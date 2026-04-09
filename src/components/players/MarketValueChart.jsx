import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";

function formatValue(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)} Mio €`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)} Tsd €`;
  return `${value} €`;
}

export default function MarketValueChart({ playerId, currentMarketValue }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["playerMarketValueHistory", playerId],
    queryFn: () => base44.entities.PlayerMarketValueHistory.filter({ player_id: playerId }, "date", 100),
    enabled: !!playerId,
  });

  // Build chart data: history entries + current value
  const chartData = React.useMemo(() => {
    const entries = history.map(h => ({
      date: new Date(h.date).getTime(),
      value: h.market_value,
      label: format(new Date(h.date), "dd.MM.yyyy", { locale: de })
    }));

    // Sort by date ascending
    entries.sort((a, b) => a.date - b.date);

    // If no history but we have a current value, show just one point
    if (entries.length === 0 && currentMarketValue) {
      return [{
        date: Date.now(),
        value: currentMarketValue,
        label: format(new Date(), "dd.MM.yyyy", { locale: de })
      }];
    }

    return entries;
  }, [history, currentMarketValue]);

  // Calculate trend
  const trend = React.useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    const diff = last - first;
    const pct = first > 0 ? ((diff / first) * 100).toFixed(1) : 0;
    return { diff, pct, direction: diff > 0 ? "up" : diff < 0 ? "down" : "neutral" };
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-slate-400">
        Noch keine Marktwertdaten vorhanden.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {trend && (
        <div className="flex items-center gap-2 text-sm">
          {trend.direction === "up" && (
            <span className="flex items-center gap-1 text-green-600">
              <TrendingUp className="w-4 h-4" />
              +{formatValue(trend.diff)} ({trend.pct}%)
            </span>
          )}
          {trend.direction === "down" && (
            <span className="flex items-center gap-1 text-red-500">
              <TrendingDown className="w-4 h-4" />
              {formatValue(trend.diff)} ({trend.pct}%)
            </span>
          )}
          {trend.direction === "neutral" && (
            <span className="flex items-center gap-1 text-slate-500">
              <Minus className="w-4 h-4" />
              Unverändert
            </span>
          )}
          <span className="text-slate-400">seit {chartData[0].label}</span>
        </div>
      )}

      {chartData.length > 1 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickFormatter={formatValue}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip
              formatter={(value) => [formatValue(value), "Marktwert"]}
              labelStyle={{ color: "#475569", fontWeight: 600 }}
              contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#1e40af"
              strokeWidth={2}
              dot={{ r: 4, fill: "#1e40af" }}
              activeDot={{ r: 6, fill: "#1e40af" }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-4 text-sm text-slate-400">
          Aktueller Marktwert: <span className="font-semibold text-slate-700">{formatValue(chartData[0].value)}</span>
          <br />
          <span className="text-xs">Der Graph wird nach der nächsten Änderung angezeigt.</span>
        </div>
      )}
    </div>
  );
}