import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, X } from 'lucide-react';
import { askGeminiConcierge } from '../services/gemini';

export default function GeminiConcierge() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "👋 Welcome to Sloan Jooste's Fundraiser AI Assistant! Ask me anything about tickets, 35 tables, Kuils River venue, dress code (A Splash of Green), or our Grand Raffle Draw (21:00 - 21:30)."
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText) => {
    const textToSend = queryText || input;
    if (!textToSend.trim()) return;

    const userMsg = { sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const responseText = await askGeminiConcierge(textToSend);
      setMessages(prev => [...prev, { sender: 'ai', text: responseText }]);
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'ai', text: "I'm here to help! Please ask any question about Sloan Jooste's Fundraiser Dance." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="p-3.5 rounded-full bg-gradient-to-r from-emerald-600 to-purple-800 text-white shadow-2xl shadow-emerald-600/30 hover:scale-105 transition-all duration-200 flex items-center gap-2 font-black text-xs border border-white/40 group"
        >
          <img src="/flyer_sloan.jpg" alt="Sloan Logo" className="w-6 h-6 rounded-full object-cover border border-white" />
          <span>Ask AI Concierge</span>
        </button>
      )}

      {/* Chat Window Drawer */}
      {isOpen && (
        <div className="w-80 sm:w-96 glass-modal rounded-3xl border border-purple-300 shadow-2xl overflow-hidden flex flex-col h-[480px] animate-fadeIn bg-white">
          
          {/* Top Bar */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-700 via-purple-900 to-emerald-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/flyer_sloan.jpg" alt="Sloan Logo" className="w-7 h-7 rounded-full object-cover border border-white" />
              <div>
                <h3 className="text-xs font-black flex items-center gap-1.5">
                  Sloan's AI Assistant
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                </h3>
                <p className="text-[10px] text-emerald-200 font-medium">Powered by Gemini AI</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs bg-slate-50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-purple-100 border border-purple-300 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5 font-bold">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[82%] leading-relaxed shadow-sm whitespace-pre-wrap ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white font-semibold rounded-tr-none'
                      : 'bg-white text-slate-800 border border-purple-100 rounded-tl-none font-medium'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-slate-500 text-xs italic p-2">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-1.5 bg-white border-t border-purple-100 flex items-center gap-1.5 overflow-x-auto text-[10px] scrollbar-none font-bold">
            <button
              onClick={() => handleSend("When is the raffle draw?")}
              className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 whitespace-nowrap hover:bg-emerald-100 transition"
            >
              🎟️ Raffle Time (21:00)
            </button>
            <button
              onClick={() => handleSend("Where is the venue located?")}
              className="px-2.5 py-1 rounded-full bg-purple-50 border border-purple-300 text-purple-950 whitespace-nowrap hover:bg-purple-100 transition"
            >
              📍 Kuils River Venue
            </button>
            <button
              onClick={() => handleSend("What is the dress code?")}
              className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 whitespace-nowrap hover:bg-emerald-100 transition"
            >
              👗 Splash of Green
            </button>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-purple-100 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about raffle, venue, tickets..."
              className="flex-1 bg-slate-50 border border-purple-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 font-medium"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
