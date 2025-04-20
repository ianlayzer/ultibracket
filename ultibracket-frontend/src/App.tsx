import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import LeaderboardPage from './pages/LeaderboardPage';
import GroupsPage from './pages/GroupsPage';
import MyBracketPage from './pages/MyBracketPage';
import NotFoundPage from './pages/NotFoundPage';
import Navbar from './components/Navbar';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
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
