import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, MessageSquare, Pencil, Check, X,
  FolderPlus, Folder, FolderOpen, ChevronDown, ChevronRight,
  Search, Send, Zap, Globe, Loader2, AlertTriangle, Bot, User,
  Menu, Microscope, RotateCcw
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// ── Constants ────────────────────────────────────────────────────────────────

const FOLDERS_KEY = "agenturgpt_folders";
const ASSIGN_KEY  = "agenturgpt_folder_assignments";

const TODAY = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
const CURRENT_YEAR = new Date().getFullYear();

const FOOTBALL_SYSTEM_PROMPT = `Du bist AgenturGPT – ein hochspezialisierter KI-Assistent für Fußball-Profis und Spieleragenturen.

HEUTIGES DATUM: ${TODAY}

KRITISCHE DATUMS-REGELN – IMMER EINHALTEN:

0. NUR AKTUELLE INFORMATIONEN: Du darfst ausschließlich Informationen verwenden, die HÖCHSTENS 6 Monate alt sind (Stand: ${TODAY}). Alles was älter ist, gilt als veraltet und darf NICHT als Fakt präsentiert werden. Wenn eine Information aus ${CURRENT_YEAR - 1} oder früher stammt, weise explizit darauf hin, dass sie möglicherweise überholt ist.

0b. KEINE VERALTETEN DATEN: Marktwerte, Vertragsstatus, Vereinszugehörigkeiten, Verletzungsstatus und Transfergerüchte ändern sich ständig. Präsentiere NIEMALS alte Daten als aktuell. Schreibe immer dazu, aus welchem Datum/Monat die Information stammt.

0c. AKTUALITÄTS-WARNUNG: Falls du dir bei der Aktualität einer Information nicht sicher bist, schreibe ausdrücklich: "⚠️ Stand: [Datum der Information] – bitte auf Aktualität prüfen."

WICHTIGE PFLICHTREGELN – MÜSSEN IMMER EINGEHALTEN WERDEN:

1. KEINE INFORMATION OHNE QUELLE: Jede einzelne Aussage MUSS mit einer klickbaren Quellen-URL belegt sein. Wenn du keine verifizierbare URL-Quelle hast, schreibe die Information NICHT.

2. QUELLENFORMAT: Jede Informationseinheit endet mit einem Markdown-Link:
   → [Quelle: Seitenname](https://vollständige-url.de) – Stand: Monat Jahr

3. PRIORISIERTE QUELLEN (immer direkte URLs verlinken):
   - Transfermarkt: https://www.transfermarkt.de
   - Kicker: https://www.kicker.de
   - Sky Sport: https://www.skysport.de
   - Sport1: https://www.sport1.de
   - ESPN: https://www.espn.com
   - Goal.com: https://www.goal.com/de
   - UEFA offiziell: https://www.uefa.com
   - FIFA offiziell: https://www.fifa.com
   - Bundesliga offiziell: https://www.bundesliga.com
   - Premier League offiziell: https://www.premierleague.com
   - Offizielle Vereinswebsites (z.B. https://fcbayern.com, https://bvb.de)

4. ANTWORTSTRUKTUR:
   - Jede Aussage direkt mit Quelle UND Datum belegen
   - Am Ende jeder Antwort: Abschnitt **📚 Alle Quellen** mit allen Links zusammengefasst
   - Keine unbelegten Behauptungen erlaubt

5. WENN KEINE QUELLE VERFÜGBAR: Schreibe: "Zu diesem Thema liegen mir aktuell keine verifizierbaren Quellen vor. Bitte prüfe direkt auf [Transfermarkt](https://www.transfermarkt.de) oder [Kicker](https://www.kicker.de)."

Antworte immer auf Deutsch und professionell.`;

const DEEP_RESEARCH_SYSTEM_PROMPT = `${FOOTBALL_SYSTEM_PROMPT}

DEEP RESEARCH MODUS AKTIVIERT:
Führe eine umfassende, mehrstufige Recherche durch:
1. Analysiere das Thema aus ALLEN Perspektiven – jede Aussage mit URL belegen
2. Suche aktuelle UND historische Daten – alle mit direkten Links
3. Vergleiche Quellen, weise auf Widersprüche hin (beide Quellen verlinken)
4. Strukturierte Antwort mit Kapiteln und Zwischenüberschriften
5. Bewerte die Verlässlichkeit jeder Information anhand der Quelle
6. Handlungsempfehlungen für Spieleragenturen
7. Abschluss mit vollständigem **📚 Quellenverzeichnis** aller verwendeten Links

Sei so ausführlich wie möglich. Länge ist erwünscht.`;

const SUGGESTION_PROMPTS = [
  "Was sind die aktuellen Transfergerüchte in der Bundesliga?",
  "Analysiere den Marktwert von Florian Wirtz",
  "Welche Vereine suchen aktuell einen Mittelstürmer?",
  "Wie hat sich der Transfermarkt in dieser Saison entwickelt?",
  "Was sind die Top-Talente in der 2. Bundesliga?",
  "Aktuelle Verletzungen und Ausfälle in der Bundesliga",
  "Welche Verträge laufen im Sommer 2026 aus?",
  "Analysiere die Transferstrategie von Bayern München",
  "Was verdienen Top-Stürmer in der Bundesliga?",
  "Recherchiere Spieler mit Erfahrung in Champions League und Bundesliga",
];

function randomPrompts(n = 4) {
  const shuffled = [...SUGGESTION_PROMPTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ── Local storage helpers ─────────────────────────────────────────────────────

function loadLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}
function saveLS(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ── Sidebar ───────────────────────────────────────────────────────────────────

function ConvItem({ conv, isActive, onSelect, onDelete, onRename, onMoveToFolder, folders }) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [showFolderMenu, setShowFolderMenu] = useState(false);

  return (
    <div
      onClick={() => editing === null && onSelect(conv)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowFolderMenu(false); }}
      className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer text-sm relative ${
        isActive ? "bg-slate-600 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white"
      }`}
    >
      <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400" />
      {editing !== null ? (
        <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
          <input
            autoFocus value={editing}
            onChange={e => setEditing(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { onRename(conv.id, editing); setEditing(null); } if (e.key === "Escape") setEditing(null); }}
            className="flex-1 bg-slate-700 text-white text-xs px-1.5 py-0.5 rounded border border-slate-500 outline-none min-w-0"
          />
          <button onClick={() => { onRename(conv.id, editing); setEditing(null); }} className="text-green-400"><Check className="w-3 h-3" /></button>
          <button onClick={e => { e.stopPropagation(); setEditing(null); }} className="text-slate-400"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <>
          <span className="flex-1 truncate text-xs">{conv.title}</span>
          {conv.mode === "deep_research" && <Microscope className="w-3 h-3 text-purple-400 shrink-0" />}
          {(hovered || isActive) && (
            <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
              <div className="relative">
                <button onClick={e => { e.stopPropagation(); setShowFolderMenu(p => !p); }} className="p-0.5 hover:text-white text-slate-400 rounded" title="In Ordner">
                  <Folder className="w-3 h-3" />
                </button>
                {showFolderMenu && (
                  <div className="absolute right-0 top-5 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 min-w-32 py-1">
                    <button onClick={e => { e.stopPropagation(); onMoveToFolder(conv.id, null); setShowFolderMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700">Kein Ordner</button>
                    {folders.map(f => (
                      <button key={f.id} onClick={e => { e.stopPropagation(); onMoveToFolder(conv.id, f.id); setShowFolderMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700">{f.name}</button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={e => { e.stopPropagation(); setEditing(conv.title); }} className="p-0.5 hover:text-white text-slate-400 rounded"><Pencil className="w-3 h-3" /></button>
              <button onClick={e => { e.stopPropagation(); onDelete(conv.id); }} className="p-0.5 hover:text-red-400 text-slate-400 rounded"><Trash2 className="w-3 h-3" /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, onRename, folders, assignments, onCreateFolder, onDeleteFolder, onMoveToFolder }) {
  const [search, setSearch]           = useState("");
  const [collapsed, setCollapsed]     = useState({});
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );
  const unfoldered = filtered.filter(c => !assignments[c.id]);

  const toggle = (key) => setCollapsed(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white w-64 shrink-0 border-r border-slate-700">
      {/* Header */}
      <div className="p-3 border-b border-slate-700 space-y-2">
        <div className="flex items-center gap-2 px-1 py-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm">AgenturGPT</span>
        </div>
        <Button onClick={onNew} className="w-full bg-slate-700 hover:bg-slate-600 text-white gap-2 justify-start" variant="outline">
          <Plus className="w-4 h-4" /> Neuer Chat
        </Button>
        <Button onClick={() => setShowNewFolder(p => !p)} size="sm" className="w-full bg-transparent hover:bg-slate-700 text-slate-400 hover:text-white gap-2 justify-start border-slate-700 text-xs" variant="outline">
          <FolderPlus className="w-3.5 h-3.5" /> Neuer Ordner
        </Button>
        {showNewFolder && (
          <div className="flex gap-1">
            <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && newFolderName.trim()) { onCreateFolder(newFolderName.trim()); setNewFolderName(""); setShowNewFolder(false); } if (e.key === "Escape") setShowNewFolder(false); }}
              placeholder="Ordnername..." className="flex-1 bg-slate-800 border border-slate-600 text-white text-xs px-2 py-1 rounded outline-none"
            />
            <button onClick={() => { if (newFolderName.trim()) { onCreateFolder(newFolderName.trim()); setNewFolderName(""); setShowNewFolder(false); } }} className="text-green-400 p-1"><Check className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chats durchsuchen..." className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs rounded-lg outline-none focus:border-slate-500" />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {/* Folders */}
        {folders.map(folder => {
          const folderConvs = filtered.filter(c => assignments[c.id] === folder.id);
          const isCollapsed = collapsed[folder.id];
          return (
            <div key={folder.id} className="mb-1">
              <div className="flex items-center gap-1 group/f">
                <button onClick={() => toggle(folder.id)} className="flex items-center gap-1.5 flex-1 px-2 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700">
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {isCollapsed ? <Folder className="w-3 h-3" /> : <FolderOpen className="w-3 h-3" />}
                  <span className="truncate">{folder.name}</span>
                  <span className="ml-auto text-slate-500 font-normal">{folderConvs.length}</span>
                </button>
                <button onClick={() => onDeleteFolder(folder.id)} className="opacity-0 group-hover/f:opacity-100 p-1 text-slate-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
              </div>
              {!isCollapsed && folderConvs.map(conv => (
                <div key={conv.id} className="ml-2">
                  <ConvItem conv={conv} isActive={conv.id === activeId} onSelect={onSelect} onDelete={onDelete} onRename={onRename} onMoveToFolder={onMoveToFolder} folders={folders} />
                </div>
              ))}
            </div>
          );
        })}

        {/* Ungrouped */}
        {unfoldered.length > 0 && (
          <div>
            {folders.length > 0 && (
              <button onClick={() => toggle("__unfoldered")} className="w-full flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-300 uppercase tracking-wider mb-1">
                {collapsed["__unfoldered"] ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Alle Chats
              </button>
            )}
            {!collapsed["__unfoldered"] && unfoldered.map(conv => (
              <ConvItem key={conv.id} conv={conv} isActive={conv.id === activeId} onSelect={onSelect} onDelete={onDelete} onRename={onRename} onMoveToFolder={onMoveToFolder} folders={folders} />
            ))}
          </div>
        )}

        {filtered.length === 0 && <div className="text-xs text-slate-500 px-2 py-4 text-center">Keine Chats gefunden</div>}
      </div>
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center shrink-0 mt-1">
          <Globe className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[82%] ${isUser ? "flex flex-col items-end" : ""}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-green-700 text-white"
            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
        }`}>
          {isUser ? (
            <p>{msg.content}</p>
          ) : (
            <ReactMarkdown
              className="prose prose-sm prose-slate dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              components={{
                a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-green-600 dark:text-green-400 hover:underline">{children}</a>,
                code: ({ inline, children }) => inline
                  ? <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs font-mono">{children}</code>
                  : <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto my-3 text-xs"><code>{children}</code></pre>
              }}
            >
              {msg.content}
            </ReactMarkdown>
          )}
        </div>
        {msg.isDeepResearch && (
          <div className="flex items-center gap-1 mt-1 text-xs text-purple-500 dark:text-purple-400">
            <Microscope className="w-3 h-3" /> Deep Research
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AgenturGPT() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState("");
  const [deepMode, setDeepMode]           = useState(false);
  const [loading, setLoading]             = useState(false);
  const [initializing, setInitializing]   = useState(true);
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [suggestions]                     = useState(() => randomPrompts(4));
  const [folders, setFolders]             = useState(() => loadLS(FOLDERS_KEY, []));
  const [assignments, setAssignments]     = useState(() => loadLS(ASSIGN_KEY, {}));
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load conversations from entity on mount
  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.AgenturGPTConversation.list("-created_date", 100);
        setConversations(list || []);
        if (list?.length) {
          const first = list[0];
          setActiveConv(first);
          setMessages(first.messages ? JSON.parse(first.messages) : []);
        }
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const saveConvMessages = useCallback(async (convId, msgs) => {
    await base44.entities.AgenturGPTConversation.update(convId, { messages: JSON.stringify(msgs) });
  }, []);

  const createNewConv = async () => {
    const title = `Chat ${new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
    const conv = await base44.entities.AgenturGPTConversation.create({ title, messages: "[]" });
    setConversations(prev => [conv, ...prev]);
    setActiveConv(conv);
    setMessages([]);
    inputRef.current?.focus();
  };

  const selectConv = (conv) => {
    setActiveConv(conv);
    setMessages(conv.messages ? JSON.parse(conv.messages) : []);
  };

  const deleteConv = async (id) => {
    await base44.entities.AgenturGPTConversation.delete(id);
    const remaining = conversations.filter(c => c.id !== id);
    setConversations(remaining);
    if (activeConv?.id === id) {
      if (remaining.length) { setActiveConv(remaining[0]); setMessages(remaining[0].messages ? JSON.parse(remaining[0].messages) : []); }
      else { setActiveConv(null); setMessages([]); }
    }
  };

  const renameConv = async (id, newTitle) => {
    await base44.entities.AgenturGPTConversation.update(id, { title: newTitle });
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
    if (activeConv?.id === id) setActiveConv(prev => ({ ...prev, title: newTitle }));
  };

  // Folders
  const createFolder = (name) => {
    const f = { id: Date.now().toString(), name };
    const updated = [...folders, f];
    setFolders(updated); saveLS(FOLDERS_KEY, updated);
  };
  const deleteFolder = (fid) => {
    const updated = folders.filter(f => f.id !== fid);
    setFolders(updated); saveLS(FOLDERS_KEY, updated);
    const newA = { ...assignments };
    Object.keys(newA).forEach(k => { if (newA[k] === fid) delete newA[k]; });
    setAssignments(newA); saveLS(ASSIGN_KEY, newA);
  };
  const moveToFolder = (convId, folderId) => {
    const newA = { ...assignments };
    if (folderId === null) delete newA[convId]; else newA[convId] = folderId;
    setAssignments(newA); saveLS(ASSIGN_KEY, newA);
  };

  // Send message
  const sendMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput("");

    // Ensure conversation exists
    let conv = activeConv;
    if (!conv) {
      const title = content.length > 45 ? content.substring(0, 45) + "…" : content;
      conv = await base44.entities.AgenturGPTConversation.create({ title, messages: "[]", mode: deepMode ? "deep_research" : "normal" });
      setConversations(prev => [conv, ...prev]);
      setActiveConv(conv);
    }

    const userMsg = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    // Auto-rename on first message
    if (messages.length === 0) {
      const title = content.length > 45 ? content.substring(0, 45) + "…" : content;
      renameConv(conv.id, title);
    }

    try {
      // Build conversation history for context
      const historyContext = messages.slice(-10).map(m => `${m.role === "user" ? "Nutzer" : "AgenturGPT"}: ${m.content}`).join("\n\n");

      const systemPrompt = deepMode ? DEEP_RESEARCH_SYSTEM_PROMPT : FOOTBALL_SYSTEM_PROMPT;

      const fullPrompt = `${systemPrompt}

${historyContext ? `BISHERIGER GESPRÄCHSVERLAUF:\n${historyContext}\n\n` : ""}AKTUELLE FRAGE DES NUTZERS:
${content}`;

      const model = deepMode ? "gemini_3_1_pro" : "gemini_3_flash";

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: true,
        model
      });

      const assistantMsg = {
        role: "assistant",
        content: typeof result === "string" ? result : result?.response || result?.text || JSON.stringify(result),
        isDeepResearch: deepMode
      };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      await saveConvMessages(conv.id, finalMessages);
    } catch (err) {
      const errMsg = { role: "assistant", content: `⚠️ Fehler: ${err.message}` };
      const finalMessages = [...newMessages, errMsg];
      setMessages(finalMessages);
      await saveConvMessages(conv.id, finalMessages);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {sidebarOpen && (
        <Sidebar
          conversations={conversations}
          activeId={activeConv?.id}
          onSelect={selectConv}
          onNew={createNewConv}
          onDelete={deleteConv}
          onRename={renameConv}
          folders={folders}
          assignments={assignments}
          onCreateFolder={createFolder}
          onDeleteFolder={deleteFolder}
          onMoveToFolder={moveToFolder}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(p => !p)} className="h-8 w-8 shrink-0">
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-900 dark:text-white text-sm truncate">
              {activeConv?.title || "AgenturGPT"}
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
              Transfermarkt · Kicker · Sky · Vereinswebsites
            </p>
          </div>
          {/* Deep Research Toggle */}
          <button
            onClick={() => setDeepMode(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              deepMode
                ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-purple-300 hover:text-purple-600"
            }`}
          >
            <Microscope className="w-3.5 h-3.5" />
            Deep Research
            {deepMode && <Badge className="bg-purple-600 text-white text-xs px-1 py-0 border-0 ml-1">AN</Badge>}
          </button>
        </div>

        {/* Deep Research Info Banner */}
        {deepMode && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800 px-4 py-2 flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300">
            <Microscope className="w-3.5 h-3.5 shrink-0" />
            <span><strong>Deep Research aktiv:</strong> Die KI führt eine tiefgehende, mehrstufige Analyse durch. Antworten sind ausführlicher und nutzen ein leistungsstärkeres Modell (mehr Credits).</span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            {initializing ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center space-y-8">
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">AgenturGPT</h2>
                  <p className="text-slate-500 text-sm max-w-md mx-auto">
                    Dein KI-Assistent für Fußball-Business. Ich recherchiere direkt auf Transfermarkt, Kicker, Sky, ESPN und offiziellen Vereinswebsites.
                  </p>
                </div>

                {/* Source Badges */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {["Transfermarkt", "Kicker", "Sky Sport", "Sport1", "UEFA", "Vereinswebsites", "Goal.com"].map(src => (
                    <span key={src} className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs rounded-full border border-green-200 dark:border-green-800 flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5" /> {src}
                    </span>
                  ))}
                </div>

                {/* Suggestions */}
                <div className="grid gap-2 sm:grid-cols-2 max-w-2xl mx-auto text-left">
                  {suggestions.map((p, i) => (
                    <button key={i} onClick={() => sendMessage(p)} className="flex items-start gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-green-400 hover:bg-green-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300 text-left group transition-all">
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-green-600 shrink-0 mt-0.5" />
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                      <span className="text-sm text-slate-500">
                        {deepMode ? "Führe tiefgehende Recherche durch…" : "Recherchiere aktuelle Daten…"}
                      </span>
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
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={deepMode ? "Frage für Deep Research stellen…" : "Frage stellen, z. B. 'Aktueller Marktwert von Jamal Musiala?'"}
                rows={1}
                disabled={loading || initializing}
                className="flex-1 resize-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-green-400 dark:focus:border-green-600 transition-colors disabled:opacity-50"
                style={{ minHeight: "44px", maxHeight: "140px" }}
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; }}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading || initializing}
                className={`px-4 shrink-0 ${deepMode ? "bg-purple-700 hover:bg-purple-600" : "bg-green-700 hover:bg-green-600"}`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-slate-400 text-center">
              AgenturGPT recherchiert in Echtzeit auf Transfermarkt, Kicker, Sky, UEFA und Vereinswebsites · Enter zum Senden
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}