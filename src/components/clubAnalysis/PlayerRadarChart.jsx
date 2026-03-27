import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

const LABELS = {
  position: "Position",
  style: "Spielstil",
  physical: "Physisch",
  technical: "Technisch",
  mental: "Mental",
  culture: "Kultur"
};

export default function PlayerRadarChart({ radarScores, playerName }) {
  if (!radarScores) return null;

  const data = Object.entries(LABELS).map(([key, label]) => ({
    subject: label,
    score: radarScores[key] || 0,
    fullMark: 10
  }));

  return (
    <div className="w-full">
      <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-1">{playerName}</p>
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
          <Radar name={playerName} dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}