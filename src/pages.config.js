/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Archives from './pages/Archives';
import Calendar from './pages/Calendar';
import ClubRequestDetail from './pages/ClubRequestDetail';
import ClubRequests from './pages/ClubRequests';
import ClubRequestsDashboard from './pages/ClubRequestsDashboard';
import ClubsOverview from './pages/ClubsOverview';
import CoachDetail from './pages/CoachDetail';
import Coaches from './pages/Coaches';
import Dashboard from './pages/Dashboard';
import DealDetail from './pages/DealDetail';
import Deals from './pages/Deals';
import Home from './pages/Home';
import MyActivity from './pages/MyActivity';
import NoteDetail from './pages/NoteDetail';
import NotificationSettings from './pages/NotificationSettings';
import Notifications from './pages/Notifications';
import OrganizationalOverview from './pages/OrganizationalOverview';
import PlayerDetail from './pages/PlayerDetail';
import Players from './pages/Players';
import TaskDetail from './pages/TaskDetail';
import Tasks from './pages/Tasks';
import AccountSettings from './pages/AccountSettings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Archives": Archives,
    "Calendar": Calendar,
    "ClubRequestDetail": ClubRequestDetail,
    "ClubRequests": ClubRequests,
    "ClubRequestsDashboard": ClubRequestsDashboard,
    "ClubsOverview": ClubsOverview,
    "CoachDetail": CoachDetail,
    "Coaches": Coaches,
    "Dashboard": Dashboard,
    "DealDetail": DealDetail,
    "Deals": Deals,
    "Home": Home,
    "MyActivity": MyActivity,
    "NoteDetail": NoteDetail,
    "NotificationSettings": NotificationSettings,
    "Notifications": Notifications,
    "OrganizationalOverview": OrganizationalOverview,
    "PlayerDetail": PlayerDetail,
    "Players": Players,
    "TaskDetail": TaskDetail,
    "Tasks": Tasks,
    "AccountSettings": AccountSettings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};