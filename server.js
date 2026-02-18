require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
app.use(express.json());

/* =========================
   CONEXIÓN MYSQL RAILWAY
========================= */
const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQLPORT,
  ssl: {
    rejectUnauthorized: false
  }
});

/* =========================
   VERIFICACIÓN WEBHOOK
========================= */
app.get("/webhook", (req, res) => {
  const verify_token = process.env.VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === verify_token) {
      console.log("Webhook verificado correctamente");
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }
});

/* =========================
   RECIBIR MENSAJES
========================= */
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const numero = message.from;
    const texto = message.text?.body || "";

    console.log("Mensaje recibido:", numero, texto);

    // 🔥 Guardar en Railway
    await db.execute(
      `INSERT INTO mensajes_queue (numero, mensaje, tipo)
       VALUES (?, ?, 'recibido')`,
      [numero, texto]
    );

    // ⚡ Responder rápido a Meta
    res.sendStatus(200);

  } catch (error) {
    console.error("Error en webhook:", error);
    res.sendStatus(500);
  }
});

/* =========================
   PUERTO
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto", PORT);
});
