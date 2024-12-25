import { WebSocket, WebSocketServer } from "ws";
import { createServer } from "http";
import dotenv from "dotenv";
import express from "express";
import axios from "axios";
import cors from "cors";
import path from "path";

dotenv.config();

const PORT = process.env.PORT || 8080;
const apiKey = process.env.API_KEY;

const app = express();
app.use(express.json());
app.use(cors());

const server = createServer(app);
const wss = new WebSocketServer({ server });

const __dirname = path.resolve();
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  // Serve static files from Vite build directory
  app.use(express.static(path.join(__dirname, "dist")));

  // Fallback for SPA routing
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

app.post("/translate", async (req, res) => {
  const { text, targetLanguage } = req.body;
  try {
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        q: text,
        target: targetLanguage,
      }
    );
    const translation = response.data.data.translations[0].translatedText;
    res.json({ translation });
  } catch (error) {
    console.error("Translation error:", error.message);
    res.status(500).json({ error: "Translation failed" });
  }
});

wss.on("connection", (ws) => {
  console.log("New WebSocket client connected");

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      const { text, username, sourceLanguage, targetLanguage } = data;

      if (!text || !username || !sourceLanguage || !targetLanguage) {
        console.error("Invalid message format received");
        ws.send(JSON.stringify({ error: "Invalid message format" }));
        return;
      }

      const response = await axios.post(`http://localhost:${PORT}/translate`, {
        text,
        targetLanguage,
      });

      const translatedMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        text,
        translation: response.data.translation,
        sender: username,
        timestamp: Date.now(),
      };

      console.log(
        `Message from ${username}: ${text} -> Translated: ${translatedMessage.translation}`
      );

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(translatedMessage));
        }
      });
    } catch (error) {
      console.error("Error handling message:", error.message);
      ws.send(JSON.stringify({ error: "Error processing message" }));
    }
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error.message);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
