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
import NoteDetail from './pages/NoteDetail';
import NotificationSettings from './pages/NotificationSettings';
import Notifications from './pages/Notifications';
import OrganizationalOverview from './pages/OrganizationalOverview';
import PlayerDetail from './pages/PlayerDetail';
import Players from './pages/Players';
import TaskDetail from './pages/TaskDetail';
import Tasks from './pages/Tasks';
import Archives from './pages/Archives';
import MyActivity from './pages/MyActivity';
import __Layout from './Layout.jsx';


export const PAGES = {
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
    "NoteDetail": NoteDetail,
    "NotificationSettings": NotificationSettings,
    "Notifications": Notifications,
    "OrganizationalOverview": OrganizationalOverview,
    "PlayerDetail": PlayerDetail,
    "Players": Players,
    "TaskDetail": TaskDetail,
    "Tasks": Tasks,
    "Archives": Archives,
    "MyActivity": MyActivity,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};