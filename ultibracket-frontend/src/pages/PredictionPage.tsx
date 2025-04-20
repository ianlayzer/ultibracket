import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/firebase';
import { ref, set, get } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

function PredictionPage() {
  const [prediction, setPrediction] = useState('');
  const [existingPrediction, setExistingPrediction] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // Set up auth state observer
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoggedIn(true);
        fetchPrediction(user.uid);
      } else {
        setLoggedIn(false);
        setLoading(false);
      }
    });

    // Cleanup function
    return () => unsubscribe();
  }, []);

  // Separate the fetch function to be called after auth state changes
  const fetchPrediction = async (userId: string) => {
    try {
      const userPredictionRef = ref(db, `predictions/${userId}`);
      const snapshot = await get(userPredictionRef);

      if (snapshot.exists()) {
        setExistingPrediction(snapshot.val());
        console.log('Prediction fetched:', snapshot.val());
      } else {
        console.log('No prediction found');
      }
    } catch (error) {
      console.error('Error fetching prediction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrediction(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (user && prediction.trim()) {
      const userPredictionRef = ref(db, `predictions/${user.uid}`);
      try {
        await set(userPredictionRef, prediction);
        setExistingPrediction(prediction);
        console.log('Prediction saved successfully:', prediction);
      } catch (error) {
        console.error('Error saving prediction:', error);
      }
    } else {
      console.log('No user logged in or prediction is empty');
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!loggedIn) {
    return <p>Log in to see this page</p>;
  }

  return (
    <div>
      <h2>Who do you think will win nationals?</h2>
      {existingPrediction ? (
        <p>Your current prediction: {existingPrediction}</p>
      ) : (
        <p>You haven't made a prediction yet.</p>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={prediction}
          onChange={handleInputChange}
          placeholder="Enter your prediction"
        />
        <button type="submit">Submit Prediction</button>
      </form>
    </div>
  );
}

export default PredictionPage;
