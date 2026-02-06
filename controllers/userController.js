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
  const user = db.users.find(u => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  // NO regreses la contraseña
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
  });
}

// Actualizar perfil
export function updateProfile(req, res) {
  const { username, email } = req.body;
  const db = readDB();

  const userIndex = db.users.findIndex(u => u.id === req.user.id);
  if (userIndex === -1) return res.status(404).json({ message: "Usuario no encontrado" });

  db.users[userIndex].username = username;
  db.users[userIndex].email = email;

  saveDB(db);

  res.json({ message: "Perfil actualizado correctamente" });
}
