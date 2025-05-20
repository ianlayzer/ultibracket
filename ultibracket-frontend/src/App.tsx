import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import LeaderboardPage from './pages/LeaderboardPage';
import BracketViewerPage from './pages/BracketViewerPage';
import MyBracketPage from './pages/MyBracketPage';
import NotFoundPage from './pages/NotFoundPage';
import Navbar from './components/Navbar';
import MasterBracketAdminPage from './pages/MasterBracketAdminPage';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { auth } from './firebase/firebase';

function App() {
  const currentUser = auth;

  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <div className="page-content">
          <Routes>
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route
              path="/leaderboard/:tournamentNameParam"
              element={<LeaderboardPage />}
            />
            <Route
              path="/brackets/:userId/:baseTournamentNameSlug"
              element={<BracketViewerPage />}
            />
            <Route
              path="/my-bracket"
              element={
                currentUser ? (
                  <MyBracketPage />
                ) : (
                  <Navigate
                    to="/login"
                    replace
                    state={{ message: 'Please log in to view your bracket.' }}
                  />
                )
              }
            />
            <Route
              path="/"
              element={
                currentUser ? (
                  <Navigate to="/my-bracket" replace />
                ) : (
                  <LeaderboardPage /> // Or a welcome page
                )
              }
            />
            <Route
              path="/master-bracket"
              element={<MasterBracketAdminPage />}
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Routes></Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
