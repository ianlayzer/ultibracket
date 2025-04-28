// firebaseUtils.ts
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  getDoc,
  getDocs,
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
  timestamp?: number;
  champion?: string;
}

/**
 * Save tournament data to Firestore
 * @param tournamentData Tournament data to save
 * @returns Promise that resolves with the document ID
 */
export const saveTournament = async (
  tournamentData: Tournament,
): Promise<string> => {
  console.log('trying to save tournament in utils');
  try {
    // Add timestamp and get champion from final game
    const finalGame = tournamentData.bracket.final[0];
    const updatedData = {
      ...tournamentData,
      timestamp: Date.now(),
      champion: finalGame.winner,
    };

    // Create a unique ID based on the tournament name and timestamp
    const tournamentId = `${tournamentData.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;

    // Save to Firestore
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await setDoc(tournamentRef, updatedData);

    console.log('Tournament saved successfully with ID:', tournamentId);
    return tournamentId;
  } catch (error) {
    console.error('Error saving tournament:', error);
    throw error;
  }
};

/**
 * Get a tournament by ID
 * @param tournamentId The tournament document ID
 * @returns Promise with tournament data or null if not found
 */
export const getTournament = async (
  tournamentId: string,
): Promise<Tournament | null> => {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (tournamentSnap.exists()) {
      return tournamentSnap.data() as Tournament;
    } else {
      console.log('No tournament found with ID:', tournamentId);
      return null;
    }
  } catch (error) {
    console.error('Error getting tournament:', error);
    throw error;
  }
};

/**
 * Get all tournaments
 * @returns Promise with array of tournaments
 */
export const getAllTournaments = async (): Promise<Tournament[]> => {
  try {
    const tournamentsRef = collection(db, 'tournaments');
    const tournamentSnap = await getDocs(tournamentsRef);

    const tournaments: Tournament[] = [];
    tournamentSnap.forEach((doc) => {
      tournaments.push(doc.data() as Tournament);
    });

    return tournaments;
  } catch (error) {
    console.error('Error getting tournaments:', error);
    throw error;
  }
};
