export type Team = {
  id: string;
  name: string;
  seed: number;
};

export type Game = {
  id: string;
  round: number;
  teamA: Team;
  teamB: Team;
  scoreA?: number;
  scoreB?: number;
  winner?: Team;
};

export type Pool = {
  id: string;
  name: string;
  teams: Team[];
  games: Game[];
};

export type PoolPlayRound = {
  id: string;
  pools: Pool[];
};

export type EliminationRound = {
  id: string;
  roundNumber: number;
  games: Game[];
};

export type Tournament = {
  id: string;
  name: string;
  year: number;
  poolPlay: PoolPlayRound;
  eliminationRounds: EliminationRound[];
  champion?: Team;
};

export type Record = {
  wins: number;
  losses: number;
};
