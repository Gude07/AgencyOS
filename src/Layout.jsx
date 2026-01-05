import React, { useState } from "react";
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
  TrendingUp
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import OnlineUsers from "@/components/OnlineUsers";
import NotificationCenter from "@/components/notifications/NotificationCenter";

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
    title: "Vereine",
    url: createPageUrl("ClubsOverview"),
    icon: Building2,
  },
  {
    title: "Vereinsanfragen",
    url: createPageUrl("ClubRequests"),
    icon: Building2,
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

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="border-b border-slate-100 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-white">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69175f86bfb516d23d496067/a03e36395_0a2a8123-bc63-4947-9283-2f5b930988cb.jpg" 
              alt="STS Sports Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-lg">STS Sports</h2>
            <p className="text-xs text-slate-500">Spieleragentur</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">
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
                      ? 'bg-blue-900 text-white' 
                      : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="font-medium">{item.title}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">
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
                      ? 'bg-blue-900 text-white' 
                      : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="font-medium">{item.title}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="hidden lg:block">
          <OnlineUsers />
        </div>
      </div>

      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-slate-700 font-semibold text-sm">
                {user?.full_name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 text-sm truncate">
                {user?.full_name || 'Benutzer'}
              </p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200 flex-shrink-0"
            title="Abmelden"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row w-full bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-white">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69175f86bfb516d23d496067/a03e36395_0a2a8123-bc63-4947-9283-2f5b930988cb.jpg" 
                alt="STS Sports Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">STS Sports</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[280px]">
                <SidebarNav onNavClick={() => setMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-64 border-r border-slate-200">
        <SidebarNav />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="hidden lg:flex items-center justify-end px-6 py-4 bg-white border-b border-slate-200">
          <NotificationCenter />
        </div>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}