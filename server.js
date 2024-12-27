import dotenv from "dotenv";
import express from "express";
import axios from "axios";
import cors from "cors";

dotenv.config();

const PORT = process.env.PORT || 8080;
const apiKey = process.env.API_KEY;

const app = express();
app.use(express.json());
app.use(cors());
app.use("/api", apiRouter);

// Temporary in-memory storage for messages
let messages = [];

// Test API endpoint
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// Translation API endpoint
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

// Endpoint to post a new message
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

    messages.push(newMessage);
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error translating message:", error.message);
    res.status(500).json({ error: "Error processing message" });
  }
});

// Endpoint to fetch messages
app.get("/api/messages", (req, res) => {
  res.json(messages);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app; // Required for Vercel
