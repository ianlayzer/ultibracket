// src/pages/BracketViewerPage.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import TournamentView from '../components/Tournament'; // Adjust path
import { Container, Alert } from 'react-bootstrap';

// You might have an AuthContext to get the currently logged-in user
// import { useAuth } from '../contexts/AuthContext'; // Example

function BracketViewerPage() {
  const { userId, baseTournamentNameSlug } = useParams<{
    userId: string;
    baseTournamentNameSlug: string;
  }>();
  // const { currentUser } = useAuth(); // Get logged-in user if needed for the `user` prop of TournamentView

  // For TournamentView, the 'user' prop is the person *currently browsing*.
  // It can be null if you allow anonymous viewing of shared brackets.
  // Let's assume for now you have a way to get this, or pass null.
  const loggedInUser = null; // Example: replace with actual data: currentUser ? { email: currentUser.email, uid: currentUser.uid } : null;

  if (!userId || !baseTournamentNameSlug) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          User ID or Tournament Name missing in URL.
        </Alert>
      </Container>
    );
  }

  // Decode the slug. If your original names had hyphens, this is a simple approach.
  // If names are more complex, ensure slugify/deslugify are robust.
  const tournamentName = decodeURIComponent(baseTournamentNameSlug);

  return (
    <TournamentView
      viewOnlyUserId={userId} // The user whose bracket to display
      viewOnlyTournamentName={tournamentName} // The specific tournament
    />
  );
}

export default BracketViewerPage;
