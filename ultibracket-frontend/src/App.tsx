import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import LeaderboardPage from './pages/LeaderboardPage';
import GroupsPage from './pages/GroupsPage';
import MyBracketPage from './pages/MyBracketPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <ul className="nav-tabs">
            <li>
              <Link to="/">Leaderboard</Link>
            </li>
            <li>
              <Link to="/groups">Groups</Link>
            </li>
            <li>
              <Link to="/my-bracket">My Bracket</Link>
            </li>
          </ul>
        </nav>

        <div className="page-content">
          <Routes>
            <Route path="/" element={<LeaderboardPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/my-bracket" element={<MyBracketPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
