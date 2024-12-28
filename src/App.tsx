import React, { useEffect, useRef, useState } from "react";
import { Languages, Mic, StopCircle, Volume2 } from "lucide-react";
import axios from "axios";

interface Message {
  id: string;
  text: string;
  translation: string;
  sender: string;
  timestamp: number;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [primaryLanguage, setPrimaryLanguage] = useState("ja-JP");
  const [secondaryLanguage, setSecondaryLanguage] = useState("es-ES");
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [speechQueue, setSpeechQueue] = useState<string[]>([]);
  const isProcessingSpeechQueue = useRef(false);
  const recognition = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_BASE_URL = `/api`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/messages`); // Use API base URL
      const data = Array.isArray(response.data) ? response.data : [];
      setMessages((prevMessages) => [...prevMessages, ...data]);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/messages`, {
        text,
        username,
        sourceLanguage: primaryLanguage.startsWith("ja") ? "ja" : "en",
        targetLanguage: secondaryLanguage.startsWith("ja")
          ? "ja"
          : secondaryLanguage.startsWith("es")
          ? "es"
          : "en",
      });
      const message = response.data;
      setMessages((prev) => [...prev, message]);
      return message;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  const startRecording = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      recognition.current = new (window.SpeechRecognition ||
        window.webkitSpeechRecognition)();
      recognition.current.continuous = false;
      recognition.current.lang = primaryLanguage;

      recognition.current.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        try {
          const response = await sendMessage(text);
          if (response && response.translation) {
            setSpeechQueue((prevQueue) => [...prevQueue, response.translation]);
          }
        } catch (error) {
          console.error("Error processing recorded text:", error);
        }
      };

      recognition.current.onend = () => setIsRecording(false);
      recognition.current.start();
      setIsRecording(true);
    } catch (error) {
      alert(
        "Microphone access is required. Please check your browser settings."
      );
    }
  };

  const stopRecording = () => {
    recognition.current?.stop();
  };

  const speakMessage = (text: string, lang: string) => {
    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find((voice) => voice.lang === lang);

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      } else {
        console.warn(`No voice found for language: ${lang}`);
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        console.error("Speech synthesis error:", e);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  useEffect(() => {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }, []);

  const processSpeechQueue = async () => {
    if (isProcessingSpeechQueue.current || speechQueue.length === 0) return;
    isProcessingSpeechQueue.current = true;

    while (speechQueue.length > 0) {
      const message = speechQueue.shift();
      if (message) {
        await speakMessage(message, secondaryLanguage);
      }
    }

    isProcessingSpeechQueue.current = false;
  };

  useEffect(() => {
    if (!isProcessingSpeechQueue.current && speechQueue.length > 0) {
      processSpeechQueue();
    }
  }, [speechQueue]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      setIsLoggedIn(true);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-400 to-purple-500">
        <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
          <h1 className="text-2xl font-semibold text-center mb-6 text-gray-700">
            BabelFish
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Name
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Primary Language
              </label>
              <select
                value={primaryLanguage}
                onChange={(e) => setPrimaryLanguage(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="en-US">English</option>
                <option value="ja-JP">Japanese</option>
                <option value="es-ES">Spanish</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Secondary Language
              </label>
              <select
                value={secondaryLanguage}
                onChange={(e) => setSecondaryLanguage(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="en-US">English</option>
                <option value="ja-JP">Japanese</option>
                <option value="es-ES">Spanish</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-200"
            >
              {primaryLanguage === "ja-JP"
                ? "入る"
                : primaryLanguage === "es-ES"
                ? "Entrar"
                : "Enter"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Languages className="w-6 h-6 text-blue-500" />
            <h1 className="text-lg font-semibold text-gray-800">BabelFish</h1>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">{username}</span>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Primary Language
              </label>
              <select
                value={primaryLanguage}
                onChange={(e) => setPrimaryLanguage(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="en-US">English</option>
                <option value="ja-JP">Japanese</option>
                <option value="es-ES">Spanish</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Secondary Language
              </label>
              <select
                value={secondaryLanguage}
                onChange={(e) => setSecondaryLanguage(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="en-US">English</option>
                <option value="ja-JP">Japanese</option>
                <option value="es-ES">Spanish</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4">
        <div
          className="h-[calc(100vh-160px)] overflow-y-auto space-y-4 bg-gray-100 rounded-lg p-4"
          style={{ maxHeight: "calc(100vh - 160px)" }}
        >
          {messages.map((message) => (
            <div
              key={`${message.id}-${message.timestamp}`}
              className={`flex flex-col ${
                message.sender === username ? "items-end" : "items-start"
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm text-gray-600">{message.sender}</span>
                <span className="text-xs text-gray-400">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === username
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-800"
                }`}
              >
                <p className="mb-1">{message.text}</p>
                <p className="text-sm opacity-80">{message.translation}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-white border-t p-4">
        <div className="max-w-3xl mx-auto flex items-center space-x-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2 rounded-full ${
              isRecording
                ? "bg-red-100 text-red-600 hover:bg-red-200"
                : "bg-blue-100 text-blue-600 hover:bg-blue-200"
            }`}
          >
            {isRecording ? (
              <StopCircle className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>
          <button
            onClick={() => {
              const lastMessage = messages[messages.length - 1];
              if (lastMessage) {
                speakMessage(lastMessage.text, primaryLanguage).then(() => {
                  speakMessage(lastMessage.translation, secondaryLanguage);
                });
              }
            }}
            className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <Volume2 className="w-6 h-6" />
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
