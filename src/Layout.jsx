import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  Users,
  Building2,
  UserCog,
  Menu,
  X,
  LogOut,
  Inbox,
  TrendingUp,
  Moon,
  Sun,
  Briefcase,
  Sparkles
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import OnlineUsers from "@/components/OnlineUsers";
import FeedbackButton from "@/components/FeedbackButton";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import AgencySwitcher from "@/components/AgencySwitcher";
import { motion } from "framer-motion";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Aufgaben",
    url: createPageUrl("Tasks"),
    icon: CheckSquare,
  },
  {
    title: "Kalender",
    url: createPageUrl("Calendar"),
    icon: Calendar,
  },
  {
    title: "Organisatorisches",
    url: createPageUrl("OrganizationalOverview"),
    icon: Inbox,
  },
  {
    title: "Meine Aktivitäten",
    url: createPageUrl("MyActivity"),
    icon: TrendingUp,
  },
];

const transferItems = [
  {
    title: "Spieler",
    url: createPageUrl("Players"),
    icon: Users,
  },
  {
    title: "Trainer",
    url: createPageUrl("Coaches"),
    icon: UserCog,
  },

  {
    title: "Vereinsanfragen",
    url: createPageUrl("ClubRequests"),
    icon: Building2,
  },
  {
    title: "Vereinsprofile",
    url: createPageUrl("ClubProfiles"),
    icon: Building2,
  },
  {
    title: "KI-Vereinsanalyse",
    url: createPageUrl("ClubAnalysis"),
    icon: Sparkles,
  },
  {
    title: "Spieler-Vergleich KI",
    url: createPageUrl("PlayerComparison"),
    icon: Sparkles,
  },
  {
    title: "Deals",
    url: createPageUrl("Deals"),
    icon: CheckSquare,
  },
  {
    title: "Archive",
    url: createPageUrl("Archives"),
    icon: Inbox,
  },
];

function SidebarNav({ onNavClick }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [agency, setAgency] = React.useState(null);
  const [darkMode, setDarkMode] = React.useState(false);

  React.useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (u.agency_id) {
        const agencies = await base44.entities.Agency.list();
        const userAgency = agencies.find(a => a.id === u.agency_id);
        setAgency(userAgency);
      }
    }).catch(() => {});
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      <div className="border-b border-slate-100 dark:border-slate-800 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-white dark:bg-slate-800">
            {agency?.logo_url ? (
              <img 
                src={agency.logo_url} 
                alt={agency.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <Building2 className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-lg">{agency?.name || "Agentur"}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Spieleragentur</p>
          </div>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 space-y-2">
        <AgencySwitcher />
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleDarkMode}
          className="w-full justify-start gap-2 text-slate-700 dark:text-slate-300"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {darkMode ? 'Hell-Modus' : 'Dunkel-Modus'}
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">
            Organisation
          </div>
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  onClick={onNavClick}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-900 dark:bg-blue-700 text-white' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="font-medium">{item.title}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">
            Transfer Management
          </div>
          <div className="space-y-1">
            {transferItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  onClick={onNavClick}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-900 dark:bg-blue-700 text-white' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="font-medium">{item.title}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {user?.role === "admin" && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">
              Administration
            </div>
            <div className="space-y-1">
              <Link
                to={createPageUrl("AgencyManagement")}
                onClick={onNavClick}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  location.pathname === createPageUrl("AgencyManagement")
                    ? 'bg-blue-900 dark:bg-blue-700 text-white' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building2 className={`w-5 h-5 ${location.pathname === createPageUrl("AgencyManagement") ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className="font-medium">Agenturen</span>
              </Link>
            </div>
          </div>
        )}

        <div className="hidden lg:block">
          <OnlineUsers />
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <Link
            to={createPageUrl("AccountSettings")}
            onClick={onNavClick}
            className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                {user?.full_name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                {user?.full_name || 'Benutzer'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200 flex-shrink-0"
            title="Abmelden"
          >
            <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

const bottomNavItems = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "Aufgaben", url: createPageUrl("Tasks"), icon: CheckSquare },
  { title: "Kalender", url: createPageUrl("Calendar"), icon: Calendar },
  { title: "Portfolio", url: createPageUrl("Players"), icon: Briefcase },
];

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row w-full bg-slate-50 dark:bg-slate-950">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-white dark:bg-slate-800">
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">Agentur</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FeedbackButton />
            <NotificationCenter />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-6 h-6 dark:text-slate-300" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[280px] dark:bg-slate-900">
                <SidebarNav onNavClick={() => setMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-64 border-r border-slate-200 dark:border-slate-800">
        <SidebarNav />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden pb-16 lg:pb-0">
        <div className="hidden lg:flex items-center justify-end gap-2 px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <FeedbackButton />
          <NotificationCenter />
        </div>
        <div className="flex-1 overflow-auto" style={{ overscrollBehavior: 'none' }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        <div className="grid grid-cols-4 gap-1 px-2 pt-2">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <Link
                key={item.title}
                to={item.url}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors ${
                  isActive 
                    ? 'text-blue-900 dark:text-blue-400 bg-blue-50 dark:bg-blue-950' 
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-900 dark:text-blue-400' : ''}`} />
                <span className="text-xs font-medium">{item.title}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}