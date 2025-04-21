import { Table, Card, Badge, Container, Row, Col } from 'react-bootstrap';

import './Tournament.css';

// Sample data based on the provided tournament results
const tournamentData = {
  name: 'USA Ultimate College Nationals 2024',
  pools: {
    'Pool A': [
      {
        team: 'North Carolina (1)',
        wins: 4,
        losses: 0,
        tiebreaker: null,
        advanced: true,
      },
      {
        team: 'Brown (8)',
        wins: 2,
        losses: 2,
        tiebreaker: '1-1,2 [+1]',
        advanced: true,
      },
      {
        team: 'Texas (12)',
        wins: 2,
        losses: 2,
        tiebreaker: '1-1,1 [+1]',
        advanced: true,
      },
      {
        team: 'Oregon State (17)',
        wins: 2,
        losses: 2,
        tiebreaker: '1-1,-3 [-3]',
        advanced: false,
      },
      {
        team: 'Alabama-Huntsville (13)',
        wins: 0,
        losses: 4,
        tiebreaker: null,
        advanced: false,
      },
    ],
    'Pool B': [
      {
        team: 'Georgia (2)',
        wins: 4,
        losses: 0,
        tiebreaker: null,
        advanced: true,
      },
      {
        team: 'Oregon (7)',
        wins: 3,
        losses: 1,
        tiebreaker: null,
        advanced: true,
      },
      {
        team: 'North Carolina State (14)',
        wins: 2,
        losses: 2,
        tiebreaker: null,
        advanced: true,
      },
      {
        team: 'Washington University (18)',
        wins: 1,
        losses: 3,
        tiebreaker: null,
        advanced: false,
      },
      {
        team: 'Carleton College (11)',
        wins: 0,
        losses: 4,
        tiebreaker: null,
        advanced: false,
      },
    ],
    'Pool C': [
      {
        team: 'Minnesota (10)',
        wins: 3,
        losses: 1,
        tiebreaker: '1-0,7 [+13]',
        advanced: true,
      },
      {
        team: 'Massachusetts (3)',
        wins: 3,
        losses: 1,
        tiebreaker: '0-1,-7 [+3]',
        advanced: true,
      },
      {
        team: 'Pittsburgh (6)',
        wins: 2,
        losses: 2,
        tiebreaker: '1-0,9 [+12]',
        advanced: true,
      },
      {
        team: 'California (15)',
        wins: 2,
        losses: 2,
        tiebreaker: '0-1,-9 [-9]',
        advanced: false,
      },
      {
        team: 'Ottawa (19)',
        wins: 0,
        losses: 4,
        tiebreaker: null,
        advanced: false,
      },
    ],
    'Pool D': [
      {
        team: 'Cal Poly-SLO (5)',
        wins: 4,
        losses: 0,
        tiebreaker: null,
        advanced: true,
      },
      {
        team: 'Colorado (4)',
        wins: 3,
        losses: 1,
        tiebreaker: null,
        advanced: true,
      },
      {
        team: 'Michigan (20)',
        wins: 2,
        losses: 2,
        tiebreaker: null,
        advanced: true,
      },
      {
        team: 'Vermont (9)',
        wins: 1,
        losses: 3,
        tiebreaker: null,
        advanced: false,
      },
      {
        team: 'Penn State (16)',
        wins: 0,
        losses: 4,
        tiebreaker: null,
        advanced: false,
      },
    ],
  },
  bracket: {
    // Pre-quarters games reordered to match the quarterfinal matchups
    prequarters: [
      {
        id: 1,
        team1: 'Oregon (7)',
        team2: 'Pittsburgh (6)',
        score: '14 - 12',
        winner: 'Oregon (7)',
      },
      {
        id: 2,
        team1: 'North Carolina State (14)',
        team2: 'Massachusetts (3)',
        score: '14 - 13',
        winner: 'North Carolina State (14)',
      },
      {
        id: 3,
        team1: 'Colorado (4)',
        team2: 'Texas (12)',
        score: '15 - 10',
        winner: 'Colorado (4)',
      },
      {
        id: 4,
        team1: 'Brown (8)',
        team2: 'Michigan (20)',
        score: '15 - 12',
        winner: 'Brown (8)',
      },
    ],
    // Quarterfinals reordered to align with pre-quarters winners and semifinal matchups
    quarters: [
      {
        id: 5,
        team1: 'North Carolina (1)',
        team2: 'Oregon (7)',
        score: '12 - 11',
        winner: 'North Carolina (1)',
      },
      {
        id: 6,
        team1: 'Cal Poly-SLO (5)',
        team2: 'North Carolina State (14)',
        score: '15 - 9',
        winner: 'Cal Poly-SLO (5)',
      },
      {
        id: 7,
        team1: 'Minnesota (10)',
        team2: 'Colorado (4)',
        score: '12 - 15',
        winner: 'Colorado (4)',
      },
      {
        id: 8,
        team1: 'Georgia (2)',
        team2: 'Brown (8)',
        score: '13 - 15',
        winner: 'Brown (8)',
      },
    ],
    // Semifinals reordered to align with quarterfinal winners and final matchup
    semis: [
      {
        id: 9,
        team1: 'North Carolina (1)',
        team2: 'Cal Poly-SLO (5)',
        score: '13 - 15',
        winner: 'Cal Poly-SLO (5)',
      },
      {
        id: 10,
        team1: 'Brown (8)',
        team2: 'Colorado (4)',
        score: '15 - 12',
        winner: 'Brown (8)',
      },
    ],
    // Final remains the same, already correctly ordered
    final: [
      {
        id: 11,
        team1: 'Cal Poly-SLO (5)',
        team2: 'Brown (8)',
        score: '11 - 15',
        winner: 'Brown (8)',
      },
    ],
  },
};

// Helper function to extract team name without seed
const getTeamName = (fullTeamString: string) => {
  return fullTeamString.replace(/\s*\(\d+\)$/, '');
};

// Helper function to extract seed
const getSeed = (fullTeamString: string) => {
  const match = fullTeamString.match(/\((\d+)\)$/);
  return match ? parseInt(match[1]) : null;
};

const TournamentView = () => {
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
      </div>
    );
  };

  const BracketGame = ({ game, isLeft = true }) => {
    const team1 = getTeamName(game.team1);
    const team2 = getTeamName(game.team2);
    const seed1 = getSeed(game.team1);
    const seed2 = getSeed(game.team2);
    const isWinner1 = game.winner === game.team1;
    const isWinner2 = game.winner === game.team2;
    const [score1, score2] = game.score.split(' - ');

    return (
      <div className="bracket-game mb-4">
        <div className={`bracket-team ${isWinner1 ? 'winner' : 'loser'}`}>
          <div className="d-flex justify-content-between">
            <div className="d-flex align-items-center">
              <span>{team1}</span>
              <Badge bg="secondary" className="ms-2">
                {seed1}
              </Badge>
            </div>
            <span>{score1}</span>
          </div>
        </div>
        <div className={`bracket-team ${isWinner2 ? 'winner' : 'loser'}`}>
          <div className="d-flex justify-content-between">
            <div className="d-flex align-items-center">
              <span>{team2}</span>
              <Badge bg="secondary" className="ms-2">
                {seed2}
              </Badge>
            </div>
            <span>{score2}</span>
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
                <BracketGame key={game.id} game={game} />
              ))}
            </Col>

            {/* Quarters */}
            <Col md={3}>
              <h5 className="text-center mb-3">Quarterfinals</h5>
              {tournamentData.bracket.quarters.map((game) => (
                <BracketGame key={game.id} game={game} />
              ))}
            </Col>

            {/* Semis */}
            <Col md={3}>
              <h5 className="text-center mb-3">Semifinals</h5>
              {tournamentData.bracket.semis.map((game) => (
                <BracketGame key={game.id} game={game} />
              ))}
            </Col>

            {/* Final */}
            <Col md={3}>
              <h5 className="text-center mb-3">Final</h5>
              {tournamentData.bracket.final.map((game) => (
                <BracketGame key={game.id} game={game} />
              ))}
            </Col>
          </Row>
        </div>
      </div>
    );
  };

  return (
    <Container className="mt-4">
      {/* Pool Play section */}
      <div className="bg-light py-3 mb-4 border">
        <Container>
          <h3 className="text-center mb-0">Pool Play</h3>
        </Container>
      </div>
      {renderPoolStandings()}
      {/* Bracket section with some spacing */}
      <div className="mt-5">
        <div className="bg-light py-3 mb-4 border">
          <Container>
            <h3 className="text-center mb-0">Bracket Play</h3>
          </Container>
        </div>
        {renderBracket()}
      </div>
    </Container>
  );
};

export default TournamentView;
