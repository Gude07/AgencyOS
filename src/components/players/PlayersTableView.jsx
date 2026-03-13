import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format, differenceInYears } from "date-fns";

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  return differenceInYears(new Date(), new Date(dateOfBirth));
};

const formatCurrency = (value) => {
  if (!value) return "-";
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M €`;
  }
  return `${(value / 1000).toFixed(0)}k €`;
};

export default function PlayersTableView({ players }) {
  const navigate = useNavigate();
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        direction = null;
      }
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    }
    if (sortConfig.direction === "asc") {
      return <ArrowUp className="w-4 h-4 text-blue-600" />;
    }
    if (sortConfig.direction === "desc") {
      return <ArrowDown className="w-4 h-4 text-blue-600" />;
    }
    return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
  };

  const sortedPlayers = React.useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return players;
    }

    return [...players].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case "name":
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
          break;
        case "age":
          aValue = calculateAge(a.date_of_birth) || 0;
          bValue = calculateAge(b.date_of_birth) || 0;
          break;
        case "club":
          aValue = a.current_club?.toLowerCase() || "";
          bValue = b.current_club?.toLowerCase() || "";
          break;
        case "contract":
          aValue = a.contract_until ? new Date(a.contract_until).getTime() : 0;
          bValue = b.contract_until ? new Date(b.contract_until).getTime() : 0;
          break;
        case "market_value":
          aValue = a.market_value || 0;
          bValue = b.market_value || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [players, sortConfig]);

  const handleRowClick = (player) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('scrollY', window.scrollY.toString());
    navigate(
      createPageUrl("PlayerDetail") +
        "?id=" +
        player.id +
        "&back=" +
        encodeURIComponent(window.location.pathname + "?" + urlParams.toString())
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead 
                className="cursor-pointer select-none font-semibold"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-2">
                  Name
                  {getSortIcon("name")}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none font-semibold"
                onClick={() => handleSort("age")}
              >
                <div className="flex items-center gap-2">
                  Alter
                  {getSortIcon("age")}
                </div>
              </TableHead>
              <TableHead>Position</TableHead>
              <TableHead 
                className="cursor-pointer select-none font-semibold"
                onClick={() => handleSort("club")}
              >
                <div className="flex items-center gap-2">
                  Verein
                  {getSortIcon("club")}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none font-semibold"
                onClick={() => handleSort("contract")}
              >
                <div className="flex items-center gap-2">
                  Vertrag bis
                  {getSortIcon("contract")}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none font-semibold text-right"
                onClick={() => handleSort("market_value")}
              >
                <div className="flex items-center justify-end gap-2">
                  Marktwert
                  {getSortIcon("market_value")}
                </div>
              </TableHead>
              <TableHead>Kategorie</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPlayers.map((player) => (
              <TableRow
                key={player.id}
                className="cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => handleRowClick(player)}
              >
                <TableCell className="font-medium text-slate-900">
                  {player.name}
                </TableCell>
                <TableCell className="text-slate-700">
                  {calculateAge(player.date_of_birth) || "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {player.position}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-700">
                  {player.current_club || "-"}
                </TableCell>
                <TableCell className="text-slate-700">
                  {player.contract_until
                    ? format(new Date(player.contract_until), "dd.MM.yyyy")
                    : "-"}
                </TableCell>
                <TableCell className="text-right font-semibold text-slate-900">
                  {formatCurrency(player.market_value)}
                </TableCell>
                <TableCell>
                  {player.category && (
                    <Badge variant="secondary" className="text-xs">
                      {player.category}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {sortedPlayers.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          Keine Spieler gefunden
        </div>
      )}
    </div>
  );
}