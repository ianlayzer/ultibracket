import { auth } from '../firebase/firebase';
import { signOut } from 'firebase/auth';
import { Link } from 'react-router-dom';
import { useAuth } from '../firebase/useAuth';
import { handleGoogleLogin } from '../firebase/handleGoogleLogin';
import { Button } from 'react-bootstrap';

const Navbar = () => {
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

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
        {user ? (
          <li>
            <span>{user.displayName || user.email} </span>
            <span
              onClick={handleLogout}
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
