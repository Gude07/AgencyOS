import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Zap, Target, TrendingUp, User, Trophy } from "lucide-react";

export function FitScoreBar({ score }) {
  const bg = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-blue-500" : score >= 40 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
        <div className={`${bg} h-2 rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 w-10 text-right">{score}</span>
    </div>
  );
}

export function ProfileSection({ profile }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 bg-slate-50 dark:bg-slate-800">
          <CardContent className="p-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" /> Spielstil
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">{profile.playing_style}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-slate-50 dark:bg-slate-800">
          <CardContent className="p-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" /> Taktische Rolle
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">{profile.tactical_role}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-slate-50 dark:bg-slate-800">
          <CardContent className="p-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Physisches Profil</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">{profile.physical_profile}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-slate-50 dark:bg-slate-800">
          <CardContent className="p-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Technisches Profil</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">{profile.technical_profile}</p>
          </CardContent>
        </Card>
      </div>
      <Card className="border-0 bg-slate-50 dark:bg-slate-800">
        <CardContent className="p-4">
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Taktisches Profil</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">{profile.tactical_profile}</p>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" /> Stärken
          </h4>
          <div className="flex flex-wrap gap-2">
            {(profile.strengths || []).map((s, i) => (
              <Badge key={i} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0">{s}</Badge>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400" /> Schwächen
          </h4>
          <div className="flex flex-wrap gap-2">
            {(profile.weaknesses || []).map((w, i) => (
              <Badge key={i} className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-0">{w}</Badge>
            ))}
          </div>
        </div>
      </div>
      <div>
        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Key Attributes</h4>
        <div className="flex flex-wrap gap-2">
          {(profile.key_attributes || []).map((a, i) => (
            <Badge key={i} variant="outline" className="text-blue-700 border-blue-300 dark:text-blue-300">{a}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SimilarPlayerCard({ player, fitResult }) {
  return (
    <Card className="border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">{player.name || fitResult?.name}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {player.club || fitResult?.club} · {player.league || ''} {player.age ? `· ${player.age} J.` : ''}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">{player.position || fitResult?.position}</Badge>
        </div>
        {fitResult && (
          <div className="mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Fit Score</span>
            <FitScoreBar score={fitResult.fit_score} />
          </div>
        )}
        {player.estimated_market_value && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            💰 Marktwert: <span className="font-medium">{player.estimated_market_value}</span>
          </p>
        )}
        {fitResult?.comparison_summary && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{fitResult.comparison_summary}</p>
        )}
        {fitResult?.strength_overlap?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {fitResult.strength_overlap.map((s, i) => (
              <span key={i} className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        )}
        {fitResult?.key_difference?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {fitResult.key_difference.map((d, i) => (
              <span key={i} className="text-xs bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full">{d}</span>
            ))}
          </div>
        )}
        {player.similarity_reason && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">{player.similarity_reason}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ReplacementCard({ player, rank }) {
  return (
    <Card className="border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${rank === 1 ? 'bg-yellow-400 text-yellow-900' : rank === 2 ? 'bg-slate-300 text-slate-700' : rank === 3 ? 'bg-orange-300 text-orange-800' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">{player.name}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">{player.club} · {player.position}</p>
              </div>
            </div>
            <div className="mb-2">
              <span className="text-xs font-medium text-slate-500 block mb-1">Replacement Score</span>
              <FitScoreBar score={player.replacement_score} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{player.tactical_fit_explanation}</p>
            {player.strength_for_club_system?.length > 0 && (
              <div className="mb-2">
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">Stärken für den Verein:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {player.strength_for_club_system.map((s, i) => (
                    <span key={i} className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {player.potential_risk?.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-red-500">Risiken:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {player.potential_risk.map((r, i) => (
                    <span key={i} className="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 px-2 py-0.5 rounded-full">{r}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FullComparisonView({ comparison }) {
  const profile = comparison.player_profile || {};
  const similarPlayers = comparison.similar_players || [];
  const fitResults = comparison.fit_results || [];
  const clubReplacement = comparison.club_replacement;
  const referenceClub = comparison.reference_club;

  const mergedPlayers = similarPlayers.map(sp => ({
    ...sp,
    fitResult: fitResults.find(fr =>
      fr.name?.toLowerCase().includes(sp.name?.toLowerCase().split(' ')[0]) ||
      sp.name?.toLowerCase().includes(fr.name?.toLowerCase().split(' ')[0])
    )
  })).sort((a, b) => (b.fitResult?.fit_score || 0) - (a.fitResult?.fit_score || 0));

  return (
    <Tabs defaultValue="profile">
      <TabsList className="grid w-full" style={{ gridTemplateColumns: clubReplacement ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }}>
        <TabsTrigger value="profile" className="gap-1 text-xs md:text-sm">
          <User className="w-3 h-3" /> Spielerprofil
        </TabsTrigger>
        <TabsTrigger value="similar" className="gap-1 text-xs md:text-sm">
          <TrendingUp className="w-3 h-3" /> Ähnliche Spieler ({mergedPlayers.length})
        </TabsTrigger>
        {clubReplacement && (
          <TabsTrigger value="replacement" className="gap-1 text-xs md:text-sm">
            <Trophy className="w-3 h-3" /> Vereinsersatz
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="profile" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {profile.player_name || comparison.reference_player}
              <Badge className="ml-2" variant="outline">{profile.position}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileSection profile={profile} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="similar" className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mergedPlayers.map((player, i) => (
            <SimilarPlayerCard key={i} player={player} fitResult={player.fitResult} />
          ))}
          {fitResults.filter(fr => !mergedPlayers.find(p => p.name?.toLowerCase().includes(fr.name?.toLowerCase().split(' ')[0]))).map((fr, i) => (
            <SimilarPlayerCard key={`fr-${i}`} player={fr} fitResult={fr} />
          ))}
        </div>
      </TabsContent>

      {clubReplacement && (
        <TabsContent value="replacement" className="mt-4">
          {clubReplacement.club_context && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Vereinskontext: {referenceClub}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {clubReplacement.club_context.formation && (
                  <div><span className="text-blue-600 dark:text-blue-400 font-medium block">Formation</span>{clubReplacement.club_context.formation}</div>
                )}
                {clubReplacement.club_context.playing_style && (
                  <div><span className="text-blue-600 dark:text-blue-400 font-medium block">Spielstil</span>{clubReplacement.club_context.playing_style}</div>
                )}
                {clubReplacement.club_context.league && (
                  <div><span className="text-blue-600 dark:text-blue-400 font-medium block">Liga</span>{clubReplacement.club_context.league}</div>
                )}
                {clubReplacement.club_context.tactical_philosophy && (
                  <div><span className="text-blue-600 dark:text-blue-400 font-medium block">Philosophie</span>{clubReplacement.club_context.tactical_philosophy}</div>
                )}
              </div>
            </div>
          )}
          <div className="space-y-3">
            {(clubReplacement.club_replacement_analysis || []).map((p, i) => (
              <ReplacementCard key={i} player={p} rank={i + 1} />
            ))}
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
}