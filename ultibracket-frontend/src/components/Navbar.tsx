import { Nav } from 'react-bootstrap';
import { Navbar as BsNavbar } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <BsNavbar expand="lg">
      <BsNavbar.Brand as={Link} to="/">
        Home
      </BsNavbar.Brand>
      <BsNavbar.Collapse id="basic-navbar-nav">
        <Nav>
          <Nav.Link as={Link} to="/about">
            About
          </Nav.Link>
        </Nav>
      </BsNavbar.Collapse>
    </BsNavbar>
  );
};

export default Navbar;
