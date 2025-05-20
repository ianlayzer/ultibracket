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
  Form,
  Alert,
} from 'react-bootstrap';
import { useState, useEffect, useMemo } from 'react';
import './Tournament.css';
import {
  saveUserBracketPicks,
  getUserBracketPicks,
  Tournament as FirebaseTournamentType,
  getMasterTournament,
  saveMasterTournament,
  deleteMasterTournament,
} from './../firebase/FirebaseUtils';
import { useAuth } from '../firebase/useAuth';
import { useDivision } from '../contexts/DivisionContext';
import {
  calculateBracketScoresAgainstMaster,
  MAX_POSSIBLE_POINTS_NEW_SYSTEM,
  SCORING_RULES_ROUND_NAMES,
} from './../utils/scoreUtils';

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
  score: string;
  winner: string | null;
}
interface TournamentDisplayData {
  name: string;
  pools: { [key: string]: PoolTeam[] };
  bracket: {
    prequarters: BracketGame[];
    quarters: BracketGame[];
    semis: BracketGame[];
    final: BracketGame[];
  };
}

// Helper functions
const getTeamName = (fullTeamString: string): string => {
  if (!fullTeamString || fullTeamString === 'TBD') return 'TBD';
  return fullTeamString.replace(/\s*\(\d+\)$/, '');
};
const getSeed = (fullTeamString: string): number | null => {
  if (!fullTeamString || fullTeamString === 'TBD') return null;
  const match = fullTeamString.match(/\((\d+)\)$/);
  return match ? parseInt(match[1]) : null;
};
const formatTeamString = (team: Team): string => `${team.name} (${team.seed})`;

// Data creation functions
const createPools = (teams: Team[]): { [key: string]: PoolTeam[] } => {
  const sortedTeams = [...teams].sort((a, b) => a.seed - b.seed);
  const pools: { [key: string]: PoolTeam[] } = {
    'Pool A': [],
    'Pool B': [],
    'Pool C': [],
    'Pool D': [],
  };
  if (sortedTeams.length < 20) {
    console.warn('Not enough teams to fill pools for division.');
    const poolNames = Object.keys(pools);
    sortedTeams.forEach((team, index) =>
      pools[poolNames[index % poolNames.length]].push(createPoolTeam(team)),
    );
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
  pools['Pool A'].push(createPoolTeam(sortedTeams[16]));
  pools['Pool B'].push(createPoolTeam(sortedTeams[13]));
  pools['Pool C'].push(createPoolTeam(sortedTeams[14]));
  pools['Pool D'].push(createPoolTeam(sortedTeams[15]));
  pools['Pool A'].push(createPoolTeam(sortedTeams[12]));
  pools['Pool B'].push(createPoolTeam(sortedTeams[17]));
  pools['Pool C'].push(createPoolTeam(sortedTeams[18]));
  pools['Pool D'].push(createPoolTeam(sortedTeams[19]));
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
const populateBracketFromPools = (pools: {
  [key: string]: PoolTeam[];
}): TournamentDisplayData['bracket'] => {
  const newBracket = createEmptyBracket();
  const poolA = pools['Pool A']?.slice(0, 3) || [];
  const poolB = pools['Pool B']?.slice(0, 3) || [];
  const poolC = pools['Pool C']?.slice(0, 3) || [];
  const poolD = pools['Pool D']?.slice(0, 3) || [];
  Object.values(pools).forEach((poolTeams) =>
    poolTeams.forEach((pt) => (pt.advanced = false)),
  );
  [...poolA, ...poolB, ...poolC, ...poolD].forEach((pt) => {
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
  nameWithDivision: string,
): TournamentDisplayData => {
  const pools = createPools(teams);
  const bracket = createEmptyBracket();
  return { name: nameWithDivision, pools, bracket };
};

const defaultMensTeams: Team[] = [
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
const defaultWomensTeams: Team[] = [
  { name: 'British Columbia', seed: 1 },
  { name: 'Carleton', seed: 2 },
  { name: 'Tufts', seed: 3 },
  { name: 'Colorado', seed: 4 },
  { name: 'Vermont', seed: 5 },
  { name: 'Washington', seed: 6 },
  { name: 'Oregon', seed: 7 },
  { name: 'North Carolina', seed: 8 },
  { name: 'Stanford', seed: 9 },
  { name: 'California-Santa Barbara', seed: 10 },
  { name: 'Michigan', seed: 11 },
  { name: 'Cal Poly-SLO', seed: 12 },
  { name: 'California-San Diego', seed: 13 },
  { name: 'California-Santa Cruz', seed: 14 },
  { name: 'Utah', seed: 15 },
  { name: 'Victoria', seed: 16 },
  { name: 'Pennsylvania', seed: 17 },
  { name: 'California-Davis', seed: 18 },
  { name: 'Georgia', seed: 19 },
  { name: 'Cornell', seed: 20 },
];

const BASE_TOURNAMENT_NAME_CORE = 'USA Ultimate College Nationals 2025';
const BASE_MASTER_BRACKET_ID_CORE = 'MASTER_BRACKET_USAU_2025';

type RoundName = keyof TournamentDisplayData['bracket'];
const ROUND_ORDER: RoundName[] = ['prequarters', 'quarters', 'semis', 'final'];

interface TournamentViewProps {
  viewOnlyUserId?: string;
  viewOnlyTournamentName?: string;
  isMasterBracket?: boolean;
}

const TournamentView: React.FC<TournamentViewProps> = ({
  viewOnlyUserId,
  viewOnlyTournamentName,
  isMasterBracket = false,
}) => {
  const { user } = useAuth();
  const {
    currentDivision,
    getDivisionSpecificName,
    getDivisionSpecificMasterId,
  } = useDivision();
  const activeDefaultTeams =
    currentDivision === 'mens' ? defaultMensTeams : defaultWomensTeams;
  const currentBaseTournamentName = getDivisionSpecificName(
    BASE_TOURNAMENT_NAME_CORE,
  );
  const currentMasterBracketIdentifier = getDivisionSpecificMasterId(
    BASE_MASTER_BRACKET_ID_CORE,
  );

  const [tournamentData, setTournamentData] =
    useState<TournamentDisplayData | null>(null);
  const [userBracketName, setUserBracketName] = useState<string>(
    isMasterBracket ? currentMasterBracketIdentifier : '',
  );
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
  const [isEditing, setIsEditing] = useState<boolean>(
    isMasterBracket ? true : !viewOnlyUserId,
  );
  const [errorLoading, setErrorLoading] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [possiblePointsRemaining, setPossiblePointsRemaining] =
    useState<number>(MAX_POSSIBLE_POINTS_NEW_SYSTEM);
  const [maxPointsForDisplay, setMaxPointsForDisplay] = useState<number>(
    MAX_POSSIBLE_POINTS_NEW_SYSTEM,
  );
  const [masterBracketForScoring, setMasterBracketForScoring] =
    useState<FirebaseTournamentType | null>(null);
  const [isLoadingMasterForScoring, setIsLoadingMasterForScoring] =
    useState<boolean>(!isMasterBracket);

  const masterConfirmedData = useMemo(() => {
    // Renamed from masterConfirmedTeams for clarity
    if (!masterBracketForScoring || !masterBracketForScoring.bracket)
      return null;

    const bracket = masterBracketForScoring.bracket;
    const pools = masterBracketForScoring.pools;
    const confirmed: {
      teamsByRound: { [K in RoundName]?: Set<string> };
      champion: string | null;
      completedRounds: Set<RoundName>;
      allTeamsEverPlayedOrAdvancedInMaster: Set<string>; // New set for "eliminated" check
    } = {
      teamsByRound: {
        prequarters: new Set<string>(),
        quarters: new Set<string>(),
        semis: new Set<string>(),
        final: new Set<string>(),
      },
      champion:
        bracket.final[0]?.winner && bracket.final[0].winner !== 'TBD'
          ? bracket.final[0].winner
          : null,
      completedRounds: new Set<RoundName>(),
      allTeamsEverPlayedOrAdvancedInMaster: new Set<string>(),
    };

    // Populate teamsByRound based on who is *slotted* into each round in the master bracket
    // and who won to advance.
    // Also populate allTeamsEverPlayedOrAdvancedInMaster

    // Prequarters
    let prequartersComplete = true;
    bracket.prequarters.forEach((g) => {
      if (g.team1 && g.team1 !== 'TBD') {
        confirmed.teamsByRound.prequarters!.add(g.team1);
        confirmed.allTeamsEverPlayedOrAdvancedInMaster.add(g.team1);
      }
      if (g.team2 && g.team2 !== 'TBD') {
        confirmed.teamsByRound.prequarters!.add(g.team2);
        confirmed.allTeamsEverPlayedOrAdvancedInMaster.add(g.team2);
      }
      if (g.winner && g.winner !== 'TBD') {
        confirmed.teamsByRound.quarters!.add(g.winner); // Winner advances to quarters set
        confirmed.allTeamsEverPlayedOrAdvancedInMaster.add(g.winner);
      } else {
        prequartersComplete = false; // If any game doesn't have a winner, round isn't complete
      }
    });
    if (prequartersComplete && bracket.prequarters.length > 0)
      confirmed.completedRounds.add('prequarters');

    // Pool winners also go to quarters
    (Object.values(pools) as PoolTeam[][]).forEach((poolTeams) => {
      if (poolTeams[0]?.team && poolTeams[0].team !== 'TBD') {
        confirmed.teamsByRound.quarters!.add(poolTeams[0].team);
        confirmed.allTeamsEverPlayedOrAdvancedInMaster.add(poolTeams[0].team);
      }
    });
    // Ensure any teams directly slotted into master QF games are also added
    // (though populateBracketFromPools should handle this by design)
    bracket.quarters.forEach((g) => {
      if (g.team1 && g.team1 !== 'TBD')
        confirmed.teamsByRound.quarters!.add(g.team1);
      if (g.team2 && g.team2 !== 'TBD')
        confirmed.teamsByRound.quarters!.add(g.team2);
    });

    // Quarters
    let quartersComplete = true;
    bracket.quarters.forEach((g) => {
      // Teams in QF slots already added above
      if (g.winner && g.winner !== 'TBD') {
        confirmed.teamsByRound.semis!.add(g.winner);
        confirmed.allTeamsEverPlayedOrAdvancedInMaster.add(g.winner);
      } else {
        quartersComplete = false;
      }
    });
    if (quartersComplete && bracket.quarters.length > 0)
      confirmed.completedRounds.add('quarters');
    // Ensure any teams directly slotted into master Semis games are also added
    bracket.semis.forEach((g) => {
      if (g.team1 && g.team1 !== 'TBD')
        confirmed.teamsByRound.semis!.add(g.team1);
      if (g.team2 && g.team2 !== 'TBD')
        confirmed.teamsByRound.semis!.add(g.team2);
    });

    // Semis
    let semisComplete = true;
    bracket.semis.forEach((g) => {
      if (g.winner && g.winner !== 'TBD') {
        confirmed.teamsByRound.final!.add(g.winner);
        confirmed.allTeamsEverPlayedOrAdvancedInMaster.add(g.winner);
      } else {
        semisComplete = false;
      }
    });
    if (semisComplete && bracket.semis.length > 0)
      confirmed.completedRounds.add('semis');
    bracket.final.forEach((g) => {
      if (g.team1 && g.team1 !== 'TBD')
        confirmed.teamsByRound.final!.add(g.team1);
      if (g.team2 && g.team2 !== 'TBD')
        confirmed.teamsByRound.final!.add(g.team2);
    });

    // Final
    if (bracket.final[0]?.winner && bracket.final[0].winner !== 'TBD') {
      confirmed.completedRounds.add('final');
      // Champion is already stored at the top level of 'confirmed'
      confirmed.allTeamsEverPlayedOrAdvancedInMaster.add(
        bracket.final[0].winner,
      );
    }
    return confirmed;
  }, [masterBracketForScoring]);

  useEffect(() => {
    const loadMainBracketData = async () => {
      if (isMasterBracket) {
        if (!currentMasterBracketIdentifier) {
          setErrorLoading('Master bracket identifier is missing.');
          setTournamentData(null);
          return;
        }
        try {
          const masterTournamentDataFirebase = await getMasterTournament(
            currentMasterBracketIdentifier,
          );
          if (masterTournamentDataFirebase) {
            setTournamentData(masterTournamentDataFirebase);
            setUserBracketName(
              masterTournamentDataFirebase.name ||
                currentMasterBracketIdentifier,
            );
            const hasPicks =
              masterTournamentDataFirebase.bracket.prequarters.some(
                (g) => g.team1 !== 'TBD',
              ) ||
              masterTournamentDataFirebase.bracket.quarters.some(
                (g) => g.team1 !== 'TBD',
              );
            setBracketGeneratedFromPools(hasPicks);
          } else {
            setTournamentData(
              createTournamentData(
                activeDefaultTeams,
                currentMasterBracketIdentifier,
              ),
            );
            setUserBracketName(currentMasterBracketIdentifier);
            setBracketGeneratedFromPools(false);
          }
          setIsEditing(true);
        } catch (error) {
          console.error('Error loading master bracket:', error);
          setErrorLoading(
            `Failed to load master bracket. ${(error as Error).message}`,
          );
          setTournamentData(null);
        }
      } else {
        const targetUserId = viewOnlyUserId || user?.uid;
        const targetBaseName = viewOnlyTournamentName
          ? getDivisionSpecificName(viewOnlyTournamentName)
          : currentBaseTournamentName;
        if (!targetUserId || !targetBaseName) {
          setErrorLoading('Required user or tournament base name is missing.');
          setTournamentData(null);
          return;
        }
        try {
          const savedUserPicks = await getUserBracketPicks(
            targetUserId,
            targetBaseName,
          );
          if (savedUserPicks) {
            setTournamentData(savedUserPicks.tournamentData);
            setUserBracketName(savedUserPicks.userBracketName);
            const hasPicks =
              savedUserPicks.tournamentData.bracket.prequarters.some(
                (g) => g.team1 !== 'TBD',
              ) ||
              savedUserPicks.tournamentData.bracket.quarters.some(
                (g) => g.team1 !== 'TBD',
              );
            setBracketGeneratedFromPools(hasPicks);
            setIsEditing(!!viewOnlyUserId ? false : true);
            if (viewOnlyUserId) setIsEditing(false);
          } else {
            const isOwnBracketContext = user?.uid === targetUserId;
            if (viewOnlyUserId && !isOwnBracketContext) {
              setErrorLoading(
                `Bracket not found for user ${targetUserId} for ${targetBaseName}.`,
              );
              setTournamentData(null);
            } else if (isOwnBracketContext && !isLocked) {
              const newTournament = createTournamentData(
                activeDefaultTeams,
                targetBaseName,
              );
              setTournamentData(newTournament);
              setUserBracketName(
                user.email
                  ? `${user.email}'s ${currentDivision} Bracket`
                  : `My ${currentDivision} Bracket`,
              );
              setIsEditing(true);
              setBracketGeneratedFromPools(false);
            } else {
              setErrorLoading(
                `Cannot create or view bracket for ${targetBaseName} (may not exist, or is locked).`,
              );
              setTournamentData(
                createTournamentData(activeDefaultTeams, targetBaseName),
              );
              setIsEditing(false);
            }
          }
        } catch (error) {
          console.error('Error loading user bracket:', error);
          setErrorLoading(
            `Failed to load user bracket data. ${(error as Error).message}`,
          );
          setTournamentData(null);
        }
      }
    };
    const initializeComponent = async () => {
      setIsLoading(true);
      setErrorLoading(null);
      setTournamentData(null);
      if (!isMasterBracket && user === undefined) return;
      let masterForScoringLoadPromise: Promise<void> = Promise.resolve();
      if (!isMasterBracket) {
        setIsLoadingMasterForScoring(true);
        masterForScoringLoadPromise = getMasterTournament(
          currentMasterBracketIdentifier,
        )
          .then((master) => {
            setMasterBracketForScoring(master);
          })
          .catch((e) => {
            console.error('Failed to load master bracket for scoring:', e);
            setMasterBracketForScoring(null);
          })
          .finally(() => {
            setIsLoadingMasterForScoring(false);
          });
      }
      await loadMainBracketData();
      await masterForScoringLoadPromise;
      setIsLoading(false);
    };
    initializeComponent();
  }, [
    user,
    viewOnlyUserId,
    viewOnlyTournamentName,
    isLocked,
    isMasterBracket,
    currentDivision,
    activeDefaultTeams,
    currentBaseTournamentName,
    currentMasterBracketIdentifier,
    getDivisionSpecificName,
  ]);

  useEffect(() => {
    if (isMasterBracket) {
      setIsLocked(false);
      setCountdown('Master bracket - Always Unlocked');
      return;
    }
    const calculateCountdown = () => {
      const lockDate = new Date('2025-05-23T17:30:00Z');
      const now = new Date();
      const diff = lockDate.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown('Bracket Locked!');
        setIsLocked(true);
        if (!viewOnlyUserId && user?.uid === (viewOnlyUserId || user?.uid))
          setIsEditing(false);
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setCountdown(`${d}d ${h}h ${m}m ${s}s`);
      setIsLocked(false);
    };
    calculateCountdown();
    const intervalId = setInterval(calculateCountdown, 1000);
    return () => clearInterval(intervalId);
  }, [
    isMasterBracket,
    viewOnlyUserId,
    user,
    setIsLocked,
    setCountdown,
    setIsEditing,
  ]);

  useEffect(() => {
    if (tournamentData?.bracket) {
      const finalGame = tournamentData.bracket.final[0];
      setIsBracketComplete(!!finalGame?.winner);
    } else {
      setIsBracketComplete(false);
    }
    if (
      !isMasterBracket &&
      tournamentData?.bracket &&
      !isLoadingMasterForScoring
    ) {
      const scores = calculateBracketScoresAgainstMaster(
        tournamentData.bracket,
        masterBracketForScoring,
      );
      setCurrentScore(scores.currentScore);
      setPossiblePointsRemaining(scores.possiblePointsRemaining);
      setMaxPointsForDisplay(scores.maxPoints);
    } else if (isMasterBracket) {
      setCurrentScore(0);
      setPossiblePointsRemaining(0);
      setMaxPointsForDisplay(0);
    } else {
      setCurrentScore(0);
      setPossiblePointsRemaining(MAX_POSSIBLE_POINTS_NEW_SYSTEM);
      setMaxPointsForDisplay(MAX_POSSIBLE_POINTS_NEW_SYSTEM);
    }
  }, [
    tournamentData,
    isMasterBracket,
    masterBracketForScoring,
    isLoadingMasterForScoring,
  ]);

  const isOverallLoading =
    isLoading ||
    (!isMasterBracket && user === undefined) ||
    (!isMasterBracket && isLoadingMasterForScoring);

  if (isOverallLoading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" />
        <p>Loading Bracket Data...</p>
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
  if (!tournamentData) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          Bracket data could not be prepared or is unavailable.
        </Alert>
      </Container>
    );
  }

  const handleDragStart = (poolName: string, index: number) => {
    const canDrag =
      isEditing && (isMasterBracket || !isLocked) && !viewOnlyUserId;
    if (!canDrag) return;
    setDraggedTeam({ poolName, index });
  };
  const handleDragOver = (e: React.DragEvent) => {
    const canDrag =
      isEditing && (isMasterBracket || !isLocked) && !viewOnlyUserId;
    if (!canDrag) return;
    e.preventDefault();
  };
  const handleDrop = (poolName: string, index: number) => {
    const canDrop =
      isEditing && (isMasterBracket || !isLocked) && !viewOnlyUserId;
    if (!canDrop || !draggedTeam || draggedTeam.poolName !== poolName) {
      setDraggedTeam(null);
      return;
    }
    const newTournamentData = { ...tournamentData };
    newTournamentData.pools = JSON.parse(
      JSON.stringify(newTournamentData.pools),
    );
    const pool = newTournamentData.pools[poolName];
    const [movedTeam] = pool.splice(draggedTeam.index, 1);
    pool.splice(index, 0, movedTeam);
    newTournamentData.bracket = createEmptyBracket();
    setTournamentData(newTournamentData);
    setBracketGeneratedFromPools(false);
    setDraggedTeam(null);
  };

  const generateBracket = () => {
    const canGenerate =
      isEditing && (isMasterBracket || !isLocked) && !viewOnlyUserId;
    if (!canGenerate) return;
    const currentPoolsCopy = JSON.parse(JSON.stringify(tournamentData.pools));
    const newBracket = populateBracketFromPools(currentPoolsCopy);
    setTournamentData((prev) => ({
      ...prev!,
      pools: currentPoolsCopy,
      bracket: newBracket,
    }));
    setBracketGeneratedFromPools(true);
  };

  const handleTeamClick = (
    roundName: keyof TournamentDisplayData['bracket'],
    gameId: number,
    teamNumber: 1 | 2,
  ) => {
    const canClick =
      isEditing &&
      (isMasterBracket || !isLocked) &&
      !viewOnlyUserId &&
      bracketGeneratedFromPools;
    if (!canClick) return;
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
        if (oldTeamInNextSlot !== winner || nextGame.winner) {
          const oldWinnerOfNextGame = nextGame.winner;
          nextGame.winner = null;
          if (oldWinnerOfNextGame)
            clearNextRound(
              bracket,
              nextRoundKey,
              nextGame.id,
              oldWinnerOfNextGame,
            );
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
          if (oldWinnerOfNextGame)
            clearNextRound(
              bracket,
              nextRoundKey,
              nextGame.id,
              oldWinnerOfNextGame,
            );
        }
      }
    }
  };

  const handleSavePicks = async () => {
    if (!tournamentData) {
      setSaveMessage('No tournament data to save.');
      setShowSaveToast(true);
      return;
    }
    if (!isMasterBracket && (!user || !user.uid)) {
      setSaveMessage('User not logged in.');
      setShowSaveToast(true);
      return;
    }
    if (!isMasterBracket && isLocked) {
      setSaveMessage('Cannot save user bracket, it is locked.');
      setShowSaveToast(true);
      return;
    }
    if (!isMasterBracket && !userBracketName.trim()) {
      setSaveMessage('User bracket name cannot be empty.');
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
    setIsSaving(true);
    setSaveMessage(null);
    const dataToSave: FirebaseTournamentType = {
      name: tournamentData.name,
      pools: tournamentData.pools,
      bracket: tournamentData.bracket,
    };
    const finalGame = tournamentData.bracket.final[0];
    dataToSave.champion = finalGame?.winner || undefined;
    try {
      if (isMasterBracket) {
        await saveMasterTournament({
          ...dataToSave,
          name: currentMasterBracketIdentifier,
        });
        setSaveMessage(
          `Master bracket "${currentMasterBracketIdentifier}" saved successfully!`,
        );
      } else if (user && user.uid) {
        await saveUserBracketPicks(
          user.uid,
          tournamentData.name,
          userBracketName,
          dataToSave,
        );
        setSaveMessage(
          `Bracket "${userBracketName}" for ${currentDivision} division saved successfully!`,
        );
        setIsEditing(false);
      } else {
        throw new Error('Cannot determine save type or user missing.');
      }
    } catch (error) {
      console.error('Error saving bracket:', error);
      setSaveMessage(`Failed to save bracket. ${(error as Error).message}`);
    } finally {
      setIsSaving(false);
      setShowSaveToast(true);
    }
  };

  const handleDeleteMasterBracket = async () => {
    if (!isMasterBracket || !currentMasterBracketIdentifier) {
      setSaveMessage(
        'This action is only for master brackets and requires an identifier.',
      );
      setShowSaveToast(true);
      return;
    }
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete the master bracket "${currentMasterBracketIdentifier}"? This action cannot be undone.`,
    );
    if (!confirmDelete) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await deleteMasterTournament(currentMasterBracketIdentifier);
      setSaveMessage(
        `Master bracket "${currentMasterBracketIdentifier}" deleted successfully. You can recreate it by saving again.`,
      );
      setShowSaveToast(true);
      setTournamentData(
        createTournamentData(
          activeDefaultTeams,
          currentMasterBracketIdentifier,
        ),
      );
      setUserBracketName(currentMasterBracketIdentifier);
      setBracketGeneratedFromPools(false);
      setIsBracketComplete(false);
    } catch (error) {
      console.error('Error deleting master bracket:', error);
      setSaveMessage(
        `Failed to delete master bracket. ${(error as Error).message}`,
      );
      setShowSaveToast(true);
    } finally {
      setIsSaving(false);
    }
  };

  const canEditPools =
    isEditing &&
    (isMasterBracket || !isLocked) &&
    (!viewOnlyUserId || user?.uid === viewOnlyUserId);
  const canClickBracketTeams =
    isEditing &&
    (isMasterBracket || !isLocked) &&
    (!viewOnlyUserId || user?.uid === viewOnlyUserId) &&
    bracketGeneratedFromPools;
  const showScoringFeedback =
    !isMasterBracket &&
    !isLoadingMasterForScoring &&
    masterBracketForScoring?.bracket &&
    masterConfirmedData;

  const renderPoolStandings = () => (
    <div className="mt-4">
      <Row>
        {Object.entries(tournamentData.pools).map(([poolName, poolTeams]) => (
          <Col md={3} key={`${currentDivision}-${poolName}`} className="mb-4">
            <Card className="pool-card">
              <Card.Header className="bg-secondary text-white text-center">
                <h5 className="mb-0">{poolName}</h5>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="pool-teams-container">
                  {(poolTeams || []).map((team, index) => (
                    <div
                      key={`${currentDivision}-${team.team}-${index}`}
                      className={`pool-team-item ${team.advanced && bracketGeneratedFromPools ? 'pool-team-advanced' : ''}`}
                      draggable={canEditPools}
                      onDragStart={() => handleDragStart(poolName, index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(poolName, index)}
                      style={{ cursor: canEditPools ? 'grab' : 'default' }}
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
      {(isMasterBracket
        ? isEditing
        : isEditing &&
          !isLocked &&
          (!viewOnlyUserId || user?.uid === viewOnlyUserId)) && (
        <div className="d-flex justify-content-center mt-3 mb-5">
          <Button
            variant="primary"
            size="lg"
            onClick={generateBracket}
            disabled={bracketGeneratedFromPools}
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
    userGame,
    roundName,
  }: {
    userGame: BracketGame;
    roundName: RoundName;
  }) => {
    const userTeam1Name = getTeamName(userGame.team1);
    const userTeam2Name = getTeamName(userGame.team2);
    const userSeed1 = getSeed(userGame.team1);
    const userSeed2 = getSeed(userGame.team2);
    const userWinner = userGame.winner;
    const clickable = canClickBracketTeams && !showScoringFeedback;

    let team1Classes = 'bracket-team';
    let team2Classes = 'bracket-team';
    let team1PointsDisplay: string | null = null;
    let team2PointsDisplay: string | null = null;

    if (
      showScoringFeedback &&
      masterConfirmedData &&
      masterBracketForScoring?.bracket
    ) {
      const masterGame = masterBracketForScoring.bracket[roundName]?.find(
        (g) => g.id === userGame.id,
      );
      const currentRoundMasterConfirmedTeams =
        masterConfirmedData.teamsByRound[roundName];
      const masterRoundIsComplete =
        masterConfirmedData.completedRounds?.has(roundName);

      // Team 1 Logic
      if (userGame.team1 && userGame.team1 !== 'TBD') {
        let isImpossible = false;
        if (roundName !== 'prequarters') {
          // Only check prior rounds if not prequarters
          for (const prevRound of ROUND_ORDER) {
            if (prevRound === roundName) break;
            if (
              masterConfirmedData.completedRounds?.has(prevRound) &&
              !masterConfirmedData.teamsByRound[prevRound]?.has(userGame.team1)
            ) {
              isImpossible = true;
              break;
            }
          }
        }

        if (isImpossible) {
          team1Classes += ' team-impossible';
          team1PointsDisplay = '+0';
        } else if (currentRoundMasterConfirmedTeams?.has(userGame.team1)) {
          team1Classes += ' team-correct-slot';
          team1PointsDisplay = `+${SCORING_RULES_ROUND_NAMES[roundName.toUpperCase() as keyof typeof SCORING_RULES_ROUND_NAMES]}`;
          if (
            roundName === 'final' &&
            userWinner === userGame.team1 &&
            userGame.team1 === masterConfirmedData.champion
          ) {
            team1PointsDisplay = `+${SCORING_RULES_ROUND_NAMES.FINALS + SCORING_RULES_ROUND_NAMES.CHAMPION}`;
            team1Classes += ' team-correct-pick'; // Also a correct winner pick
          } else if (
            userWinner === userGame.team1 &&
            masterGame?.winner === userGame.team1
          ) {
            team1Classes += ' team-correct-pick'; // Correctly picked winner of this game
          }
        } else if (masterRoundIsComplete) {
          // Current round complete, team not there
          team1Classes += ' team-incorrect-slot';
          team1PointsDisplay = '+0';
        }
      }

      // Team 2 Logic (Similar to Team 1)
      if (userGame.team2 && userGame.team2 !== 'TBD') {
        let isImpossible = false;
        if (roundName !== 'prequarters') {
          for (const prevRound of ROUND_ORDER) {
            if (prevRound === roundName) break;
            if (
              masterConfirmedData.completedRounds?.has(prevRound) &&
              !masterConfirmedData.teamsByRound[prevRound]?.has(userGame.team2)
            ) {
              isImpossible = true;
              break;
            }
          }
        }
        if (isImpossible) {
          team2Classes += ' team-impossible';
          team2PointsDisplay = '+0';
        } else if (currentRoundMasterConfirmedTeams?.has(userGame.team2)) {
          team2Classes += ' team-correct-slot';
          team2PointsDisplay = `+${SCORING_RULES_ROUND_NAMES[roundName.toUpperCase() as keyof typeof SCORING_RULES_ROUND_NAMES]}`;
          if (
            roundName === 'final' &&
            userWinner === userGame.team2 &&
            userGame.team2 === masterConfirmedData.champion
          ) {
            team2PointsDisplay = `+${SCORING_RULES_ROUND_NAMES.FINALS + SCORING_RULES_ROUND_NAMES.CHAMPION}`;
            team2Classes += ' team-correct-pick';
          } else if (
            userWinner === userGame.team2 &&
            masterGame?.winner === userGame.team2
          ) {
            team2Classes += ' team-correct-pick';
          }
        } else if (masterRoundIsComplete) {
          team2Classes += ' team-incorrect-slot';
          team2PointsDisplay = '+0';
        }
      }
    }

    // Apply base winner style from user's perspective if not showing detailed feedback
    if (!showScoringFeedback) {
      if (userWinner === userGame.team1 && userGame.team1 !== 'TBD')
        team1Classes += ' winner';
      if (userWinner === userGame.team2 && userGame.team2 !== 'TBD')
        team2Classes += ' winner';
    }

    return (
      <div className="bracket-game-container mb-4">
        <div className="bracket-game">
          <div
            className={`${team1Classes} ${clickable && userGame.team1 !== 'TBD' ? 'clickable' : ''}`}
            onClick={() =>
              clickable &&
              userGame.team1 !== 'TBD' &&
              handleTeamClick(roundName, userGame.id, 1)
            }
          >
            <span className="team-name-seed-wrapper">
              <span>{userTeam1Name}</span>
              {userSeed1 && (
                <Badge bg="secondary" className="ms-1 seed-badge">
                  {userSeed1}
                </Badge>
              )}
            </span>
            {team1PointsDisplay && (
              <span className="points-badge">{team1PointsDisplay}</span>
            )}
          </div>
          <div
            className={`${team2Classes} ${clickable && userGame.team2 !== 'TBD' ? 'clickable' : ''}`}
            onClick={() =>
              clickable &&
              userGame.team2 !== 'TBD' &&
              handleTeamClick(roundName, userGame.id, 2)
            }
          >
            <span className="team-name-seed-wrapper">
              <span>{userTeam2Name}</span>
              {userSeed2 && (
                <Badge bg="secondary" className="ms-1 seed-badge">
                  {userSeed2}
                </Badge>
              )}
            </span>
            {team2PointsDisplay && (
              <span className="points-badge">{team2PointsDisplay}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBracket = () => (
    <div className="tournament-bracket mt-4">
      <div className="bracket-container">
        <Row>
          {ROUND_ORDER.map((roundKey) => (
            <Col
              md={3}
              key={`${currentDivision}-bracket-${roundKey}`}
              className="mb-3"
            >
              <h5 className="text-center mb-3 text-capitalize">{roundKey}</h5>
              {tournamentData.bracket[roundKey].map((userGame) => (
                <BracketGameDisplay
                  key={`${currentDivision}-game-${userGame.id}`}
                  userGame={userGame}
                  roundName={roundKey}
                />
              ))}
            </Col>
          ))}
        </Row>
      </div>
      {bracketGeneratedFromPools &&
        (isMasterBracket
          ? isEditing
          : isEditing &&
            !isLocked &&
            (!viewOnlyUserId || user?.uid === viewOnlyUserId)) && (
          <p className="text-center text-muted mt-2">
            Click on a team to advance them. Click again to deselect.
          </p>
        )}
      {isBracketComplete &&
        (isMasterBracket || !isEditing || viewOnlyUserId) && (
          <Alert variant="success" className="text-center mt-3">
            {isMasterBracket
              ? 'Master Bracket Complete!'
              : !viewOnlyUserId
                ? `Your ${currentDivision} bracket is complete!`
                : `This ${currentDivision} bracket is complete.`}
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
          <h2 className="text-center mb-0">
            {isMasterBracket
              ? currentMasterBracketIdentifier
              : tournamentData.name || `Tournament - ${currentDivision}`}
          </h2>
          {isMasterBracket && (
            <p className="text-center mb-0 small">
              ADMIN VIEW - THIS IS THE TRUE RESULTS BRACKET (
              {currentDivision.toUpperCase()})
            </p>
          )}
          {!isMasterBracket && viewOnlyUserId && userBracketName && (
            <p className="text-center mb-0 small">
              Viewing: {userBracketName} ({currentDivision} Division)
            </p>
          )}
          {!isMasterBracket && !viewOnlyUserId && user && (
            <p className="text-center mb-0 small">
              My Bracket ({user.email || 'User'}) -{' '}
              {currentDivision.toUpperCase()} Division
            </p>
          )}
        </Container>
      </div>

      {isMasterBracket ? (
        <Card className="mb-4">
          <Card.Header>
            Master Bracket Controls ({currentDivision.toUpperCase()})
          </Card.Header>
          <Card.Body className="text-center">
            <p className="mb-3">
              Edit pools and bracket below. Changes here define the official
              results for scoring for the {currentDivision} division.
            </p>
            <div className="d-grid gap-2 d-md-flex justify-content-md-center">
              <Button
                variant="danger"
                size="lg"
                onClick={handleSavePicks}
                disabled={isSaving || !bracketGeneratedFromPools}
                className="mb-2 mb-md-0 me-md-2"
              >
                {isSaving ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" /> Saving
                    Master...
                  </>
                ) : (
                  'Save Master Results'
                )}
              </Button>
              <Button
                variant="outline-danger"
                size="lg"
                onClick={handleDeleteMasterBracket}
                disabled={isSaving}
              >
                Delete Master Results
              </Button>
            </div>
          </Card.Body>
        </Card>
      ) : !viewOnlyUserId ? (
        <Card className="mb-4">
          <Card.Header>
            My {currentDivision.toUpperCase()} Bracket Controls
          </Card.Header>
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
                    placeholder={`Enter name for ${currentDivision} bracket`}
                  />
                </Form.Group>
              </Col>
              {isEditing && !isLocked && (
                <Col md={4} className="d-flex align-items-end">
                  <Button
                    variant="success"
                    onClick={handleSavePicks}
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
                This {currentDivision} bracket is locked. No more edits allowed.
              </Alert>
            )}
          </Card.Body>
        </Card>
      ) : null}

      {!isMasterBracket && (
        <Row className="mb-4 text-center">
          <Col md={4}>
            <Card bg="light">
              <Card.Header>
                Bracket Locks In ({currentDivision.toUpperCase()})
              </Card.Header>
              <Card.Body>
                <Card.Title>{countdown}</Card.Title>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card bg="light">
              <Card.Header>
                {viewOnlyUserId
                  ? `${currentDivision.toUpperCase()} Bracket Score`
                  : `Your ${currentDivision.toUpperCase()} Bracket Score`}
              </Card.Header>
              <Card.Body>
                {isLoadingMasterForScoring ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <Card.Title>
                    {currentScore} / {maxPointsForDisplay}
                  </Card.Title>
                )}
                {!masterBracketForScoring && !isLoadingMasterForScoring && (
                  <small className="text-muted d-block">
                    Master results for {currentDivision} division pending.
                  </small>
                )}
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card bg="light">
              <Card.Header>Possible Points Remaining</Card.Header>
              <Card.Body>
                {isLoadingMasterForScoring ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <Card.Title>{possiblePointsRemaining}</Card.Title>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
      {isMasterBracket && (
        <Alert variant="info" className="text-center my-3">
          This is the master bracket for the {currentDivision.toUpperCase()}{' '}
          division. It does not lock and does not have a score itself.
        </Alert>
      )}

      <div className="bg-light py-3 mb-4 border rounded">
        <Container>
          <h3 className="text-center mb-0">
            Pool Play ({currentDivision.toUpperCase()})
          </h3>
          {isMasterBracket && isEditing && (
            <p className="text-center text-muted mt-2 mb-0">
              Drag and drop teams to reorder pools for Master Results.
              {!bracketGeneratedFromPools && ' Then, populate the bracket.'}
              {bracketGeneratedFromPools &&
                ' Pool order changed, re-populate bracket.'}
            </p>
          )}
          {!isMasterBracket && isEditing && !isLocked && !viewOnlyUserId && (
            <p className="text-center text-muted mt-2 mb-0">
              Drag and drop teams to reorder pools.
              {!bracketGeneratedFromPools &&
                ' Then, populate the bracket using the button below.'}
              {bracketGeneratedFromPools &&
                ' Pool order changed, re-populate bracket below.'}
            </p>
          )}
          {!isMasterBracket && (!isEditing || isLocked || viewOnlyUserId) && (
            <p className="text-center text-muted mt-2 mb-0">
              Current pool rankings.
              {!viewOnlyUserId &&
                !isLocked &&
                ' Click "Edit Bracket" to make changes.'}
            </p>
          )}
        </Container>
      </div>
      {renderPoolStandings()}

      <div className="mt-5">
        <div className="bg-light py-3 mb-4 border rounded">
          <Container>
            <h3 className="text-center mb-0">
              Bracket Play ({currentDivision.toUpperCase()})
            </h3>
            {isMasterBracket && isEditing && !bracketGeneratedFromPools && (
              <p className="text-center text-muted mt-2 mb-0">
                Populate master bracket from pool rankings to set results.
              </p>
            )}
            {isMasterBracket && isEditing && bracketGeneratedFromPools && (
              <p className="text-center text-muted mt-2 mb-0">
                Click teams to set master results.
              </p>
            )}
            {!isMasterBracket &&
              isEditing &&
              !isLocked &&
              !viewOnlyUserId &&
              !bracketGeneratedFromPools && (
                <p className="text-center text-muted mt-2 mb-0">
                  Populate bracket from pool rankings to make picks.
                </p>
              )}
            {!isMasterBracket &&
              isEditing &&
              !isLocked &&
              !viewOnlyUserId &&
              bracketGeneratedFromPools && (
                <p className="text-center text-muted mt-2 mb-0">
                  Click teams to advance them. Save picks with "Save Picks &
                  Name".
                </p>
              )}
            {!isMasterBracket &&
              (!isEditing || isLocked || viewOnlyUserId) &&
              !bracketGeneratedFromPools && (
                <p className="text-center text-muted mt-2 mb-0">
                  Bracket not yet populated from pools.
                </p>
              )}
            {!isMasterBracket &&
              (!isEditing || isLocked || viewOnlyUserId) &&
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
            {(isMasterBracket && isEditing) ||
            (!isMasterBracket && isEditing && !isLocked && !viewOnlyUserId)
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
