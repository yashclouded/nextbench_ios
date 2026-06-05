/**
 * Tabs Layout
 *
 * Bottom tab navigator for the main app.
 * Clean, minimal tab bar with blur background.
 */

import React, { useState, useEffect } from "react";
import { Tabs, useRouter, usePathname } from "expo-router";
import { useColorScheme, View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Home, Search, Plus, MessageSquare, User, Bell } from "lucide-react-native";
import { BlurView } from "expo-blur";
import Animated, { useAnimatedStyle, withSpring, withSequence, useSharedValue, withDelay, runOnJS } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/providers/AuthProvider";
import firestore from "@react-native-firebase/firestore";

const AnimatedIcon = ({ focused, IconComponent, activeColor, iconColor, size = 24 }: any) => {
  const scale = useSharedValue(1);
  
  useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 1, { damping: 14, stiffness: 200 });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      <IconComponent 
        size={size} 
        color={focused ? activeColor : iconColor} 
        strokeWidth={focused ? 2.2 : 1.5}
        fill={focused ? (IconComponent === Home ? activeColor : 'transparent') : 'transparent'}
      />
    </Animated.View>
  );
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  
  const iconColor = isDark ? "#8E8E93" : "#8E8E93";
  const activeColor = isDark ? "#2DD4BF" : "#14B8A6";

  const [unreadCount, setUnreadCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<{title: string, message: string, link: string} | null>(null);
  const toastY = useSharedValue(-150);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    let initialLoad = true;
    const unsub = firestore()
      .collection("notifications")
      .where("userId", "==", user.uid)
      .where("read", "==", false)
      .where("type", "==", "new_message")
      .onSnapshot((snap) => {
        // Only count actual chat messages for the messages tab
        let chatUnread = 0;
        snap.docs.forEach(doc => {
          if (doc.data().link?.startsWith("/chat/")) {
            chatUnread++;
          }
        });
        setUnreadCount(chatUnread);

        if (!initialLoad) {
          snap.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data();
              
              // Only show toast if we are not already on the target screen
              if (data.link !== pathname) {
                setToastMessage({
                  title: data.title || "New Message",
                  message: data.message || "",
                  link: data.link || ""
                });
                
                toastY.value = withSequence(
                  withSpring(insets.top + 10, { damping: 15 }),
                  withDelay(4000, withSpring(-150, { damping: 15 }, (finished) => {
                    if (finished) runOnJS(setToastMessage)(null);
                  }))
                );
              }
            }
          });
        }
        initialLoad = false;
      });

    return () => unsub();
  }, [user, insets.top]);

  const toastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastY.value }],
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
  }));

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          animation: 'shift',
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: iconColor,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 0,
            backgroundColor: 'transparent',
            borderTopWidth: 0.5,
            borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            height: 85,
            paddingTop: 10,
          },
          tabBarBackground: () => (
            <BlurView
              tint={isDark ? "dark" : "light"}
              intensity={90}
              style={StyleSheet.absoluteFill}
            />
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => <AnimatedIcon focused={focused} IconComponent={Home} activeColor={activeColor} iconColor={iconColor} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            tabBarIcon: ({ focused }) => <AnimatedIcon focused={focused} IconComponent={Search} activeColor={activeColor} iconColor={iconColor} />,
          }}
        />
        
        <Tabs.Screen
          name="create"
          options={{
            title: "Sell",
            tabBarIcon: ({ focused }) => <AnimatedIcon focused={focused} IconComponent={Plus} activeColor={activeColor} iconColor={iconColor} size={26} />,
          }}
        />

        <Tabs.Screen
          name="messages"
          options={{
            title: "Messages",
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarBadgeStyle: { backgroundColor: '#F43F5E', fontSize: 10, marginTop: 2 },
            tabBarIcon: ({ focused }) => <AnimatedIcon focused={focused} IconComponent={MessageSquare} activeColor={activeColor} iconColor={iconColor} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused }) => <AnimatedIcon focused={focused} IconComponent={User} activeColor={activeColor} iconColor={iconColor} />,
          }}
        />
      </Tabs>

      {toastMessage && (
        <Animated.View style={toastStyle}>
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => {
              toastY.value = withSpring(-150);
              if (toastMessage.link.startsWith("/chat/")) {
                const chatId = toastMessage.link.replace("/chat/", "");
                router.push(`/chat/${chatId}` as any);
              }
            }}
            style={{
              backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
              padding: 16,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
            }}
          >
            <View style={{ backgroundColor: "rgba(20, 184, 166, 0.1)", padding: 10, borderRadius: 12, marginRight: 12 }}>
              <Bell size={20} color="#14B8A6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: isDark ? "#FFF" : "#000", fontWeight: "600", fontSize: 15, marginBottom: 2 }}>{toastMessage.title}</Text>
              <Text style={{ color: isDark ? "#A1A1AA" : "#71717A", fontSize: 13 }} numberOfLines={1}>{toastMessage.message}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </>
  );
}
