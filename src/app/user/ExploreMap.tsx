import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import Navigation from "../../components/Navigation";

const openDirections = (lat: number, lng: number, label: string) => {
  const scheme = Platform.select({
    ios: `maps:0,0?daddr=${lat},${lng}&q=${encodeURIComponent(label)}`,
    android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(label)})`,
  });
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  if (scheme) {
    Linking.canOpenURL(scheme)
      .then((supported) => {
        if (supported) {
          Linking.openURL(scheme);
        } else {
          Linking.openURL(webUrl);
        }
      })
      .catch(() => {
        Linking.openURL(webUrl);
      });
  } else {
    Linking.openURL(webUrl);
  }
};

export interface FarmLocationItem {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  farmerName: string;
  type: "Farm" | "Wholesaler";
  produce: string;
  priceRange: string;
  distance: string;
  rating: number;
  description: string;
  imageUrl: string;
}

export interface RouteDetails {
  distance: string;
  durationDrive: string;
  durationWalk: string;
  waypoints: [number, number][];
}

// Fixed central starting location for user in Iligan City (Pala-o / City Center)
export const DEFAULT_USER_LOCATION = {
  latitude: 8.228,
  longitude: 124.243,
};

// Realistic static road waypoints from DEFAULT_USER_LOCATION (8.2280, 124.2430) to each farm
export const STATIC_ROUTES: Record<
  string,
  {
    distance: string;
    durationDrive: string;
    durationWalk: string;
    waypoints: [number, number][];
  }
> = {
  "palao-1": {
    distance: "350m",
    durationDrive: "1 min",
    durationWalk: "4 mins",
    waypoints: [
      [8.228, 124.243],
      [8.2282, 124.2442],
      [8.2283, 124.2452],
    ],
  },
  "delcarmen-wholesaler": {
    distance: "650m",
    durationDrive: "2 mins",
    durationWalk: "8 mins",
    waypoints: [
      [8.228, 124.243],
      [8.2305, 124.243],
      [8.2328, 124.243],
      [8.2345, 124.243],
    ],
  },
  "tipanoy-1": {
    distance: "2.1 km",
    durationDrive: "6 mins",
    durationWalk: "26 mins",
    waypoints: [
      [8.228, 124.243],
      [8.225, 124.244],
      [8.221, 124.247],
      [8.217, 124.2505],
      [8.214, 124.2525],
      [8.212, 124.254],
    ],
  },
  "tambo-wholesaler": {
    distance: "2.3 km",
    durationDrive: "7 mins",
    durationWalk: "28 mins",
    waypoints: [
      [8.228, 124.243],
      [8.2315, 124.2442],
      [8.236, 124.2468],
      [8.2395, 124.25],
      [8.242, 124.2525],
      [8.2435, 124.254],
    ],
  },
  "tubod-wholesaler": {
    distance: "2.4 km",
    durationDrive: "7 mins",
    durationWalk: "30 mins",
    waypoints: [
      [8.228, 124.243],
      [8.2235, 124.2415],
      [8.2185, 124.2395],
      [8.2135, 124.238],
      [8.209, 124.237],
    ],
  },
  "luinab-1": {
    distance: "1.9 km",
    durationDrive: "5 mins",
    durationWalk: "23 mins",
    waypoints: [
      [8.228, 124.243],
      [8.2272, 124.2485],
      [8.226, 124.254],
      [8.2245, 124.258],
      [8.2235, 124.261],
    ],
  },
  "tuburan-1": {
    distance: "1.3 km",
    durationDrive: "4 mins",
    durationWalk: "16 mins",
    waypoints: [
      [8.228, 124.243],
      [8.231, 124.242],
      [8.2345, 124.2405],
      [8.238, 124.239],
    ],
  },
  "ditucalan-1": {
    distance: "6.8 km",
    durationDrive: "15 mins",
    durationWalk: "1 hr 20 mins",
    waypoints: [
      [8.228, 124.243],
      [8.221, 124.236],
      [8.212, 124.226],
      [8.201, 124.214],
      [8.191, 124.203],
      [8.1819, 124.1936],
    ],
  },
  "abuno-1": {
    distance: "1.5 km",
    durationDrive: "5 mins",
    durationWalk: "19 mins",
    waypoints: [
      [8.228, 124.243],
      [8.2245, 124.2445],
      [8.221, 124.247],
      [8.2185, 124.2485],
      [8.2165, 124.2495],
    ],
  },
};

// Helper to compute realistic route waypoints from user location to target farm
export function getRouteForFarm(
  userLat: number,
  userLng: number,
  farm: FarmLocationItem,
): RouteDetails {
  const staticRoute = STATIC_ROUTES[farm.id];
  if (staticRoute) {
    const waypoints: [number, number][] = [
      [userLat, userLng],
      ...staticRoute.waypoints.slice(1),
    ];
    return {
      distance: staticRoute.distance,
      durationDrive: staticRoute.durationDrive,
      durationWalk: staticRoute.durationWalk,
      waypoints,
    };
  }

  // Dynamic fallback for any unlisted farm
  const midLat = (userLat + farm.latitude) / 2 + 0.001;
  const midLng = (userLng + farm.longitude) / 2 - 0.001;
  return {
    distance: farm.distance.split(" • ")[0] || "1.5 km",
    durationDrive: "4 mins",
    durationWalk: "15 mins",
    waypoints: [
      [userLat, userLng],
      [midLat, midLng],
      [farm.latitude, farm.longitude],
    ],
  };
}

// Local Farm Producers and Wholesalers in key barangays of Iligan City
export const MOCK_LOCAL_FARMS: FarmLocationItem[] = [
  {
    id: "tipanoy-1",
    latitude: 8.212,
    longitude: 124.254,
    title: "Tipanoy Highland Dairy & Dragonfruit Farm",
    farmerName: "Fritz Subrabas",
    type: "Farm",
    produce: "Pure Cow's Milk, Goat's Milk & Sweet Red Dragonfruit",
    priceRange: "₱95/bottle • ₱150/kg",
    distance: "850m away • Tipanoy, Iligan City",
    rating: 4.9,
    description:
      "Pasture-fed dairy cattle and highland dragonfruit plantation in upper Tipanoy.",
    imageUrl:
      "https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "tambo-wholesaler",
    latitude: 8.2435,
    longitude: 124.254,
    title: "Tambo Wholesale Agro-Trading Hub",
    farmerName: "Belerick Teele (Trader)",
    type: "Wholesaler",
    produce: "Bulk Sacks of Cabbage, Carrots, Potatoes & Onions",
    priceRange: "₱30 - ₱65/kg (Wholesale Bulk)",
    distance: "2.3km away • Tambo, Iligan City",
    rating: 4.9,
    description:
      "Major bagsakan and commercial wholesale supply depot for local retail markets and supermarkets.",
    imageUrl:
      "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "tubod-wholesaler",
    latitude: 8.209,
    longitude: 124.237,
    title: "Tubod Commercial Fruit & Banana Wholesaler",
    farmerName: "Cleagarda Harley (Wholesaler)",
    type: "Wholesaler",
    produce: "Wholesale Lakatan Bananas, Watermelons & Young Coconuts",
    priceRange: "₱35/kg bulk bananas • ₱22/pc coconut",
    distance: "1.4km away • Tubod, Iligan City",
    rating: 4.8,
    description:
      "Wholesale volume distributor of fresh tropical fruits directly supplied to fruit stalls and vendors.",
    imageUrl:
      "https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "delcarmen-wholesaler",
    latitude: 8.2345,
    longitude: 124.243,
    title: "Del Carmen Wholesale Produce & Grains Hub",
    farmerName: "Aldous Peak (Distributor)",
    type: "Wholesaler",
    produce: "Bulk Sacks of Corn, Rice, Squash, Ampalaya & Eggplants",
    priceRange: "₱28 - ₱55/kg (Bulk Volume)",
    distance: "650m away • Del Carmen, Iligan City",
    rating: 4.8,
    description:
      "Central wholesale trading center supplying bulk grains, lowland vegetables, and root crops.",
    imageUrl:
      "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "luinab-1",
    latitude: 8.2235,
    longitude: 124.261,
    title: "Luinab Fresh Greens & Herb Garden",
    farmerName: "Molbert Uzumaki",
    type: "Farm",
    produce: "Organic Sweet Basil, Rosemary, Mint & Cherry Tomatoes",
    priceRange: "₱40/bundle • ₱70/pack",
    distance: "1.1km away • Luinab, Iligan City",
    rating: 4.8,
    description:
      "Lush botanical herb farm and fresh culinary greens garden located in quiet Luinab hills.",
    imageUrl:
      "https://images.unsplash.com/photo-1592417817098-8f3d6eb22534?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "palao-1",
    latitude: 8.2283,
    longitude: 124.2452,
    title: "Salvedia Organic Farm",
    farmerName: "Zorel Salvedia",
    type: "Farm",
    produce: "Fresh Cabbage, Bell Peppers & Cherry Tomatoes",
    priceRange: "₱50 - ₱120/kg",
    distance: "350m away • Pala-o, Iligan City",
    rating: 4.9,
    description:
      "Eco-certified organic vegetable farm. Freshly picked lettuce, juicy tomatoes, and natural pest-free herbs.",
    imageUrl:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "tuburan-1",
    latitude: 8.238,
    longitude: 124.239,
    title: "Tuburan Sweet Corn & Rootcrops",
    farmerName: "Chris Manuel Tuburan",
    type: "Farm",
    produce: "Yellow Sweet Corn, Fresh Cassava & Ube",
    priceRange: "₱35 - ₱75/kg",
    distance: "1.2km away • Tuburan, Iligan City",
    rating: 4.7,
    description:
      "Heritage sweet corn and root crop plantation harvested daily for local markets and households.",
    imageUrl:
      "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "ditucalan-1",
    latitude: 8.1819,
    longitude: 124.1936,
    title: "Maria Cristina Free-Range Poultry",
    farmerName: "Angelo Mijares",
    type: "Farm",
    produce: "Organic Brown Eggs & Native Free-Range Chicken",
    priceRange: "₱240/tray (30 pcs)",
    distance: "3.2km away • Ditucalan, Iligan City",
    rating: 4.8,
    description:
      "Pasture-raised poultry farm specializing in nutritious organic farm-fresh brown eggs.",
    imageUrl:
      "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "abuno-1",
    latitude: 8.2165,
    longitude: 124.2495,
    title: "Abuno Fruit Orchard & Agri-Nursery",
    farmerName: "Richard Laviña",
    type: "Farm",
    produce: "Sweet Carabao Mangoes, Fresh Papaya, Cacao & Pomelo",
    priceRange: "₱60 - ₱140/kg",
    distance: "1.5km away • Abuno, Iligan City",
    rating: 4.9,
    description:
      "High-yield tropical fruit orchard and native vegetable plantation nestled in the fertile lands of Abuno, Iligan City.",
    imageUrl:
      "https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=400&q=80",
  },
];

export default function ExploreMap() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const iframeRef = useRef<any>(null);
  const webViewRef = useRef<WebView>(null);

  const [selectedLocation, setSelectedLocation] =
    useState<FarmLocationItem | null>(null);
  const [activeRouteLocation, setActiveRouteLocation] =
    useState<FarmLocationItem | null>(null);
  const [searchText, setSearchText] = useState("");
  const [userLocation, setUserLocation] = useState(DEFAULT_USER_LOCATION);
  const [liveRoadStats, setLiveRoadStats] = useState<{
    distance: string;
    durationDrive: string;
    durationWalk: string;
  } | null>(null);

  // Compute active route details from current user position to destination
  const activeRouteDetails = useMemo(() => {
    if (!activeRouteLocation) return null;
    const base = getRouteForFarm(
      userLocation.latitude,
      userLocation.longitude,
      activeRouteLocation,
    );
    if (liveRoadStats) {
      return {
        ...base,
        distance: liveRoadStats.distance,
        durationDrive: liveRoadStats.durationDrive,
        durationWalk: liveRoadStats.durationWalk,
      };
    }
    return base;
  }, [activeRouteLocation, userLocation, liveRoadStats]);

  // Send message to Leaflet map (both Web iframe and Native WebView)
  const sendMapMessage = (msg: any) => {
    if (Platform.OS === "web") {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify(msg), "*");
      }
    } else if (webViewRef.current) {
      const payload = JSON.stringify(msg);
      webViewRef.current.injectJavaScript(`
        if (window.handleParentMessage) {
          window.handleParentMessage(${payload});
        }
        true;
      `);
    }
  };

  // Toggle or activate route to target farm
  const handleToggleRoute = (farm: FarmLocationItem) => {
    if (activeRouteLocation?.id === farm.id) {
      // Clear route
      setActiveRouteLocation(null);
      setLiveRoadStats(null);
      sendMapMessage({ type: "CLEAR_ROUTE" });
    } else {
      // Show route
      setActiveRouteLocation(farm);
      setSelectedLocation(farm);
      setLiveRoadStats(null);
      const route = getRouteForFarm(
        userLocation.latitude,
        userLocation.longitude,
        farm,
      );
      sendMapMessage({
        type: "SHOW_ROUTE",
        farmId: farm.id,
        waypoints: route.waypoints,
        destLat: farm.latitude,
        destLng: farm.longitude,
      });
    }
  };

  // Real-time continuous GPS tracking via expo-location
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    const startLocationTracking = async () => {
      try {
        // 1. Check if location services (GPS toggle) are enabled on the device/emulator
        const isServicesEnabled = await Location.hasServicesEnabledAsync();
        if (!isServicesEnabled) {
          console.log(
            "Device location services are turned off, using default coordinates",
          );
          return;
        }

        // 2. Request foreground permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log(
            "Location permission not granted, keeping default coordinates",
          );
          return;
        }

        // 3. Fast non-blocking check with last known position
        try {
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (isMounted && lastKnown?.coords) {
            const { latitude, longitude } = lastKnown.coords;
            setUserLocation({ latitude, longitude });
            sendMapMessage({
              type: "UPDATE_USER_LOCATION",
              latitude,
              longitude,
            });
          }
        } catch {
          // Ignore last-known errors
        }

        // 4. Try initial fresh position fix
        try {
          const currentLoc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          if (isMounted && currentLoc?.coords) {
            const { latitude, longitude } = currentLoc.coords;
            setUserLocation({ latitude, longitude });
            sendMapMessage({
              type: "UPDATE_USER_LOCATION",
              latitude,
              longitude,
            });
          }
        } catch {
          // If immediate fix isn't ready in emulator yet, watchPositionAsync will stream when available
        }

        // 5. Real-time watch stream
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000, // Stream update every 2 seconds
            distanceInterval: 2, // Or every 2 meters of movement
          },
          (loc) => {
            if (isMounted && loc?.coords) {
              const { latitude, longitude } = loc.coords;
              setUserLocation({ latitude, longitude });
              sendMapMessage({
                type: "UPDATE_USER_LOCATION",
                latitude,
                longitude,
              });
            }
          },
        );
      } catch (err) {
        // Suppress warning screen and smoothly keep default user location
        console.log("GPS stream initialization notice:", err);
      }
    };

    startLocationTracking();

    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Filter farms by search keyword
  const filteredFarms = useMemo(() => {
    if (!searchText.trim()) {
      return MOCK_LOCAL_FARMS;
    }
    const query = searchText.toLowerCase();
    return MOCK_LOCAL_FARMS.filter(
      (farm) =>
        farm.title.toLowerCase().includes(query) ||
        farm.type.toLowerCase().includes(query) ||
        farm.produce.toLowerCase().includes(query) ||
        farm.farmerName.toLowerCase().includes(query) ||
        farm.distance.toLowerCase().includes(query) ||
        farm.description.toLowerCase().includes(query),
    );
  }, [searchText]);

  // Unified message handler from Leaflet map
  const handleMapIncomingMessage = useCallback(
    (raw: any) => {
      try {
        const data = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!data) return;

        if (data.type === "PIN_CLICKED" || (data.id && data.title)) {
          const farm =
            data.farm ||
            filteredFarms.find((f) => f.id === data.id) ||
            data;
          if (farm && farm.title) {
            setSelectedLocation(farm);
          }
        } else if (data.type === "ROUTE_REQUESTED") {
          // "Directions" button on the pin popup was clicked inside Leaflet
          const farm = filteredFarms.find((f) => f.id === data.farmId);
          if (farm) {
            setLiveRoadStats(null);
            setSelectedLocation(farm);
            setActiveRouteLocation(farm);
            const route = getRouteForFarm(
              userLocation.latitude,
              userLocation.longitude,
              farm,
            );
            sendMapMessage({
              type: "SHOW_ROUTE",
              farmId: farm.id,
              waypoints: route.waypoints,
              destLat: farm.latitude,
              destLng: farm.longitude,
            });
          }
        } else if (data.type === "ROAD_STATS_UPDATED") {
          // Live road statistics returned from OSRM road geometry
          setLiveRoadStats({
            distance: data.distance,
            durationDrive: data.durationDrive,
            durationWalk: data.durationWalk,
          });
        } else if (data.type === "CLEAR_ROUTE_REQUESTED") {
          setActiveRouteLocation(null);
          setLiveRoadStats(null);
        }
      } catch {
        // Ignore parse errors
      }
    },
    [filteredFarms, userLocation],
  );

  // Web iframe message listener
  useEffect(() => {
    if (Platform.OS === "web") {
      const handleWebMessage = (event: MessageEvent) => {
        handleMapIncomingMessage(event.data);
      };
      window.addEventListener("message", handleWebMessage);
      return () => window.removeEventListener("message", handleWebMessage);
    }
  }, [handleMapIncomingMessage]);

  // Native WebView message handler
  const handleWebViewMessage = (event: any) => {
    handleMapIncomingMessage(event.nativeEvent.data);
  };

  const handleRecenterUser = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (loc?.coords) {
        const { latitude, longitude } = loc.coords;
        setUserLocation({ latitude, longitude });
        sendMapMessage({
          type: "UPDATE_USER_LOCATION",
          latitude,
          longitude,
        });
      }
    } catch {
      // Fallback to sending recenter with existing coordinates
    }
    sendMapMessage({ type: "RECENTER" });
  };

  const initialLat = userLocation.latitude;
  const initialLng = userLocation.longitude;
  const initialZoom = 13;

  // Leaflet HTML template with dynamic Farm / Wholesaler markers, User Location, and Route Polyline
  const leafletHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <title>Local Farm Map</title>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossorigin=""
      />
      <script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        crossorigin=""
      ></script>
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
        }
        html, body, #map {
          width: 100%;
          height: 100%;
          min-height: 100%;
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          overflow: hidden;
          background-color: #e5e7eb;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .custom-location-marker {
          background: transparent;
          border: none;
        }
        .marker-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transform: translate(-50%, -100%);
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .marker-wrapper:hover, .marker-wrapper:active {
          transform: translate(-50%, -106%) scale(1.08);
          z-index: 9999 !important;
        }
        .marker-image-container {
          width: 80px;
          height: 56px;
          border-radius: 8px;
          border: 2px solid #ffffff;
          overflow: hidden;
          background-color: #cbd5e1;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.38);
          position: relative;
          z-index: 2;
        }
        .marker-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .marker-type-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          border-radius: 4px;
          padding: 1px 4px;
          font-size: 8px;
          font-weight: bold;
          color: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          letter-spacing: 0.2px;
        }
        .marker-pin-svg {
          width: 26px;
          height: 32px;
          margin-top: -4px;
          z-index: 1;
          filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.45));
        }

        /* User Location Marker & Radar Pulse */
        .user-marker-container {
          background: transparent;
          border: none;
        }
        .user-location-marker {
          position: relative;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .user-pulse-ring {
          position: absolute;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background-color: rgba(114, 175, 91, 0.4);
          animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        .user-core-dot {
          position: relative;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background-color: #72AF5B;
          border: 3px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
          z-index: 2;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.4); opacity: 0.9; }
          70% { transform: scale(1.6); opacity: 0.2; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        /* Leaflet Marker Popup Customization */
        .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25) !important;
          padding: 3px !important;
        }
        .leaflet-popup-content {
          margin: 10px 12px !important;
          line-height: 1.3 !important;
        }
        .popup-dir-btn {
          display: block;
          width: 100%;
          margin-top: 8px;
          background-color: #72AF5B;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          text-align: center;
          transition: background-color 0.15s ease;
        }
        .popup-dir-btn:hover, .popup-dir-btn:active {
          background-color: #5e944a;
        }
        .leaflet-control-attribution {
          font-size: 9px !important;
          background: rgba(255, 255, 255, 0.75) !important;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var userLat = ${userLocation.latitude};
        var userLng = ${userLocation.longitude};
        var locations = ${JSON.stringify(filteredFarms)};
        var staticRoutes = ${JSON.stringify(STATIC_ROUTES)};

        var currentRouteCasing = null;
        var currentRouteLine = null;

        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false
        }).setView([${initialLat}, ${initialLng}], ${initialZoom});

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        setTimeout(function() {
          map.invalidateSize();
        }, 250);

        // 1. Current User Location Marker (Pulsing Radar Dot)
        var userIcon = L.divIcon({
          className: 'user-marker-container',
          html: '<div class="user-location-marker">' +
                  '<div class="user-pulse-ring"></div>' +
                  '<div class="user-core-dot"></div>' +
                '</div>',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        var userMarker = L.marker([userLat, userLng], {
          icon: userIcon,
          zIndexOffset: 1000
        }).addTo(map);

        userMarker.bindTooltip('<b>You are here</b><br>Current Location', {
          permanent: false,
          direction: 'top',
          offset: [0, -10]
        });

        // 2. Add Farm / Wholesaler Markers with Custom Popups
        locations.forEach(function(locationData) {
          var isWholesaler = locationData.type === 'Wholesaler';
          var badgeText = isWholesaler ? '📦 Wholesaler' : '🌿 Field';
          var badgeBg = isWholesaler ? 'rgba(217, 119, 6, 0.95)' : 'rgba(22, 101, 52, 0.92)';
          var pinColor = isWholesaler ? '#d97706' : '#16a34a';

          var markerHtml = 
            '<div class="marker-wrapper">' +
              '<div class="marker-image-container">' +
                '<img class="marker-image" src="' + locationData.imageUrl + '" alt="' + locationData.title + '" />' +
                '<span class="marker-type-badge" style="background: ' + badgeBg + ';">' + badgeText + '</span>' +
              '</div>' +
              '<svg class="marker-pin-svg" viewBox="0 0 24 24" fill="' + pinColor + '" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" stroke="#ffffff" stroke-width="1.3"/>' +
              '</svg>' +
            '</div>';

          var customIcon = L.divIcon({
            className: 'custom-location-marker',
            html: markerHtml,
            iconSize: [80, 84],
            iconAnchor: [40, 84]
          });

          var marker = L.marker([locationData.latitude, locationData.longitude], {
            icon: customIcon
          }).addTo(map);

          // Popup on the pin with "Directions" button
          var popupContent =
            '<div style="min-width: 175px; max-width: 220px; text-align: left;">' +
              '<div style="font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 2px;">' + locationData.title + '</div>' +
              '<div style="font-size: 11px; color: #4b5563; margin-bottom: 4px;">' + locationData.produce + '</div>' +
              '<div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 600; color: #16a34a; margin-bottom: 2px;">' +
                '<span>' + badgeText + '</span>' +
                '<span style="color: #6b7280; font-weight: 500;">' + locationData.distance.split(' • ')[0] + '</span>' +
              '</div>' +
              '<button class="popup-dir-btn" onclick="window.requestRoute(\\'' + locationData.id + '\\')">' +
                '🧭 Directions' +
              '</button>' +
            '</div>';

          marker.bindPopup(popupContent, {
            offset: [0, -78],
            closeButton: true
          });

          marker.on('click', function(e) {
            if (e && e.originalEvent) {
              e.originalEvent.stopPropagation();
            }
            marker.openPopup();
            var payload = JSON.stringify({ type: 'PIN_CLICKED', id: locationData.id, farm: locationData });
            postToParent(payload);
          });
        });

        function postToParent(payload) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(payload);
          } else if (window.parent) {
            window.parent.postMessage(payload, '*');
          }
        }

        // Render solid road polyline with #72AF5B palette
        window.renderPolyline = function(points) {
          if (currentRouteCasing) map.removeLayer(currentRouteCasing);
          if (currentRouteLine) map.removeLayer(currentRouteLine);

          // 1. Dark forest green outer border casing for crisp contrast on road maps
          currentRouteCasing = L.polyline(points, {
            color: '#365327',
            weight: 7.5,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);

          // 2. Main vibrant road line in requested #72AF5B
          currentRouteLine = L.polyline(points, {
            color: '#72AF5B',
            weight: 5,
            opacity: 0.98,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);

          try {
            map.fitBounds(currentRouteLine.getBounds(), {
              padding: [80, 80],
              maxZoom: 16,
              animate: true
            });
          } catch(e) {}
        };

        // Draw route using OSRM real road network with static fallback
        window.drawRoute = function(points, farmId, destLat, destLng) {
          window.clearRoute();
          if (!points || points.length < 2) return;
          window.currentRoutePoints = points.slice();
          window.currentFarmId = farmId;

          // Render fallback immediately for 0ms responsiveness
          window.renderPolyline(points);

          // If destination coords exist, fetch exact street road network from OSRM
          if (destLat && destLng && typeof fetch !== 'undefined') {
            var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' + 
                          userLng + ',' + userLat + ';' + destLng + ',' + destLat + 
                          '?overview=full&geometries=geojson';

            fetch(osrmUrl, { headers: { 'Accept': 'application/json' } })
              .then(function(res) { return res.json(); })
              .then(function(data) {
                if (data && data.code === 'Ok' && data.routes && data.routes[0]) {
                  var roadPoints = data.routes[0].geometry.coordinates.map(function(c) {
                    return [c[1], c[0]];
                  });
                  // Ensure road route explicitly reaches the exact destination farm pin
                  if (destLat && destLng && roadPoints.length > 0) {
                    var lastPt = roadPoints[roadPoints.length - 1];
                    if (Math.abs(lastPt[0] - destLat) > 0.00002 || Math.abs(lastPt[1] - destLng) > 0.00002) {
                      roadPoints.push([destLat, destLng]);
                    }
                  }
                  window.currentRoutePoints = roadPoints;
                  window.renderPolyline(roadPoints);

                  var km = (data.routes[0].distance / 1000).toFixed(1) + ' km';
                  var mins = Math.max(1, Math.round(data.routes[0].duration / 60)) + ' mins';
                  var walkMins = Math.max(2, Math.round(data.routes[0].distance / 70)) + ' mins';
                  postToParent(JSON.stringify({
                    type: 'ROAD_STATS_UPDATED',
                    farmId: farmId,
                    distance: km,
                    durationDrive: mins,
                    durationWalk: walkMins
                  }));
                }
              })
              .catch(function() {
                // Keep initial fallback polyline
              });
          }
        };

        // Clear active route polyline
        window.clearRoute = function() {
          if (currentRouteCasing) {
            map.removeLayer(currentRouteCasing);
            currentRouteCasing = null;
          }
          if (currentRouteLine) {
            map.removeLayer(currentRouteLine);
            currentRouteLine = null;
          }
          window.currentRoutePoints = null;
          window.currentFarmId = null;
        };

        // Triggered when "Directions" button inside Leaflet pin popup is tapped
        window.requestRoute = function(farmId) {
          var farm = locations.find(function(l) { return l.id === farmId; });
          var farmRoute = staticRoutes[farmId];
          var fallbackPts = (farmRoute && farmRoute.waypoints)
            ? farmRoute.waypoints
            : [[userLat, userLng], [farm ? farm.latitude : userLat, farm ? farm.longitude : userLng]];

          window.drawRoute(
            fallbackPts,
            farmId,
            farm ? farm.latitude : null,
            farm ? farm.longitude : null
          );

          var payload = JSON.stringify({ type: 'ROUTE_REQUESTED', farmId: farmId });
          postToParent(payload);
        };

        // Listen for messages from React Native
        window.handleParentMessage = function(msg) {
          if (!msg) return;
          if (msg.type === 'SHOW_ROUTE') {
            window.drawRoute(msg.waypoints, msg.farmId, msg.destLat, msg.destLng);
          } else if (msg.type === 'CLEAR_ROUTE') {
            window.clearRoute();
          } else if (msg.type === 'RECENTER') {
            map.flyTo([userLat, userLng], 15, { animate: true });
          } else if (msg.type === 'UPDATE_USER_LOCATION') {
            userLat = msg.latitude;
            userLng = msg.longitude;
            if (userMarker) {
              userMarker.setLatLng([msg.latitude, msg.longitude]);
            }
            if (currentRouteLine && window.currentFarmId) {
              var destFarm = locations.find(function(l) { return l.id === window.currentFarmId; });
              if (destFarm) {
                window.drawRoute(window.currentRoutePoints, window.currentFarmId, destFarm.latitude, destFarm.longitude);
              }
            }
          }
        };

        window.addEventListener('message', function(event) {
          try {
            var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (data && data.type) {
              window.handleParentMessage(data);
            }
          } catch (e) {}
        });
      </script>
    </body>
    </html>
  `;

  const topInset = Math.max(insets.top, 14);

  return (
    <View
      className="flex-1 bg-white relative w-full h-full"
      style={styles.rootContainer}
    >
      {/* 1. Full-Screen Leaflet Map Background */}
      <View
        style={StyleSheet.absoluteFill}
        className="w-full h-full bg-gray-200"
      >
        {Platform.OS === "web" ? (
          <iframe
            ref={iframeRef}
            key={searchText}
            srcDoc={leafletHtml}
            style={{
              width: "100%",
              height: "100%",
              minHeight: "100%",
              border: "none",
              display: "block",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            title="Local Farm & Wholesaler Map"
          />
        ) : (
          <WebView
            ref={webViewRef}
            key={searchText}
            originWhitelist={["*"]}
            source={{ html: leafletHtml }}
            onMessage={handleWebViewMessage}
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
              backgroundColor: "#e5e7eb",
            }}
            geolocationEnabled={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
          />
        )}
      </View>

      {/* 2. Top Floating Row: Chevron Back Button + Search Bar */}
      <View
        style={{
          position: "absolute",
          top: topInset,
          left: 16,
          right: 16,
          zIndex: 30,
        }}
        className="flex-row items-center gap-2.5"
      >
        {/* Chevron Back Button */}
        <TouchableOpacity
          onPress={() => {
            if (activeRouteLocation) {
              setActiveRouteLocation(null);
              sendMapMessage({ type: "CLEAR_ROUTE" });
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.push("/user/NewsFeed" as any);
            }
          }}
          activeOpacity={0.7}
          className="w-11 h-11 rounded-full bg-white items-center justify-center shadow-lg elevation-5 border border-gray-100"
          style={{
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.18)",
          }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color="black" />
        </TouchableOpacity>

        {/* Search Bar Input with Location Pin Icon & Gray Border */}
        <View
          className="flex-1 bg-white rounded-full border border-gray-200 flex-row items-center px-4 h-11 shadow-lg elevation-5"
          style={{
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          }}
        >
          <Ionicons name="location-sharp" size={20} color="#16a34a" />
          <TextInput
            placeholder="Search field, wholesaler, produce..."
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
            className="flex-1 text-sm text-gray-800 ml-2 py-0.5 h-full"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3. Active Route Floating HUD Banner */}
      {activeRouteLocation && activeRouteDetails && (
        <View
          style={{
            position: "absolute",
            top: topInset + 54,
            left: 16,
            right: 16,
            zIndex: 35,
          }}
          className="bg-white rounded-2xl p-3.5 shadow-2xl elevation-8 border border-emerald-100"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5 flex-1 mr-2">
              <View className="w-9 h-9 rounded-full bg-[#72AF5B]/15 border border-[#72AF5B]/30 items-center justify-center">
                <Ionicons name="navigate-circle" size={24} color="#72AF5B" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-[#4e7d3b]">
                    Active Route
                  </Text>
                  <Text className="text-gray-300 text-[10px]">•</Text>
                  <Text className="text-[10px] font-medium text-gray-500">
                    From My Location
                  </Text>
                </View>
                <Text
                  className="text-sm font-bold text-gray-900 leading-tight"
                  numberOfLines={1}
                >
                  {activeRouteLocation.title}
                </Text>
              </View>
            </View>

            {/* Exit Route Button */}
            <TouchableOpacity
              onPress={() => {
                setActiveRouteLocation(null);
                setLiveRoadStats(null);
                sendMapMessage({ type: "CLEAR_ROUTE" });
              }}
              className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Exit active route"
            >
              <Ionicons name="close" size={16} color="#4B5563" />
            </TouchableOpacity>
          </View>

          {/* Route Stats: Drive & Walk */}
          <View className="flex-row items-center gap-2 mt-2.5 pt-2 border-t border-gray-100">
            <View className="flex-row items-center bg-[#72AF5B]/15 px-2.5 py-1 rounded-lg">
              <Ionicons name="car" size={14} color="#4e7d3b" />
              <Text className="text-xs font-bold text-[#2d4b20] ml-1.5">
                {activeRouteDetails.durationDrive}
              </Text>
              <Text className="text-[11px] text-[#4e7d3b] ml-1">
                ({activeRouteDetails.distance})
              </Text>
            </View>

            <View className="flex-row items-center bg-emerald-50 px-2.5 py-1 rounded-lg">
              <Ionicons name="walk" size={14} color="#059669" />
              <Text className="text-xs font-bold text-emerald-900 ml-1.5">
                {activeRouteDetails.durationWalk}
              </Text>
            </View>

            <View className="flex-1" />

            {/* External Navigation Link Option */}
            <TouchableOpacity
              onPress={() => {
                openDirections(
                  activeRouteLocation.latitude,
                  activeRouteLocation.longitude,
                  activeRouteLocation.title,
                );
              }}
              className="flex-row items-center gap-1 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg active:bg-gray-100"
              activeOpacity={0.7}
            >
              <Ionicons name="open-outline" size={13} color="#4B5563" />
              <Text className="text-[11px] font-semibold text-gray-700">
                Maps
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 4. Floating GPS "Locate Me" Button */}
      <TouchableOpacity
        onPress={handleRecenterUser}
        activeOpacity={0.8}
        className="w-11 h-11 rounded-full bg-white items-center justify-center shadow-lg elevation-5 border border-gray-100"
        style={{
          position: "absolute",
          right: 16,
          bottom: selectedLocation ? 245 : 90,
          zIndex: 25,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.18)",
        }}
        accessibilityRole="button"
        accessibilityLabel="Recenter to my location"
      >
        <Ionicons name="locate-sharp" size={22} color="#72AF5B" />
      </TouchableOpacity>

      {/* 5. Floating Farm / Wholesaler Info Card (React Native UI) */}
      {selectedLocation !== null && (
        <View
          className="absolute bottom-20 left-4 right-4 bg-white rounded-2xl p-4 shadow-xl elevation-6 z-30 border border-gray-100"
          style={{
            zIndex: 30,
            ...(Platform.OS === "web"
              ? { boxShadow: "0 12px 28px -4px rgba(0, 0, 0, 0.25)" }
              : {}),
          }}
        >
          {/* Top Row: Thumbnail + Info + Close */}
          <View className="flex-row items-start">
            {/* Left: Thumbnail Image with rating pill */}
            <View className="relative mr-3.5">
              <Image
                source={{ uri: selectedLocation.imageUrl }}
                className="w-16 h-16 rounded-xl"
                style={{ width: 64, height: 64, borderRadius: 12 }}
                resizeMode="cover"
              />
              <View
                className={`absolute bottom-0 left-0 right-0 rounded-b-xl py-0.5 items-center ${
                  selectedLocation.type === "Wholesaler"
                    ? "bg-amber-700/90"
                    : "bg-green-700/90"
                }`}
              >
                <Text className="text-[9px] font-bold text-white">
                  ⭐ {selectedLocation.rating}
                </Text>
              </View>
            </View>

            {/* Middle: Title, Type badge, Farmer, Produce */}
            <View className="flex-1 justify-center mr-1">
              <Text
                className="text-base font-bold text-gray-900 leading-tight"
                numberOfLines={1}
              >
                {selectedLocation.title}
              </Text>

              {/* Type Pill, Temporary Label & Farmer */}
              <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
                <View
                  className={`px-1.5 py-0.5 rounded ${
                    selectedLocation.type === "Wholesaler"
                      ? "bg-amber-100 border border-amber-300"
                      : "bg-green-100 border border-green-300"
                  }`}
                >
                  <Text
                    className={`text-[9px] font-bold ${
                      selectedLocation.type === "Wholesaler"
                        ? "text-amber-800"
                        : "text-green-800"
                    }`}
                  >
                    {selectedLocation.type === "Wholesaler"
                      ? "📦 Wholesaler"
                      : "🌿 Field"}
                  </Text>
                </View>

                <Text
                  className="text-xs text-gray-600 font-medium flex-1"
                  numberOfLines={1}
                >
                  {selectedLocation.farmerName}
                </Text>
              </View>

              <Text
                className="text-xs text-gray-700 font-medium mt-1"
                numberOfLines={1}
              >
                {selectedLocation.produce}
              </Text>

              <View className="flex-row items-center mt-0.5 justify-between">
                <Text className="text-xs font-bold text-gray-900">
                  {selectedLocation.priceRange}
                </Text>
                <Text className="text-[11px] text-gray-500 font-medium">
                  {selectedLocation.distance}
                </Text>
              </View>
            </View>

            {/* Right: Close Button ('X' icon) */}
            <TouchableOpacity
              onPress={() => setSelectedLocation(null)}
              className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close info card"
            >
              <Ionicons name="close" size={18} color="#4B5563" />
            </TouchableOpacity>
          </View>

          {/* Bottom Action Row: Direction & Message */}
          <View className="flex-row items-center gap-2 mt-3 pt-2.5 border-t border-gray-100">
            {/* Direction Button */}
            <TouchableOpacity
              onPress={() => handleToggleRoute(selectedLocation)}
              className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 ${
                activeRouteLocation?.id === selectedLocation.id
                  ? "bg-slate-800 active:bg-slate-900"
                  : "bg-[#72AF5B] active:bg-[#5e944a]"
              }`}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Get directions to ${selectedLocation.title}`}
            >
              <Ionicons
                name={
                  activeRouteLocation?.id === selectedLocation.id
                    ? "close-circle"
                    : "navigate"
                }
                size={15}
                color="#ffffff"
              />
              <Text className="text-white font-bold text-xs">
                {activeRouteLocation?.id === selectedLocation.id
                  ? "Clear Route"
                  : "Direction"}
              </Text>
            </TouchableOpacity>

            {/* Message / Inquire Button */}
            <TouchableOpacity
              onPress={() => {
                try {
                  router.push({
                    pathname: "/user/ChatConversation",
                    params: {
                      userId: String(selectedLocation.id || ""),
                      farmerId: String(selectedLocation.id || ""),
                      name:
                        selectedLocation.farmerName || selectedLocation.title,
                      avatarUrl: selectedLocation.imageUrl,
                      online: "true",
                    },
                  } as any);
                } catch {
                  router.push("/user/Chats" as any);
                }
              }}
              className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 ${
                selectedLocation.type === "Wholesaler"
                  ? "bg-[#d97706] active:bg-[#b45309]"
                  : "bg-[#16a34a] active:bg-[#15803d]"
              }`}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Message ${selectedLocation.farmerName}`}
            >
              <Ionicons name="chatbubble-ellipses" size={15} color="#ffffff" />
              <Text className="text-white font-bold text-xs">Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 6. Bottom Navigation Bar */}
      <Navigation showFab={false} activeTabName="explore" />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    minHeight: "100%",
    position: "relative",
    overflow: "hidden",
  },
});
