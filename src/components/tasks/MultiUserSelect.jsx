import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, X } from "lucide-react";

export default function MultiUserSelect({ selectedUsers = [], users = [], onChange, disabled = false }) {
  const handleToggleUser = (userEmail) => {
    if (selectedUsers.includes(userEmail)) {
      onChange(selectedUsers.filter(email => email !== userEmail));
    } else {
      onChange([...selectedUsers, userEmail]);
    }
  };

  const handleRemoveUser = (userEmail) => {
    onChange(selectedUsers.filter(email => email !== userEmail));
  };

  const getSelectedUserNames = () => {
    return selectedUsers.map(email => {
      const user = users.find(u => u.email === email);
      return user ? user.full_name : email;
    });
  };

  return (
    <div className="space-y-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" disabled={disabled} className="w-full justify-start">
            <Users className="w-4 h-4 mr-2" />
            {selectedUsers.length === 0 
              ? "Personen zuweisen..." 
              : `${selectedUsers.length} Person(en) zugewiesen`
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700 mb-3">Personen auswählen</p>
            {users.map(user => (
              <div key={user.email} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded">
                <Checkbox
                  checked={selectedUsers.includes(user.email)}
                  onCheckedChange={() => handleToggleUser(user.email)}
                />
                <label className="flex-1 text-sm cursor-pointer">
                  {user.full_name}
                  <span className="text-slate-500 ml-2 text-xs">{user.email}</span>
                </label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {getSelectedUserNames().map((name, index) => (
            <Badge key={selectedUsers[index]} variant="secondary" className="pl-2 pr-1">
              {name}
              {!disabled && (
                <button
                  onClick={() => handleRemoveUser(selectedUsers[index])}
                  className="ml-1 hover:bg-slate-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}