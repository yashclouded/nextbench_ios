/**
 * Auth Provider
 *
 * Provides authentication state to the entire app via React Context.
 * Subscribes to Firebase onAuthStateChanged and Firestore user document.
 */

import {
  signInWithGoogle as firebaseSignInWithGoogle,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendMagicLink as firebaseSendMagicLink,
  signInWithMagicLink as firebaseSignInWithMagicLink,
  type FirebaseUser,
} from "@/services/firebase/auth";
import { subscribeToDocument } from "@/services/firebase/firestore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface UserData {
  id: string;
  name: string;
  email: string;
  school: string;
  verified: boolean;
  verificationStatus: "pending" | "approved" | "rejected";
  reputation: number;
  isAdmin: boolean;
  profilePicture?: string | null;
  idCardUrl?: string | null;
  selfieUrl?: string | null;
  about?: string | null;
  username?: string | null;
  city?: string;
  createdAt: any;
  updatedAt: any;
}

interface AuthContextValue {
  /** The current Firebase user, or null if not signed in */
  user: FirebaseUser | null;
  /** The Firestore user document */
  userData: UserData | null;
  /** True while the initial auth state and doc is being determined */
  isLoading: boolean;
  /** Convenience: true if user is non-null */
  isAuthenticated: boolean;
  /** Sign in with Google */
  signInWithGoogle: () => Promise<any>;
  /** Send Magic Link */
  sendMagicLink: (email: string) => Promise<void>;
  /** Sign in with Magic Link */
  signInWithMagicLink: (email: string, link: string) => Promise<any>;
  /** Sign out */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Configure GoogleSignin on mount
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
  }, []);

  // Subscribe to auth state changes and Firestore document
  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Subscribe to Firestore user doc
        unsubscribeDoc = subscribeToDocument<UserData>(
          "users",
          firebaseUser.uid,
          (doc) => {
            setUserData(doc);
            setIsLoading(false);
          }
        );
      } else {
        setUserData(null);
        setIsLoading(false);
        if (unsubscribeDoc) unsubscribeDoc();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const signInWithGoogle = async () => {
    return firebaseSignInWithGoogle();
  };

  const sendMagicLink = async (email: string) => {
    return firebaseSendMagicLink(email);
  };

  const signInWithMagicLink = async (email: string, link: string) => {
    return firebaseSignInWithMagicLink(email, link);
  };

  const signOut = async () => {
    await firebaseSignOut();
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      userData,
      isLoading,
      isAuthenticated: user !== null,
      signInWithGoogle,
      sendMagicLink,
      signInWithMagicLink,
      signOut,
    }),
    [user, userData, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
