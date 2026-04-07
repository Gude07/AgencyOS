import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Sparkles, 
  MessageCircle, 
  Plus, 
  Trash2, 
  Bot,
  User,
  Loader2,
  ChevronRight
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const AGENT_NAME = "playerClubMatcher";
const CONV_STORAGE_KEY = "aiChat_conversationId";

const SUGGESTED_PROMPTS = [
  "Welche Spieler unter 20 Jahren haben den höchsten Marktwert?",
  "Für welche offenen Vereinsanfragen gibt es passende Stürmer?",
  "Zeige mir alle Spieler mit ablaufendem Vertrag in den nächsten 6 Monaten",
  "Welche Spieler passen am besten zu einer Bundesliga-Anfrage mit Budget bis 3 Mio €?",
  "Welche Spieler sind aktuell in der Kategorie Top-Priorität?",
  "Vergleiche die besten Innenverteidiger im Portfolio",
];

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  if (message.role === "tool" || (!message.content && !message.tool_calls?.length)) return null;

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center shrink-0 mt-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? "flex flex-col items-end" : ""}`}>
        {message.content && (
          <div className={`rounded-2xl px-4 py-3 ${
            isUser 
              ? "bg-blue-900 text-white" 
              : "bg-white border border-slate-200 text-slate-800"
          }`}>
            {isUser ? (
              <p className="text-sm leading-relaxed">{message.content}</p>
            ) : (
              <ReactMarkdown
                className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                  ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                  h3: ({ children }) => <h3 className="font-semibold text-slate-900 mt-3 mb-1">{children}</h3>,
                  h2: ({ children }) => <h2 className="font-bold text-slate-900 mt-3 mb-1">{children}</h2>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
        {message.tool_calls?.length > 0 && !message.content && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs text-slate-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            Daten werden abgerufen...
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4 text-slate-600" />
        </div>
      )}
    </div>
  );
}

export default function AIChat() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    initConversation();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsub;
  }, [conversation?.id]);

  const initConversation = async () => {
    setIsInitializing(true);
    try {
      const savedId = localStorage.getItem(CONV_STORAGE_KEY);
      if (savedId) {
        try {
          const conv = await base44.agents.getConversation(savedId);
          if (conv) {
            setConversation(conv);
            setMessages(conv.messages || []);
            setIsInitializing(false);
            return;
          }
        } catch {}
      }
      await createNewConversation();
    } finally {
      setIsInitializing(false);
    }
  };

  const createNewConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: {
        name: `Chat ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })}`,
      }
    });
    setConversation(conv);
    setMessages([]);
    localStorage.setItem(CONV_STORAGE_KEY, conv.id);
  };

  const handleNewChat = async () => {
    localStorage.removeItem(CONV_STORAGE_KEY);
    await createNewConversation();
  };

  const sendMessage = async (text) => {
    const content = text || input.trim();
    if (!content || isLoading || !conversation) return;
    setInput("");
    setIsLoading(true);
    try {
      await base44.agents.addMessage(conversation, { role: "user", content });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const visibleMessages = messages.filter(m => 
    m.role !== "tool" && (m.content || m.tool_calls?.length)
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white text-lg">KI-Scout Assistent</h1>
              <p className="text-xs text-slate-500">Intelligente Spieler- & Vereinsanalyse</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleNewChat} className="gap-2">
            <Plus className="w-4 h-4" />
            Neuer Chat
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {isInitializing ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="py-12 text-center space-y-8">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Wie kann ich dir helfen?
                </h2>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  Ich habe Zugriff auf alle Spielerprofile und Vereinsanfragen. Stell mir eine Frage oder wähle einen Vorschlag.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 max-w-2xl mx-auto text-left">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all text-sm text-slate-700 dark:text-slate-300 text-left group"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {visibleMessages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-slate-500">Analysiere Daten...</span>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Frage stellen, z. B. 'Welche Spieler unter 22 passen zu Bundesliga-Anfragen?'"
            disabled={isLoading || isInitializing}
            className="flex-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading || isInitializing}
            className="bg-blue-900 hover:bg-blue-800 px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-2">
          Der Assistent hat Echtzeit-Zugriff auf Spielerprofile, Vereinsanfragen und Vereinsprofile.
        </p>
      </div>
    </div>
  );
}