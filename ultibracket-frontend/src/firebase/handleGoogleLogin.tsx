// src/firebase/handleGoogleLogin.ts (or wherever it's defined)
import {
  signInWithPopup,
  GoogleAuthProvider,
  AuthError, // Import AuthError for better type checking
} from 'firebase/auth';
import { auth } from '../firebase/firebase'; // Your Firebase auth instance

export const handleGoogleLogin = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    // The user is signed in.
    console.log('Google Login Successful, user:', result.user);

    // Option 1: Reload the page (your current method)
    // This works because your useAuth hook should pick up the new auth state on reload.
    if (result.user) {
      window.location.reload();
    }

    // Option 2: Update state or navigate (more React-idiomatic but requires more setup)
    // For example, if you have a setUser function from a context:
    // setUser(result.user);
    // Or if using React Router:
    // navigate('/my-bracket'); // Assuming navigate is available
  } catch (error) {
    const authError = error as AuthError; // Cast to AuthError to access 'code'

    console.error('Google Login Error Code:', authError.code);
    console.error('Google Login Error Message:', authError.message);

    // More specific error handling:
    if (authError.code === 'auth/popup-closed-by-user') {
      console.log('Login popup was closed by the user.');
      // No need to show a generic error message to the user for this.
    } else if (authError.code === 'auth/cancelled-popup-request') {
      console.log('Popup request cancelled (e.g., another popup was opened).');
    } else if (authError.code === 'auth/popup-blocked') {
      alert(
        'Login popup was blocked by your browser. Please allow popups for this site to sign in.',
      );
    } else if (
      authError.code === 'auth/account-exists-with-different-credential'
    ) {
      alert(
        'An account already exists with the same email address but different sign-in credentials. Try signing in using a different provider associated with this email.',
      );
      // You might want to guide the user or link accounts here if you support multiple providers.
    } else if (authError.code) {
      // Handle other Firebase auth errors
      alert(`Login failed: ${authError.message} (Code: ${authError.code})`);
    } else {
      // Handle non-Firebase errors or unknown structure
      console.error('An unknown error occurred during sign-in:', error);
      alert('An unexpected error occurred during sign-in. Please try again.');
    }
  }
};
