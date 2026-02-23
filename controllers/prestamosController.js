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
    nombres,      // Nuevo
    apellidos,    // Nuevo
    nombre,       // Mantenemos por compatibilidad si se envía
    telefono,
    motivo,
    monto,
    fecha,
    cuotas,
    fecha_limite,
    moneda        // Nuevo: PEN o USD
  } = req.body;

  const evidencia = req.file ? req.file.filename : null;

  const db = readDB();

  // Lógica para nombres
  let nombreCompleto = nombre;
  if (nombres && apellidos) {
    nombreCompleto = `${nombres} ${apellidos}`.trim();
  } else if (!nombre && nombres) {
    nombreCompleto = nombres;
  }

  // Lógica para moneda (default PEN)
  const monedaFinal = moneda || "PEN";

  const nuevoPrestamo = {
    id: Date.now().toString(),      // ID único
    nombres: nombres || "",
    apellidos: apellidos || "",
    nombre: nombreCompleto,         // Nombre completo para compatibilidad
    telefono,
    motivo,

    monto: Number(monto),           // TOTAL del préstamo
    moneda: monedaFinal,            // Guardamos la moneda
    monto_pagado: 0,                // Aún no paga nada
    saldo: Number(monto),           // Al inicio debe todo
    estado: "Pendiente",            // Estado inicial

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
  const evidencia = req.file ? req.file.filename : null;

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
    evidencia: evidencia, // Guardamos la evidencia
  };

  prestamo.pagos.push(nuevoPago);

  saveDB(db);

  res.json({
    message: "Pago registrado",
    pago: nuevoPago,
    prestamo
  });
}

// Obtener evidencia de pago
export function obtenerEvidenciaPago(req, res) {
  const { id } = req.params;
  const db = readDB();

  let pagoEncontrado = null;
  db.prestamos.forEach(p => {
    if (p.pagos) {
      const pago = p.pagos.find(pg => pg.id === id);
      if (pago) pagoEncontrado = pago;
    }
  });

  if (!pagoEncontrado || !pagoEncontrado.evidencia) {
    return res.status(404).json({ message: "Evidencia no encontrada" });
  }

  const filePath = path.join(process.cwd(), "uploads", pagoEncontrado.evidencia);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ message: "Archivo físico no encontrado" });
  }
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

  // Definir símbolo de moneda
  const simbolo = prestamoEncontrado.moneda === "USD" ? "$" : "S/";

  // ---- CONTENIDO DEL PDF ----
  doc
    .fontSize(20)
    .text("VOUCHER DE PAGO", { align: "center" })
    .moveDown(2);

  doc.fontSize(12);
  doc.text(`Cliente: ${prestamoEncontrado.nombre}`);
  // Mostrar nombres y apellidos por separado si existen
  if (prestamoEncontrado.nombres || prestamoEncontrado.apellidos) {
    doc.text(`(Nombres: ${prestamoEncontrado.nombres || ""} - Apellidos: ${prestamoEncontrado.apellidos || ""})`);
  }

  doc.text(`Teléfono: ${prestamoEncontrado.telefono}`);
  doc.text(`ID Préstamo: ${prestamoEncontrado.id}`);
  doc.text(`Moneda: ${prestamoEncontrado.moneda === "USD" ? "Dólares Americanos" : "Soles"}`);
  doc.moveDown();

  doc.text(`Monto Pagado: ${simbolo} ${pagoEncontrado.monto}`);
  doc.text(`Fecha de Pago: ${pagoEncontrado.fecha}`);
  doc.text(`Saldo Pendiente: ${simbolo} ${prestamoEncontrado.saldo}`);
  doc.text(`Estado del Préstamo: ${prestamoEncontrado.estado}`);
  doc.moveDown(2);

  doc.text("Gracias por su pago.", { align: "center" });

  doc.end();
}

// Editar préstamo
export function editarPrestamo(req, res) {
  const { id } = req.params;
  const {
    nombres,
    apellidos,
    nombre,
    telefono,
    motivo,
    monto,
    fecha,
    cuotas,
    fecha_limite,
    moneda
  } = req.body;

  const db = readDB();
  const prestamo = db.prestamos.find(p => p.id === id);

  if (!prestamo) {
    return res.status(404).json({ message: "Préstamo no encontrado" });
  }

  // Verificar pertenencia (opcional pero recomendado)
  if (prestamo.userId !== req.user.id) {
    return res.status(403).json({ message: "No tiene permiso para editar este préstamo" });
  }

  // Actualizar evidencia si se sube un archivo nuevo
  if (req.file) {
    // Podríamos eliminar el archivo anterior aquí si existiera
    prestamo.evidencia = req.file.filename;
  }

  // Lógica para nombres
  if (nombres !== undefined) prestamo.nombres = nombres;
  if (apellidos !== undefined) prestamo.apellidos = apellidos;

  if (nombres !== undefined || apellidos !== undefined) {
    prestamo.nombre = `${nombres || prestamo.nombres} ${apellidos || prestamo.apellidos}`.trim();
  } else if (nombre !== undefined) {
    prestamo.nombre = nombre;
  }

  if (telefono !== undefined) prestamo.telefono = telefono;
  if (motivo !== undefined) prestamo.motivo = motivo;
  if (fecha !== undefined) prestamo.fecha = fecha;
  if (cuotas !== undefined) prestamo.cuotas = cuotas;
  if (fecha_limite !== undefined) prestamo.fecha_limite = fecha_limite;
  if (moneda !== undefined) prestamo.moneda = moneda;

  // Si cambia el monto, recalculamos el saldo
  if (monto !== undefined) {
    const nuevoMontoTotal = Number(monto);
    prestamo.monto = nuevoMontoTotal;
    prestamo.saldo = nuevoMontoTotal - (prestamo.monto_pagado || 0);

    // Actualizar estado basado en el nuevo saldo
    if (prestamo.saldo <= 0) {
      prestamo.estado = "Cancelado";
    } else {
      // Si antes estaba Cancelado y ahora tiene saldo, vuelve a Pendiente o Deuda
      prestamo.estado = "Deuda";
    }
  }

  saveDB(db);

  res.json({ message: "Préstamo actualizado correctamente", prestamo });
}


