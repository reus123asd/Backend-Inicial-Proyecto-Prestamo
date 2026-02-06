import jwt from "jsonwebtoken";

export function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(403).json({ message: "Token no proporcionado" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, "SECRET_KEY"); // Debe ser el mismo del login
    req.user = decoded; // ⬅️ Esto permite que getProfile reciba el ID del usuario
    next();
  } catch (error) {
    return res.status(403).json({ message: "Token inválido o expirado" });
  }
}
  