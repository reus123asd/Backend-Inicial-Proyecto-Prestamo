import fs from "fs";
const DB_PATH = "./db.json";
import PDFDocument from "pdfkit";
import path from "path";

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Registrar préstamo
export function registrarPrestamo(req, res) {
  const {
    nombre,
    telefono,
    motivo,
    monto,
    fecha,
    cuotas,
    fecha_limite
  } = req.body;

  const evidencia = req.file ? req.file.filename : null;

  const db = readDB();

  const nuevoPrestamo = {
    id: Date.now().toString(),      // ID único
    nombre,                         // Nombre del cliente
    telefono,
    motivo,

    monto: Number(monto),           // TOTAL del préstamo
    monto_pagado: 0,                // Aún no paga nada
    saldo: Number(monto),            // Al inicio debe todo
    estado: "Pendiente",             // Estado inicial

    fecha,
    cuotas,
    fecha_limite,
    evidencia,

    pagos: [],                       // Historial vacío
    userId: req.user.id,
  };

  db.prestamos.push(nuevoPrestamo);
  saveDB(db);

  res.json({ message: "Préstamo registrado correctamente", prestamo: nuevoPrestamo });
}

// Obtener préstamos por usuario
export function obtenerPrestamos(req, res) {
  const db = readDB();
  const prestamos = db.prestamos.filter(p => p.userId === req.user.id);
  res.json(prestamos);
}

// Eliminar préstamo
export function eliminarPrestamo(req, res) {
  const db = readDB();
  const id = req.params.id;

  db.prestamos = db.prestamos.filter((p) => p.id !== id);

  saveDB(db);

  res.json({ message: "Préstamo eliminado correctamente" });
}

// Registrar pago
export function registrarPago(req, res) {
  const { id } = req.params;
  const { monto, fecha } = req.body;

  const db = readDB();
  const prestamo = db.prestamos.find(p => p.id === id);

  if (!prestamo) {
    return res.status(404).json({ message: "Préstamo no encontrado" });
  }

  const pago = Number(monto);

  if (pago <= 0) {
    return res.status(400).json({ message: "Monto inválido" });
  }

  if (pago > prestamo.saldo) {
    return res.status(400).json({ message: "El monto excede el saldo" });
  }

  // actualizar montos
  prestamo.monto_pagado += pago;
  prestamo.saldo = prestamo.monto - prestamo.monto_pagado;

  prestamo.estado = prestamo.saldo <= 0 ? "Cancelado" : "Deuda";

  // historial de pagos
  if (!prestamo.pagos) prestamo.pagos = [];

  const nuevoPago = {
    id: Date.now().toString(),
    prestamoId: prestamo.id,
    cliente: prestamo.nombre,
    monto: pago,
    fecha: fecha || new Date().toISOString().split("T")[0],
  };

  prestamo.pagos.push(nuevoPago);

  saveDB(db);

  res.json({
    message: "Pago registrado",
    pago: nuevoPago,
    prestamo
  });
}

export function obtenerPagos(req, res) {
  const db = readDB();

  const pagos = [];

  db.prestamos.forEach(p => {
    if (p.userId === req.user.id && p.pagos) {
      p.pagos.forEach(pago => {
        pagos.push(pago);
      });
    }
  });

  res.json(pagos);
}

export function descargarVoucherPDF(req, res) {
  const { id } = req.params;
  const db = readDB();

  let pagoEncontrado = null;
  let prestamoEncontrado = null;

  db.prestamos.forEach(p => {
    if (p.pagos) {
      const pago = p.pagos.find(pg => pg.id === id);
      if (pago) {
        pagoEncontrado = pago;
        prestamoEncontrado = p;
      }
    }
  });

  if (!pagoEncontrado) {
    return res.status(404).json({ message: "Pago no encontrado" });
  }

  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=voucher_${pagoEncontrado.id}.pdf`
  );
  res.setHeader("Content-Type", "application/pdf");

  doc.pipe(res);

  // ---- CONTENIDO DEL PDF ----
  doc
    .fontSize(20)
    .text("VOUCHER DE PAGO", { align: "center" })
    .moveDown(2);

  doc.fontSize(12);
  doc.text(`Cliente: ${prestamoEncontrado.nombre}`);
  doc.text(`Teléfono: ${prestamoEncontrado.telefono}`);
  doc.text(`ID Préstamo: ${prestamoEncontrado.id}`);
  doc.moveDown();

  doc.text(`Monto Pagado: S/ ${pagoEncontrado.monto}`);
  doc.text(`Fecha de Pago: ${pagoEncontrado.fecha}`);
  doc.text(`Saldo Pendiente: S/ ${prestamoEncontrado.saldo}`);
  doc.text(`Estado del Préstamo: ${prestamoEncontrado.estado}`);
  doc.moveDown(2);

  doc.text("Gracias por su pago.", { align: "center" });

  doc.end();
}


