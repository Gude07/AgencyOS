import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Calendar from './pages/Calendar';
import Players from './pages/Players';
import PlayerDetail from './pages/PlayerDetail';
import ClubRequests from './pages/ClubRequests';
import ClubRequestDetail from './pages/ClubRequestDetail';
import Coaches from './pages/Coaches';
import CoachDetail from './pages/CoachDetail';
import ClubRequestsDashboard from './pages/ClubRequestsDashboard';
import NotificationSettings from './pages/NotificationSettings';
import Notifications from './pages/Notifications';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Tasks": Tasks,
    "TaskDetail": TaskDetail,
    "Calendar": Calendar,
    "Players": Players,
    "PlayerDetail": PlayerDetail,
    "ClubRequests": ClubRequests,
    "ClubRequestDetail": ClubRequestDetail,
    "Coaches": Coaches,
    "CoachDetail": CoachDetail,
    "ClubRequestsDashboard": ClubRequestsDashboard,
    "NotificationSettings": NotificationSettings,
    "Notifications": Notifications,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};