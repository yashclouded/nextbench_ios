/**
 * Root Layout
 *
 * This is the entry point for the entire app.
 * It wraps everything in providers and handles auth-based routing.
 *
 * Provider composition order (outermost first):
 * 1. QueryProvider — server state must be available everywhere
 * 2. AuthProvider — auth state depends on Firebase (which uses Query patterns)
 * 3. ThemeProvider — theming wraps navigation
 * 4. Navigation (Slot/Stack) — renders the current route
 */

import "../global.css";

import React, { useEffect } from "react";
import { useColorScheme } from "react-native";
import { Stack, useRouter, useSegments, ThemeProvider, DarkTheme, DefaultTheme } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import firestore from "@react-native-firebase/firestore";
import * as Linking from "expo-linking";
import { Alert } from "react-native";
import { isMagicLink, getPendingMagicLinkEmail } from "@/services/firebase/auth";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";

// Keep splash screen visible until fonts are loaded
SplashScreen.preventAutoHideAsync();

/**
 * Inner layout that handles auth-based routing.
 * Must be inside AuthProvider to access useAuth().
 */
function RootLayoutNav() {
  const { isAuthenticated, userData, isLoading, user, signInWithMagicLink } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  // Handle auth-based navigation
  useEffect(() => {
    if (isLoading) return; // Wait for auth to initialize

    const inAuthGroup = segments[0] === "(auth)";
    const isVerificationScreen = segments[0] === "(auth)" && segments[1] === "verification";
    const hasProfile = isAuthenticated && userData !== null;
    const needsVerification = hasProfile && userData?.verified === false;

    if (!hasProfile && !inAuthGroup) {
      // User is not signed in or missing profile → redirect to login
      router.replace("/(auth)/login");
    } else if (hasProfile) {
      if (needsVerification && !isVerificationScreen) {
        // Logged in but not verified -> force to verification screen
        router.replace("/(auth)/verification");
      } else if (!needsVerification && inAuthGroup) {
        // Logged in and verified but on auth screen -> redirect to home
        router.replace("/(tabs)");
      }
    }
  }, [isAuthenticated, userData, isLoading, segments]);

  // Handle incoming deep links for Magic Link Auth
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url || !isMagicLink(url)) return;

      try {
        const email = getPendingMagicLinkEmail();

        if (!email) {
          // If the email isn't available, we should ideally prompt for it, 
          // but for simplicity in this flow we'll alert the user.
          Alert.alert(
            "Email required",
            "Please enter your email on the login screen, then tap the link again."
          );
          return;
        }

        await signInWithMagicLink(email, url);
      } catch (error: any) {
        console.error("Magic Link Sign In Error: ", error);
        Alert.alert("Sign In Failed", error.message);
      }
    };

    // Handle the initial URL (app opened from closed state)
    Linking.getInitialURL().then(handleUrl);

    // Handle URLs while the app is in the background/foreground
    const subscription = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [signInWithMagicLink]);

  // Request push notification permissions when authenticated
  useEffect(() => {
    if (!isAuthenticated || !userData || !user) return;

    async function registerForPushNotifications() {
      if (!Device.isDevice) return; // Push doesn't work on simulator

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return;

      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId || !user) return;
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        // Store push token in Firestore
        await firestore().collection('users').doc(user.uid).update({
          pushToken: tokenData.data,
        });
      } catch (err) {
        console.warn('Failed to get push token:', err);
      }
    }

    registerForPushNotifications();
  }, [isAuthenticated, userData, user]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

/**
 * Root Layout — entry point.
 * Loads fonts, sets up providers, renders navigation.
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Hide splash screen when fonts are ready
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Don't render until fonts are loaded
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </QueryProvider>
  );
}
