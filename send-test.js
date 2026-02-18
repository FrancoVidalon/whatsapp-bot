import "dotenv/config";
import axios from "axios";

const url = `https://graph.facebook.com/v24.0/${process.env.PHONE_NUMBER_ID}/messages`;

const data = {
  messaging_product: "whatsapp",
  to: "51912258346",
  type: "template",
  template: {
    name: "recuperaciones",
    language: { code: "es_PE" },
    components: [
      {
        type: "header",
        parameters: [
          { type: "text", text: "PEDRO QUISPE" }
        ]
      },
      {
        type: "body",
        parameters: [
          { type: "text", text: "912258346" }
        ]
      }
    ]
  }
};

try {
  const res = await axios.post(url, data, {
    headers: {
      Authorization: `Bearer ${process.env.TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  console.log("✅ MENSAJE ENVIADO");
  console.log(res.data);
} catch (err) {
  console.error("❌ ERROR:");
  console.error(err.response?.data || err.message);
}
