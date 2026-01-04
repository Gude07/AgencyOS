import Calendar from './pages/Calendar';
import ClubRequestDetail from './pages/ClubRequestDetail';
import ClubRequests from './pages/ClubRequests';
import ClubRequestsDashboard from './pages/ClubRequestsDashboard';
import ClubsOverview from './pages/ClubsOverview';
import CoachDetail from './pages/CoachDetail';
import Coaches from './pages/Coaches';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import NotificationSettings from './pages/NotificationSettings';
import Notifications from './pages/Notifications';
import PlayerDetail from './pages/PlayerDetail';
import Players from './pages/Players';
import TaskDetail from './pages/TaskDetail';
import Tasks from './pages/Tasks';
import NoteDetail from './pages/NoteDetail';
import OrganizationalOverview from './pages/OrganizationalOverview';
import Deals from './pages/Deals';
import DealDetail from './pages/DealDetail';
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
    "Home": Home,
    "NotificationSettings": NotificationSettings,
    "Notifications": Notifications,
    "PlayerDetail": PlayerDetail,
    "Players": Players,
    "TaskDetail": TaskDetail,
    "Tasks": Tasks,
    "NoteDetail": NoteDetail,
    "OrganizationalOverview": OrganizationalOverview,
    "Deals": Deals,
    "DealDetail": DealDetail,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};