import {
  Card,
  Badge,
  Container,
  Row,
  Col,
  Button,
  Spinner,
  Toast,
  ToastContainer,
  Form, // Added Form
  Alert, // Added Alert
} from 'react-bootstrap';
import { useState, useEffect, useCallback } from 'react';
import './Tournament.css';
// Updated import path and functions
import {
  saveUserBracketPicks,
  getUserBracketPicks,
  Tournament as FirebaseTournamentType, // Use aliased type
  UserBracketPicks as FirebaseUserBracketPicksType, // Use aliased type
} from './../firebase/FirebaseUtils';
import { useAuth } from '../firebase/useAuth';

// Type definitions
interface Team {
  name: string;
  seed: number;
}

interface PoolTeam {
  team: string;
  wins: number;
  losses: number;
  advanced: boolean;
}

interface BracketGame {
  id: number;
  team1: string;
  team2: string;
  score: string; // Score might not be relevant for user predictions, but kept for structure
  winner: string | null;
}

// This is the structure for the base tournament and user's manipulated version
interface TournamentDisplayData {
  name: string; // Base tournament name
  pools: {
    [key: string]: PoolTeam[];
  };
  bracket: {
    prequarters: BracketGame[];
    quarters: BracketGame[];
    semis: BracketGame[];
    final: BracketGame[];
  };
}

// Helper function to extract team name without seed
const getTeamName = (fullTeamString: string) => {
  if (fullTeamString === 'TBD') return 'TBD';
  return fullTeamString.replace(/\s*\(\d+\)$/, '');
};

// Helper function to extract seed
const getSeed = (fullTeamString: string) => {
  if (fullTeamString === 'TBD') return null;
  const match = fullTeamString.match(/\((\d+)\)$/);
  return match ? parseInt(match[1]) : null;
};

// Helper function to format team string
const formatTeamString = (team: Team) => {
  return `${team.name} (${team.seed})`;
};

// Function to create pools based on teams
const createPools = (teams: Team[]): { [key: string]: PoolTeam[] } => {
  const sortedTeams = [...teams].sort((a, b) => a.seed - b.seed);
  const pools: { [key: string]: PoolTeam[] } = {
    'Pool A': [],
    'Pool B': [],
    'Pool C': [],
    'Pool D': [],
  };

  if (sortedTeams.length < 20) {
    // Handle cases with fewer than 20 teams if necessary, or ensure 20 teams are always provided
    console.warn(
      'Not enough teams to fill pools according to the defined structure.',
    );
    // Fallback: simple distribution for fewer teams (example)
    const poolNames = Object.keys(pools);
    sortedTeams.forEach((team, index) => {
      pools[poolNames[index % poolNames.length]].push(createPoolTeam(team));
    });
    return pools;
  }

  pools['Pool A'].push(createPoolTeam(sortedTeams[0]));
  pools['Pool B'].push(createPoolTeam(sortedTeams[1]));
  pools['Pool C'].push(createPoolTeam(sortedTeams[2]));
  pools['Pool D'].push(createPoolTeam(sortedTeams[3]));
  pools['Pool D'].push(createPoolTeam(sortedTeams[4]));
  pools['Pool C'].push(createPoolTeam(sortedTeams[5]));
  pools['Pool B'].push(createPoolTeam(sortedTeams[6]));
  pools['Pool A'].push(createPoolTeam(sortedTeams[7]));
  pools['Pool D'].push(createPoolTeam(sortedTeams[8]));
  pools['Pool C'].push(createPoolTeam(sortedTeams[9]));
  pools['Pool B'].push(createPoolTeam(sortedTeams[10]));
  pools['Pool A'].push(createPoolTeam(sortedTeams[11]));
  pools['Pool A'].push(createPoolTeam(sortedTeams[16])); // Seed 17
  pools['Pool B'].push(createPoolTeam(sortedTeams[13])); // Seed 14
  pools['Pool C'].push(createPoolTeam(sortedTeams[14])); // Seed 15
  pools['Pool D'].push(createPoolTeam(sortedTeams[15])); // Seed 16
  pools['Pool A'].push(createPoolTeam(sortedTeams[12])); // Seed 13
  pools['Pool B'].push(createPoolTeam(sortedTeams[17])); // Seed 18
  pools['Pool C'].push(createPoolTeam(sortedTeams[18])); // Seed 19
  pools['Pool D'].push(createPoolTeam(sortedTeams[19])); // Seed 20
  return pools;
};

const createPoolTeam = (team: Team): PoolTeam => ({
  team: formatTeamString(team),
  wins: 0,
  losses: 0,
  advanced: false,
});

const createEmptyBracket = (): TournamentDisplayData['bracket'] => ({
  prequarters: Array(4)
    .fill(null)
    .map((_, i) => ({
      id: i + 1,
      team1: 'TBD',
      team2: 'TBD',
      score: '0 - 0',
      winner: null,
    })),
  quarters: Array(4)
    .fill(null)
    .map((_, i) => ({
      id: i + 5,
      team1: 'TBD',
      team2: 'TBD',
      score: '0 - 0',
      winner: null,
    })),
  semis: Array(2)
    .fill(null)
    .map((_, i) => ({
      id: i + 9,
      team1: 'TBD',
      team2: 'TBD',
      score: '0 - 0',
      winner: null,
    })),
  final: [{ id: 11, team1: 'TBD', team2: 'TBD', score: '0 - 0', winner: null }],
});

const populateBracketFromPools = (
  pools: { [key: string]: PoolTeam[] },
  currentBracket?: TournamentDisplayData['bracket'],
) => {
  const newBracket = currentBracket
    ? JSON.parse(JSON.stringify(currentBracket))
    : createEmptyBracket();

  const poolA = pools['Pool A']?.slice(0, 3) || [];
  const poolB = pools['Pool B']?.slice(0, 3) || [];
  const poolC = pools['Pool C']?.slice(0, 3) || [];
  const poolD = pools['Pool D']?.slice(0, 3) || [];

  // Mark teams as advanced in pools (visual cue, actual advancement logic is in bracket population)
  Object.values(pools).forEach((poolTeams) => {
    poolTeams.forEach((pt, index) => {
      pt.advanced = index < 3; // Top 3 advance
    });
  });

  // Ensure teams exist before assigning
  newBracket.quarters[0].team1 = poolA[0]?.team || 'TBD';
  newBracket.quarters[1].team1 = poolD[0]?.team || 'TBD';
  newBracket.quarters[2].team1 = poolC[0]?.team || 'TBD';
  newBracket.quarters[3].team1 = poolB[0]?.team || 'TBD';

  newBracket.prequarters[0].team1 = poolA[1]?.team || 'TBD';
  newBracket.prequarters[0].team2 = poolD[2]?.team || 'TBD';
  newBracket.prequarters[1].team1 = poolB[1]?.team || 'TBD';
  newBracket.prequarters[1].team2 = poolC[2]?.team || 'TBD';
  newBracket.prequarters[2].team1 = poolC[1]?.team || 'TBD';
  newBracket.prequarters[2].team2 = poolB[2]?.team || 'TBD';
  newBracket.prequarters[3].team1 = poolD[1]?.team || 'TBD';
  newBracket.prequarters[3].team2 = poolA[2]?.team || 'TBD';

  // When bracket is populated from pools, subsequent round winners should be cleared
  // if their feeder games changed. This is complex. For now, we assume user will re-click.
  // Or, we can reset winners of games whose teams just got populated.
  const resetDependentGames = (bracket: TournamentDisplayData['bracket']) => {
    // Example: if prequarter teams change, reset quarter winners that depend on them.
    // This logic would need to be carefully implemented if auto-clearing is desired.
  };
  // resetDependentGames(newBracket);

  return newBracket;
};

const createTournamentData = (
  teams: Team[],
  name: string,
): TournamentDisplayData => {
  const pools = createPools(teams);
  const bracket = createEmptyBracket(); // Start with an empty bracket
  return { name, pools, bracket };
};

const defaultTeams: Team[] = [
  { name: 'Massachusetts', seed: 1 },
  { name: 'Oregon', seed: 2 },
  { name: 'Colorado', seed: 3 },
  { name: 'Carleton College', seed: 4 },
  { name: 'North Carolina', seed: 5 },
  { name: 'Cal Poly-SLO', seed: 6 },
  { name: 'California-Santa Cruz', seed: 7 },
  { name: 'Oregon State', seed: 8 },
  { name: 'Washington University', seed: 9 },
  { name: 'California', seed: 10 },
  { name: 'Northeastern', seed: 11 },
  { name: 'Texas', seed: 12 },
  { name: 'Vermont', seed: 13 },
  { name: 'Georgia', seed: 14 },
  { name: 'British Columbia', seed: 15 },
  { name: 'Penn State', seed: 16 },
  { name: 'Utah', seed: 17 },
  { name: 'Western Washington', seed: 18 },
  { name: 'Michigan', seed: 19 },
  { name: 'Ottawa', seed: 20 },
];

// Scoring configuration
const POINTS_PER_ROUND = {
  prequarters: 10,
  quarters: 20,
  semis: 40,
  final: 80,
};
const MAX_POSSIBLE_POINTS =
  4 * POINTS_PER_ROUND.prequarters +
  4 * POINTS_PER_ROUND.quarters +
  2 * POINTS_PER_ROUND.semis +
  1 * POINTS_PER_ROUND.final;

interface TournamentViewProps {
  teams?: Team[];
  baseTournamentName?: string; // Name of the overall tournament event
  user: {
    // User information
    email: string;
    uid: string;
  };
}

const TournamentView: React.FC<TournamentViewProps> = ({
  teams = defaultTeams,
  baseTournamentName = 'USA Ultimate College Nationals 2025', // Default base name
}) => {
  const { user } = useAuth();
  const [tournamentData, setTournamentData] =
    useState<TournamentDisplayData | null>(null);
  const [userBracketName, setUserBracketName] = useState<string>('');
  const [draggedTeam, setDraggedTeam] = useState<{
    poolName: string;
    index: number;
  } | null>(null);
  const [bracketGeneratedFromPools, setBracketGeneratedFromPools] =
    useState<boolean>(false);
  const [isBracketComplete, setIsBracketComplete] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSaveToast, setShowSaveToast] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(true); // Start in edit mode or based on loaded data

  const [countdown, setCountdown] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);

  const [currentScore, setCurrentScore] = useState<number>(0);
  const [possiblePointsRemaining, setPossiblePointsRemaining] =
    useState<number>(MAX_POSSIBLE_POINTS);

  // Initialize or load tournament data
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      if (!user || !user.uid) {
        console.error('User not provided or incomplete.');
        setTournamentData(createTournamentData(teams, baseTournamentName));
        setUserBracketName(`${user?.email || 'My'}'s Bracket`);
        setIsEditing(true);
        setIsLoading(false);
        return;
      }

      try {
        const savedUserPicks = await getUserBracketPicks(
          user.uid,
          baseTournamentName,
        );
        if (savedUserPicks) {
          setTournamentData(savedUserPicks.tournamentData);
          setUserBracketName(savedUserPicks.userBracketName);
          setBracketGeneratedFromPools(true); // Assume if saved, pools were processed
          setIsEditing(false); // Start in view mode if data is loaded
        } else {
          // No saved data, initialize new
          setTournamentData(createTournamentData(teams, baseTournamentName));
          setUserBracketName(`${user.email}'s Bracket`);
          setIsEditing(true);
        }
      } catch (error) {
        console.error('Error loading user bracket:', error);
        setTournamentData(createTournamentData(teams, baseTournamentName));
        setUserBracketName(`${user.email}'s Bracket`);
        setIsEditing(true);
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, [teams, baseTournamentName, user]);

  // Countdown Timer Logic
  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      let lockDate = new Date(now);

      // Find the next Friday
      const currentDay = now.getDay(); // Sunday = 0, Friday = 5
      const daysUntilFriday = (5 - currentDay + 7) % 7;
      lockDate.setDate(now.getDate() + daysUntilFriday);
      lockDate.setHours(5, 0, 0, 0); // 5 AM

      // If it's Friday and past 5 AM, set to next Friday
      if (now.getDay() === 5 && now.getTime() >= lockDate.getTime()) {
        lockDate.setDate(lockDate.getDate() + 7);
      } else if (now.getTime() >= lockDate.getTime()) {
        // If today is Sat/Sun and lockDate was for past Friday
        lockDate.setDate(lockDate.getDate() + 7);
      }

      const diff = lockDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown('Bracket Locked!');
        setIsLocked(true);
        setIsEditing(false); // Force view mode
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setCountdown(`${d}d ${h}h ${m}m ${s}s`);
      setIsLocked(false);
    };

    calculateCountdown(); // Initial call
    const intervalId = setInterval(calculateCountdown, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Calculate Score and Bracket Completion
  useEffect(() => {
    if (tournamentData?.bracket) {
      let score = 0;
      const rounds: (keyof TournamentDisplayData['bracket'])[] = [
        'prequarters',
        'quarters',
        'semis',
        'final',
      ];
      rounds.forEach((roundName) => {
        tournamentData.bracket[roundName].forEach((game) => {
          if (game.winner) {
            score += POINTS_PER_ROUND[roundName];
          }
        });
      });
      setCurrentScore(score);
      setPossiblePointsRemaining(MAX_POSSIBLE_POINTS - score);

      const finalGame = tournamentData.bracket.final[0];
      setIsBracketComplete(!!finalGame?.winner);
    } else {
      setCurrentScore(0);
      setPossiblePointsRemaining(MAX_POSSIBLE_POINTS);
      setIsBracketComplete(false);
    }
  }, [tournamentData]);

  if (isLoading || !tournamentData) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p>Loading tournament data...</p>
      </Container>
    );
  }

  const handleDragStart = (poolName: string, index: number) => {
    if (!isEditing || isLocked) return;
    setDraggedTeam({ poolName, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditing || isLocked) return;
    e.preventDefault();
  };

  const handleDrop = (poolName: string, index: number) => {
    if (
      !isEditing ||
      isLocked ||
      !draggedTeam ||
      draggedTeam.poolName !== poolName
    ) {
      setDraggedTeam(null);
      return;
    }

    const newTournamentData = { ...tournamentData };
    const pool = [...newTournamentData.pools[poolName]];
    const [movedTeam] = pool.splice(draggedTeam.index, 1);
    pool.splice(index, 0, movedTeam);
    newTournamentData.pools[poolName] = pool;
    setTournamentData(newTournamentData);
    setBracketGeneratedFromPools(false); // Pool order changed, bracket needs regeneration
    setDraggedTeam(null);
  };

  const generateBracket = () => {
    if (!isEditing || isLocked) return;
    const newBracket = populateBracketFromPools(
      tournamentData.pools,
      tournamentData.bracket,
    );
    setTournamentData((prev) => ({
      ...prev!,
      bracket: newBracket,
      // Update pools in tournamentData state to reflect advanced status
      pools: JSON.parse(JSON.stringify(prev!.pools)), // Deep copy to trigger re-render if needed
    }));
    setBracketGeneratedFromPools(true);
  };

  const handleTeamClick = (
    roundName: keyof TournamentDisplayData['bracket'],
    gameId: number,
    teamNumber: 1 | 2,
  ) => {
    if (!isEditing || isLocked || !bracketGeneratedFromPools) return;

    setTournamentData((prevData) => {
      if (!prevData) return null;
      const newTournamentData = JSON.parse(
        JSON.stringify(prevData),
      ) as TournamentDisplayData; // Deep copy
      const game = newTournamentData.bracket[roundName].find(
        (g) => g.id === gameId,
      );

      if (!game) return newTournamentData;
      const selectedTeam = teamNumber === 1 ? game.team1 : game.team2;
      if (selectedTeam === 'TBD') return newTournamentData;

      // If clicking the current winner, deselect (clear winner and subsequent games)
      if (game.winner === selectedTeam) {
        game.winner = null;
        // TODO: Clear subsequent games more robustly
        // For now, let's clear the direct next game if this was a winning pick
        clearNextRound(
          newTournamentData.bracket,
          roundName,
          gameId,
          selectedTeam,
        );
      } else {
        game.winner = selectedTeam;
        updateNextRound(
          newTournamentData.bracket,
          roundName,
          gameId,
          selectedTeam,
        );
      }
      return newTournamentData;
    });
  };

  // Helper to update the next round based on a winner
  const updateNextRound = (
    bracket: TournamentDisplayData['bracket'],
    currentRound: keyof TournamentDisplayData['bracket'],
    gameId: number,
    winner: string,
  ) => {
    let nextRoundKey: keyof TournamentDisplayData['bracket'] | null = null;
    let nextGameId: number | null = null;
    let teamPosInNextGame: 1 | 2 | null = null;

    if (currentRound === 'prequarters') {
      nextRoundKey = 'quarters';
      const pqMap = [
        { id: 1, nextId: 5, pos: 2 },
        { id: 2, nextId: 6, pos: 2 },
        { id: 3, nextId: 7, pos: 2 },
        { id: 4, nextId: 8, pos: 2 },
      ];
      const mapping = pqMap.find((m) => m.id === gameId);
      if (mapping) {
        nextGameId = mapping.nextId;
        teamPosInNextGame = mapping.pos as 1 | 2;
      }
    } else if (currentRound === 'quarters') {
      nextRoundKey = 'semis';
      const qfMap = [
        { id: 5, nextId: 9, pos: 1 },
        { id: 6, nextId: 9, pos: 2 },
        { id: 7, nextId: 10, pos: 1 },
        { id: 8, nextId: 10, pos: 2 },
      ];
      const mapping = qfMap.find((m) => m.id === gameId);
      if (mapping) {
        nextGameId = mapping.nextId;
        teamPosInNextGame = mapping.pos as 1 | 2;
      }
    } else if (currentRound === 'semis') {
      nextRoundKey = 'final';
      const sfMap = [
        { id: 9, nextId: 11, pos: 1 },
        { id: 10, nextId: 11, pos: 2 },
      ];
      const mapping = sfMap.find((m) => m.id === gameId);
      if (mapping) {
        nextGameId = mapping.nextId;
        teamPosInNextGame = mapping.pos as 1 | 2;
      }
    }

    if (nextRoundKey && nextGameId !== null && teamPosInNextGame !== null) {
      const nextGame = bracket[nextRoundKey].find((g) => g.id === nextGameId);
      if (nextGame) {
        if (teamPosInNextGame === 1) nextGame.team1 = winner;
        else nextGame.team2 = winner;
        nextGame.winner = null; // Clear winner of next game as it's now TBD
        // Recursively clear further rounds if this game's winner was already set
        clearNextRound(
          bracket,
          nextRoundKey,
          nextGameId,
          nextGame.team1 === winner ? nextGame.team2 : nextGame.team1,
        ); // Clear based on the other team if it was part of a previous win
      }
    }
  };

  // Helper to clear subsequent rounds if a winner is deselected or changed
  const clearNextRound = (
    bracket: TournamentDisplayData['bracket'],
    currentRound: keyof TournamentDisplayData['bracket'],
    gameId: number,
    teamThatNoLongerAdvances: string | null, // The team that was previously winning this game
  ) => {
    // This function needs to be robust. If a winner is cleared,
    // any subsequent game that featured this winner must be reset.
    // And its winner, and so on.
    // For simplicity in this example, we'll just clear the immediate next game.
    // A full implementation would trace all dependencies.

    let nextRoundKey: keyof TournamentDisplayData['bracket'] | null = null;
    let nextGameId: number | null = null;

    // Determine the next game affected
    if (currentRound === 'prequarters') {
      nextRoundKey = 'quarters';
      const mapping = [
        { id: 1, nextId: 5 },
        { id: 2, nextId: 6 },
        { id: 3, nextId: 7 },
        { id: 4, nextId: 8 },
      ];
      nextGameId = mapping.find((m) => m.id === gameId)?.nextId || null;
    } else if (currentRound === 'quarters') {
      nextRoundKey = 'semis';
      const mapping = [
        { id: 5, nextId: 9 },
        { id: 6, nextId: 9 },
        { id: 7, nextId: 10 },
        { id: 8, nextId: 10 },
      ];
      nextGameId = mapping.find((m) => m.id === gameId)?.nextId || null;
    } else if (currentRound === 'semis') {
      nextRoundKey = 'final';
      nextGameId = 11; // Only one final game
    }

    if (nextRoundKey && nextGameId) {
      const nextGame = bracket[nextRoundKey].find((g) => g.id === nextGameId);
      if (nextGame) {
        let changed = false;
        if (nextGame.team1 === teamThatNoLongerAdvances) {
          nextGame.team1 = 'TBD';
          changed = true;
        }
        if (nextGame.team2 === teamThatNoLongerAdvances) {
          nextGame.team2 = 'TBD';
          changed = true;
        }
        if (changed || nextGame.winner) {
          // If teams changed or if there was a winner
          const oldWinnerOfNextGame = nextGame.winner;
          nextGame.winner = null;
          if (oldWinnerOfNextGame) {
            // If this game had a winner, recursively clear
            clearNextRound(
              bracket,
              nextRoundKey,
              nextGame.id,
              oldWinnerOfNextGame,
            );
          }
        }
      }
    }
  };

  const handleSaveUserPicks = async () => {
    if (!tournamentData || !user || !user.uid) {
      setSaveMessage(
        'Cannot save. Bracket might be locked or user data missing.',
      );
      setShowSaveToast(true);
      return;
    }
    if (!bracketGeneratedFromPools) {
      setSaveMessage(
        'Please generate the bracket from pool rankings before saving.',
      );
      setShowSaveToast(true);
      return;
    }
    if (!userBracketName.trim()) {
      setSaveMessage('Bracket name cannot be empty.');
      setShowSaveToast(true);
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    // Ensure the tournamentData being saved is the FirebaseTournamentType
    const dataToSave: FirebaseTournamentType = {
      name: tournamentData.name, // Base tournament name
      pools: tournamentData.pools,
      bracket: tournamentData.bracket,
      // timestamp and champion will be set by saveUserBracketPicks
    };

    try {
      await saveUserBracketPicks(
        user.uid,
        tournamentData.name,
        userBracketName,
        dataToSave,
      );
      setSaveMessage(`Bracket "${userBracketName}" saved successfully!`);
      setIsEditing(false); // Switch to view mode after saving
    } catch (error) {
      console.error('Error saving user bracket picks:', error);
      setSaveMessage(`Failed to save bracket. ${(error as Error).message}`);
    } finally {
      setIsSaving(false);
      setShowSaveToast(true);
    }
  };

  const renderPoolStandings = () => (
    <div className="mt-4">
      <Row>
        {Object.entries(tournamentData.pools).map(([poolName, poolTeams]) => (
          <Col md={3} key={poolName} className="mb-4">
            <Card className="pool-card">
              <Card.Header className="bg-secondary text-white text-center">
                <h5 className="mb-0">{poolName}</h5>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="pool-teams-container">
                  {(poolTeams || []).map((team, index) => (
                    <div
                      key={index}
                      className={`pool-team-item ${team.advanced ? 'pool-team-advanced' : ''}`}
                      draggable={
                        isEditing && !isLocked && !bracketGeneratedFromPools
                      }
                      onDragStart={() => handleDragStart(poolName, index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(poolName, index)}
                      style={{
                        cursor:
                          isEditing && !isLocked && !bracketGeneratedFromPools
                            ? 'grab'
                            : 'default',
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <span>{getTeamName(team.team)}</span>
                          <Badge bg="secondary" className="ms-2">
                            {getSeed(team.team)}
                          </Badge>
                        </div>
                        {/* Wins/Losses might not be user-editable, but kept for structure
                        <span className="team-record">{team.wins} - {team.losses}</span>
                        */}
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      {isEditing && !isLocked && (
        <div className="d-flex justify-content-center mt-3 mb-5">
          <Button
            variant="primary"
            size="lg"
            onClick={generateBracket}
            disabled={bracketGeneratedFromPools || !isEditing || isLocked}
          >
            {bracketGeneratedFromPools
              ? 'Bracket Populated'
              : 'Populate Bracket from Pool Rankings'}
          </Button>
        </div>
      )}
    </div>
  );

  const BracketGameDisplay = ({
    game,
    roundName,
  }: {
    game: BracketGame;
    roundName: keyof TournamentDisplayData['bracket'];
  }) => {
    const team1Name = getTeamName(game.team1);
    const team2Name = getTeamName(game.team2);
    const seed1 = getSeed(game.team1);
    const seed2 = getSeed(game.team2);
    const isWinner1 = game.winner === game.team1 && game.team1 !== 'TBD';
    const isWinner2 = game.winner === game.team2 && game.team2 !== 'TBD';
    const clickable = isEditing && !isLocked && bracketGeneratedFromPools;

    return (
      <div className="bracket-game mb-4">
        <div
          className={`bracket-team ${isWinner1 ? 'winner' : ''} ${clickable && game.team1 !== 'TBD' ? 'clickable' : ''}`}
          onClick={() =>
            clickable &&
            game.team1 !== 'TBD' &&
            handleTeamClick(roundName, game.id, 1)
          }
        >
          <span>{team1Name}</span>
          {seed1 && (
            <Badge bg="secondary" className="ms-1">
              {seed1}
            </Badge>
          )}
        </div>
        <div
          className={`bracket-team ${isWinner2 ? 'winner' : ''} ${clickable && game.team2 !== 'TBD' ? 'clickable' : ''}`}
          onClick={() =>
            clickable &&
            game.team2 !== 'TBD' &&
            handleTeamClick(roundName, game.id, 2)
          }
        >
          <span>{team2Name}</span>
          {seed2 && (
            <Badge bg="secondary" className="ms-1">
              {seed2}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const renderBracket = () => (
    <div className="tournament-bracket mt-4">
      <div className="bracket-container">
        <Row>
          {['prequarters', 'quarters', 'semis', 'final'].map((roundKey) => (
            <Col md={3} key={roundKey}>
              <h5 className="text-center mb-3 text-capitalize">{roundKey}</h5>
              {tournamentData.bracket[
                roundKey as keyof TournamentDisplayData['bracket']
              ].map((game) => (
                <BracketGameDisplay
                  key={game.id}
                  game={game}
                  roundName={roundKey as keyof TournamentDisplayData['bracket']}
                />
              ))}
            </Col>
          ))}
        </Row>
      </div>

      {bracketGeneratedFromPools && isEditing && !isLocked && (
        <p className="text-center text-muted mt-2">
          Click on a team to advance them. Click again to deselect.
        </p>
      )}
      {isBracketComplete && !isEditing && (
        <Alert variant="success" className="text-center mt-3">
          Your bracket is complete! Champion:{' '}
          <strong>
            {getTeamName(tournamentData.bracket.final[0].winner!)}
          </strong>
        </Alert>
      )}
    </div>
  );

  return (
    <Container className="mt-4">
      <div className="bg-primary text-white py-3 mb-4 border rounded">
        <Container>
          <h2 className="text-center mb-0">{tournamentData.name}</h2>
          {user && (
            <p className="text-center mb-0 small">Viewing as: {user.email}</p>
          )}
        </Container>
      </div>

      {/* Bracket Name and Edit/Save Controls */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={isEditing ? 8 : 12}>
              <Form.Group controlId="bracketName">
                <Form.Label>Bracket Name</Form.Label>
                <Form.Control
                  type="text"
                  value={userBracketName}
                  onChange={(e) => setUserBracketName(e.target.value)}
                  readOnly={!isEditing || isLocked}
                  placeholder="Enter a name for your bracket"
                />
              </Form.Group>
            </Col>
            {isEditing && !isLocked && (
              <Col md={4} className="d-flex align-items-end">
                <Button
                  variant="success"
                  onClick={handleSaveUserPicks}
                  disabled={isSaving || !bracketGeneratedFromPools}
                  className="w-100"
                >
                  {isSaving ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                      />{' '}
                      Saving...
                    </>
                  ) : (
                    'Save Picks & Bracket Name'
                  )}
                </Button>
              </Col>
            )}
          </Row>
          {!isEditing && !isLocked && (
            <Button
              variant="info"
              onClick={() => setIsEditing(true)}
              className="mt-3"
            >
              Edit Bracket
            </Button>
          )}
          {isLocked && (
            <Alert variant="warning" className="mt-3">
              Bracket is locked. No more edits allowed.
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Countdown and Points */}
      <Row className="mb-4 text-center">
        <Col md={4}>
          <Card bg="light">
            <Card.Header>Bracket Locks In</Card.Header>
            <Card.Body>
              <Card.Title>{countdown}</Card.Title>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card bg="light">
            <Card.Header>Your Current Bracket Score</Card.Header>
            <Card.Body>
              <Card.Title>
                {currentScore} / {MAX_POSSIBLE_POINTS}
              </Card.Title>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card bg="light">
            <Card.Header>Possible Points Remaining</Card.Header>
            <Card.Body>
              <Card.Title>{possiblePointsRemaining}</Card.Title>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Pool Play section */}
      <div className="bg-light py-3 mb-4 border rounded">
        <Container>
          <h3 className="text-center mb-0">Pool Play</h3>
          {isEditing && !isLocked && !bracketGeneratedFromPools && (
            <p className="text-center text-muted mt-2 mb-0">
              Drag and drop teams to reorder within pools. Then, populate the
              bracket.
            </p>
          )}
          {(!isEditing || (isLocked && !bracketGeneratedFromPools)) && (
            <p className="text-center text-muted mt-2 mb-0">
              Pool rankings are set. Click "Edit Bracket" to make changes if not
              locked.
            </p>
          )}
          {bracketGeneratedFromPools && (
            <p className="text-center text-muted mt-2 mb-0">
              Pool rankings used to generate bracket. Edit pools by first
              resetting/clearing bracket or re-generate.
            </p>
          )}
        </Container>
      </div>
      {renderPoolStandings()}

      {/* Bracket section */}
      <div className="mt-5">
        <div className="bg-light py-3 mb-4 border rounded">
          <Container>
            <h3 className="text-center mb-0">Bracket Play</h3>
            {!bracketGeneratedFromPools && (!isEditing || isLocked) && (
              <p className="text-center text-muted mt-2 mb-0">
                Generate bracket from pool play first.
              </p>
            )}
            {bracketGeneratedFromPools && isEditing && !isLocked && (
              <p className="text-center text-muted mt-2 mb-0">
                Click teams to advance them. Picks are saved with "Save My Picks
                & Name".
              </p>
            )}
          </Container>
        </div>
        {bracketGeneratedFromPools ? (
          renderBracket()
        ) : (
          <Alert variant="info" className="text-center">
            Please complete pool rankings and click "Populate Bracket from Pool
            Rankings" above to view the bracket.
          </Alert>
        )}
      </div>

      <ToastContainer position="bottom-end" className="p-3">
        <Toast
          onClose={() => setShowSaveToast(false)}
          show={showSaveToast}
          delay={6000}
          autohide
          bg={saveMessage?.includes('Failed') ? 'danger' : 'success'}
        >
          <Toast.Header>
            <strong className="me-auto">
              {saveMessage?.includes('Failed') ? 'Error' : 'Notification'}
            </strong>
          </Toast.Header>
          <Toast.Body className="text-white">{saveMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default TournamentView;
