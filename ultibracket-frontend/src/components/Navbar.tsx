import { Link } from 'react-router-dom';
import { useAuth } from '../firebase/useAuth';
import { handleGoogleLogin } from '../firebase/handleGoogleLogin';
import { handleGoogleLogout } from '../firebase/handleGoogleLogout';

const Navbar = () => {
  const { user } = useAuth();

  return (
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
        <li>
          <Link to="/prediction">Prediction</Link>
        </li>
        {user ? (
          <li>
            <span>{user.displayName || user.email} </span>
            <span
              onClick={handleGoogleLogout}
              style={{
                cursor: 'pointer',
                color: 'blue',
                textDecoration: 'underline',
              }}
            >
              Log Out
            </span>
          </li>
        ) : (
          <li>
            <span
              onClick={handleGoogleLogin}
              style={{
                cursor: 'pointer',
                color: 'blue',
                textDecoration: 'underline',
              }}
            >
              Log In
            </span>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
