import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
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

export interface FarmLocationItem {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  farmerName: string;
  type: "Farm" | "Wholesaler"; // Distinguishes direct Producer vs Wholesale Trader
  produce: string;
  priceRange: string;
  distance: string;
  rating: number;
  description: string;
  imageUrl: string;
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
    latitude: 8.2285,
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
  const [selectedLocation, setSelectedLocation] =
    useState<FarmLocationItem | null>(null);
  const [searchText, setSearchText] = useState("");

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
        farm.description.toLowerCase().includes(query)
    );
  }, [searchText]);

  // Handle messages posted from Web (iframe)
  useEffect(() => {
    if (Platform.OS === "web") {
      const handleWebMessage = (event: MessageEvent) => {
        try {
          const raw =
            typeof event.data === "string"
              ? JSON.parse(event.data)
              : event.data;
          if (raw && raw.id && raw.title) {
            setSelectedLocation(raw);
          }
        } catch {
          // Ignore unrelated window messages
        }
      };

      window.addEventListener("message", handleWebMessage);
      return () => window.removeEventListener("message", handleWebMessage);
    }
  }, []);

  // Handle messages posted from react-native-webview (native Android / iOS)
  const handleWebViewMessage = (event: any) => {
    try {
      const data =
        typeof event.nativeEvent.data === "string"
          ? JSON.parse(event.nativeEvent.data)
          : event.nativeEvent.data;
      if (data) {
        setSelectedLocation(data);
      }
    } catch (error) {
      console.error("Failed to parse message from Leaflet WebView:", error);
    }
  };

  const initialLat = 8.2285;
  const initialLng = 124.2452;
  const initialZoom = 13;

  // Leaflet HTML template with dynamic Farm / Wholesaler markers
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
        .leaflet-control-attribution {
          font-size: 9px !important;
          background: rgba(255, 255, 255, 0.75) !important;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
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

        var locations = ${JSON.stringify(filteredFarms)};

        locations.forEach(function(locationData) {
          var isWholesaler = locationData.type === 'Wholesaler';
          var badgeText = isWholesaler ? '📦 Wholesaler' : '🌿 Farm';
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

          marker.on('click', function(e) {
            if (e && e.originalEvent) {
              e.originalEvent.stopPropagation();
            }
            var payload = JSON.stringify(locationData);
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(payload);
            } else if (window.parent) {
              window.parent.postMessage(payload, '*');
            }
          });
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
      <View style={StyleSheet.absoluteFill} className="w-full h-full bg-gray-200">
        {Platform.OS === "web" ? (
          <iframe
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
            if (router.canGoBack()) {
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
            placeholder="Search farm, wholesaler, produce..."
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

      {/* 3. Floating Farm / Wholesaler Info Card (React Native UI) */}
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

              {/* Type Pill & Farmer */}
              <View className="flex-row items-center gap-1.5 mt-1">
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
                      : "🌿 Farm Producer"}
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

          {/* Bottom Action Row */}
          <View className="flex-row items-center gap-2 mt-3 pt-2.5 border-t border-gray-100">
            <TouchableOpacity
              onPress={() => {
                try {
                  router.push("/user/ChatConversation" as any);
                } catch {
                  router.push("/user/Chats" as any);
                }
              }}
              className={`flex-1 py-2 rounded-xl flex-row items-center justify-center ${
                selectedLocation.type === "Wholesaler"
                  ? "bg-[#d97706] active:bg-[#b45309]"
                  : "bg-[#16a34a] active:bg-[#15803d]"
              }`}
              activeOpacity={0.8}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={16}
                color="#FFFFFF"
                style={{ marginRight: 4 }}
              />
              <Text className="text-white font-bold text-xs">
                {selectedLocation.type === "Wholesaler"
                  ? "Inquire Bulk / Wholesale"
                  : "Chat Farmer"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                try {
                  router.push("/user/People" as any);
                } catch {
                  router.push("/user/NewsFeed" as any);
                }
              }}
              className="px-3.5 py-2 bg-gray-100 rounded-xl flex-row items-center justify-center active:bg-gray-200"
              activeOpacity={0.8}
            >
              <Ionicons
                name="storefront-outline"
                size={15}
                color="#374151"
                style={{ marginRight: 4 }}
              />
              <Text className="text-gray-800 font-semibold text-xs">
                View Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 4. Bottom Navigation Bar */}
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
