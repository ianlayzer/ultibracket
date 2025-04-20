import { auth } from '../firebase/firebase';
import { signOut } from 'firebase/auth';

export const handleGoogleLogout = async () => {
  await signOut(auth);
  // after logout, refresh the page
  window.location.reload();
};
