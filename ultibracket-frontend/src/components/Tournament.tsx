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
} from 'react-bootstrap';
import { useState, useEffect, useRef } from 'react';
import './Tournament.css';
import { saveTournament } from './../firebase/FirebaseUtils'; // Import our Firebase utility

// Type definitions
interface Team {
  name: string;
  seed: number;
}

interface PoolTeam {
  team: string; // Format: "TeamName (Seed)"
  wins: number;
  losses: number;
  advanced: boolean;
}

interface BracketGame {
  id: number;
  team1: string; // Format: "TeamName (Seed)" or "TBD"
  team2: string; // Format: "TeamName (Seed)" or "TBD"
  score: string;
  winner: string | null; // Format: "TeamName (Seed)" or null if not decided
}

interface Tournament {
  name: string;
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
  return fullTeamString.replace(/\s*\(\d+\)$/, '');
};

// Helper function to extract seed
const getSeed = (fullTeamString: string) => {
  const match = fullTeamString.match(/\((\d+)\)$/);
  return match ? parseInt(match[1]) : null;
};

// Helper function to format team string
const formatTeamString = (team: Team) => {
  return `${team.name} (${team.seed})`;
};

// Function to create pools based on teams
const createPools = (teams: Team[]): { [key: string]: PoolTeam[] } => {
  // Sort teams by seed
  const sortedTeams = [...teams].sort((a, b) => a.seed - b.seed);

  // Create 4 pools with 5 teams each using snake pattern
  const pools: { [key: string]: PoolTeam[] } = {
    'Pool A': [],
    'Pool B': [],
    'Pool C': [],
    'Pool D': [],
  };

  // Pool A: 1, 8, 12, 17, 13
  // Pool B: 2, 7, 14, 18, 11
  // Pool C: 3, 6, 10, 15, 19
  // Pool D: 4, 5, 9, 16, 20

  // First pass: 1,2,3,4
  pools['Pool A'].push(createPoolTeam(sortedTeams[0]));
  pools['Pool B'].push(createPoolTeam(sortedTeams[1]));
  pools['Pool C'].push(createPoolTeam(sortedTeams[2]));
  pools['Pool D'].push(createPoolTeam(sortedTeams[3]));

  // Second pass: 5,6,7,8
  pools['Pool D'].push(createPoolTeam(sortedTeams[4]));
  pools['Pool C'].push(createPoolTeam(sortedTeams[5]));
  pools['Pool B'].push(createPoolTeam(sortedTeams[6]));
  pools['Pool A'].push(createPoolTeam(sortedTeams[7]));

  // Third pass: 9,10,11,12
  pools['Pool D'].push(createPoolTeam(sortedTeams[8]));
  pools['Pool C'].push(createPoolTeam(sortedTeams[9]));
  pools['Pool B'].push(createPoolTeam(sortedTeams[10]));
  pools['Pool A'].push(createPoolTeam(sortedTeams[11]));

  // Fourth pass: 13,14,15,16
  pools['Pool A'].push(createPoolTeam(sortedTeams[16]));
  pools['Pool B'].push(createPoolTeam(sortedTeams[13]));
  pools['Pool C'].push(createPoolTeam(sortedTeams[14]));
  pools['Pool D'].push(createPoolTeam(sortedTeams[15]));

  // Fifth pass: 17,18,19,20
  pools['Pool A'].push(createPoolTeam(sortedTeams[12]));
  pools['Pool B'].push(createPoolTeam(sortedTeams[17]));
  pools['Pool C'].push(createPoolTeam(sortedTeams[18]));
  pools['Pool D'].push(createPoolTeam(sortedTeams[19]));

  return pools;
};

// Helper to create a pool team entry
const createPoolTeam = (team: Team): PoolTeam => {
  return {
    team: formatTeamString(team),
    wins: 0,
    losses: 0,
    advanced: false,
  };
};

// Create empty bracket structure with placeholders
const createEmptyBracket = () => {
  return {
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
    final: [
      {
        id: 11,
        team1: 'TBD',
        team2: 'TBD',
        score: '0 - 0',
        winner: null,
      },
    ],
  };
};

// Function to populate the bracket from pool standings
const populateBracketFromPools = (pools: { [key: string]: PoolTeam[] }) => {
  const bracket = createEmptyBracket();

  // For each pool, get the top 3 teams (based on their order after drag & drop)
  const poolA = pools['Pool A'].slice(0, 3);
  const poolB = pools['Pool B'].slice(0, 3);
  const poolC = pools['Pool C'].slice(0, 3);
  const poolD = pools['Pool D'].slice(0, 3);

  // Mark teams as advanced
  [...poolA, ...poolB, ...poolC, ...poolD].forEach((team) => {
    team.advanced = true;
  });

  // Pool winners get a bye to quarterfinals
  // A1 vs winner of B2/C3
  bracket.quarters[0].team1 = poolA[0].team;

  // D1 vs winner of C2/B3
  bracket.quarters[1].team1 = poolD[0].team;

  // C1 vs winner of D2/A3
  bracket.quarters[2].team1 = poolC[0].team;

  // B1 vs winner of A2/D3
  bracket.quarters[3].team1 = poolB[0].team;

  // Pre-quarters matchups
  // A2 vs D3
  bracket.prequarters[0].team1 = poolA[1].team;
  bracket.prequarters[0].team2 = poolD[2].team;

  // B2 vs C3
  bracket.prequarters[1].team1 = poolB[1].team;
  bracket.prequarters[1].team2 = poolC[2].team;

  // C2 vs B3
  bracket.prequarters[2].team1 = poolC[1].team;
  bracket.prequarters[2].team2 = poolB[2].team;

  // D2 vs A3
  bracket.prequarters[3].team1 = poolD[1].team;
  bracket.prequarters[3].team2 = poolA[2].team;

  return bracket;
};

// Create tournament data from teams list
const createTournamentData = (teams: Team[]): Tournament => {
  const pools = createPools(teams);
  const bracket = createEmptyBracket();

  return {
    name: 'USA Ultimate College Nationals 2024',
    pools,
    bracket,
  };
};

// Default teams if none are provided
const defaultTeams: Team[] = [
  { name: 'North Carolina', seed: 1 },
  { name: 'Georgia', seed: 2 },
  { name: 'Massachusetts', seed: 3 },
  { name: 'Colorado', seed: 4 },
  { name: 'Cal Poly-SLO', seed: 5 },
  { name: 'Pittsburgh', seed: 6 },
  { name: 'Oregon', seed: 7 },
  { name: 'Brown', seed: 8 },
  { name: 'Vermont', seed: 9 },
  { name: 'Minnesota', seed: 10 },
  { name: 'Carleton College', seed: 11 },
  { name: 'Texas', seed: 12 },
  { name: 'Alabama-Huntsville', seed: 13 },
  { name: 'North Carolina State', seed: 14 },
  { name: 'California', seed: 15 },
  { name: 'Penn State', seed: 16 },
  { name: 'Oregon State', seed: 17 },
  { name: 'Washington University', seed: 18 },
  { name: 'Ottawa', seed: 19 },
  { name: 'Michigan', seed: 20 },
];

interface TournamentViewProps {
  teams?: Team[];
}

const TournamentView: React.FC<TournamentViewProps> = ({
  teams = defaultTeams,
}) => {
  const [tournamentData, setTournamentData] = useState<Tournament | null>(null);
  const [draggedTeam, setDraggedTeam] = useState<{
    poolName: string;
    index: number;
  } | null>(null);
  const [bracket, setBracket] = useState<Tournament['bracket'] | null>(null);
  const [bracketGenerated, setBracketGenerated] = useState<boolean>(false);
  const [isBracketComplete, setIsBracketComplete] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSaveToast, setShowSaveToast] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tournamentId, setTournamentId] = useState<string | null>(null);

  useEffect(() => {
    // Generate tournament data when teams change
    setTournamentData(createTournamentData(teams));
    setBracketGenerated(false);
    setIsBracketComplete(false);
  }, [teams]);

  // Check if bracket is complete (final winner is selected)
  useEffect(() => {
    if (tournamentData && bracketGenerated) {
      const finalGame = tournamentData.bracket.final[0];
      setIsBracketComplete(finalGame.winner !== null);
    } else {
      setIsBracketComplete(false);
    }
  }, [tournamentData, bracketGenerated]);

  if (!tournamentData) {
    return <div>Loading tournament data...</div>;
  }

  const handleDragStart = (poolName: string, index: number) => {
    setDraggedTeam({ poolName, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = (poolName: string, index: number) => {
    if (draggedTeam && draggedTeam.poolName === poolName) {
      // Only allow reordering within the same pool
      const newTournamentData = { ...tournamentData };
      const pool = [...newTournamentData.pools[poolName]];

      // Reorder the teams
      const [movedTeam] = pool.splice(draggedTeam.index, 1);
      pool.splice(index, 0, movedTeam);

      // Update the pool
      newTournamentData.pools[poolName] = pool;
      setTournamentData(newTournamentData);
    }

    setDraggedTeam(null);
  };

  const generateBracket = () => {
    const newBracket = populateBracketFromPools(tournamentData.pools);
    setTournamentData({
      ...tournamentData,
      bracket: newBracket,
    });
    setBracketGenerated(true);
  };

  const handleTeamClick = (
    roundName: 'prequarters' | 'quarters' | 'semis' | 'final',
    gameId: number,
    teamNumber: 1 | 2,
  ) => {
    if (!bracketGenerated) return;

    const newTournamentData = { ...tournamentData };
    const game = newTournamentData.bracket[roundName].find(
      (g) => g.id === gameId,
    );

    if (!game) return;

    const selectedTeam = teamNumber === 1 ? game.team1 : game.team2;

    // If the team is TBD, don't do anything
    if (selectedTeam === 'TBD') return;

    // Set the winner
    game.winner = selectedTeam;

    // Update the next round
    let nextRound: 'quarters' | 'semis' | 'final';
    let nextGameId: number;
    let nextTeamPosition: 1 | 2;

    if (roundName === 'prequarters') {
      nextRound = 'quarters';
      // Map prequarters games to quarters games
      if (gameId === 1) {
        nextGameId = 5;
        nextTeamPosition = 2;
      } else if (gameId === 2) {
        nextGameId = 6;
        nextTeamPosition = 2;
      } else if (gameId === 3) {
        nextGameId = 7;
        nextTeamPosition = 2;
      } else {
        nextGameId = 8;
        nextTeamPosition = 2;
      }
    } else if (roundName === 'quarters') {
      nextRound = 'semis';
      // Map quarters games to semis games
      if (gameId === 5 || gameId === 6) {
        nextGameId = 9;
        nextTeamPosition = gameId === 5 ? 1 : 2;
      } else {
        nextGameId = 10;
        nextTeamPosition = gameId === 7 ? 1 : 2;
      }
    } else if (roundName === 'semis') {
      nextRound = 'final';
      nextGameId = 11;
      nextTeamPosition = gameId === 9 ? 1 : 2;
    } else {
      // Final has no next round
      setTournamentData(newTournamentData);
      return;
    }

    // Find the next game
    const nextGame = newTournamentData.bracket[nextRound].find(
      (g) => g.id === nextGameId,
    );
    if (nextGame) {
      // Update the team in the next game
      if (nextTeamPosition === 1) {
        nextGame.team1 = selectedTeam;
      } else {
        nextGame.team2 = selectedTeam;
      }

      // Clear the winner if it exists
      nextGame.winner = null;
    }

    setTournamentData(newTournamentData);
  };

  // Function to save the tournament to Firebase
  const handleSaveTournament = async () => {
    console.log('trying to save tournament in Tournament.tsx');
    if (!isBracketComplete || !tournamentData) return;

    setIsSaving(true);
    setSaveError(null);
    console.log('up to the try');

    try {
      const id = await saveTournament(tournamentData);
      setTournamentId(id);
      setShowSaveToast(true);
    } catch (error) {
      console.error('Error saving tournament:', error);
      setSaveError('Failed to save tournament. Please try again.');
      setShowSaveToast(true);
    } finally {
      setIsSaving(false);
    }
  };

  const renderPoolStandings = () => {
    return (
      <div className="mt-4">
        <Row>
          {Object.entries(tournamentData.pools).map(([poolName, teams]) => (
            <Col md={3} key={poolName} className="mb-4">
              <Card className="pool-card">
                <Card.Header className="bg-secondary text-white text-center">
                  <h5 className="mb-0">{poolName}</h5>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="pool-teams-container">
                    {teams.map((team, index) => (
                      <div
                        key={index}
                        className={`pool-team-item ${team.advanced ? 'pool-team-advanced' : ''}`}
                        draggable={!bracketGenerated}
                        onDragStart={() => handleDragStart(poolName, index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(poolName, index)}
                        style={{
                          cursor: bracketGenerated ? 'default' : 'grab',
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center">
                            <span>{getTeamName(team.team)}</span>
                            <Badge bg="secondary" className="ms-2">
                              {getSeed(team.team)}
                            </Badge>
                          </div>
                          <span className="team-record">
                            {team.wins} - {team.losses}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        <div className="d-flex justify-content-center mt-3 mb-5">
          <Button
            variant="primary"
            size="lg"
            onClick={generateBracket}
            disabled={bracketGenerated}
          >
            {bracketGenerated
              ? 'Bracket Generated'
              : 'Generate Bracket from Pool Rankings'}
          </Button>
        </div>
      </div>
    );
  };

  const BracketGame = ({
    game,
    roundName,
  }: {
    game: BracketGame;
    roundName: 'prequarters' | 'quarters' | 'semis' | 'final';
  }) => {
    const team1 = getTeamName(game.team1);
    const team2 = getTeamName(game.team2);
    const seed1 = getSeed(game.team1);
    const seed2 = getSeed(game.team2);
    const isWinner1 = game.winner === game.team1;
    const isWinner2 = game.winner === game.team2;

    return (
      <div className="bracket-game mb-4">
        <div
          className={`bracket-team ${isWinner1 ? 'winner' : ''} ${bracketGenerated && game.team1 !== 'TBD' ? 'clickable' : ''}`}
          onClick={() =>
            bracketGenerated &&
            game.team1 !== 'TBD' &&
            handleTeamClick(roundName, game.id, 1)
          }
        >
          <div className="d-flex justify-content-between">
            <div className="d-flex align-items-center">
              <span>{team1}</span>
              {seed1 && (
                <Badge bg="secondary" className="ms-2">
                  {seed1}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div
          className={`bracket-team ${isWinner2 ? 'winner' : ''} ${bracketGenerated && game.team2 !== 'TBD' ? 'clickable' : ''}`}
          onClick={() =>
            bracketGenerated &&
            game.team2 !== 'TBD' &&
            handleTeamClick(roundName, game.id, 2)
          }
        >
          <div className="d-flex justify-content-between">
            <div className="d-flex align-items-center">
              <span>{team2}</span>
              {seed2 && (
                <Badge bg="secondary" className="ms-2">
                  {seed2}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBracket = () => {
    return (
      <div className="tournament-bracket mt-4">
        <div className="bracket-container">
          <Row>
            {/* Pre-quarters */}
            <Col md={3}>
              <h5 className="text-center mb-3">Pre-quarters</h5>
              {tournamentData.bracket.prequarters.map((game) => (
                <BracketGame
                  key={game.id}
                  game={game}
                  roundName="prequarters"
                />
              ))}
            </Col>

            {/* Quarters */}
            <Col md={3}>
              <h5 className="text-center mb-3">Quarterfinals</h5>
              {tournamentData.bracket.quarters.map((game) => (
                <BracketGame key={game.id} game={game} roundName="quarters" />
              ))}
            </Col>

            {/* Semis */}
            <Col md={3}>
              <h5 className="text-center mb-3">Semifinals</h5>
              {tournamentData.bracket.semis.map((game) => (
                <BracketGame key={game.id} game={game} roundName="semis" />
              ))}
            </Col>

            {/* Final */}
            <Col md={3}>
              <h5 className="text-center mb-3">Final</h5>
              {tournamentData.bracket.final.map((game) => (
                <BracketGame key={game.id} game={game} roundName="final" />
              ))}
            </Col>
          </Row>
        </div>

        {bracketGenerated && (
          <div className="text-center mt-4">
            <p className="text-muted mb-3">
              Click on a team to advance them to the next round.
            </p>

            {/* Save tournament button - only enabled when bracket is complete */}
            <Button
              variant="success"
              size="lg"
              onClick={handleSaveTournament}
              disabled={!isBracketComplete || isSaving}
              className="mt-3"
            >
              {isSaving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                'Save Tournament'
              )}
            </Button>

            {isBracketComplete && (
              <p className="text-success mt-2">
                Tournament complete! Champion:{' '}
                {getTeamName(tournamentData.bracket.final[0].winner!)}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Container className="mt-4">
      {/* Tournament Title */}
      <div className="bg-primary text-white py-3 mb-4 border rounded">
        <Container>
          <h2 className="text-center mb-0">{tournamentData.name}</h2>
        </Container>
      </div>

      {/* Pool Play section */}
      <div className="bg-light py-3 mb-4 border rounded">
        <Container>
          <h3 className="text-center mb-0">Pool Play</h3>
          {!bracketGenerated && (
            <p className="text-center text-muted mt-2 mb-0">
              Drag and drop teams to reorder them within their pools
            </p>
          )}
        </Container>
      </div>
      {renderPoolStandings()}

      {/* Bracket section with some spacing */}
      <div className="mt-5">
        <div className="bg-light py-3 mb-4 border rounded">
          <Container>
            <h3 className="text-center mb-0">Bracket Play</h3>
            {bracketGenerated && (
              <p className="text-center text-muted mt-2 mb-0">
                Click on teams to advance them through the bracket
              </p>
            )}
          </Container>
        </div>
        {renderBracket()}
      </div>

      {/* Toast notification for save success/failure */}
      <ToastContainer position="bottom-end" className="p-3">
        <Toast
          onClose={() => setShowSaveToast(false)}
          show={showSaveToast}
          delay={5000}
          autohide
          bg={saveError ? 'danger' : 'success'}
        >
          <Toast.Header>
            <strong className="me-auto">
              {saveError ? 'Error' : 'Success'}
            </strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            {saveError ? (
              saveError
            ) : (
              <>
                Tournament saved successfully! ID:{' '}
                <strong>{tournamentId}</strong>
              </>
            )}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default TournamentView;
