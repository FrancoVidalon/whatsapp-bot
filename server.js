import express from "express";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const app = express();
app.use(express.json());

/* =====================================================
   🔌 CONEXIÓN A MYSQL RAILWAY (POOL - PRODUCCIÓN)
===================================================== */
const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log("✅ Pool de base de datos listo");

/* =====================================================
   ✅ VERIFICACIÓN WEBHOOK (GET)
===================================================== */
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const verify_token = process.env.VERIFY_TOKEN;

  console.log("Query recibida:", req.query);

  if (mode && token && mode === "subscribe" && token === verify_token) {
    console.log("✅ Webhook verificado correctamente");
    return res.status(200).send(challenge);
  }

  console.log("❌ Webhook GET inválido");
  res.sendStatus(403);
});

/* =====================================================
   📩 WEBHOOK POST - MENSAJES Y STATUS
===================================================== */
app.post("/webhook", async (req, res) => {
  try {
    console.log("Body recibido:", JSON.stringify(req.body, null, 2));

    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) return res.sendStatus(200);

   // -----------------------------
   // 📦 Status de mensajes enviados
   // -----------------------------
   if (value.statuses) {
     for (const statusData of value.statuses) {
   
       const message_id = statusData.id;
       const numero = statusData.recipient_id;
       const estado = statusData.status; // sent, delivered, read, failed
       const timestamp = statusData.timestamp || null;
   
       // Pricing info (cuando viene)
       const categoria = statusData.pricing?.category || null;
       const tipo = statusData.pricing?.type || null;
       const modelo_precios = statusData.pricing?.pricing_model || null;
       const facturable = statusData.pricing?.billable ?? null;
   
       console.log("📦 Status recibido:", {
         message_id,
         numero,
         estado,
         categoria,
         tipo
       });
   
       await db.execute(
         `INSERT INTO mensajes_status 
         (message_id, numero, estado, categoria, tipo, modelo_precios, facturable, timestamp_evento, fecha_registro)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
         [
           message_id,
           numero,
           estado,
           categoria,
           tipo,
           modelo_precios,
           facturable,
           timestamp
         ]
       );
   
       console.log("💾 Evento guardado en mensajes_status");
     }
   
     return res.sendStatus(200);
   }

    // -----------------------------
    // 📩 Mensajes entrantes
    // -----------------------------
    const message = value.messages?.[0];
    if (message) {
      const numero = message.from;
      const texto = message.text?.body || "";

      console.log("📩 Mensaje entrante:", numero, texto);

      // Guardar en mensajes_queue
      await db.execute(
        `INSERT INTO mensajes_queue (numero, mensaje, tipo, procesado, fecha)
         VALUES (?, ?, 'recibido', 0, NOW())`,
        [numero, texto]
      );

      console.log("💾 Mensaje guardado en mensajes_queue");
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("❌ Error en webhook:", error);
    res.sendStatus(500);
  }
});

/* =====================================================
   🛡️ MANEJO GLOBAL DE ERRORES
===================================================== */
process.on("unhandledRejection", (err) => {
  console.error("🔥 Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("🔥 Uncaught Exception:", err);
});

/* =====================================================
   🚀 INICIAR SERVIDOR
===================================================== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
