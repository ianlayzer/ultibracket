import { Nav } from 'react-bootstrap';
import { Navbar as BsNavbar } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <BsNavbar expand="lg">
      <BsNavbar.Brand as={Link} to="/">
        Home
      </BsNavbar.Brand>
      <Nav>
        <Nav.Link as={Link} to="/tournaments">
          Tournaments
        </Nav.Link>
        <Nav.Link as={Link} to="/about">
          About
        </Nav.Link>
      </Nav>
    </BsNavbar>
  );
};

export default Navbar;
