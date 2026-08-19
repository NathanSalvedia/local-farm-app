import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import BottomNavBar from "../../components/Navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FarmMarker {
  id: string;
  name: string;
  category: "Vegetables" | "Fruits" | "Dairy" | "Organic" | "Livestock";
  products: string;
  price: string;
  distance: string;
  rating: number;
  latitude: number;
  longitude: number;
  image: string;
}

// ─── Mock Farm Locations ──────────────────────────────────────────────────────

const MOCK_FARMS: FarmMarker[] = [
  {
    id: "1",
    name: "Salvedia Organic Farm",
    category: "Organic",
    products: "Fresh Cabbage, Tomatoes & Lettuce",
    price: "₱50 - ₱120/kg",
    distance: "350m away",
    rating: 4.9,
    latitude: 8.2285,
    longitude: 124.2452,
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "2",
    name: "Mark's Hydroponics & Greens",
    category: "Vegetables",
    products: "Romaine Lettuce, Kale, Spinach",
    price: "₱80/pack",
    distance: "600m away",
    rating: 4.8,
    latitude: 8.232,
    longitude: 124.249,
    image:
      "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "3",
    name: "Mindanao Highland Dairy",
    category: "Dairy",
    products: "Fresh Cow's Milk & Cheese",
    price: "₱95/bottle",
    distance: "1.2km away",
    rating: 4.9,
    latitude: 8.224,
    longitude: 124.241,
    image:
      "https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "4",
    name: "Tuburan Sweet Corn & Root Crops",
    category: "Vegetables",
    products: "Yellow Sweet Corn, Cassava, Ube",
    price: "₱35/kg",
    distance: "1.5km away",
    rating: 4.7,
    latitude: 8.235,
    longitude: 124.238,
    image:
      "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "5",
    name: "Kiko Fruit Orchard",
    category: "Fruits",
    products: "Sweet Carabao Mango, Papaya & Bananas",
    price: "₱60 - ₱150/kg",
    distance: "2.1km away",
    rating: 4.8,
    latitude: 8.221,
    longitude: 124.252,
    image:
      "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=400&q=80",
  },
];

const CATEGORIES = ["All", "Vegetables", "Fruits", "Organic", "Dairy", "Livestock"];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ExploreMap() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedFarm, setSelectedFarm] = useState<FarmMarker | null>(
    MOCK_FARMS[0]
  );

  const filteredFarms = MOCK_FARMS.filter((farm) => {
    const matchesSearch =
      farm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      farm.products.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || farm.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const centerLat = selectedFarm ? selectedFarm.latitude : 8.228;
  const centerLng = selectedFarm ? selectedFarm.longitude : 124.2452;

  // Standalone full interactive Leaflet map
  const leafletHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body, html, #map { width: 100%; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #e5e7eb; }
        .custom-pin {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transform: translate(-50%, -100%);
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .custom-pin:hover, .custom-pin.active {
          transform: translate(-50%, -108%) scale(1.1);
          z-index: 1000 !important;
        }
        .pin-bubble {
          background: #ffffff;
          padding: 4px 8px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.22);
          border: 2px solid #72AF5B;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 700;
          color: #1f2937;
          white-space: nowrap;
          margin-bottom: 2px;
        }
        .pin-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #72AF5B;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(114, 175, 91, 0.45);
          border: 2.5px solid #ffffff;
        }
        .pin-icon-wrap svg {
          width: 18px;
          height: 18px;
          fill: #ffffff;
        }
        .user-dot {
          width: 16px;
          height: 16px;
          background: #2563eb;
          border-radius: 50%;
          border: 3px solid #ffffff;
          box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.35);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.5); }
          70% { box-shadow: 0 0 0 12px rgba(37, 99, 235, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 16px;
          padding: 4px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }
        .leaflet-popup-content {
          margin: 6px;
          font-size: 12px;
        }
        .popup-img {
          width: 100%;
          height: 80px;
          border-radius: 10px;
          object-fit: cover;
          margin-bottom: 6px;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { 
          zoomControl: false,
          attributionControl: false 
        }).setView([${centerLat}, ${centerLng}], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        // Current user position marker
        var userIcon = L.divIcon({
          className: 'user-marker',
          html: '<div class="user-dot"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        L.marker([8.228, 124.244], { icon: userIcon }).addTo(map);

        // Farm markers
        var farms = ${JSON.stringify(filteredFarms)};

        farms.forEach(function(farm) {
          var pinHtml = 
            '<div class="custom-pin">' +
              '<div class="pin-bubble">' +
                '<span>🌿</span>' +
                '<span>' + farm.name + '</span>' +
              '</div>' +
              '<div class="pin-icon-wrap">' +
                '<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>' +
              '</div>' +
            '</div>';

          var icon = L.divIcon({
            className: 'farm-leaflet-pin',
            html: pinHtml,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
          });

          var marker = L.marker([farm.latitude, farm.longitude], { icon: icon }).addTo(map);

          var popupContent = 
            '<div>' +
              '<img src="' + farm.image + '" class="popup-img" alt="' + farm.name + '" />' +
              '<b style="font-size: 13px; color: #111827; display: block; margin-bottom: 2px;">' + farm.name + '</b>' +
              '<span style="font-size: 11px; color: #72AF5B; font-weight: bold; display: block; margin-bottom: 3px;">' + farm.products + '</span>' +
              '<span style="font-size: 11px; color: #6b7280;">' + farm.distance + ' • ' + farm.price + '</span>' +
            '</div>';

          marker.bindPopup(popupContent);
        });
      </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView
      className="flex-1 bg-white relative h-full"
      style={{ flex: 1, position: "relative", minHeight: "100%" }}
    >
      {/* ── 1. Floating Top Header & Search Bar ────────────────────────────── */}
      <View
        className="absolute top-0 left-0 right-0 z-30 pt-3 px-4 pb-2 bg-white/95 border-b border-gray-100 shadow-sm backdrop-blur-md"
        style={{ pointerEvents: "box-none" }}
      >
        <View className="flex-row items-center gap-2.5 mb-2">
          {/* Search Input */}
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-3.5 h-11 border border-gray-100 shadow-2xs">
            <Ionicons name="search-outline" size={20} color="#72AF5B" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search local farms, fresh produce..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-sm text-gray-800 px-2 h-full"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* List View Toggle */}
          <TouchableOpacity
            onPress={() => router.push("/user/NearbyUsers" as any)}
            className="w-11 h-11 rounded-2xl bg-white border border-gray-200 items-center justify-center active:bg-gray-100 shadow-sm"
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Nearby users list"
          >
            <Ionicons name="people-outline" size={22} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* ── Category Filter Pills ───────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="py-1"
          contentContainerStyle={{ paddingRight: 16 }}
          style={{ flexGrow: 0 }}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                className={`mr-2 px-3.5 py-1.5 rounded-full flex-row items-center shadow-2xs ${
                  isSelected
                    ? "bg-[#72AF5B] border border-[#72AF5B]"
                    : "bg-white border border-gray-200"
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`text-xs ${
                    isSelected
                      ? "font-bold text-white"
                      : "font-medium text-gray-700"
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── 2. Full-Screen Interactive Leaflet Map ────────────────────────── */}
      <View className="flex-1 w-full h-full bg-gray-100">
        <iframe
          srcDoc={leafletHtml}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
          }}
          title="Explore Local Farms Leaflet Map"
        />
      </View>

      {/* ── 3. Floating Quick Farm Card at Bottom ─────────────────────────── */}
      {selectedFarm && (
        <View
          className="absolute bottom-20 left-4 right-4 z-40 bg-white rounded-2xl p-3.5 shadow-2xl border border-gray-100 elevation-12"
          style={{
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
          }}
        >
          <View className="flex-row items-center">
            {/* Farm Thumbnail */}
            <View className="w-16 h-16 rounded-xl bg-gray-200 overflow-hidden mr-3 border border-gray-100 flex-shrink-0">
              <iframe
                srcDoc={`<img src="${selectedFarm.image}" style="width:100%;height:100%;object-fit:cover;" />`}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Thumbnail"
              />
            </View>

            {/* Farm Info */}
            <View className="flex-1 pr-1">
              <View className="flex-row items-center justify-between">
                <Text
                  className="font-bold text-gray-900 text-sm leading-tight flex-1 mr-1"
                  numberOfLines={1}
                >
                  {selectedFarm.name}
                </Text>
                <View className="flex-row items-center bg-amber-50 px-1.5 py-0.5 rounded-md">
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text className="text-[11px] font-bold text-amber-700 ml-0.5">
                    {selectedFarm.rating}
                  </Text>
                </View>
              </View>

              <Text
                className="text-xs text-[#72AF5B] font-semibold mt-0.5"
                numberOfLines={1}
              >
                {selectedFarm.products}
              </Text>

              <View className="flex-row items-center mt-1">
                <Ionicons name="location" size={12} color="#6B7280" />
                <Text className="text-[11px] text-gray-500 font-medium ml-1">
                  {selectedFarm.distance}
                </Text>
                <Text className="text-[11px] text-gray-400 mx-1.5">•</Text>
                <Text className="text-[11px] text-gray-700 font-bold">
                  {selectedFarm.price}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row items-center gap-2 mt-2.5 pt-2.5 border-t border-gray-100">
            {/* Chat Farmer Button */}
            <TouchableOpacity
              onPress={() => router.push("/user/ChatConversation" as any)}
              className="flex-1 bg-[#72AF5B] py-2 rounded-xl flex-row items-center justify-center active:bg-[#62974e] shadow-2xs"
              activeOpacity={0.8}
            >
              <Ionicons
                name="chatbubble-ellipses"
                size={16}
                color="#FFFFFF"
                style={{ marginRight: 4 }}
              />
              <Text className="text-white font-bold text-xs">Chat Farmer</Text>
            </TouchableOpacity>

            {/* View Details / Next Farm Pin */}
            <TouchableOpacity
              onPress={() => {
                const currentIndex = MOCK_FARMS.findIndex(
                  (f) => f.id === selectedFarm.id
                );
                const nextFarm =
                  MOCK_FARMS[(currentIndex + 1) % MOCK_FARMS.length];
                setSelectedFarm(nextFarm);
              }}
              className="bg-gray-100 py-2 px-3 rounded-xl flex-row items-center justify-center active:bg-gray-200"
              activeOpacity={0.8}
            >
              <Text className="text-gray-700 font-semibold text-xs mr-1">
                Next Farm
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#4B5563" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── 4. Bottom Navigation Bar ──────────────────────────────────────── */}
      <BottomNavBar showFab={false} activeTabName="explore" />
    </SafeAreaView>
  );
}
