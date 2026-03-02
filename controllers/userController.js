import fs from "fs";
const DB_PATH = "./db.json";

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Obtener perfil
export function getProfile(req, res) {
  const db = readDB();
  // Usamos == en lugar de === por si hay discrepancia de tipos (string vs number)
  const user = db.users.find(u => u.id == req.user.id);

  if (!user) {
    console.log(`[BACKEND] Usuario no encontrado para ID: ${req.user.id}`);
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  // NO regreses la contraseña
  console.log(`[BACKEND] Enviando perfil para: ${user.email} (Nombre: ${user.nombres || user.username})`);
  res.json({
    id: user.id,
    nombres: user.nombres || user.username || "",
    apellidos: user.apellidos || "",
    email: user.email,
  });
}

// Actualizar perfil
export function updateProfile(req, res) {
  const { nombres, apellidos, email } = req.body;
  const db = readDB();

  const userIndex = db.users.findIndex(u => u.id == req.user.id);
  if (userIndex === -1) {
    console.log(`[BACKEND] No se pudo encontrar usuario para actualizar. ID: ${req.user.id}`);
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  db.users[userIndex].nombres = nombres || db.users[userIndex].nombres || "";
  db.users[userIndex].apellidos = apellidos || db.users[userIndex].apellidos || "";
  db.users[userIndex].email = email || db.users[userIndex].email;

  saveDB(db);
  console.log(`[BACKEND] Perfil actualizado exitosamente para: ${db.users[userIndex].email}`);

  res.json({ message: "Perfil actualizado correctamente", user: db.users[userIndex] });
}
