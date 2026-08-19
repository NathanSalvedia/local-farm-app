import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export interface TabRoute {
  key: string;
  name: string;
  params?: object;
}

export interface NavigationProps {
  activeTab?: "Home" | "Friends" | "Messages" | "Map" | "Menu" | string;
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

const ACTIVE_COLOR = "#006400"; // Dark green matching reference image
const INACTIVE_COLOR = "#9CA3AF"; // Neutral gray

interface TabItemConfig {
  key: string;
  title: "Home" | "Friends" | "Messages" | "Map" | "Menu";
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

const STATIC_TABS: TabItemConfig[] = [
  { key: "index", title: "Home", icon: "home" },
  { key: "community", title: "Friends", icon: "people", badge: 2 },
  { key: "chat", title: "Messages", icon: "chatbubble", badge: 7 },
  { key: "explore", title: "Map", icon: "map" },
  { key: "more", title: "Menu", icon: "menu" },
];

export function UserTabBar({
  state,
  descriptors,
  navigation,
  onFabPress,
  showFab = true,
}: NavigationProps) {
  const router = useRouter();

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
      <View className="flex-row items-center justify-around w-full h-14 bg-white border-t border-gray-200 shadow-2xl elevation-10">
        {state.routes.map((route: TabRoute, index: number) => {
          const options = descriptors[route.key]?.options || {};
          const isFocused = state.index === index;
          const tabConfig = STATIC_TABS.find(
            (t) =>
              t.key === route.name ||
              t.title.toLowerCase() === route.name.toLowerCase()
          ) || STATIC_TABS[index] || { icon: "home", badge: 0 };

          const iconColor = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;

          const onPress = () => {
            if (route.name === "index" || route.name === "home") {
              try {
                router.push("/user/NewsFeed");
                return;
              } catch (e) {}
            }
            if (route.name === "chat" || route.name === "Chats") {
              try {
                router.push("/user/Chats");
                return;
              } catch (e) {}
            }
            if (route.name === "community" || route.name === "People") {
              try {
                router.push("/user/People");
                return;
              } catch (e) {}
            }
            if (route.name === "explore" || route.name === "Map" || route.name === "NearbyUsers") {
              try {
                router.push("/user/ExploreMap");
                return;
              } catch (e) {}
            }
            if (route.name === "more" || route.name === "Menu" || route.name === "Profile") {
              try {
                router.push("/user/MenuProfile");
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
              className="flex-1 h-full justify-center items-center relative"
              activeOpacity={0.7}
            >
              {/* Short Active Green Line Indicator at Top */}
              {isFocused && (
                <View
                  className="absolute top-0 w-8 h-[3.5px] bg-[#006400] rounded-b-md"
                  style={{
                    position: "absolute",
                    top: 0,
                    width: 34,
                    height: 3.5,
                    backgroundColor: "#006400",
                    borderBottomLeftRadius: 3,
                    borderBottomRightRadius: 3,
                  }}
                />
              )}

              <Ionicons name={tabConfig.icon} size={24} color={iconColor} />

              {tabConfig.badge !== undefined && tabConfig.badge > 0 && (
                <View className="absolute top-2 right-[20%] w-4 h-4 rounded-full bg-red-600 items-center justify-center shadow-2xs">
                  <Text className="text-white text-[10px] font-bold text-center leading-tight">
                    {tabConfig.badge > 99 ? "99+" : tabConfig.badge}
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

  if (props?.state && props?.descriptors && props?.navigation) {
    return <UserTabBar {...props} />;
  }

  // Deduce active tab key from props or current pathname
  let activeKey = "index";

  if (props?.activeTab) {
    const tabMap: Record<string, string> = {
      Home: "index",
      Friends: "community",
      Messages: "chat",
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
      pathname.includes("MenuProfile")
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
        router.push("/user/People");
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
        {STATIC_TABS.map((tab) => {
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
                  className="absolute top-0 w-8 h-[3.5px] bg-[#006400] rounded-b-md"
                  style={{
                    position: "absolute",
                    top: 0,
                    width: 34,
                    height: 3.5,
                    backgroundColor: "#006400",
                    borderBottomLeftRadius: 3,
                    borderBottomRightRadius: 3,
                  }}
                />
              )}

              <Ionicons name={tab.icon} size={24} color={iconColor} />

              {tab.badge !== undefined && tab.badge > 0 && (
                <View className="absolute top-2 right-[20%] w-4 h-4 rounded-full bg-red-600 items-center justify-center shadow-2xs">
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
