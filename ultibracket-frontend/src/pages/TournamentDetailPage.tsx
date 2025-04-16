import { Container } from 'react-bootstrap';
import Navbar from '../components/Navbar';
import { useParams } from 'react-router-dom';

const TournamentDetailPage = () => {
  const { tournamentId } = useParams();
  console.log(tournamentId);

  return (
    <Container>
      <Navbar />
      <h1>Tournaments</h1>
      <p>{tournamentId}</p>
    </Container>
  );
};

export default TournamentDetailPage;
