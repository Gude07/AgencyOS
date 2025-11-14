import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Calendar from './pages/Calendar';
import Reports from './pages/Reports';
import Players from './pages/Players';
import PlayerDetail from './pages/PlayerDetail';
import ClubRequests from './pages/ClubRequests';
import ClubRequestDetail from './pages/ClubRequestDetail';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Tasks": Tasks,
    "TaskDetail": TaskDetail,
    "Calendar": Calendar,
    "Reports": Reports,
    "Players": Players,
    "PlayerDetail": PlayerDetail,
    "ClubRequests": ClubRequests,
    "ClubRequestDetail": ClubRequestDetail,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};