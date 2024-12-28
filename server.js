import dotenv from "dotenv";
import express from "express";
import path from "path";
import axios from "axios";
import cors from "cors";

dotenv.config();

const PORT = process.env.PORT || 8080;
const apiKey = process.env.API_KEY;

const app = express();
const __dirname = path.resolve();

app.use(express.json());
app.use(cors());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, "dist")));

// Temporary in-memory storage for messages
let messages = [];

// API routes
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from the backend!" });
});

app.post("/api/translate", async (req, res) => {
  const { text, targetLanguage } = req.body;

  if (!text || !targetLanguage) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      { q: text, target: targetLanguage }
    );
    const translation = response.data.data.translations[0].translatedText;
    res.json({ translation });
  } catch (error) {
    console.error("Translation error:", error.message);
    res.status(500).json({ error: "Translation failed" });
  }
});

app.post("/api/messages", async (req, res) => {
  const { text, username, sourceLanguage, targetLanguage } = req.body;

  if (!text || !username || !sourceLanguage || !targetLanguage) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      { q: text, target: targetLanguage }
    );

    const translation = response.data.data.translations[0].translatedText;

    const newMessage = {
      id: Date.now().toString(),
      text,
      translation,
      sender: username,
      timestamp: Date.now(),
    };

    messages.push(newMessage); // Push the new message to in-memory storage
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error translating message:", error.message);
    res.status(500).json({ error: "Error processing message" });
  }
});
app.get("/api/messages", (req, res) => {
  res.json(messages);
});

// Fallback route for React frontend
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;