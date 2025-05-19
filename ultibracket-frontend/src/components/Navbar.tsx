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
          <Link to="/leaderboard">Leaderboard</Link>
        </li>
        {user ? (
          <>
            <li>
              <Link to="/my-bracket">My Bracket</Link>
            </li>
          </>
        ) : null}
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
