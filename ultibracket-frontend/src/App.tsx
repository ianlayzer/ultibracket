import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import AboutPage from './pages/AboutPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import TournamentsListPage from './pages/TournamentsListPage';

import 'bootstrap/dist/css/bootstrap.min.css';
import TournamentDetailPage from './pages/TournamentDetailPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/tournaments" element={<TournamentsListPage />} />
        <Route
          path="/tournaments/:tournamentId"
          element={<TournamentDetailPage />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
