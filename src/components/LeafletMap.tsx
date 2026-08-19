import React from "react";
import { Platform, StyleSheet, View } from "react-native";

export interface LeafletMapProps {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  popupImage?: string;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export default function LeafletMap({
  latitude = 8.228,
  longitude = 124.2452,
  zoom = 14,
  popupImage = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80",
}: LeafletMapProps) {
  const leafletHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
      <style>
        * { box-sizing: border-box; }
        body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .custom-pin-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: translate(-50%, -100%);
          pointer-events: auto;
          cursor: pointer;
        }
        .popup-card {
          width: 130px;
          height: 80px;
          border-radius: 12px;
          overflow: hidden;
          border: 2.5px solid white;
          box-shadow: 0 6px 16px rgba(0,0,0,0.3);
          background: #e2e8f0;
          margin-bottom: 4px;
          transition: transform 0.2s ease;
        }
        .popup-card:hover {
          transform: scale(1.05);
        }
        .popup-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .pin-icon {
          filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { 
          zoomControl: false,
          attributionControl: false 
        }).setView([${latitude}, ${longitude}], ${zoom});

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        var customIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: '<div class="custom-pin-container">' +
                  '<div class="popup-card">' +
                    '<img src="${popupImage}" alt="Location Preview" />' +
                  '</div>' +
                  '<svg class="pin-icon" width="34" height="34" viewBox="0 0 24 24" fill="#2563eb" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>' +
                  '</svg>' +
                '</div>',
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        });

        var marker = L.marker([${latitude}, ${longitude}], { icon: customIcon }).addTo(map);
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <iframe
        srcDoc={leafletHtml}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
        title="Leaflet Map"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#e5e7eb",
  },
});
