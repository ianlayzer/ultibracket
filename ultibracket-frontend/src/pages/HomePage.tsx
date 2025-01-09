import { Container } from 'react-bootstrap';
import Navbar from '../components/Navbar';

const HomePage = () => {
  return (
    <Container>
      <Navbar />
      <h1>Welcome to UltiBracket</h1>
      <p>A billion dollar business coming soon.</p>
    </Container>
  );
};

export default HomePage;
