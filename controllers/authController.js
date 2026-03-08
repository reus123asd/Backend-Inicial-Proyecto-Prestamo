import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const DB_PATH = "./db.json";

// Leer BD
function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH));
}

// Guardar BD
function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// REGISTER
export function register(req, res) {
  const { nombres, apellidos, email, password } = req.body;

  if (!nombres || !apellidos || !email || !password) {
    return res.status(400).json({
      message: "Todos los campos son obligatorios"
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: "La contraseña debe tener al menos 6 caracteres"
    });
  }

  const db = readDB();

  const userExists = db.users.find(u => u.email === email);
  if (userExists) {
    return res.status(400).json({ message: "Email ya registrado" });
  }

  const hashed = bcrypt.hashSync(password, 10);

  const newUser = {
    id: Date.now().toString(),
    nombres,
    apellidos,
    email,
    password: hashed
  };

  db.users.push(newUser);
  saveDB(db);

  return res.status(201).json({
    message: "Usuario registrado correctamente"
  });
}


// LOGIN
export function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Correo y contraseña son obligatorios"
    });
  }

  const db = readDB();

  const user = db.users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ message: "Credenciales inválidas" });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ message: "Credenciales inválidas" });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || "SECRET_KEY",
    { expiresIn: "1d" }
  );

  return res.json({
    message: "Login correcto",
    token,
    user: {
      id: user.id,
      nombres: user.nombres,
      apellidos: user.apellidos,
      email: user.email
    }
  });
}

// FORGOT PASSWORD
export function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "El correo es obligatorio" });

  const db = readDB();
  const user = db.users.find(u => u.email === email);

  if (!user) {
    // Para seguridad, no confirmamos si el correo existe o no
    return res.json({ message: "Si el correo está registrado, recibirás un link de recuperación." });
  }

  // Generamos un token temporal
  const resetToken = jwt.sign({ id: user.id }, process.env.RESET_SECRET || "RESET_SECRET", { expiresIn: "1h" });

  // En una app real, aquí enviaríamos un correo.
  // Por ahora lo simulamos devolviendo un mensaje de éxito.
  console.log(`[SIMULACIÓN] Link de recuperación para ${email}: http://localhost:5173/reset-password/${resetToken}`);

  return res.json({
    message: "Si el correo está registrado, recibirás un link de recuperación.",
    debugToken: resetToken // Solo para pruebas/debug
  });
}

// RESET PASSWORD
export function resetPassword(req, res) {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Token y nueva contraseña son obligatorios" });
  }

  try {
    const decoded = jwt.verify(token, process.env.RESET_SECRET || "RESET_SECRET");
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === decoded.id);

    if (userIndex === -1) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    db.users[userIndex].password = bcrypt.hashSync(newPassword, 10);
    saveDB(db);

    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    return res.status(400).json({ message: "Token inválido o expirado" });
  }
}

// GOOGLE LOGIN
export function googleLogin(req, res) {
  const { uid, email, username, photoURL } = req.body;

  if (!email) return res.status(400).json({ message: "Email es requerido" });

  const db = readDB();
  let user = db.users.find(u => u.email === email);

  if (!user) {
    // Si no existe, lo creamos
    const nameParts = username ? username.split(" ") : [email.split("@")[0], ""];
    const first = nameParts[0];
    const last = nameParts.slice(1).join(" ") || "";

    user = {
      id: Date.now().toString(),
      nombres: first,
      apellidos: last,
      email,
      googleId: uid,
      photoURL: photoURL || null,
      password: "OAUTH_USER"
    };
    db.users.push(user);
    saveDB(db);
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || "SECRET_KEY",
    { expiresIn: "1d" }
  );

  return res.json({
    message: "Google login correcto",
    token,
    user: {
      id: user.id,
      nombres: user.nombres,
      apellidos: user.apellidos,
      email: user.email,
      photoURL: user.photoURL
    }
  });
}

