require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");

const app = express();
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "publicity1234",
  database: "whatsapp_bot"
});

db.connect(err => {
  if (err) console.error(err);
  else console.log("✅ MySQL local conectado");
});

app.post("/guardar-mensaje", (req, res) => {
  const { cartera, documento, numero, mensaje, estado } = req.body;

  db.query(
    "INSERT INTO mensajes (cartera, documento, numero, mensaje, tipo, hora) VALUES (?, ?, ?, ?, ?, NOW())",
    [cartera, documento, numero, mensaje, estado],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error");
      }
      res.send("OK");
    }
  );
});

app.listen(8080, () => {
  console.log("🚀 API local en puerto 8080");
});
