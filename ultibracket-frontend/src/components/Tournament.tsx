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
    console.warn(
      'Not enough teams to fill pools according to the defined structure.',
    );
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
  // currentBracket?: TournamentDisplayData['bracket'], // We will always create a fresh bracket from pools
) => {
  const newBracket = createEmptyBracket(); // Always start with a fresh empty bracket

  const poolA = pools['Pool A']?.slice(0, 3) || [];
  const poolB = pools['Pool B']?.slice(0, 3) || [];
  const poolC = pools['Pool C']?.slice(0, 3) || [];
  const poolD = pools['Pool D']?.slice(0, 3) || [];

  // Mark teams as advanced in pools (visual cue)
  Object.values(pools).forEach((poolTeams) => {
    poolTeams.forEach((pt) => (pt.advanced = false)); // Reset first
  });
  [...poolA, ...poolB, ...poolC, ...poolD].forEach((pt) => {
    // Find the team in the original pools structure and mark it
    for (const poolName in pools) {
      const teamInPool = pools[poolName].find(
        (poolTeam) => poolTeam.team === pt.team,
      );
      if (teamInPool) {
        teamInPool.advanced = true;
        break;
      }
    }
  });

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

  return newBracket;
};

const createTournamentData = (
  teams: Team[],
  name: string,
): TournamentDisplayData => {
  const pools = createPools(teams);
  const bracket = createEmptyBracket();
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
  baseTournamentName?: string;
  viewOnlyUserId?: string;
  viewOnlyTournamentName?: string;
}

const TournamentView: React.FC<TournamentViewProps> = ({
  teams = defaultTeams,
  baseTournamentName:
    propBaseTournamentName = 'USA Ultimate College Nationals 2025',
  viewOnlyUserId,
  viewOnlyTournamentName,
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
  const [isEditing, setIsEditing] = useState<boolean>(!viewOnlyUserId);
  const [errorLoading, setErrorLoading] = useState<string | null>(null);

  const effectiveUserId = viewOnlyUserId || user?.uid;
  const effectiveBaseTournamentName =
    viewOnlyTournamentName || propBaseTournamentName;
  const isViewingSomeoneElse =
    !!viewOnlyUserId && (!user || viewOnlyUserId !== user.uid);

  const [countdown, setCountdown] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);

  const [currentScore, setCurrentScore] = useState<number>(0);
  const [possiblePointsRemaining, setPossiblePointsRemaining] =
    useState<number>(MAX_POSSIBLE_POINTS);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      setErrorLoading(null);
      if (!effectiveUserId || !effectiveBaseTournamentName) {
        setErrorLoading(
          'Required information (user or tournament) is missing to display the bracket.',
        );
        setIsLoading(false);
        setTournamentData(null);
        return;
      }
      try {
        const savedUserPicks = await getUserBracketPicks(
          effectiveUserId,
          effectiveBaseTournamentName,
        );
        if (savedUserPicks) {
          setTournamentData(savedUserPicks.tournamentData);
          setUserBracketName(savedUserPicks.userBracketName);
          // Check if the loaded bracket has any teams beyond TBD, implying it was populated
          const hasPicks =
            savedUserPicks.tournamentData.bracket.prequarters.some(
              (g) => g.team1 !== 'TBD',
            ) ||
            savedUserPicks.tournamentData.bracket.quarters.some(
              (g) => g.team1 !== 'TBD',
            );
          setBracketGeneratedFromPools(hasPicks);
          setIsEditing(false);
        } else {
          if (isViewingSomeoneElse) {
            setErrorLoading(`Bracket not found for the specified user.`);
            setTournamentData(null);
          } else if (user?.uid === effectiveUserId && !isLocked) {
            const newTournament = createTournamentData(
              teams,
              effectiveBaseTournamentName,
            );
            setTournamentData(newTournament);
            setUserBracketName(`${user.email}'s Bracket`);
            setIsEditing(true);
            setBracketGeneratedFromPools(false);
          } else {
            setErrorLoading('Cannot create new bracket (locked or no user).');
            setTournamentData(
              createTournamentData(teams, effectiveBaseTournamentName),
            );
            setIsEditing(false);
          }
        }
      } catch (error) {
        console.error('Error loading user bracket:', error);
        setErrorLoading(
          `Failed to load bracket data. ${(error as Error).message}`,
        );
        setTournamentData(null);
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, [
    teams,
    propBaseTournamentName,
    user,
    viewOnlyUserId,
    viewOnlyTournamentName,
    isLocked,
  ]);

  useEffect(() => {
    const calculateCountdown = () => {
      // Target date: Friday, May 23, 2025, 10:30 AM PDT (UTC-7)
      // PDT is UTC-7. So, 10:30 AM PDT is 17:30 UTC.
      const lockDate = new Date('2025-05-23T17:30:00Z'); // Target date in UTC

      const now = new Date(); // Current time in user's local timezone

      const diff = lockDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown('Bracket Locked!');
        setIsLocked(true);
        // Only set isEditing to false if not viewing someone else's bracket
        // and the current user could potentially edit.
        if (!isViewingSomeoneElse) {
          setIsEditing(false);
        }
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setCountdown(`${d}d ${h}h ${m}m ${s}s`);
      setIsLocked(false); // Ensure isLocked is false if countdown is active
    };

    calculateCountdown(); // Initial call
    const intervalId = setInterval(calculateCountdown, 1000);

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [isViewingSomeoneElse, setIsLocked, setCountdown, setIsEditing]); // Added setIsLocked, setCountdown, setIsEditing as dependencies because they are used in the effect

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
          if (game.winner) score += POINTS_PER_ROUND[roundName];
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

  if (isLoading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" />
        <p>Loading Bracket...</p>
      </Container>
    );
  }
  if (errorLoading) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">{errorLoading}</Alert>
      </Container>
    );
  }
  if (!tournamentData && !isEditing) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">Bracket data is unavailable.</Alert>
      </Container>
    );
  }
  if (!tournamentData) {
    if (isEditing && user && !isViewingSomeoneElse) {
      return (
        <Container className="text-center mt-5">
          <Spinner animation="border" />
          <p>Initializing new bracket...</p>
        </Container>
      );
    }
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          Critical error: Bracket data could not be initialized.
        </Alert>
      </Container>
    );
  }

  const handleDragStart = (poolName: string, index: number) => {
    if (!isEditing || isLocked || isViewingSomeoneElse) return; // Allow drag if editing own bracket
    setDraggedTeam({ poolName, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditing || isLocked || isViewingSomeoneElse) return;
    e.preventDefault();
  };

  const handleDrop = (poolName: string, index: number) => {
    if (
      !isEditing ||
      isLocked ||
      isViewingSomeoneElse ||
      !draggedTeam ||
      draggedTeam.poolName !== poolName
    ) {
      setDraggedTeam(null);
      return;
    }

    const newTournamentData = { ...tournamentData }; // Shallow copy tournamentData
    newTournamentData.pools = JSON.parse(
      JSON.stringify(newTournamentData.pools),
    ); // Deep copy pools

    const pool = newTournamentData.pools[poolName];
    const [movedTeam] = pool.splice(draggedTeam.index, 1);
    pool.splice(index, 0, movedTeam);

    // Pool order changed, so bracket needs regeneration and picks are invalid
    newTournamentData.bracket = createEmptyBracket();
    setTournamentData(newTournamentData);
    setBracketGeneratedFromPools(false);
    setDraggedTeam(null);
  };

  const generateBracket = () => {
    if (!isEditing || isLocked || isViewingSomeoneElse) return;

    // Create a deep copy of pools to pass to populateBracketFromPools
    // and to ensure 'advanced' status is correctly updated on a fresh copy for display
    const currentPoolsCopy = JSON.parse(JSON.stringify(tournamentData.pools));
    const newBracket = populateBracketFromPools(currentPoolsCopy);

    setTournamentData((prev) => ({
      ...prev!,
      pools: currentPoolsCopy, // Use the modified copy of pools
      bracket: newBracket,
    }));
    setBracketGeneratedFromPools(true);
  };

  const handleTeamClick = (
    roundName: keyof TournamentDisplayData['bracket'],
    gameId: number,
    teamNumber: 1 | 2,
  ) => {
    if (
      !isEditing ||
      isLocked ||
      !bracketGeneratedFromPools ||
      isViewingSomeoneElse
    )
      return;

    setTournamentData((prevData) => {
      if (!prevData) return null;
      const newTournamentData = JSON.parse(
        JSON.stringify(prevData),
      ) as TournamentDisplayData;
      const game = newTournamentData.bracket[roundName].find(
        (g) => g.id === gameId,
      );
      if (!game) return newTournamentData;
      const selectedTeam = teamNumber === 1 ? game.team1 : game.team2;
      if (selectedTeam === 'TBD') return newTournamentData;

      if (game.winner === selectedTeam) {
        game.winner = null;
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
        const oldTeamInNextSlot =
          teamPosInNextGame === 1 ? nextGame.team1 : nextGame.team2;
        if (teamPosInNextGame === 1) nextGame.team1 = winner;
        else nextGame.team2 = winner;

        // If the team in the slot changed, or if there was a winner, clear subsequent winner
        if (oldTeamInNextSlot !== winner || nextGame.winner) {
          const oldWinnerOfNextGame = nextGame.winner;
          nextGame.winner = null;
          if (oldWinnerOfNextGame) {
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

  const clearNextRound = (
    bracket: TournamentDisplayData['bracket'],
    currentRound: keyof TournamentDisplayData['bracket'],
    gameId: number,
    teamThatNoLongerAdvances: string | null,
  ) => {
    let nextRoundKey: keyof TournamentDisplayData['bracket'] | null = null;
    let nextGameId: number | null = null;

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
      nextGameId = 11;
    }

    if (nextRoundKey && nextGameId) {
      const nextGame = bracket[nextRoundKey].find((g) => g.id === nextGameId);
      if (nextGame) {
        let teamSlotChanged = false;
        if (nextGame.team1 === teamThatNoLongerAdvances) {
          nextGame.team1 = 'TBD';
          teamSlotChanged = true;
        }
        if (nextGame.team2 === teamThatNoLongerAdvances) {
          nextGame.team2 = 'TBD';
          teamSlotChanged = true;
        }

        if (teamSlotChanged || nextGame.winner) {
          const oldWinnerOfNextGame = nextGame.winner;
          nextGame.winner = null;
          if (oldWinnerOfNextGame) {
            // If this game itself had a winner that depended on teamThatNoLongerAdvances
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
    if (!tournamentData || !user || !user.uid || isLocked) {
      // Added isLocked check
      setSaveMessage(
        'Cannot save. Bracket might be locked or user data missing.',
      );
      setShowSaveToast(true);
      return;
    }
    if (!bracketGeneratedFromPools) {
      setSaveMessage(
        'Please populate the bracket from pool rankings before saving.',
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
    const dataToSave: FirebaseTournamentType = {
      name: tournamentData.name,
      pools: tournamentData.pools,
      bracket: tournamentData.bracket,
    };
    try {
      await saveUserBracketPicks(
        user.uid,
        tournamentData.name,
        userBracketName,
        dataToSave,
      );
      setSaveMessage(`Bracket "${userBracketName}" saved successfully!`);
      setIsEditing(false);
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
                      key={team.team + index} // Ensure unique key if team names can repeat across reorders
                      className={`pool-team-item ${team.advanced && bracketGeneratedFromPools ? 'pool-team-advanced' : ''}`}
                      draggable={
                        isEditing && !isLocked && !isViewingSomeoneElse
                      } // MODIFIED
                      onDragStart={() => handleDragStart(poolName, index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(poolName, index)}
                      style={{
                        cursor:
                          isEditing && !isLocked && !isViewingSomeoneElse
                            ? 'grab'
                            : 'default', // MODIFIED
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <span>{getTeamName(team.team)}</span>
                          <Badge bg="secondary" className="ms-2">
                            {getSeed(team.team)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      {isEditing &&
        !isLocked &&
        !isViewingSomeoneElse && ( // Only show button if editing own bracket
          <div className="d-flex justify-content-center mt-3 mb-5">
            <Button
              variant="primary"
              size="lg"
              onClick={generateBracket}
              disabled={bracketGeneratedFromPools} // Disable if already populated
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
    const clickable =
      isEditing &&
      !isLocked &&
      bracketGeneratedFromPools &&
      !isViewingSomeoneElse;

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
      {bracketGeneratedFromPools &&
        isEditing &&
        !isLocked &&
        !isViewingSomeoneElse && (
          <p className="text-center text-muted mt-2">
            Click on a team to advance them. Click again to deselect.
          </p>
        )}
      {isBracketComplete &&
        (!isEditing || isViewingSomeoneElse) && ( // Show completed message if not editing OR if viewing someone else
          <Alert variant="success" className="text-center mt-3">
            {!isViewingSomeoneElse
              ? 'Your bracket is complete!'
              : 'Bracket is complete.'}
            Champion:{' '}
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
          {isViewingSomeoneElse && userBracketName && (
            <p className="text-center mb-0 small">Viewing: {userBracketName}</p>
          )}
          {!isViewingSomeoneElse && user && (
            <p className="text-center mb-0 small">My Bracket ({user.email})</p>
          )}
        </Container>
      </div>

      {!isViewingSomeoneElse && (
        <Card className="mb-4">
          <Card.Header>My Bracket Controls</Card.Header>
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
                    disabled={
                      isSaving || !bracketGeneratedFromPools || isLocked
                    }
                    className="w-100"
                  >
                    {isSaving ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" />{' '}
                        Saving...
                      </>
                    ) : (
                      'Save Picks & Name'
                    )}
                  </Button>
                </Col>
              )}
            </Row>
            {!isEditing && !isLocked && user?.uid === effectiveUserId && (
              <Button
                variant="info"
                onClick={() => setIsEditing(true)}
                className="mt-3"
              >
                Edit Bracket
              </Button>
            )}
            {isLocked && !isViewingSomeoneElse && (
              <Alert variant="warning" className="mt-3">
                Bracket is locked. No more edits allowed.
              </Alert>
            )}
          </Card.Body>
        </Card>
      )}

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
            <Card.Header>
              {isViewingSomeoneElse
                ? 'Bracket Score'
                : 'Your Current Bracket Score'}
            </Card.Header>
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

      <div className="bg-light py-3 mb-4 border rounded">
        <Container>
          <h3 className="text-center mb-0">Pool Play</h3>
          {isEditing && !isLocked && !isViewingSomeoneElse && (
            <p className="text-center text-muted mt-2 mb-0">
              Drag and drop teams to reorder pools.
              {!bracketGeneratedFromPools &&
                ' Then, populate the bracket using the button below.'}
              {bracketGeneratedFromPools &&
                ' Pool order changed, re-populate bracket below.'}
            </p>
          )}
          {(!isEditing || isLocked || isViewingSomeoneElse) && ( // Viewing or locked
            <p className="text-center text-muted mt-2 mb-0">
              Current pool rankings.
              {!isViewingSomeoneElse &&
                !isLocked &&
                user?.uid === effectiveUserId &&
                ' Click "Edit Bracket" to make changes.'}
            </p>
          )}
        </Container>
      </div>
      {renderPoolStandings()}

      <div className="mt-5">
        <div className="bg-light py-3 mb-4 border rounded">
          <Container>
            <h3 className="text-center mb-0">Bracket Play</h3>
            {isEditing &&
              !isLocked &&
              !isViewingSomeoneElse &&
              !bracketGeneratedFromPools && (
                <p className="text-center text-muted mt-2 mb-0">
                  Populate bracket from pool rankings to make picks.
                </p>
              )}
            {isEditing &&
              !isLocked &&
              !isViewingSomeoneElse &&
              bracketGeneratedFromPools && (
                <p className="text-center text-muted mt-2 mb-0">
                  Click teams to advance them. Save picks with "Save Picks &
                  Name".
                </p>
              )}
            {(!isEditing || isLocked || isViewingSomeoneElse) &&
              !bracketGeneratedFromPools && (
                <p className="text-center text-muted mt-2 mb-0">
                  Bracket not yet populated from pools.
                </p>
              )}
            {(!isEditing || isLocked || isViewingSomeoneElse) &&
              bracketGeneratedFromPools && (
                <p className="text-center text-muted mt-2 mb-0">
                  Current bracket picks.
                </p>
              )}
          </Container>
        </div>
        {bracketGeneratedFromPools ? (
          renderBracket()
        ) : (
          <Alert variant="info" className="text-center">
            {isEditing && !isLocked && !isViewingSomeoneElse
              ? 'Please complete pool rankings and click "Populate Bracket from Pool Rankings" above to view and interact with the bracket.'
              : 'Bracket will be displayed once populated from pool rankings.'}
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
