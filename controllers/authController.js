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
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
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
    username,
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
    "SECRET_KEY",
    { expiresIn: "1d" }
  );

  return res.json({
    message: "Login correcto",
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    }
  });
}

