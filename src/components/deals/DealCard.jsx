import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Building2, 
  Calendar, 
  FileText, 
  TrendingUp,
  CheckCircle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { motion } from "framer-motion";

const statusColors = {
  interesse: "bg-slate-100 text-slate-800 border-slate-200",
  verhandlung: "bg-blue-100 text-blue-800 border-blue-200",
  angebot_erhalten: "bg-purple-100 text-purple-800 border-purple-200",
  medizincheck: "bg-cyan-100 text-cyan-800 border-cyan-200",
  vertragsunterzeichnung: "bg-indigo-100 text-indigo-800 border-indigo-200",
  abgeschlossen: "bg-green-100 text-green-800 border-green-200",
  abgelehnt: "bg-red-100 text-red-800 border-red-200",
  pausiert: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const priorityColors = {
  niedrig: "bg-emerald-100 text-emerald-800 border-emerald-200",
  mittel: "bg-yellow-100 text-yellow-800 border-yellow-200",
  hoch: "bg-orange-100 text-orange-800 border-orange-200",
  kritisch: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels = {
  interesse: "Interesse",
  verhandlung: "Verhandlung",
  angebot_erhalten: "Angebot erhalten",
  medizincheck: "Medizincheck",
  vertragsunterzeichnung: "Vertragsunterzeichnung",
  abgeschlossen: "Abgeschlossen",
  abgelehnt: "Abgelehnt",
  pausiert: "Pausiert",
};

export default function DealCard({ deal, onClick }) {
  const formatCurrency = (value) => {
    if (!value) return null;
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M €`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K €`;
    }
    return `${value.toLocaleString('de-DE')} €`;
  };

  const calculateCommission = () => {
    if (!deal.agency_commission) return 0;
    
    if (deal.agency_commission_type === 'jährlich') {
      return deal.agency_commission * (deal.contract_length || 1);
    } else if (deal.agency_commission_type === 'prozent_gehalt' && deal.agency_commission_percent) {
      const totalSalary = (deal.annual_salary || 0) * (deal.contract_length || 1);
      return totalSalary * (deal.agency_commission_percent / 100);
    } else if (deal.agency_commission_type === 'prozent_ablöse' && deal.agency_commission_percent) {
      return (deal.transfer_fee || 0) * (deal.agency_commission_percent / 100);
    }
    return deal.agency_commission || 0;
  };

  const commission = calculateCommission();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card 
        className="border-slate-200 bg-white hover:shadow-md hover:border-blue-200 cursor-pointer transition-all"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-slate-900 truncate">{deal.player_name}</h3>
                <Badge variant="secondary" className={priorityColors[deal.priority] + " border text-xs"}>
                  {deal.priority}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {deal.receiving_club}
                </span>
                {deal.transfer_window && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {deal.transfer_window}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="secondary" className={statusColors[deal.status] + " border"}>
                  {statusLabels[deal.status]}
                </Badge>
                {deal.transfer_type && (
                  <Badge variant="outline">
                    {deal.transfer_type === 'transfer' && 'Transfer'}
                    {deal.transfer_type === 'leihe' && 'Leihe'}
                    {deal.transfer_type === 'ablösefrei' && 'Ablösefrei'}
                  </Badge>
                )}
                {deal.documents && deal.documents.length > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {deal.documents.length}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {deal.transfer_fee && (
                  <span className="text-slate-600">
                    Ablöse: <span className="font-medium text-slate-900">{formatCurrency(deal.transfer_fee)}</span>
                  </span>
                )}
                {deal.annual_salary && (
                  <span className="text-slate-600">
                    Gehalt: <span className="font-medium text-slate-900">{formatCurrency(deal.annual_salary)}/Jahr</span>
                  </span>
                )}
                {commission > 0 && (
                  <span className="text-green-700 font-medium flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Provision: {formatCurrency(commission)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {deal.probability && (
                <div className="text-right">
                  <span className="text-xs text-slate-500">Wahrscheinlichkeit</span>
                  <p className="text-lg font-bold text-slate-900">{deal.probability}%</p>
                </div>
              )}
              {deal.status === 'abgeschlossen' && (
                deal.agency_payment_received ? (
                  <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Bezahlt
                  </Badge>
                ) : (
                  <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Ausstehend
                  </Badge>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}