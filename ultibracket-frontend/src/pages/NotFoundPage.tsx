import { Container } from 'react-bootstrap';
import Navbar from '../components/NavBar';

const NotFoundPage = () => {
  return (
    <Container>
      <Navbar />
      <h1>Not found!</h1>
      <p>What were you looking for?</p>
    </Container>
  );
};

export default NotFoundPage;
