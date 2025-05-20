import { Container } from 'react-bootstrap';
import TournamentView from '../components/TournamentView'; // Adjust path as needed
import { useDivision } from '../contexts/DivisionContext'; // Import to get division-specific ID

function MasterBracketAdminPage() {
  const { currentDivision } = useDivision(); // Add currentDivision for keying

  return (
    <Container fluid className="p-0">
      {/* Add a key to force re-mount and re-initialization when division changes */}
      <TournamentView
        key={currentDivision} // Force re-mount on division change
        isMasterBracket={true}
      />
    </Container>
  );
}

export default MasterBracketAdminPage;
