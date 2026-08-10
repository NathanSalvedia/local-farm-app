import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export interface TabRoute {
  key: string;
  name: string;
  params?: object;
}

export interface TabNavigationProps {
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
  onFabPress?: () => void;
  showFab?: boolean;
  activeTabName?: string;
}

const ACTIVE_COLOR = "#72AF5B";
const INACTIVE_COLOR = "#9CA3AF";

// Icon mapping: route name → Ionicons vector icon names (active | inactive)
const TAB_ICONS: Record<
  string,
  {
    active: keyof typeof Ionicons.glyphMap;
    inactive: keyof typeof Ionicons.glyphMap;
  }
> = {
  index: { active: "home", inactive: "home-outline" },
  community: { active: "people", inactive: "people-outline" },
  chat: { active: "chatbubble", inactive: "chatbubble-outline" },
  explore: { active: "map", inactive: "map-outline" },
  more: { active: "menu", inactive: "menu" },
};

const STATIC_TABS = [
  { key: "index", name: "index", title: "Home", badge: 0 },
  { key: "community", name: "community", title: "Community", badge: 2 },
  { key: "chat", name: "chat", title: "Chat", badge: 7 },
  { key: "explore", name: "explore", title: "Explore", badge: 0 },
  { key: "more", name: "more", title: "More", badge: 0 },
];

// Badge counts per route
const BADGES: Record<string, number> = {
  community: 2,
  chat: 7,
};

export function UserTabBar({
  state,
  descriptors,
  navigation,
  onFabPress,
  showFab = true,
}: TabNavigationProps) {
  const router = useRouter();

  if (!state || !descriptors || !navigation) return null;

  return (
    <View
      className="absolute bottom-0 left-0 right-0 w-full z-50"
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        zIndex: 50,
      }}
    >
      {/* Floating Action Button (FAB) at bottom right */}
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
      <View className="flex-row items-center justify-around w-full h-16 bg-white border-t border-gray-200 shadow-2xl elevation-10 px-2">
        {state.routes.map((route: TabRoute, index: number) => {
          const options = descriptors[route.key]?.options || {};
          const isFocused = state.index === index;
          const icons = TAB_ICONS[route.name];
          const badgeCount = BADGES[route.name];

          const iconName = isFocused ? icons?.active : icons?.inactive;
          const iconColor = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;

          const onPress = () => {
            if (route.name === "index" || route.name === "home") {
              try {
                router.push("/user/NewsFeed");
                return;
              } catch (e) {}
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
              className="flex-1 items-center justify-center h-full relative"
              activeOpacity={0.7}
            >
              {iconName && (
                <Ionicons name={iconName} size={24} color={iconColor} />
              )}

              {badgeCount !== undefined && badgeCount > 0 && (
                <View className="absolute top-3 right-[22%] min-w-4 h-4 rounded-full bg-red-500 items-center justify-center px-1">
                  <Text className="text-white text-[10px] font-bold text-center">
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

export default function BottomNavBar(props?: TabNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  if (props?.state && props?.descriptors && props?.navigation) {
    return <UserTabBar {...props} />;
  }

  // Deduce active tab from current route pathname if activeTabName is not explicitly passed
  let activeTab = props?.activeTabName;
  if (!activeTab) {
    if (
      pathname.includes("NewsFeed") ||
      pathname === "/" ||
      pathname === "/user"
    ) {
      activeTab = "index";
    } else if (
      pathname.includes("People") ||
      pathname.includes("Friends") ||
      pathname.includes("Suggestions") ||
      pathname.includes("NearbyUsers") ||
      pathname.includes("SentRequests") ||
      pathname.includes("community")
    ) {
      activeTab = "community";
    } else if (pathname.includes("Chat")) {
      activeTab = "chat";
    } else if (pathname.includes("Explore")) {
      activeTab = "explore";
    } else if (pathname.includes("More")) {
      activeTab = "more";
    } else {
      activeTab = "index";
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
        router.push("/user/People");
      } catch (e) {
        console.warn(e);
      }
    }
  };

  return (
    <View
      className="absolute bottom-0 left-0 right-0 w-full z-50"
      pointerEvents="box-none"
      style={{
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
      <View className="flex-row items-center justify-around w-full h-16 bg-white border-t border-gray-200 shadow-2xl elevation-10 px-2">
        {STATIC_TABS.map((tab) => {
          const isFocused = activeTab === tab.key;
          const icons = TAB_ICONS[tab.name];
          const iconName = isFocused ? icons?.active : icons?.inactive;
          const iconColor = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleTabPress(tab.key)}
              className="flex-1 items-center justify-center h-full relative"
              activeOpacity={0.7}
            >
              {iconName && (
                <Ionicons name={iconName} size={24} color={iconColor} />
              )}

              {tab.badge > 0 && (
                <View className="absolute top-3 right-[22%] min-w-4 h-4 rounded-full bg-red-500 items-center justify-center px-1">
                  <Text className="text-white text-[10px] font-bold text-center">
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
