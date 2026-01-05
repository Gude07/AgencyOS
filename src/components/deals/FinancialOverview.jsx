import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Users,
  CheckCircle,
  Clock
} from "lucide-react";

export default function FinancialOverview({ deals = [] }) {
  const completedDeals = deals.filter(d => d.status === 'abgeschlossen');
  const pendingDeals = deals.filter(d => !['abgeschlossen', 'abgelehnt'].includes(d.status));

  // Berechnungen für abgeschlossene Deals
  const calculateCommission = (deal) => {
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

  const totalCommissionCompleted = completedDeals.reduce((sum, deal) => sum + calculateCommission(deal), 0);
  const totalCommissionPending = pendingDeals.reduce((sum, deal) => sum + calculateCommission(deal), 0);
  
  const receivedCommission = completedDeals
    .filter(d => d.agency_payment_received)
    .reduce((sum, deal) => sum + calculateCommission(deal), 0);
  
  const pendingPayment = totalCommissionCompleted - receivedCommission;

  // Monatliche/Jährliche Einnahmen aus laufenden Verträgen (jährliche Provisionen)
  const recurringAnnual = completedDeals
    .filter(d => d.agency_commission_type === 'jährlich')
    .reduce((sum, deal) => {
      // Prüfen ob Vertrag noch läuft
      if (deal.contract_end_date && new Date(deal.contract_end_date) > new Date()) {
        return sum + (deal.agency_commission || 0);
      }
      return sum;
    }, 0);

  const recurringMonthly = recurringAnnual / 12;

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M €`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K €`;
    }
    return `${value.toFixed(0)} €`;
  };

  const stats = [
    {
      title: "Gesamtprovision (Abgeschlossen)",
      value: formatCurrency(totalCommissionCompleted),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Erwartete Provision (Laufend)",
      value: formatCurrency(totalCommissionPending),
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Bereits erhalten",
      value: formatCurrency(receivedCommission),
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Ausstehende Zahlung",
      value: formatCurrency(pendingPayment),
      icon: Calendar,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hauptstatistiken */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border-slate-200 bg-white">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">{stat.title}</p>
                  <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Wiederkehrende Einnahmen */}
      {recurringAnnual > 0 && (
        <Card className="border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Wiederkehrende Einnahmen
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-600">Monatlich</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(recurringMonthly)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Jährlich</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(recurringAnnual)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deal-Übersicht Tabelle */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-lg">Provisionsübersicht nach Spieler</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold text-slate-600">Spieler</th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-600">Verein</th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-600">Provision</th>
                  <th className="text-center p-3 text-xs font-semibold text-slate-600">Art</th>
                  <th className="text-center p-3 text-xs font-semibold text-slate-600">Status</th>
                  <th className="text-center p-3 text-xs font-semibold text-slate-600">Erhalten</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Noch keine Deals vorhanden
                    </td>
                  </tr>
                ) : (
                  deals.map((deal) => {
                    const commission = calculateCommission(deal);
                    return (
                      <tr key={deal.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <span className="font-medium text-slate-900">{deal.player_name}</span>
                        </td>
                        <td className="p-3 text-sm text-slate-600">{deal.receiving_club}</td>
                        <td className="p-3 text-right">
                          <span className="font-semibold text-slate-900">{formatCurrency(commission)}</span>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="text-xs">
                            {deal.agency_commission_type === 'einmalig' && 'Einmalig'}
                            {deal.agency_commission_type === 'jährlich' && 'Jährlich'}
                            {deal.agency_commission_type === 'prozent_gehalt' && `${deal.agency_commission_percent}% Gehalt`}
                            {deal.agency_commission_type === 'prozent_ablöse' && `${deal.agency_commission_percent}% Ablöse`}
                            {!deal.agency_commission_type && 'Einmalig'}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge 
                            variant="secondary"
                            className={deal.status === 'abgeschlossen' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {deal.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          {deal.status === 'abgeschlossen' && (
                            deal.agency_payment_received ? (
                              <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                            ) : (
                              <Clock className="w-5 h-5 text-orange-500 mx-auto" />
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {deals.length > 0 && (
                <tfoot className="bg-slate-100">
                  <tr>
                    <td colSpan={2} className="p-3 font-semibold text-slate-700">Gesamt</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {formatCurrency(totalCommissionCompleted + totalCommissionPending)}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}