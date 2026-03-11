import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Building2, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function AgencySwitcher() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => base44.entities.Agency.list(),
  });

  const switchAgencyMutation = useMutation({
    mutationFn: (agencyId) => base44.auth.updateMe({ agency_id: agencyId }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      window.location.reload();
    },
  });

  const currentAgency = agencies.find(a => a.id === user?.agency_id);

  if (agencies.length <= 1) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="truncate">{currentAgency?.name || "Agentur wählen"}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2">
        <div className="space-y-1">
          {agencies.map((agency) => (
            <button
              key={agency.id}
              onClick={() => {
                switchAgencyMutation.mutate(agency.id);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-100 transition-colors ${
                user?.agency_id === agency.id ? 'bg-slate-50' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {agency.logo_url ? (
                  <img src={agency.logo_url} alt={agency.name} className="w-6 h-6 rounded object-cover" />
                ) : (
                  <Building2 className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-sm font-medium">{agency.name}</span>
              </div>
              {user?.agency_id === agency.id && (
                <Check className="w-4 h-4 text-blue-600" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}