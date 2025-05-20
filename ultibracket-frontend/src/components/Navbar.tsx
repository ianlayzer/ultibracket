import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../firebase/useAuth';
import { handleGoogleLogin } from '../firebase/handleGoogleLogin';
import { handleGoogleLogout } from '../firebase/handleGoogleLogout';
import { useDivision, Division } from '../contexts/DivisionContext';
import {
  Button,
  ButtonGroup,
  NavDropdown,
  Nav,
  Navbar as BootstrapNavbar,
  Container,
} from 'react-bootstrap'; // Import NavDropdown
import './Navbar.css';

const Navbar = () => {
  const { user } = useAuth();
  const { currentDivision, setCurrentDivision } = useDivision();

  const handleDivisionToggle = (division: Division) => {
    setCurrentDivision(division);
  };

  const getNavbarClass = () => {
    return currentDivision === 'mens' ? 'navbar-mens' : 'navbar-womens';
  };

  return (
    <BootstrapNavbar expand="lg" sticky="top" className={getNavbarClass()}>
      <Container fluid>
        <BootstrapNavbar.Brand as={Link} to="/">
          🏆 UltiBracket
        </BootstrapNavbar.Brand>
        <BootstrapNavbar.Toggle aria-controls="navbarNav" />
        <BootstrapNavbar.Collapse id="navbarNav">
          <Nav className="me-auto mb-2 mb-lg-0">
            <Nav.Link as={Link} to="/leaderboard">
              Leaderboard
            </Nav.Link>
            {user && (
              <Nav.Link as={Link} to="/my-bracket">
                My Bracket
              </Nav.Link>
            )}
            <Nav.Link as={Link} to="/scoring">
              Rules & Scoring
            </Nav.Link>
          </Nav>
          <div className="d-flex align-items-center">
            <ButtonGroup className="me-3">
              <Button
                variant={currentDivision === 'mens' ? 'light' : 'outline-light'}
                onClick={() => handleDivisionToggle('mens')}
                size="sm"
              >
                Men's
              </Button>
              <Button
                variant={
                  currentDivision === 'womens' ? 'light' : 'outline-light'
                }
                onClick={() => handleDivisionToggle('womens')}
                size="sm"
              >
                Women's
              </Button>
            </ButtonGroup>
            {user ? (
              <NavDropdown
                title={user.displayName || user.email}
                id="navbarDropdownUserLink"
                align="end" // Aligns dropdown to the right
                menuVariant={
                  getNavbarClass().includes('mens') ||
                  getNavbarClass().includes('womens')
                    ? 'dark'
                    : 'light'
                } // Adjust based on navbar color
              >
                <NavDropdown.Item onClick={handleGoogleLogout}>
                  Log Out
                </NavDropdown.Item>
                {/* Add other dropdown items here if needed */}
              </NavDropdown>
            ) : (
              <Nav.Link
                onClick={handleGoogleLogin}
                style={{ cursor: 'pointer' }}
              >
                Log In
              </Nav.Link>
            )}
          </div>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;
