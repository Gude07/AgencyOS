import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, User, Mail, Shield, Trash2, Bell } from "lucide-react";
import OutlookConnectionCard from "@/components/settings/OutlookConnectionCard";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AccountSettings() {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      // Delete user account
      await base44.entities.User.delete(currentUser.id);
      // Logout
      await base44.auth.logout();
    },
  });

  const handleDeleteAccount = () => {
    if (deleteConfirmation === currentUser?.email) {
      deleteAccountMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kontoeinstellungen</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Verwalten Sie Ihre Kontoinformationen
            </p>
          </div>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-900 dark:text-blue-400" />
              <CardTitle className="text-slate-900 dark:text-white">Profil</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Name</Label>
              <Input
                value={currentUser?.full_name || ""}
                disabled
                className="mt-1.5 bg-slate-50 dark:bg-slate-800 dark:text-slate-300"
              />
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">E-Mail</Label>
              <Input
                value={currentUser?.email || ""}
                disabled
                className="mt-1.5 bg-slate-50 dark:bg-slate-800 dark:text-slate-300"
              />
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Rolle</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                <span className="text-slate-900 dark:text-white font-medium capitalize">
                  {currentUser?.role || "user"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <OutlookConnectionCard />

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-900 dark:text-blue-400" />
              <CardTitle className="text-slate-900 dark:text-white">Benachrichtigungen</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Passe an, für welche Ereignisse du Benachrichtigungen erhältst und über welche Kanäle.
            </p>
            <Link to={createPageUrl("NotificationSettings")}>
              <button className="text-sm text-blue-700 dark:text-blue-400 font-medium hover:underline flex items-center gap-1">
                Benachrichtigungseinstellungen öffnen →
              </button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-900 bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-red-100 dark:border-red-900">
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              <CardTitle className="text-red-600 dark:text-red-400">Gefahrenzone</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Konto löschen</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Diese Aktion kann nicht rückgängig gemacht werden. Alle Ihre Daten werden unwiderruflich gelöscht.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Konto dauerhaft löschen
              </Button>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="dark:bg-slate-900 dark:border-slate-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600 dark:text-red-400">
                ⚠️ Konto unwiderruflich löschen?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3 dark:text-slate-400">
                <p className="font-semibold text-slate-900 dark:text-white">
                  ACHTUNG: Diese Aktion kann nicht rückgängig gemacht werden!
                </p>
                <p>
                  Ihr gesamtes Konto und alle zugehörigen Daten werden <strong className="text-red-600">permanent gelöscht</strong>.
                </p>
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded p-3 mt-3">
                  <p className="text-sm text-red-800 dark:text-red-300 mb-2">
                    Zum Bestätigen geben Sie bitte Ihre E-Mail-Adresse ein:
                  </p>
                  <p className="font-mono font-semibold text-red-900 dark:text-red-400 mb-2">
                    {currentUser?.email}
                  </p>
                  <Input
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="E-Mail-Adresse eingeben"
                    className="border-red-300 dark:border-red-800 focus:border-red-500 dark:bg-slate-800"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirmation("")} className="dark:bg-slate-800 dark:text-white">
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== currentUser?.email || deleteAccountMutation.isPending}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteAccountMutation.isPending ? "Wird gelöscht..." : "Unwiderruflich löschen"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}