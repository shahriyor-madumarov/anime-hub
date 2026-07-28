import React, { useState } from "react";
import { Sparkles, Bot, Send, X, RefreshCw, Compass, Lightbulb, HelpCircle } from "lucide-react";

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_PROMPTS = [
  "Посоветуй уютное аниме в жанре повседневность с хорошим юмором",
  "В каком порядке смотреть франшизу Fate (Судьба)?",
  "Посоветуй захватывающую мангу с качественной рисовкой",
  "Топ 5 лучших темных фэнтези аниме с высоким рейтингом"
];

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ isOpen, onClose }) => {
  const [inputPrompt, setInputPrompt] = useState("");
  const [messages, setMessages] = useState<{ sender: "user" | "ai"; text: string }[]>([
    {
      sender: "ai",
      text: "Привет! Я **AnimiX AI** — ваш личный гид по миру аниме и манги. Задайте мне любой вопрос: что посмотреть под настроение, в каком порядке смотреть сложные франшизы или какую мангу почитать!"
    }
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const prompt = textToSend || inputPrompt;
    if (!prompt.trim() || loading) return;

    // Add user message
    const updatedMessages = [...messages, { sender: "user" as const, text: prompt }];
    setMessages(updatedMessages);
    if (!textToSend) setInputPrompt("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: data.reply || "Не удалось получить ответ от AI." }
      ]);
    } catch (e) {
      console.error("AI assistant error", e);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Произошла ошибка при соединении с AI-сервером. Проверьте подключение." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl h-[85vh] bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 text-white shadow-lg">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                AnimiX AI Консультант
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-600/30 text-red-400 border border-red-500/30">
                  Gemini 3.6
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Умный поиск, рекомендации и порядки просмотра франшиз</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-zinc-900 hover:bg-red-600 text-white transition-colors border border-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div 
              key={idx}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] p-4 rounded-2xl text-xs md:text-sm leading-relaxed ${
                msg.sender === "user" 
                  ? "bg-red-600 text-white font-medium rounded-br-none shadow-md" 
                  : "bg-zinc-900/90 border border-zinc-800 text-zinc-200 rounded-bl-none shadow-lg whitespace-pre-line"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                AnimiX AI подбирает лучшие рекомендации...
              </div>
            </div>
          )}
        </div>

        {/* Preset Prompt Suggestions */}
        <div className="px-6 py-2 border-t border-zinc-800/60 bg-zinc-950/80 overflow-x-auto flex gap-2">
          {PRESET_PROMPTS.map((p, i) => (
            <button 
              key={i}
              onClick={() => handleSend(p)}
              disabled={loading}
              className="text-[11px] px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 whitespace-nowrap border border-zinc-800 flex items-center gap-1 flex-shrink-0 transition-colors"
            >
              <Lightbulb className="w-3 h-3 text-amber-400" /> {p}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }} 
          className="p-4 border-t border-zinc-800 bg-zinc-900/80 flex items-center gap-3"
        >
          <input 
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Спросите что устно про аниме или попросите рекомендацию..."
            className="flex-1 bg-zinc-950 text-sm text-white px-4 py-3 rounded-2xl border border-zinc-800 focus:outline-none focus:border-red-500"
          />
          <button 
            type="submit"
            disabled={loading || !inputPrompt.trim()}
            className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-lg"
          >
            <Send className="w-4 h-4" /> Отправить
          </button>
        </form>
      </div>
    </div>
  );
};
