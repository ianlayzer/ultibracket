import { Container } from 'react-bootstrap';
import Navbar from '../components/Navbar';
import TournamentView from '../components/TournamentView';

const BracketPage = () => {
  return (
    <Container fluid>
      <Navbar />
      <TournamentView />
    </Container>
  );
};

export default BracketPage;
