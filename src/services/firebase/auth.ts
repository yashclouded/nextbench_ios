/**
 * Firebase Authentication Service
 *
 * All auth operations are centralized here. Screens never call
 * Firebase Auth directly — they go through AuthProvider which
 * uses these functions.
 *
 * Adding a new auth provider (e.g., Apple Sign In) means adding
 * one function here. Nothing else changes.
 */

import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

let pendingMagicLinkEmail: string | null = null;

export function setPendingMagicLinkEmail(email: string) {
  pendingMagicLinkEmail = email;
}

export function getPendingMagicLinkEmail(): string | null {
  return pendingMagicLinkEmail;
}

export type FirebaseUser = FirebaseAuthTypes.User;

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChanged(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return auth().onAuthStateChanged(callback);
}

/**
 * Sign in with Google.
 * Uses @react-native-google-signin/google-signin to get an idToken,
 * then authenticates with Firebase.
 */
export async function signInWithGoogle(): Promise<FirebaseAuthTypes.UserCredential> {
  // Check if your device supports Google Play
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // Get the users ID token
  const signInResult = await GoogleSignin.signIn();
  const idToken = signInResult.data?.idToken;

  if (!idToken) {
    throw new Error("No ID token found");
  }

  // Create a Google credential with the token
  const googleCredential = auth.GoogleAuthProvider.credential(idToken);

  // Sign-in the user with the credential
  return auth().signInWithCredential(googleCredential);
}

/**
 * Sign out the current user.
 * Signs out from both Google and Firebase to clear cache.
 */
export async function signOut(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (e) {
    // Ignore error if not signed in with Google
  }
  return auth().signOut();
}

/**
 * Send a Magic Link to the provided email.
 */
export async function sendMagicLink(email: string): Promise<void> {
  const actionCodeSettings = {
    // URL must be whitelisted in Firebase Console -> Auth -> Settings -> Authorized Domains
    url: 'https://nextbench-a11ed.firebaseapp.com/login',
    handleCodeInApp: true,
    iOS: {
      bundleId: 'in.nextbench.app',
    },
    android: {
      packageName: 'in.nextbench.app',
      installApp: true,
    },
    // The default dynamic link domain can be inferred or specified here if set up in Firebase
  };

  return auth().sendSignInLinkToEmail(email, actionCodeSettings);
}

/**
 * Check if a deep link URL is a Firebase Email Sign-In link.
 */
export function isMagicLink(url: string): boolean {
  return auth().isSignInWithEmailLink(url);
}

/**
 * Sign in using the magic link and the original email.
 */
export async function signInWithMagicLink(email: string, link: string): Promise<FirebaseAuthTypes.UserCredential> {
  return auth().signInWithEmailLink(email, link);
}

/**
 * Get the currently signed-in user (synchronous snapshot).
 * Returns null if no user is signed in.
 */
export function getCurrentUser(): FirebaseUser | null {
  return auth().currentUser;
}

/**.     
 * Update the user's display name and photo URL.
 */
export async function updateProfile(updates: {
  displayName?: string;
  photoURL?: string;
}): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error("No authenticated user");
  return user.updateProfile(updates);
}
