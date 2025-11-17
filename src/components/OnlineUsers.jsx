import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export default function OnlineUsers() {
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 30000, // Aktualisiere alle 30 Sekunden
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Aktualisiere last_seen alle 2 Minuten
  useEffect(() => {
    const updateLastSeen = async () => {
      if (currentUser) {
        try {
          await base44.auth.updateMe({ 
            last_seen: new Date().toISOString() 
          });
          queryClient.invalidateQueries({ queryKey: ['users'] });
        } catch (error) {
          console.error('Fehler beim Aktualisieren von last_seen:', error);
        }
      }
    };

    updateLastSeen(); // Sofort aktualisieren
    const interval = setInterval(updateLastSeen, 120000); // Alle 2 Minuten

    return () => clearInterval(interval);
  }, [currentUser, queryClient]);

  // Benutzer als online betrachten, wenn last_seen innerhalb der letzten 5 Minuten
  const onlineUsers = users.filter(user => {
    if (!user.last_seen) return false;
    const lastSeen = new Date(user.last_seen);
    const now = new Date();
    const diffMinutes = (now - lastSeen) / 1000 / 60;
    return diffMinutes < 5;
  });

  if (onlineUsers.length === 0) return null;

  return (
    <div className="px-4 py-3 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Online ({onlineUsers.length})
        </span>
      </div>
      <div className="space-y-1">
        {onlineUsers.map(user => (
          <div key={user.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50">
            <div className="relative">
              <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-slate-700 font-semibold text-xs">
                  {user.full_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-900 truncate">
                {user.full_name}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}