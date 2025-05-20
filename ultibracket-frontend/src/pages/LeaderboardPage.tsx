// src/pages/LeaderboardPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Table, Spinner, Alert, Container } from 'react-bootstrap';
import {
  getAllUserBracketsForTournament,
  UserBracketPicks as FirebaseUserBracketPicksType,
  getMasterTournament,
  Tournament as FirebaseTournamentType,
} from './../firebase/FirebaseUtils';
import {
  calculateBracketScoresAgainstMaster,
  MAX_POSSIBLE_POINTS_NEW_SYSTEM,
} from './../utils/scoreUtils';
import { useDivision } from '../contexts/DivisionContext'; // Import useDivision

const CORE_MASTER_ID_FOR_LEADERBOARD_SCORING = 'MASTER_BRACKET_USAU_2025';
const CORE_TOURNAMENT_NAME_FOR_LEADERBOARD =
  'USA Ultimate College Nationals 2025';

const slugify = (text: string): string => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
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
  const { tournamentNameParam } = useParams<{ tournamentNameParam?: string }>(); // This param is CORE name
  const {
    currentDivision,
    getDivisionSpecificName,
    getDivisionSpecificMasterId,
  } = useDivision();

  const coreTournamentName = tournamentNameParam
    ? decodeURIComponent(tournamentNameParam)
    : CORE_TOURNAMENT_NAME_FOR_LEADERBOARD;

  const divisionSpecificTournamentName =
    getDivisionSpecificName(coreTournamentName);
  const divisionSpecificMasterId = getDivisionSpecificMasterId(
    CORE_MASTER_ID_FOR_LEADERBOARD_SCORING,
  );

  const [brackets, setBrackets] = useState<LeaderboardEntry[]>([]);
  const [masterBracketData, setMasterBracketData] =
    useState<FirebaseTournamentType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [maxPointsForDisplay, setMaxPointsForDisplay] = useState<number>(
    MAX_POSSIBLE_POINTS_NEW_SYSTEM,
  );
  const [sortBy, setSortBy] = useState<SortableColumn>('calculatedScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      setIsLoading(true);
      setError(null);
      setMasterBracketData(null);
      setBrackets([]); // Clear previous division's brackets

      try {
        if (!divisionSpecificTournamentName) {
          // Now uses division-specific name
          throw new Error(
            'Tournament name (with division) for user brackets not specified for leaderboard.',
          );
        }

        const master = await getMasterTournament(divisionSpecificMasterId); // Use division-specific master ID
        setMasterBracketData(master);

        const rawUserBrackets = await getAllUserBracketsForTournament(
          divisionSpecificTournamentName,
        ); // Fetch for specific division

        const processedBrackets: LeaderboardEntry[] = rawUserBrackets.map(
          (userPick) => {
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
        setMaxPointsForDisplay(MAX_POSSIBLE_POINTS_NEW_SYSTEM);
      } catch (err) {
        console.error('Failed to load leaderboard data:', err);
        setError(`Failed to load leaderboard. ${(err as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [divisionSpecificTournamentName, divisionSpecificMasterId]); // Depend on division-specific names

  const sortedBrackets = useMemo(() => {
    return [...brackets].sort((a, b) => {
      let valA, valB;
      if (sortBy === 'userBracketName') {
        valA = a.userBracketName.toLowerCase();
        valB = b.userBracketName.toLowerCase();
      } else if (sortBy === 'userChampion') {
        valA = a.champion?.toLowerCase() || '';
        valB = b.champion?.toLowerCase() || '';
      } else {
        valA = a[sortBy];
        valB = b[sortBy];
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [brackets, sortBy, sortOrder]);

  const handleSort = (column: SortableColumn) => {
    if (sortBy === column) {
      setSortOrder((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder(
        column === 'userBracketName' || column === 'userChampion'
          ? 'asc'
          : 'desc',
      );
    }
  };

  const getSortIndicator = (column: SortableColumn) => {
    if (sortBy === column) return sortOrder === 'asc' ? ' ▲' : ' ▼';
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

  const showMasterNotAvailableMessage =
    !isLoading && !error && !masterBracketData && brackets.length > 0;

  return (
    <Container className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>🏆 Leaderboard - {currentDivision.toUpperCase()} Division</h2>
      </div>
      {showMasterNotAvailableMessage && (
        <Alert variant="info" className="mt-3">
          Official {currentDivision} tournament results are not yet available
          for scoring. All current scores are 0.
        </Alert>
      )}
      <h4 className="mb-3 text-muted">{coreTournamentName}</h4>
      {brackets.length === 0 && !isLoading && !error && (
        <Alert variant="info" className="mt-3">
          No user brackets found for "{divisionSpecificTournamentName}" yet.
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
                Champion Pick {getSortIndicator('userChampion')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedBrackets.map((bracket) => (
              <tr
                key={`${bracket.userId}-${slugify(bracket.baseTournamentName)}`}
              >
                {' '}
                {/* baseTournamentName here is already division specific */}
                <td>
                  <Link
                    to={`/brackets/${bracket.userId}/${slugify(coreTournamentName)}`}
                  >
                    {' '}
                    {/* Link to core name, division is by context */}
                    {bracket.userBracketName}
                  </Link>
                </td>
                <td>
                  {bracket.calculatedScore} / {maxPointsForDisplay}
                </td>
                <td>{bracket.calculatedPossiblePointsRemaining}</td>
                <td>{bracket.champion || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
}
export default LeaderboardPage;
