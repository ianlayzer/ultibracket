// src/pages/RulesAndScoringPage.tsx
import React from 'react';
import { Container, Card, ListGroup, Row, Col, Table } from 'react-bootstrap';

// Import scoring constants if you want to display them dynamically,
// otherwise, you can hardcode them in the text.
// import { SCORING_RULES, MAX_POSSIBLE_POINTS_NEW_SYSTEM } from '../utils/scoreUtils'; // Adjust path as needed

function RulesAndScoringPage() {
  // You can either hardcode values or import from scoreUtils
  const scoring = {
    prequarterfinalist: 100,
    quarterfinalist: 200,
    semifinalist: 400,
    finalist: 800,
    champion: 1600,
  };
  const maxPoints =
    8 * scoring.prequarterfinalist +
    8 * scoring.quarterfinalist +
    4 * scoring.semifinalist +
    2 * scoring.finalist +
    1 * scoring.champion;

  return (
    <Container className="mt-4 mb-5">
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <Card>
            <Card.Header className="bg-primary text-white">
              <h2 className="text-center mb-0">📜 Rules & Scoring</h2>
            </Card.Header>
            <Card.Body>
              <section className="mb-4">
                <Card.Title as="h3" className="mb-3">
                  How to Play
                </Card.Title>
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    <strong>1. Sign Up / Log In:</strong> You'll need an account
                    to save your bracket predictions.
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>2. Access Your Bracket:</strong> Navigate to "My
                    Bracket" from the menu.
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>3. Set Pool Rankings:</strong>
                    <ul className="mt-2">
                      <li>
                        Before the bracket is generated, you can drag and drop
                        teams within each pool to set your predicted finishing
                        order.
                      </li>
                      <li>
                        The top 3 teams from each pool (based on your ranking)
                        will advance to the bracket.
                      </li>
                    </ul>
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>4. Populate Bracket:</strong> Click "Populate
                    Bracket from Pool Rankings". This will set the initial
                    matchups for Prequarterfinals and Quarterfinals based on
                    your pool predictions (or default seedings if you skip pool
                    ranking).
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>5. Make Your Picks:</strong>
                    <ul className="mt-2">
                      <li>
                        Click on a team in a matchup to select them as the
                        winner. They will advance to the next round.
                      </li>
                      <li>
                        Continue making picks through Prequarters,
                        Quarterfinals, Semifinals, and the Final until you have
                        a champion.
                      </li>
                      <li>
                        If you change your mind on a pick, you can click the
                        winning team again to deselect them (this will clear
                        their path in subsequent rounds).
                      </li>
                    </ul>
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>6. Name Your Bracket:</strong> Give your bracket a
                    unique name!
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>7. Save Your Picks:</strong>
                    <ul className="mt-2">
                      <li>
                        Click "Save Picks & Name" to save your progress. You can
                        come back and edit your bracket until the lock time.
                      </li>
                      <li>
                        **Important:** Your bracket must be fully completed (a
                        champion selected) to be eligible for full points, but
                        saving partial progress is allowed.
                      </li>
                    </ul>
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>8. Lock Time:</strong> All brackets will lock on
                    **Friday, May 23, 2025, at 10:30 AM Pacific Time**. No
                    changes can be made after this time.
                  </ListGroup.Item>
                </ListGroup>
              </section>

              <hr />

              <section className="mb-4">
                <Card.Title as="h3" className="mb-3">
                  Scoring System
                </Card.Title>
                <p>
                  Points are awarded based on how accurately your bracket
                  predictions match the official results.
                </p>
                <Table
                  striped
                  bordered
                  hover
                  responsive
                  size="sm"
                  className="mt-2"
                >
                  <tbody>
                    <tr>
                      <td>Prequarterfinalist</td>
                      <td>{scoring.prequarterfinalist} points per team</td>
                    </tr>
                    <tr>
                      <td>Quarterfinalist</td>
                      <td>{scoring.quarterfinalist} points per team</td>
                    </tr>
                    <tr>
                      <td>Semifinalist</td>
                      <td>{scoring.semifinalist} points per team</td>
                    </tr>
                    <tr>
                      <td>Finalist</td>
                      <td>{scoring.finalist} points per team</td>
                    </tr>
                    <tr>
                      <td>Champion</td>
                      <td>{scoring.champion} points</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="text-end fw-bold">
                        Maximum Possible Points:
                      </td>
                      <td className="fw-bold">{maxPoints}</td>
                    </tr>
                  </tfoot>
                </Table>
              </section>

              <hr />

              <section>
                <Card.Title as="h3" className="mb-3">
                  General Notes
                </Card.Title>
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    Administrators will update scores as the tournament unfolds.
                  </ListGroup.Item>
                  <ListGroup.Item>
                    Make sure your bracket is fully saved before the tournament
                    starts.
                  </ListGroup.Item>
                  <ListGroup.Item>Have fun and good luck!</ListGroup.Item>
                </ListGroup>
              </section>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default RulesAndScoringPage;
