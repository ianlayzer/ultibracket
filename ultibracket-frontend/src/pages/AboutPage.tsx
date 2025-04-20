import { Container } from 'react-bootstrap';
import Navbar from '../components/Navbar';

const AboutPage = () => {
  return (
    <Container>
      <Navbar />
      <h1>About</h1>
      <p>Hi! My name is Ian. I am the greatest frisbee player ever.</p>
    </Container>
  );
};

export default AboutPage;
