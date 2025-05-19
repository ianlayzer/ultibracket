// LeaderboardPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Table,
  Spinner,
  Alert,
  Container,
  ButtonGroup,
  Button,
} from 'react-bootstrap';
import {
  getAllUserBracketsForTournament,
  UserBracketPicks as FirebaseUserBracketPicksType,
} from './../firebase/FirebaseUtils'; // Adjust path as needed
import {
  calculateBracketScores,
  MAX_POSSIBLE_POINTS,
} from './../utils/scoreUtils'; // Adjust path as needed

// Helper to slugify text for URL parameters
const slugify = (text: string): string => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};

interface LeaderboardEntry extends FirebaseUserBracketPicksType {
  calculatedScore: number;
  calculatedPossiblePointsRemaining: number;
}

type SortableColumn =
  | 'userBracketName'
  | 'calculatedScore'
  | 'calculatedPossiblePointsRemaining';

function LeaderboardPage() {
  const { tournamentNameParam } = useParams<{ tournamentNameParam?: string }>();
  // Use a default tournament name if not provided in URL, or make it mandatory
  const baseTournamentNameForLeaderboard = tournamentNameParam
    ? decodeURIComponent(tournamentNameParam)
    : 'USA Ultimate College Nationals 2025'; // Default if no param

  const [brackets, setBrackets] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortableColumn>('calculatedScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchBrackets = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Ensure baseTournamentNameForLeaderboard is a valid string
        if (!baseTournamentNameForLeaderboard) {
          throw new Error('Tournament name not specified for leaderboard.');
        }
        const rawBrackets = await getAllUserBracketsForTournament(
          baseTournamentNameForLeaderboard,
        );
        const processedBrackets: LeaderboardEntry[] = rawBrackets.map(
          (bracket) => {
            const scores = calculateBracketScores(
              bracket.tournamentData?.bracket,
            );
            return {
              ...bracket,
              calculatedScore: scores.currentScore,
              calculatedPossiblePointsRemaining: scores.possiblePointsRemaining,
            };
          },
        );
        setBrackets(processedBrackets);
      } catch (err) {
        console.error('Failed to load leaderboard data:', err);
        setError(`Failed to load leaderboard data. ${(err as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrackets();
  }, [baseTournamentNameForLeaderboard]);

  const sortedBrackets = useMemo(() => {
    return [...brackets].sort((a, b) => {
      let valA, valB;

      if (sortBy === 'userBracketName') {
        valA = a.userBracketName.toLowerCase();
        valB = b.userBracketName.toLowerCase();
      } else {
        valA = a[sortBy];
        valB = b[sortBy];
      }

      if (valA < valB) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [brackets, sortBy, sortOrder]);

  const handleSort = (column: SortableColumn) => {
    if (sortBy === column) {
      setSortOrder((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder(column === 'userBracketName' ? 'asc' : 'desc'); // Default sort for name is asc, scores desc
    }
  };

  const getSortIndicator = (column: SortableColumn) => {
    if (sortBy === column) {
      return sortOrder === 'asc' ? ' ▲' : ' ▼';
    }
    return '';
  };

  if (isLoading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" role="status" />
        <p className="mt-2">Loading Leaderboard...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      </Container>
    );
  }

  if (brackets.length === 0) {
    return (
      <Container>
        <Alert variant="info" className="mt-3">
          No brackets found for "{baseTournamentNameForLeaderboard}" yet.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>🏆 Leaderboard</h2>
        {/* Optionally, add controls to switch baseTournamentNameForLeaderboard if you have multiple */}
      </div>
      <h4 className="mb-3 text-muted">{baseTournamentNameForLeaderboard}</h4>
      <Table striped bordered hover responsive className="mt-3">
        <thead>
          <tr>
            <th
              onClick={() => handleSort('userBracketName')}
              style={{ cursor: 'pointer' }}
            >
              Bracket Name {getSortIndicator('userBracketName')}
            </th>
            <th
              onClick={() => handleSort('calculatedScore')}
              style={{ cursor: 'pointer' }}
            >
              Current Score {getSortIndicator('calculatedScore')}
            </th>
            <th
              onClick={() => handleSort('calculatedPossiblePointsRemaining')}
              style={{ cursor: 'pointer' }}
            >
              Possible Points Remaining{' '}
              {getSortIndicator('calculatedPossiblePointsRemaining')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedBrackets.map((bracket) => (
            // Ensure bracket.userId and bracket.baseTournamentName exist and are strings for the key
            <tr
              key={`${bracket.userId}-${slugify(bracket.baseTournamentName)}`}
            >
              <td>
                <Link
                  to={`/brackets/${bracket.userId}/${slugify(bracket.baseTournamentName)}`}
                >
                  {bracket.userBracketName}
                </Link>
              </td>
              <td>
                {bracket.calculatedScore} / {MAX_POSSIBLE_POINTS}
              </td>
              <td>{bracket.calculatedPossiblePointsRemaining}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}
export default LeaderboardPage;
