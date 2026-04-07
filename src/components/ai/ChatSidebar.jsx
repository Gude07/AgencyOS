import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, Trash2, MessageSquare, Pencil, Check, X, 
  FolderPlus, Folder, FolderOpen, ChevronDown, ChevronRight, Search
} from "lucide-react";
import { isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";

const FOLDERS_KEY = "aiChat_folders";

function loadFolders() {
  try { return JSON.parse(localStorage.getItem(FOLDERS_KEY) || "[]"); } 
  catch { return []; }
}
function saveFolders(folders) {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

function groupConversations(conversations) {
  const groups = { "Heute": [], "Gestern": [], "Diese Woche": [], "Dieser Monat": [], "Älter": [] };
  conversations.forEach(conv => {
    const date = new Date(conv.created_date || Date.now());
    if (isToday(date)) groups["Heute"].push(conv);
    else if (isYesterday(date)) groups["Gestern"].push(conv);
    else if (isThisWeek(date)) groups["Diese Woche"].push(conv);
    else if (isThisMonth(date)) groups["Dieser Monat"].push(conv);
    else groups["Älter"].push(conv);
  });
  return groups;
}

function ConvItem({ conv, isActive, onSelect, onDelete, onRename, onMoveToFolder, folders }) {
  const [hovered, setHovered] = useState(false);
  const [editingName, setEditingName] = useState(null);
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const name = conv.metadata?.name || "Untitled";

  const startEdit = (e) => { e.stopPropagation(); setEditingName(name); };
  const confirmEdit = (e) => { e?.stopPropagation(); if (editingName?.trim()) onRename(conv.id, editingName.trim()); setEditingName(null); };

  return (
    <div
      onClick={() => editingName === null && onSelect(conv)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowFolderMenu(false); }}
      className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors text-sm relative ${
        isActive ? "bg-slate-600 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white"
      }`}
    >
      <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400" />
      {editingName !== null ? (
        <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
          <input
            autoFocus
            value={editingName}
            onChange={e => setEditingName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") setEditingName(null); }}
            className="flex-1 bg-slate-700 text-white text-xs px-1.5 py-0.5 rounded border border-slate-500 outline-none min-w-0"
          />
          <button onClick={confirmEdit} className="text-green-400 hover:text-green-300"><Check className="w-3 h-3" /></button>
          <button onClick={e => { e.stopPropagation(); setEditingName(null); }} className="text-slate-400 hover:text-slate-300"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <>
          <span className="flex-1 truncate text-xs">{name}</span>
          {(hovered || isActive) && (
            <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
              <div className="relative">
                <button 
                  onClick={e => { e.stopPropagation(); setShowFolderMenu(p => !p); }} 
                  className="p-0.5 hover:text-white text-slate-400 rounded" 
                  title="In Ordner verschieben"
                >
                  <Folder className="w-3 h-3" />
                </button>
                {showFolderMenu && (
                  <div className="absolute right-0 top-5 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 min-w-32 py-1">
                    <button
                      onClick={e => { e.stopPropagation(); onMoveToFolder(conv.id, null); setShowFolderMenu(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                    >
                      Kein Ordner
                    </button>
                    {folders.map(f => (
                      <button
                        key={f.id}
                        onClick={e => { e.stopPropagation(); onMoveToFolder(conv.id, f.id); setShowFolderMenu(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={startEdit} className="p-0.5 hover:text-white text-slate-400 rounded">
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

export default function ChatSidebar({ conversations, activeConversationId, onSelect, onNewChat, onDelete, onRename, isLoading }) {
  const [search, setSearch] = useState("");
  const [folders, setFolders] = useState(loadFolders);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState({});
  const [folderAssignments, setFolderAssignments] = useState(() => {
    try { return JSON.parse(localStorage.getItem("aiChat_folderAssignments") || "{}"); } catch { return {}; }
  });

  const saveFolderAssignments = (assignments) => {
    localStorage.setItem("aiChat_folderAssignments", JSON.stringify(assignments));
    setFolderAssignments(assignments);
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder = { id: Date.now().toString(), name: newFolderName.trim() };
    const updated = [...folders, newFolder];
    setFolders(updated);
    saveFolders(updated);
    setNewFolderName("");
    setShowNewFolder(false);
  };

  const deleteFolder = (folderId) => {
    const updated = folders.filter(f => f.id !== folderId);
    setFolders(updated);
    saveFolders(updated);
    // Remove assignments for this folder
    const newAssignments = { ...folderAssignments };
    Object.keys(newAssignments).forEach(k => { if (newAssignments[k] === folderId) delete newAssignments[k]; });
    saveFolderAssignments(newAssignments);
  };

  const moveToFolder = (convId, folderId) => {
    const updated = { ...folderAssignments };
    if (folderId === null) delete updated[convId];
    else updated[convId] = folderId;
    saveFolderAssignments(updated);
  };

  const filtered = conversations.filter(c =>
    (c.metadata?.name || "Untitled").toLowerCase().includes(search.toLowerCase())
  );

  const unfoldered = filtered.filter(c => !folderAssignments[c.id]);
  const groups = groupConversations(unfoldered);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white w-64 shrink-0 border-r border-slate-700">
      {/* Header */}
      <div className="p-3 border-b border-slate-700 space-y-2">
        <Button onClick={onNewChat} className="w-full bg-slate-700 hover:bg-slate-600 text-white gap-2 justify-start" variant="outline">
          <Plus className="w-4 h-4" /> Neuer Chat
        </Button>
        <Button onClick={() => setShowNewFolder(p => !p)} className="w-full bg-transparent hover:bg-slate-700 text-slate-400 hover:text-white gap-2 justify-start border-slate-700 text-xs" variant="outline" size="sm">
          <FolderPlus className="w-3.5 h-3.5" /> Neuer Ordner
        </Button>
        {showNewFolder && (
          <div className="flex gap-1">
            <input
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
              placeholder="Ordnername..."
              className="flex-1 bg-slate-800 border border-slate-600 text-white text-xs px-2 py-1 rounded outline-none"
            />
            <button onClick={createFolder} className="text-green-400 hover:text-green-300 p-1"><Check className="w-4 h-4" /></button>
            <button onClick={() => setShowNewFolder(false)} className="text-slate-400 hover:text-slate-300 p-1"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chats durchsuchen..." className="pl-8 h-8 bg-slate-800 border-slate-700 text-white placeholder-slate-500 text-xs" />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {isLoading ? (
          <div className="text-xs text-slate-500 px-2 py-4 text-center">Laden...</div>
        ) : (
          <>
            {/* Folders */}
            {folders.map(folder => {
              const folderConvs = filtered.filter(c => folderAssignments[c.id] === folder.id);
              const collapsed = collapsedFolders[folder.id];
              return (
                <div key={folder.id} className="mb-1">
                  <div className="flex items-center gap-1 group/folder">
                    <button
                      onClick={() => setCollapsedFolders(p => ({ ...p, [folder.id]: !p[folder.id] }))}
                      className="flex items-center gap-1.5 flex-1 px-2 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {collapsed ? <Folder className="w-3 h-3" /> : <FolderOpen className="w-3 h-3" />}
                      <span className="truncate">{folder.name}</span>
                      <span className="ml-auto text-slate-500 font-normal">{folderConvs.length}</span>
                    </button>
                    <button onClick={() => deleteFolder(folder.id)} className="opacity-0 group-hover/folder:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {!collapsed && folderConvs.map(conv => (
                    <div key={conv.id} className="ml-2">
                      <ConvItem conv={conv} isActive={conv.id === activeConversationId} onSelect={onSelect} onDelete={onDelete} onRename={onRename} onMoveToFolder={moveToFolder} folders={folders} />
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Ungrouped by date */}
            {Object.entries(groups).map(([group, convs]) => {
              if (convs.length === 0) return null;
              const collapsed = collapsedFolders[`__group_${group}`];
              return (
                <div key={group} className="mb-1">
                  <button
                    onClick={() => setCollapsedFolders(p => ({ ...p, [`__group_${group}`]: !p[`__group_${group}`] }))}
                    className="w-full flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-300 uppercase tracking-wider"
                  >
                    {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {group}
                  </button>
                  {!collapsed && convs.map(conv => (
                    <ConvItem key={conv.id} conv={conv} isActive={conv.id === activeConversationId} onSelect={onSelect} onDelete={onDelete} onRename={onRename} onMoveToFolder={moveToFolder} folders={folders} />
                  ))}
                </div>
              );
            })}

            {filtered.length === 0 && <div className="text-xs text-slate-500 px-2 py-4 text-center">Keine Chats gefunden</div>}
          </>
        )}
      </div>
    </div>
  );
}