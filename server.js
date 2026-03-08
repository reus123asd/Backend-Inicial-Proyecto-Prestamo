import express from "express";
import cors from "cors";
import "dotenv/config";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import prestamosRoutes from "./routes/prestamos.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.json({ status: "OK" }));

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/prestamos", prestamosRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto", PORT);
});

