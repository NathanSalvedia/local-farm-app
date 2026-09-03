import { getBadgeCountsApi } from "@/services/badge-service";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export interface TabRoute {
  key: string;
  name: string;
  params?: object;
}

export interface NavigationProps {
  activeTab?: "Home" | "Friends" | "Messages" | "Map" | "Menu" | "Chat" | "Connection" | string;
  activeTabName?: string;
  onFabPress?: () => void;
  showFab?: boolean;
  state?: {
    index: number;
    routes: TabRoute[];
  };
  descriptors?: Record<
    string,
    { options?: { tabBarAccessibilityLabel?: string } }
  >;
  navigation?: {
    emit: (event: {
      type: string;
      target: string;
      canPreventDefault?: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

const ACTIVE_COLOR = "#72AF5B"; // LocalFarm green
const INACTIVE_COLOR = "#9CA3AF"; // Neutral gray

export function UserTabBar({
  state,
  descriptors,
  navigation,
  onFabPress,
  showFab = true,
}: NavigationProps) {
  const router = useRouter();
  const [badgeCounts, setBadgeCounts] = useState({ requestsCount: 0, unreadMessagesCount: 0 });

  useEffect(() => {
    let isMounted = true;
    const loadBadges = async () => {
      const counts = await getBadgeCountsApi();
      if (isMounted) setBadgeCounts(counts);
    };
    loadBadges();
    const interval = setInterval(loadBadges, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!state || !descriptors || !navigation) return null;

  return (
    <View
      className="absolute bottom-0 left-0 right-0 w-full z-50"
      style={{
        pointerEvents: "box-none",
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        zIndex: 50,
      }}
    >
      {/* Floating Action Button (FAB) */}
      {showFab && (
        <TouchableOpacity
          className="absolute bottom-[72px] right-4 h-14 w-14 rounded-full bg-[#72AF5B] items-center justify-center shadow-lg elevation-6 z-[60]"
          style={{ position: "absolute", bottom: 72, right: 16, zIndex: 60 }}
          activeOpacity={0.8}
          onPress={onFabPress}
          accessibilityRole="button"
          accessibilityLabel="Add new item"
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Navigation Bar */}
      <View className="flex-row items-center justify-around w-full h-14 bg-white border-t border-gray-200 shadow-2xl elevation-10">
        {state.routes.map((route: TabRoute, index: number) => {
          const options = descriptors[route.key]?.options || {};
          const isFocused = state.index === index;

          let iconName: keyof typeof Ionicons.glyphMap = "home";
          let badgeCount = 0;

          if (route.name === "community" || route.name === "People" || route.name === "Friends") {
            iconName = "people";
            badgeCount = badgeCounts.requestsCount;
          } else if (route.name === "chat" || route.name === "Chats" || route.name === "Messages") {
            iconName = "chatbubble";
            badgeCount = badgeCounts.unreadMessagesCount;
          } else if (route.name === "explore" || route.name === "Map" || route.name === "ExploreMap") {
            iconName = "map";
          } else if (route.name === "more" || route.name === "Menu" || route.name === "MenuProfile") {
            iconName = "menu";
          } else {
            iconName = "home";
          }

          const iconColor = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;

          const onPress = () => {
            if (route.name === "index" || route.name === "home") {
              try {
                router.push("/user/NewsFeed");
                return;
              } catch {}
            }
            if (route.name === "chat" || route.name === "Chats" || route.name === "Messages") {
              try {
                router.push("/user/Chats");
                return;
              } catch {}
            }
            if (route.name === "community" || route.name === "People" || route.name === "Friends") {
              try {
                router.push("/user/Friends");
                return;
              } catch {}
            }
            if (route.name === "explore" || route.name === "Map" || route.name === "ExploreMap") {
              try {
                router.push("/user/ExploreMap");
                return;
              } catch {}
            }
            if (route.name === "more" || route.name === "Menu" || route.name === "MenuProfile") {
              try {
                router.push("/user/MenuProfile");
                return;
              } catch {}
            }
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              className="flex-1 h-full justify-center items-center relative"
              activeOpacity={0.7}
            >
              {/* Short Active Green Line Indicator at Top */}
              {isFocused && (
                <View
                  className="absolute top-0 w-8 h-[3.5px] bg-[#72AF5B] rounded-b-md"
                  style={{
                    position: "absolute",
                    top: 0,
                    width: 34,
                    height: 3.5,
                    backgroundColor: "#72AF5B",
                    borderBottomLeftRadius: 3,
                    borderBottomRightRadius: 3,
                  }}
                />
              )}

              <Ionicons name={iconName} size={24} color={iconColor} />

              {badgeCount > 0 && (
                <View className="absolute top-2 right-[20%] min-w-[17px] h-[17px] px-1 rounded-full bg-red-600 items-center justify-center shadow-2xs">
                  <Text className="text-white text-[10px] font-bold text-center leading-tight">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function Navigation(props?: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [badgeCounts, setBadgeCounts] = useState({ requestsCount: 0, unreadMessagesCount: 0 });

  useEffect(() => {
    let isMounted = true;
    const loadBadges = async () => {
      const counts = await getBadgeCountsApi();
      if (isMounted) setBadgeCounts(counts);
    };
    loadBadges();
    const interval = setInterval(loadBadges, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (props?.state && props?.descriptors && props?.navigation) {
    return <UserTabBar {...props} />;
  }

  // Deduce active tab key from props or current pathname
  let activeKey = "index";

  if (props?.activeTab) {
    const tabMap: Record<string, string> = {
      Home: "index",
      Friends: "community",
      Connection: "community",
      Messages: "chat",
      Chat: "chat",
      Chats: "chat",
      Map: "explore",
      Menu: "more",
    };
    activeKey = tabMap[props.activeTab] || props.activeTab;
  } else if (props?.activeTabName) {
    activeKey = props.activeTabName;
  } else {
    if (
      pathname.includes("NewsFeed") ||
      pathname === "/" ||
      pathname === "/user"
    ) {
      activeKey = "index";
    } else if (
      pathname.includes("People") ||
      pathname.includes("Friends") ||
      pathname.includes("Suggestions") ||
      pathname.includes("SentRequests") ||
      pathname.includes("community")
    ) {
      activeKey = "community";
    } else if (
      pathname.includes("Chat") ||
      pathname.includes("Chats") ||
      pathname.includes("chat") ||
      pathname.includes("MessageRequests") ||
      pathname.includes("SpamMessages") ||
      pathname.includes("ArchivedMessages") ||
      pathname.includes("RestrictedAccounts")
    ) {
      activeKey = "chat";
    } else if (
      pathname.includes("Explore") ||
      pathname.includes("ExploreMap") ||
      pathname.includes("NearbyUsers") ||
      pathname.includes("explore") ||
      pathname.includes("Map")
    ) {
      activeKey = "explore";
    } else if (
      pathname.includes("More") ||
      pathname.includes("Menu") ||
      pathname.includes("MenuProfile") ||
      pathname.includes("Profile")
    ) {
      activeKey = "more";
    } else {
      activeKey = "index";
    }
  }

  const showFab = props?.showFab ?? true;

  const handleTabPress = (tabKey: string) => {
    if (tabKey === "index") {
      try {
        router.push("/user/NewsFeed");
      } catch (e) {
        console.warn(e);
      }
    } else if (tabKey === "community") {
      try {
        router.push("/user/Friends");
      } catch (e) {
        console.warn(e);
      }
    } else if (tabKey === "chat") {
      try {
        router.push("/user/Chats");
      } catch (e) {
        console.warn(e);
      }
    } else if (tabKey === "explore") {
      try {
        router.push("/user/ExploreMap");
      } catch (e) {
        console.warn(e);
      }
    } else if (tabKey === "more") {
      try {
        router.push("/user/MenuProfile");
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const tabsConfig = [
    { key: "index", title: "Home", icon: "home" as const, badge: 0 },
    { key: "community", title: "Friends", icon: "people" as const, badge: badgeCounts.requestsCount },
    { key: "chat", title: "Messages", icon: "chatbubble" as const, badge: badgeCounts.unreadMessagesCount },
    { key: "explore", title: "Map", icon: "map" as const, badge: 0 },
    { key: "more", title: "Menu", icon: "menu" as const, badge: 0 },
  ];

  return (
    <View
      className="absolute bottom-0 left-0 right-0 w-full z-50"
      style={{
        pointerEvents: "box-none",
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        zIndex: 50,
      }}
    >
      {/* Floating Action Button (FAB) */}
      {showFab && (
        <TouchableOpacity
          className="absolute bottom-[72px] right-4 h-14 w-14 rounded-full bg-[#72AF5B] items-center justify-center shadow-lg elevation-6 z-[60]"
          style={{ position: "absolute", bottom: 72, right: 16, zIndex: 60 }}
          activeOpacity={0.8}
          onPress={props?.onFabPress}
          accessibilityRole="button"
          accessibilityLabel="Add new item"
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Bottom Navigation Bar */}
      <View className="flex-row items-center justify-around w-full h-14 bg-white border-t border-gray-200 shadow-2xl elevation-10">
        {tabsConfig.map((tab) => {
          const isFocused =
            activeKey === tab.key ||
            activeKey === tab.title ||
            activeKey.toLowerCase() === tab.title.toLowerCase();

          const iconColor = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleTabPress(tab.key)}
              className="flex-1 h-full justify-center items-center relative"
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tab.title}
            >
              {/* Short Active Green Line Indicator at Top Edge */}
              {isFocused && (
                <View
                  className="absolute top-0 w-8 h-[3.5px] bg-[#72AF5B] rounded-b-md"
                  style={{
                    position: "absolute",
                    top: 0,
                    width: 34,
                    height: 3.5,
                    backgroundColor: "#72AF5B",
                    borderBottomLeftRadius: 3,
                    borderBottomRightRadius: 3,
                  }}
                />
              )}

              <Ionicons name={tab.icon} size={24} color={iconColor} />

              {tab.badge !== undefined && tab.badge > 0 && (
                <View className="absolute top-2 right-[20%] min-w-[17px] h-[17px] px-1 rounded-full bg-red-600 items-center justify-center shadow-2xs">
                  <Text className="text-white text-[10px] font-bold text-center leading-tight">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
