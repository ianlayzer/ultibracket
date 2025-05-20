import { Container } from 'react-bootstrap';
import TournamentView from '../components/Tournament'; // Adjust path as needed

const MASTER_TOURNAMENT_ID = 'MASTER_BRACKET_USAU_2025';

function MasterBracketAdminPage() {
  return (
    <Container fluid className="p-0">
      <TournamentView
        isMasterBracket={true}
        baseTournamentName={MASTER_TOURNAMENT_ID}
      />
    </Container>
  );
}

export default MasterBracketAdminPage;
