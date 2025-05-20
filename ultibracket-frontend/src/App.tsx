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
import RulesAndScoringPage from './pages/RulesAndScoringPage';
import { DivisionProvider } from './contexts/DivisionContext'; // Import DivisionProvider
import { useAuth } from './firebase/useAuth'; // Assuming useAuth comes from an AuthProvider

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

function AppContent() {
  const { user } = useAuth(); // useAuth now used here for routing logic

  return (
    <div className="app-container">
      <Navbar />
      <div className="page-content">
        <Routes>
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          {/* If tournamentNameParam is used, it should NOT include division. Division comes from context. */}
          <Route
            path="/leaderboard/:tournamentNameParam"
            element={<LeaderboardPage />}
          />
          {/* BracketViewerPage will need to know which division the slug refers to,
              or derive it. For now, let's assume baseTournamentNameSlug is the CORE name,
              and division comes from context. This might need URL adjustment later if
              you want direct division-specific links to work without prior context setting.
          */}
          <Route
            path="/brackets/:userId/:baseTournamentNameSlug"
            element={<BracketViewerPage />}
          />
          <Route
            path="/my-bracket"
            element={
              user ? (
                <MyBracketPage />
              ) : (
                <Navigate
                  to="/login" // Make sure you have a /login route
                  replace
                  state={{ message: 'Please log in to view your bracket.' }}
                />
              )
            }
          />
          <Route
            path="/"
            element={
              user ? <Navigate to="/my-bracket" replace /> : <LeaderboardPage />
            }
          />
          <Route path="/scoring" element={<RulesAndScoringPage />} />
          <Route
            path="/master-bracket" // This route will also become division-aware via context
            element={<MasterBracketAdminPage />}
          />
          {/* Example Login Page Route (You'll need to create this component) */}
          {/* <Route path="/login" element={<LoginPage />} /> */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <DivisionProvider>
        {' '}
        <AppContent />
      </DivisionProvider>
    </Router>
  );
}

export default App;
