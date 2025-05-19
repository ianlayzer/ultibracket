// src/utils/scoreUtils.ts

interface BracketGame {
  id: number;
  team1: string;
  team2: string;
  score: string; // May not be used for user pick scores but part of structure
  winner: string | null;
}

interface BracketStructure {
  prequarters: BracketGame[];
  quarters: BracketGame[];
  semis: BracketGame[];
  final: BracketGame[];
}

export const POINTS_PER_ROUND = {
  prequarters: 10,
  quarters: 20,
  semis: 40,
  final: 80,
};

export const MAX_POSSIBLE_POINTS =
  4 * POINTS_PER_ROUND.prequarters +
  4 * POINTS_PER_ROUND.quarters +
  2 * POINTS_PER_ROUND.semis +
  1 * POINTS_PER_ROUND.final;

export const calculateBracketScores = (
  bracket?: BracketStructure,
): { currentScore: number; possiblePointsRemaining: number } => {
  if (!bracket) {
    return { currentScore: 0, possiblePointsRemaining: MAX_POSSIBLE_POINTS };
  }

  let score = 0;
  const rounds: (keyof BracketStructure)[] = [
    'prequarters',
    'quarters',
    'semis',
    'final',
  ];

  rounds.forEach((roundName) => {
    // Ensure the round exists and is an array before iterating
    const gamesInRound = bracket[roundName];
    if (Array.isArray(gamesInRound)) {
      gamesInRound.forEach((game) => {
        if (game.winner) {
          score += POINTS_PER_ROUND[roundName];
        }
      });
    }
  });

  return {
    currentScore: score,
    possiblePointsRemaining: MAX_POSSIBLE_POINTS - score,
  };
};
