import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Trash2, ChevronRight, User, Globe, Calendar, Loader2, BookOpen
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

function ComparisonDetailModal({ comparison, onClose }) {
  const profile = comparison.player_profile || {};
  const fitResults = comparison.fit_results || [];
  const replacement = comparison.club_replacement;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-lg">{comparison.reference_player}</h2>
            <p className="text-sm text-slate-500">{comparison.reference_club} · {new Date(comparison.analysis_date || comparison.created_date).toLocaleDateString('de-DE')}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-4 space-y-4">
          {/* Profile summary */}
          {profile.playing_style && (
            <div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Spielstil</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{profile.playing_style}</p>
            </div>
          )}
          {profile.tactical_role && (
            <div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Taktische Rolle</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{profile.tactical_role}</p>
            </div>
          )}
          {fitResults.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Top Ähnliche Spieler</h3>
              <div className="space-y-2">
                {fitResults.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div>
                      <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{p.name}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-xs ml-2">{p.club}</span>
                    </div>
                    <Badge className={p.fit_score >= 80 ? 'bg-green-100 text-green-800' : p.fit_score >= 60 ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}>
                      {p.fit_score}/100
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          {replacement?.club_replacement_analysis?.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Top Vereinsersatz</h3>
              <div className="space-y-2">
                {replacement.club_replacement_analysis.slice(0, 3).map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div>
                      <span className="font-medium text-slate-800 dark:text-blue-200 text-sm">{p.name}</span>
                      <span className="text-slate-500 dark:text-blue-400 text-xs ml-2">{p.club}</span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {p.replacement_score}/100
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SavedComparisons() {
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComparison, setSelectedComparison] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadComparisons();
  }, []);

  const loadComparisons = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getSavedComparisons', {});
      setComparisons(res.data?.comparisons || []);
    } catch (e) {
      toast({ title: 'Fehler beim Laden', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.SavedPlayerComparison.delete(id);
      setComparisons(prev => prev.filter(c => c.id !== id));
      toast({ title: 'Analyse gelöscht' });
    } catch (e) {
      toast({ title: 'Fehler beim Löschen', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/PlayerComparison">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" /> Gespeicherte Analysen
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{comparisons.length} gespeicherte Vergleichsanalysen</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : comparisons.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-600 dark:text-slate-400 mb-2">Noch keine Analysen gespeichert</h3>
              <p className="text-sm text-slate-400 mb-4">Führe eine Analyse durch und speichere sie für später.</p>
              <Link to="/PlayerComparison">
                <Button className="bg-blue-900 hover:bg-blue-800 text-white">Neue Analyse starten</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comparisons.map(c => {
              const fitResults = c.fit_results || [];
              const topPlayer = fitResults[0];
              return (
                <Card key={c.id} className="border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedComparison(c)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">{c.reference_player}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <User className="w-3 h-3" /> {c.reference_club}
                        </p>
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Analyse löschen?</AlertDialogTitle>
                              <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-red-600 hover:bg-red-700">Löschen</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                      <Calendar className="w-3 h-3" />
                      {new Date(c.analysis_date || c.created_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      <span className="mx-1">·</span>
                      <span>{fitResults.length} Spieler analysiert</span>
                      {c.club_replacement && <Badge className="text-xs bg-blue-100 text-blue-700 border-0">+ Vereinsersatz</Badge>}
                    </div>
                    {topPlayer && (
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
                        <span className="text-slate-500">Top Match: </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{topPlayer.name}</span>
                        <span className="text-slate-400 ml-1">({topPlayer.club})</span>
                        <Badge className="ml-2 text-xs bg-green-100 text-green-800 border-0">{topPlayer.fit_score}/100</Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-end mt-2 text-xs text-blue-600 dark:text-blue-400">
                      Details anzeigen <ChevronRight className="w-3 h-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {selectedComparison && (
        <ComparisonDetailModal
          comparison={selectedComparison}
          onClose={() => setSelectedComparison(null)}
        />
      )}
    </div>
  );
}