// src/pages/BracketViewerPage.tsx
import { useParams } from 'react-router-dom';
import TournamentView from '../components/TournamentView';
import { Container, Alert } from 'react-bootstrap';
// import Navbar from '../components/Navbar'; // If needed per page

function BracketViewerPage() {
  const { userId, baseTournamentNameSlug } = useParams<{
    // This slug is the CORE name
    userId: string;
    baseTournamentNameSlug: string;
  }>();

  if (!userId || !baseTournamentNameSlug) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          User ID or Tournament Name missing in URL.
        </Alert>
      </Container>
    );
  }
  const coreTournamentName = decodeURIComponent(baseTournamentNameSlug);

  return (
    // <Navbar />
    <TournamentView
      viewOnlyUserId={userId}
      viewOnlyTournamentName={coreTournamentName} // Pass the CORE name
    />
  );
}
export default BracketViewerPage;
