import React, { useEffect, useRef, useState } from "react";
import { Languages, Mic, StopCircle, Volume2 } from "lucide-react";

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
  const [secondaryLanguage, setSecondaryLanguage] = useState("en-US");
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const recognition = useRef<any>(null);

  const initializeVoices = () => {
    return new Promise<void>((resolve) => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length) {
        resolve();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          resolve();
        };
      }
    });
  };

  const speakMessage = async (text: string, lang: string) => {
    await initializeVoices();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    const availableVoices = window.speechSynthesis.getVoices();
    let voice = availableVoices.find((v) => v.lang === lang);
    utterance.voice = voice || availableVoices[0]; // Fallback to default voice if none found

    utterance.onerror = (e) =>
      console.error("SpeechSynthesisUtterance error:", e);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (isLoggedIn) {
      ws.current = new WebSocket("ws://localhost:8080");

      ws.current.onopen = () => console.log("WebSocket connection opened");

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setMessages((prev) => [...prev, message]);
        if (message.translation) {
          speakMessage(message.translation);
        }
      };

      ws.current.onerror = (error) => console.error("WebSocket error:", error);
      ws.current.onclose = () => console.log("WebSocket connection closed");

      return () => ws.current?.close();
    }
  }, [isLoggedIn, primaryLanguage]);

  const startRecording = () => {
    recognition.current = new (window.SpeechRecognition ||
      window.webkitSpeechRecognition)();
    recognition.current.continuous = false;
    recognition.current.lang = primaryLanguage;

    recognition.current.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      sendMessage(text);
    };

    recognition.current.onend = () => setIsRecording(false);
    recognition.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognition.current?.stop();
  };

  const sendMessage = (text: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          text,
          username,
          sourceLanguage: primaryLanguage.startsWith("ja")
            ? "ja"
            : primaryLanguage.startsWith("es")
            ? "es"
            : "en",
          targetLanguage: secondaryLanguage.startsWith("ja")
            ? "ja"
            : secondaryLanguage.startsWith("es")
            ? "es"
            : "en",
        })
      );
    }
  };

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
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Enter your username"
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

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 overflow-y-auto">
        <div className="space-y-4">
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
