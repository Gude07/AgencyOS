import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, Trash2, MessageSquare, Pencil, Check, X, 
  FolderPlus, Folder, ChevronDown, ChevronRight, Search
} from "lucide-react";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { de } from "date-fns/locale";

function groupConversations(conversations) {
  const groups = {
    "Heute": [],
    "Gestern": [],
    "Diese Woche": [],
    "Dieser Monat": [],
    "Älter": [],
  };
  conversations.forEach(conv => {
    const date = new Date(conv.created_date || conv.id);
    if (isToday(date)) groups["Heute"].push(conv);
    else if (isYesterday(date)) groups["Gestern"].push(conv);
    else if (isThisWeek(date)) groups["Diese Woche"].push(conv);
    else if (isThisMonth(date)) groups["Dieser Monat"].push(conv);
    else groups["Älter"].push(conv);
  });
  return groups;
}

export default function ChatSidebar({ 
  conversations, 
  activeConversationId, 
  onSelect, 
  onNewChat, 
  onDelete, 
  onRename,
  isLoading 
}) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const filtered = conversations.filter(c =>
    (c.metadata?.name || "Untitled").toLowerCase().includes(search.toLowerCase())
  );

  const groups = groupConversations(filtered);

  const startEdit = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingName(conv.metadata?.name || "");
  };

  const confirmEdit = async (e) => {
    e?.stopPropagation();
    if (editingName.trim()) {
      await onRename(editingId, editingName.trim());
    }
    setEditingId(null);
  };

  const toggleGroup = (group) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white w-64 shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-slate-700">
        <Button 
          onClick={onNewChat}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white border-slate-600 gap-2 justify-start"
          variant="outline"
        >
          <Plus className="w-4 h-4" />
          Neuer Chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Chats durchsuchen..."
            className="pl-8 h-8 bg-slate-800 border-slate-700 text-white placeholder-slate-500 text-xs"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        {isLoading ? (
          <div className="text-xs text-slate-500 px-2 py-4 text-center">Laden...</div>
        ) : filtered.length === 0 ? (
          <div className="text-xs text-slate-500 px-2 py-4 text-center">Keine Chats gefunden</div>
        ) : (
          Object.entries(groups).map(([group, convs]) => {
            if (convs.length === 0) return null;
            const collapsed = collapsedGroups[group];
            return (
              <div key={group}>
                <button
                  onClick={() => toggleGroup(group)}
                  className="w-full flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-400 hover:text-slate-300 uppercase tracking-wider"
                >
                  {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {group}
                </button>
                {!collapsed && convs.map(conv => (
                  <ConvItem
                    key={conv.id}
                    conv={conv}
                    isActive={conv.id === activeConversationId}
                    editingId={editingId}
                    editingName={editingName}
                    setEditingName={setEditingName}
                    onSelect={onSelect}
                    onDelete={onDelete}
                    startEdit={startEdit}
                    confirmEdit={confirmEdit}
                    cancelEdit={() => setEditingId(null)}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ConvItem({ conv, isActive, editingId, editingName, setEditingName, onSelect, onDelete, startEdit, confirmEdit, cancelEdit }) {
  const [hovered, setHovered] = useState(false);
  const isEditing = editingId === conv.id;
  const name = conv.metadata?.name || "Untitled";

  return (
    <div
      onClick={() => !isEditing && onSelect(conv)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
        isActive 
          ? "bg-slate-600 text-white" 
          : "text-slate-300 hover:bg-slate-700 hover:text-white"
      }`}
    >
      <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400" />
      {isEditing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
          <input
            autoFocus
            value={editingName}
            onChange={e => setEditingName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") cancelEdit(); }}
            className="flex-1 bg-slate-700 text-white text-xs px-1.5 py-0.5 rounded border border-slate-500 outline-none min-w-0"
          />
          <button onClick={confirmEdit} className="text-green-400 hover:text-green-300"><Check className="w-3 h-3" /></button>
          <button onClick={e => { e.stopPropagation(); cancelEdit(); }} className="text-slate-400 hover:text-slate-300"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <>
          <span className="flex-1 truncate text-xs">{name}</span>
          {(hovered || isActive) && (
            <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
              <button onClick={e => startEdit(conv, e)} className="p-0.5 hover:text-white text-slate-400 rounded">
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(conv.id); }} className="p-0.5 hover:text-red-400 text-slate-400 rounded">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}