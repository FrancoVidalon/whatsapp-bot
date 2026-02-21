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
  console.log("Query recibida:", req.query);

  const verify_token = process.env.VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === verify_token) {
      console.log("✅ Webhook verificado correctamente");
      return res.status(200).send(challenge);
    } else {
      console.log("❌ Token incorrecto");
      return res.sendStatus(403);
    }
  }

  res.sendStatus(400);
});


/* =====================================================
   📩 RECIBIR MENSAJES (POST)
===================================================== */
app.post("/webhook", async (req, res) => {
  try {
    console.log("Body recibido:", JSON.stringify(req.body, null, 2));

    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const numero = message.from;
    const texto = message.text?.body || "";

    console.log("📩 Mensaje recibido:", numero, texto);

    await db.execute(
      `INSERT INTO mensajes_queue (numero, mensaje, tipo)
       VALUES (?, ?, 'recibido')`,
      [numero, texto]
    );

    console.log("💾 Mensaje guardado en BD");

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
