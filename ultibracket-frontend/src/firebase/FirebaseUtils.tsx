// firebaseUtils.ts
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  getDoc,
  getDocs,
  serverTimestamp, // Import serverTimestamp
} from 'firebase/firestore';

// Firebase configuration
// Replace with your own Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyBidqGv121tuSkNb8H4acyr4sNKzp8xqac',
  authDomain: 'ultibracket.firebaseapp.com',
  databaseURL: 'https://ultibracket-default-rtdb.firebaseio.com',
  projectId: 'ultibracket',
  storageBucket: 'ultibracket.firebasestorage.app',
  messagingSenderId: '210033848428',
  appId: '1:210033848428:web:4850ae16edf028b858e849',
  measurementId: 'G-E6KV0V288D',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Type definitions (matching our Tournament component)
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

export interface Tournament {
  // Exporting for use in UserBracketPicks
  name: string; // This will be the base tournament name
  pools: {
    [key: string]: PoolTeam[];
  };
  bracket: {
    prequarters: BracketGame[];
    quarters: BracketGame[];
    semis: BracketGame[];
    final: BracketGame[];
  };
  timestamp?: any; // Changed to any to accommodate serverTimestamp
  champion?: string;
}

// New interface for User's Bracket Picks
export interface UserBracketPicks {
  userId: string;
  baseTournamentName: string; // e.g., "USA Ultimate College Nationals 2025"
  userBracketName: string; // e.g., "user@example.com's bracket"
  tournamentData: Tournament; // The user's version of the tournament (pool order, bracket picks)
  champion?: string;
  lastSaved: any; // For serverTimestamp
}

// Helper to slugify names for IDs
const slugify = (text: string) => {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');
};

/**
 * Save MASTER tournament data to Firestore (e.g., by an admin)
 * @param tournamentData Tournament data to save
 * @returns Promise that resolves with the document ID
 */
export const saveMasterTournament = async (
  tournamentData: Tournament,
): Promise<string> => {
  try {
    const finalGame = tournamentData.bracket.final[0];
    const updatedData = {
      ...tournamentData,
      timestamp: serverTimestamp(),
      champion: finalGame?.winner || null, // Ensure finalGame exists
    };

    const tournamentId =
      slugify(tournamentData.name) || `tournament-${Date.now()}`;

    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await setDoc(tournamentRef, updatedData);

    return tournamentId;
  } catch (error) {
    console.error('Error saving master tournament:', error);
    throw error;
  }
};

/**
 * Get a MASTER tournament by its slugified name (ID)
 * @param tournamentName The base name of the tournament
 * @returns Promise with tournament data or null if not found
 */
export const getMasterTournament = async (
  tournamentName: string,
): Promise<Tournament | null> => {
  try {
    const tournamentId = slugify(tournamentName);
    if (!tournamentId) return null;

    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (tournamentSnap.exists()) {
      return tournamentSnap.data() as Tournament;
    } else {
      console.log('No master tournament found with name:', tournamentName);
      return null;
    }
  } catch (error) {
    console.error('Error getting master tournament:', error);
    throw error;
  }
};

/**
 * Save user's bracket picks to Firestore
 * @param userId The ID of the user
 * @param baseTournamentName The name of the base tournament structure
 * @param userBracketName The custom name for the user's bracket
 * @param tournamentData The user's current tournament state (pools, bracket picks)
 * @returns Promise that resolves with the user bracket document ID
 */
export const saveUserBracketPicks = async (
  userId: string,
  baseTournamentName: string,
  userBracketName: string,
  tournamentData: Tournament,
): Promise<string> => {
  try {
    if (!userId || !baseTournamentName) {
      throw new Error('User ID and Base Tournament Name are required.');
    }

    const finalGame = tournamentData.bracket.final[0];
    const userPicksData: UserBracketPicks = {
      userId,
      baseTournamentName,
      userBracketName,
      tournamentData, // Save the entire tournament data as the user configured it
      champion: finalGame?.winner || 'nobody',
      lastSaved: serverTimestamp(),
    };

    const userBracketId = `${userId}_${slugify(baseTournamentName)}`;
    const userBracketRef = doc(db, 'userBrackets', userBracketId);
    await setDoc(userBracketRef, userPicksData);

    return userBracketId;
  } catch (error) {
    console.error('Error saving user bracket picks:', error);
    throw error;
  }
};

/**
 * Get a user's bracket picks by userId and base tournament name
 * @param userId The user's ID
 * @param baseTournamentName The name of the base tournament
 * @returns Promise with UserBracketPicks data or null if not found
 */
export const getUserBracketPicks = async (
  userId: string,
  baseTournamentName: string,
): Promise<UserBracketPicks | null> => {
  try {
    if (!userId || !baseTournamentName) return null;

    const userBracketId = `${userId}_${slugify(baseTournamentName)}`;
    const userBracketRef = doc(db, 'userBrackets', userBracketId);
    const userBracketSnap = await getDoc(userBracketRef);

    if (userBracketSnap.exists()) {
      return userBracketSnap.data() as UserBracketPicks;
    } else {
      console.log('No user bracket found for:', userBracketId);
      return null;
    }
  } catch (error) {
    console.error('Error getting user bracket picks:', error);
    throw error;
  }
};

/**
 * Get all MASTER tournaments (example, might not be used directly by TournamentView for users)
 * @returns Promise with array of tournaments
 */
export const getAllMasterTournaments = async (): Promise<Tournament[]> => {
  try {
    const tournamentsRef = collection(db, 'tournaments');
    const tournamentSnap = await getDocs(tournamentsRef);

    const tournaments: Tournament[] = [];
    tournamentSnap.forEach((doc) => {
      tournaments.push(doc.data() as Tournament);
    });

    return tournaments;
  } catch (error) {
    console.error('Error getting all master tournaments:', error);
    throw error;
  }
};

// Renamed original functions to avoid confusion if they were for master tournaments
export const saveTournament = saveMasterTournament;
export const getTournament = getMasterTournament;
export const getAllTournaments = getAllMasterTournaments;
