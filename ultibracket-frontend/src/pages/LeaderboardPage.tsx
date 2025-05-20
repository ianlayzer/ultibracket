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
  getMasterTournament, // Add this
  Tournament as FirebaseTournamentType,
} from './../firebase/FirebaseUtils'; // Adjust path as needed
import {
  calculateBracketScoresAgainstMaster,
  MAX_POSSIBLE_POINTS_NEW_SYSTEM,
} from './../utils/scoreUtils'; // Adjust path as needed

const MASTER_TOURNAMENT_ID_FOR_SCORING = 'MASTER_BRACKET_USAU_2025';

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
  | 'calculatedPossiblePointsRemaining'
  | 'userChampion';

function LeaderboardPage() {
  const { tournamentNameParam } = useParams<{ tournamentNameParam?: string }>();
  // Use a default tournament name if not provided in URL, or make it mandatory
  const baseTournamentNameForLeaderboard = tournamentNameParam
    ? decodeURIComponent(tournamentNameParam)
    : 'USA Ultimate College Nationals 2025'; // Default if no param

  const [brackets, setBrackets] = useState<LeaderboardEntry[]>([]);
  const [masterBracketData, setMasterBracketData] =
    useState<FirebaseTournamentType | null>(null); // State for master data
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [maxPointsForDisplay, setMaxPointsForDisplay] = useState<number>(
    MAX_POSSIBLE_POINTS_NEW_SYSTEM,
  ); // For table header
  const [sortBy, setSortBy] = useState<SortableColumn>('calculatedScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      setIsLoading(true);
      setError(null);
      setMasterBracketData(null); // Reset on each fetch
      try {
        if (!baseTournamentNameForLeaderboard) {
          throw new Error(
            'Base tournament name for user brackets not specified for leaderboard.',
          );
        }

        // 1. Fetch Master Bracket (using the fixed ID)
        const master = await getMasterTournament(
          MASTER_TOURNAMENT_ID_FOR_SCORING,
        );
        setMasterBracketData(master); // Store master data (can be null if not found)

        // 2. Fetch User Brackets for the specified baseTournamentNameForLeaderboard
        const rawUserBrackets = await getAllUserBracketsForTournament(
          baseTournamentNameForLeaderboard,
        );

        // 3. Process and Score
        const processedBrackets: LeaderboardEntry[] = rawUserBrackets.map(
          (userPick) => {
            // Pass the fetched master object (which might be null)
            const scores = calculateBracketScoresAgainstMaster(
              userPick.tournamentData?.bracket,
              master,
            );

            return {
              ...userPick,
              calculatedScore: scores.currentScore,
              calculatedPossiblePointsRemaining: scores.possiblePointsRemaining,
            };
          },
        );

        setBrackets(processedBrackets);
        // maxPointsForDisplay will be MAX_POSSIBLE_POINTS_NEW_SYSTEM as defined in scoreUtils
        // It doesn't change based on master bracket completeness for display purposes.
        setMaxPointsForDisplay(MAX_POSSIBLE_POINTS_NEW_SYSTEM);
      } catch (err) {
        console.error('Failed to load leaderboard data:', err);
        setError(`Failed to load leaderboard. ${(err as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [baseTournamentNameForLeaderboard]);

  const sortedBrackets = useMemo(() => {
    return [...brackets].sort((a, b) => {
      let valA, valB;

      if (sortBy === 'userBracketName' || sortBy === 'userChampion') {
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

  const showMasterNotAvailableMessage =
    !isLoading && !error && !masterBracketData && brackets.length > 0;

  return (
    <Container className="mt-4">
      {/* ... Title ... */}
      {showMasterNotAvailableMessage && (
        <Alert variant="info" className="mt-3">
          Official tournament results are not yet available for scoring. All
          current scores are 0.
        </Alert>
      )}
      <h4 className="mb-3 text-muted">{baseTournamentNameForLeaderboard}</h4>
      {brackets.length === 0 && !isLoading && !error && (
        <Alert variant="info" className="mt-3">
          No user brackets found for "{baseTournamentNameForLeaderboard}" yet.
        </Alert>
      )}
      {brackets.length > 0 && (
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
              <th
                onClick={() => handleSort('userChampion')}
                style={{ cursor: 'pointer' }}
              >
                Champion {getSortIndicator('userChampion')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedBrackets.map((bracket) => (
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
                  {bracket.calculatedScore} / {maxPointsForDisplay}{' '}
                </td>
                <td>{bracket.calculatedPossiblePointsRemaining}</td>
                <td>{bracket.champion}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
}
export default LeaderboardPage;
