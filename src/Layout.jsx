import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  BarChart3,
  Users,
  Building2,
  UserCog,
  Menu,
  X,
  LogOut,
  Inbox
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
} from "@/components/ui/sidebar";
import OnlineUsers from "@/components/OnlineUsers";

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
    title: "Reports",
    url: createPageUrl("Reports"),
    icon: BarChart3,
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
    title: "Anfragen Dashboard",
    url: createPageUrl("ClubRequestsDashboard"),
    icon: Inbox,
  },
  {
    title: "Vereinsanfragen",
    url: createPageUrl("ClubRequests"),
    icon: Building2,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50">
        <Sidebar className="border-r border-slate-200 bg-white">
          <SidebarHeader className="border-b border-slate-100 p-6">
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
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">
                Organisation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`group transition-all duration-200 rounded-lg mb-1 ${
                            isActive 
                              ? 'bg-blue-900 text-white hover:bg-blue-800' 
                              : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}`} />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">
                Transfer Management
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {transferItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`group transition-all duration-200 rounded-lg mb-1 ${
                            isActive 
                              ? 'bg-blue-900 text-white hover:bg-blue-800' 
                              : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}`} />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <OnlineUsers />
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-100 p-4">
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
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}