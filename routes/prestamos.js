import { Router } from "express";
import multer from "multer";
import { auth } from "../middleware/authMiddleware.js";
import {
  registrarPrestamo,
  obtenerPrestamos,
  eliminarPrestamo,
  obtenerPagos,
  descargarVoucherPDF,
  registrarPago
} from "../controllers/prestamosController.js";

const router = Router();

// Configuración de multer
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// Registrar préstamo
router.post("/", auth, upload.single("evidencia"), registrarPrestamo);

// Obtener préstamos del usuario logueado
router.get("/", auth, obtenerPrestamos);

// Eliminar préstamo
router.delete("/:id", auth, eliminarPrestamo);

// Registrar pago
router.post("/:id/pago", auth, registrarPago);

router.get("/pagos", auth, obtenerPagos);

router.get(
  "/pagos/:id/voucher/pdf",
  auth,
  descargarVoucherPDF
);

export default router;
