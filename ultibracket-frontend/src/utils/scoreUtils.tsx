// src/utils/scoreUtils.ts

interface BracketGame {
  id: number;
  team1: string;
  team2: string;
  winner: string | null;
}

interface BracketStructure {
  prequarters: BracketGame[];
  quarters: BracketGame[];
  semis: BracketGame[];
  final: BracketGame[];
}

// This type should align with how PoolTeam/Pools are structured in FirebaseTournamentType
// For simplicity, focusing on the team name.
interface ScoreUtilPoolTeam {
  team: string;
  // other pool properties if needed for tie-breakers, not used here
}
interface ScoreUtilPools {
  [key: string]: ScoreUtilPoolTeam[];
}

// Import the Tournament type from FirebaseUtils to use for masterTournamentData
// This avoids re-declaring a similar structure here.
// You might need to adjust the import path.
import { Tournament as FirebaseTournamentType } from './../firebase/FirebaseUtils';

export const SCORING_RULES = {
  PREQUARTERFINALIST: 100,
  QUARTERFINALIST: 200,
  SEMIFINALIST: 400,
  FINALIST: 800,
  CHAMPION: 1600,
};

export const MAX_POSSIBLE_POINTS_NEW_SYSTEM =
  8 * SCORING_RULES.PREQUARTERFINALIST +
  8 * SCORING_RULES.QUARTERFINALIST +
  4 * SCORING_RULES.SEMIFINALIST +
  2 * SCORING_RULES.FINALIST +
  1 * SCORING_RULES.CHAMPION;

/**
 * Gets teams that the user has predicted to be in a specific round's game slots.
 */
const getPredictedTeamsInRoundSlots = (
  userBracket: BracketStructure,
  roundName: keyof BracketStructure,
): Set<string> => {
  const teams = new Set<string>();
  if (!userBracket || !userBracket[roundName]) return teams;

  userBracket[roundName].forEach((game) => {
    if (game.team1 && game.team1 !== 'TBD') teams.add(game.team1);
    if (game.team2 && game.team2 !== 'TBD') teams.add(game.team2);
  });
  return teams;
};

/**
 * Gets teams that are *confirmed* to have made it to a specific round in the master bracket.
 * This relies on winners from previous rounds in the master bracket being set.
 */
const getConfirmedTeamsAdvancingToRound = (
  masterTournamentData: FirebaseTournamentType,
  roundName: keyof BracketStructure,
): Set<string> => {
  const teams = new Set<string>();
  if (!masterTournamentData || !masterTournamentData.bracket) return teams;

  const masterBracket = masterTournamentData.bracket;
  const masterPools = masterTournamentData.pools as ScoreUtilPools; // Cast for simplicity

  switch (roundName) {
    case 'prequarters': // Teams *playing* in prequarters are set by pool outcomes.
      // We assume these are "confirmed" once master pools are set.
      masterBracket.prequarters.forEach((game) => {
        if (game.team1 && game.team1 !== 'TBD') teams.add(game.team1);
        if (game.team2 && game.team2 !== 'TBD') teams.add(game.team2);
      });
      break;
    case 'quarters':
      // Confirmed Pool Winners (A1, B1, C1, D1 from master pools)
      // Standard seeding: A1, D1, C1, B1 are top seeds in QF games 0,1,2,3 respectively.
      // We must use the actual teams from master pools.
      if (masterPools) {
        if (masterPools['Pool A']?.[0]?.team)
          teams.add(masterPools['Pool A'][0].team);
        if (masterPools['Pool B']?.[0]?.team)
          teams.add(masterPools['Pool B'][0].team);
        if (masterPools['Pool C']?.[0]?.team)
          teams.add(masterPools['Pool C'][0].team);
        if (masterPools['Pool D']?.[0]?.team)
          teams.add(masterPools['Pool D'][0].team);
      }
      // Confirmed Winners of prequarter games from masterBracket
      masterBracket.prequarters.forEach((game) => {
        if (game.winner && game.winner !== 'TBD') teams.add(game.winner);
      });
      break;
    case 'semis':
      masterBracket.quarters.forEach((game) => {
        if (game.winner && game.winner !== 'TBD') teams.add(game.winner);
      });
      break;
    case 'final':
      masterBracket.semis.forEach((game) => {
        if (game.winner && game.winner !== 'TBD') teams.add(game.winner);
      });
      break;
    // No default needed as roundName is typed
  }
  return teams;
};

export const calculateBracketScoresAgainstMaster = (
  userBracket?: BracketStructure,
  masterTournamentData?: FirebaseTournamentType | null, // masterTournamentData can be null
): {
  currentScore: number;
  possiblePointsRemaining: number;
  maxPoints: number;
} => {
  // If no master bracket is available (e.g., not yet created/saved by admin)
  if (!masterTournamentData || !masterTournamentData.bracket) {
    return {
      currentScore: 0,
      possiblePointsRemaining: MAX_POSSIBLE_POINTS_NEW_SYSTEM,
      maxPoints: MAX_POSSIBLE_POINTS_NEW_SYSTEM,
    };
  }

  // If user has no bracket, they score 0, all points remain possible.
  if (!userBracket) {
    return {
      currentScore: 0,
      possiblePointsRemaining: MAX_POSSIBLE_POINTS_NEW_SYSTEM,
      maxPoints: MAX_POSSIBLE_POINTS_NEW_SYSTEM,
    };
  }

  const masterBracket = masterTournamentData.bracket;
  let score = 0;

  // Prequarterfinalists: User's predicted teams in prequarter slots vs. Master's actual teams in prequarter slots.
  // Master prequarter teams are "confirmed" once derived from master pool results.
  const userPrequarterTeams = getPredictedTeamsInRoundSlots(
    userBracket,
    'prequarters',
  );
  const masterPrequarterTeamsConfirmed = getConfirmedTeamsAdvancingToRound(
    masterTournamentData,
    'prequarters',
  );
  userPrequarterTeams.forEach((team) => {
    if (masterPrequarterTeamsConfirmed.has(team)) {
      score += SCORING_RULES.PREQUARTERFINALIST;
    }
  });

  // Quarterfinalists: User's predicted QF teams vs. Master's *confirmed* QF teams (pool winners + PQ winners).
  const userQuarterfinalTeams = getPredictedTeamsInRoundSlots(
    userBracket,
    'quarters',
  );
  const masterQuarterfinalTeamsConfirmed = getConfirmedTeamsAdvancingToRound(
    masterTournamentData,
    'quarters',
  );
  userQuarterfinalTeams.forEach((team) => {
    if (masterQuarterfinalTeamsConfirmed.has(team)) {
      score += SCORING_RULES.QUARTERFINALIST;
    }
  });

  // Semifinalists: User's predicted SF teams vs. Master's *confirmed* SF teams (QF winners).
  const userSemifinalTeams = getPredictedTeamsInRoundSlots(
    userBracket,
    'semis',
  );
  const masterSemifinalTeamsConfirmed = getConfirmedTeamsAdvancingToRound(
    masterTournamentData,
    'semis',
  );
  userSemifinalTeams.forEach((team) => {
    if (masterSemifinalTeamsConfirmed.has(team)) {
      score += SCORING_RULES.SEMIFINALIST;
    }
  });

  // Finalists: User's predicted Final teams vs. Master's *confirmed* Final teams (SF winners).
  const userFinalistTeams = getPredictedTeamsInRoundSlots(userBracket, 'final');
  const masterFinalistTeamsConfirmed = getConfirmedTeamsAdvancingToRound(
    masterTournamentData,
    'final',
  );
  userFinalistTeams.forEach((team) => {
    if (masterFinalistTeamsConfirmed.has(team)) {
      score += SCORING_RULES.FINALIST;
    }
  });

  // Champion: User's champion pick vs. Master's *confirmed* champion.
  const userChampion = userBracket.final[0]?.winner;
  const masterChampionConfirmed = masterBracket.final[0]?.winner;

  if (
    masterChampionConfirmed &&
    masterChampionConfirmed !== 'TBD' &&
    userChampion &&
    userChampion === masterChampionConfirmed
  ) {
    score += SCORING_RULES.CHAMPION;
  }

  // If master bracket is incomplete, currentScore will be lower.
  // possiblePointsRemaining reflects points that can still be earned as master bracket completes.
  return {
    currentScore: score,
    possiblePointsRemaining: MAX_POSSIBLE_POINTS_NEW_SYSTEM - score,
    maxPoints: MAX_POSSIBLE_POINTS_NEW_SYSTEM,
  };
};

// Old scoring function (calculateBracketCompletionScore) can remain as is.
export const calculateBracketCompletionScore = (
  bracket?: BracketStructure,
): { currentScore: number; possiblePointsRemaining: number } => {
  const OLD_POINTS_PER_ROUND = {
    prequarters: 10,
    quarters: 20,
    semis: 40,
    final: 80,
  };
  const OLD_MAX_POSSIBLE_POINTS =
    4 * OLD_POINTS_PER_ROUND.prequarters +
    4 * OLD_POINTS_PER_ROUND.quarters +
    2 * OLD_POINTS_PER_ROUND.semis +
    1 * OLD_POINTS_PER_ROUND.final;

  if (!bracket) {
    return {
      currentScore: 0,
      possiblePointsRemaining: OLD_MAX_POSSIBLE_POINTS,
    };
  }
  let score = 0;
  const rounds: (keyof BracketStructure)[] = [
    'prequarters',
    'quarters',
    'semis',
    'final',
  ];
  rounds.forEach((roundName) => {
    const gamesInRound = bracket[roundName];
    if (Array.isArray(gamesInRound)) {
      gamesInRound.forEach((game) => {
        if (game.winner) score += OLD_POINTS_PER_ROUND[roundName];
      });
    }
  });
  return {
    currentScore: score,
    possiblePointsRemaining: OLD_MAX_POSSIBLE_POINTS - score,
  };
};
