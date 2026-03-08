import { Router } from "express";
import multer from "multer";
import { auth } from "../middleware/authMiddleware.js";
import {
  registrarPrestamo,
  obtenerPrestamos,
  eliminarPrestamo,
  obtenerPagos,
  descargarVoucherPDF,
  registrarPago,
  editarPrestamo,
  obtenerEvidenciaPago,
  obtenerEstadisticas,
  gestionarEstadoPrestamo
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

// Obtener estadísticas
router.get("/stats", auth, obtenerEstadisticas);

// Eliminar préstamo
router.delete("/:id", auth, eliminarPrestamo);

// Editar préstamo
router.patch("/:id", auth, upload.single("evidencia"), editarPrestamo);
router.patch("/:id/estado", auth, gestionarEstadoPrestamo);

// Registrar pago
router.post("/:id/pago", auth, upload.single("evidencia"), registrarPago);

router.get("/pagos", auth, obtenerPagos);

router.get(
  "/pagos/:id/voucher",
  auth,
  obtenerEvidenciaPago
);

export default router;
