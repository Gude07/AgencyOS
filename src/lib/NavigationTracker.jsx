import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { base44 } from '@/api/base44Client';
import { pagesConfig } from '@/pages.config';

export default function NavigationTracker() {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const { Pages, mainPage } = pagesConfig;
    const mainPageKey = mainPage ?? Object.keys(Pages)[0];
    const pageEnterTime = useRef(null);
    const currentPageRef = useRef(null);

    // Post navigation changes to parent window
    useEffect(() => {
        window.parent?.postMessage({
            type: "app_changed_url",
            url: window.location.href
        }, '*');
    }, [location]);

    const getPageName = (pathname) => {
        if (pathname === '/' || pathname === '') return mainPageKey;
        const pathSegment = pathname.replace(/^\//, '').split('/')[0];
        const pageKeys = Object.keys(Pages);
        const matchedKey = pageKeys.find(key => key.toLowerCase() === pathSegment.toLowerCase());
        // Also handle routes not in pagesConfig (like ClubProfiles, AIChat etc)
        return matchedKey || pathSegment || null;
    };

    const saveActivity = async (pageName, durationSeconds) => {
        try {
            const user = await base44.auth.me();
            if (!user) return;
            const today = new Date().toISOString().split('T')[0];
            const now = new Date().toISOString();
            // Find existing record for this user+page+day
            const existing = await base44.entities.UserActivity.filter({
                user_email: user.email,
                page_name: pageName,
                session_date: today
            });
            if (existing.length > 0) {
                await base44.entities.UserActivity.update(existing[0].id, {
                    duration_seconds: (existing[0].duration_seconds || 0) + durationSeconds,
                    last_seen_at: now
                });
            } else {
                await base44.entities.UserActivity.create({
                    user_email: user.email,
                    user_name: user.full_name,
                    agency_id: user.agency_id,
                    page_name: pageName,
                    session_date: today,
                    duration_seconds: durationSeconds,
                    last_seen_at: now
                });
            }
        } catch (e) {
            // Silently fail
        }
    };

    // Track page duration
    useEffect(() => {
        if (!isAuthenticated) return;
        const pathname = location.pathname;
        const pageName = getPageName(pathname);
        if (!pageName) return;

        // Save time spent on previous page
        if (currentPageRef.current && pageEnterTime.current) {
            const duration = Math.round((Date.now() - pageEnterTime.current) / 1000);
            if (duration > 2) saveActivity(currentPageRef.current, duration);
        }

        // Start tracking new page
        currentPageRef.current = pageName;
        pageEnterTime.current = Date.now();

        // Also log via appLogs
        base44.appLogs.logUserInApp(pageName).catch(() => {});

        // Save on unload/tab close
        const handleUnload = () => {
            if (currentPageRef.current && pageEnterTime.current) {
                const duration = Math.round((Date.now() - pageEnterTime.current) / 1000);
                if (duration > 2) saveActivity(currentPageRef.current, duration);
            }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [location, isAuthenticated]);

    return null;
}