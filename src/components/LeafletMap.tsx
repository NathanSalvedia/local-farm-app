import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

export interface LeafletMapProps {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  popupImage?: string;
  locationTitle?: string;
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export default function LeafletMap({
  latitude = 8.228,
  longitude = 124.2452,
  zoom = 14,
  popupImage = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80",
  locationTitle,
  interactive = true,
  onLocationSelect,
}: LeafletMapProps) {
  const isInteractive = interactive !== false;
  const escapedTitle = (locationTitle || "Location").replace(/'/g, "\\'");
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
          min-width: 100px;
          max-width: 140px;
          height: 65px;
          border-radius: 10px;
          overflow: hidden;
          border: 2px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          background: #e2e8f0;
          margin-bottom: 2px;
          position: relative;
        }
        .popup-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .pin-label-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0,0,0,0.65);
          color: #ffffff;
          font-size: 8px;
          font-weight: bold;
          padding: 2px 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
        }
        .pin-icon {
          filter: drop-shadow(0 2px 5px rgba(0,0,0,0.35));
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { 
          zoomControl: false,
          attributionControl: false,
          dragging: ${isInteractive},
          touchZoom: ${isInteractive},
          scrollWheelZoom: ${isInteractive},
          doubleClickZoom: ${isInteractive}
        }).setView([${latitude}, ${longitude}], ${zoom});

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        var customIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: '<div class="custom-pin-container">' +
                  '<div class="popup-card">' +
                    '<img src="${popupImage}" alt="Location Preview" />' +
                    '<div class="pin-label-bar">${escapedTitle}</div>' +
                  '</div>' +
                  '<svg class="pin-icon" width="28" height="28" viewBox="0 0 24 24" fill="#16a34a" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>' +
                  '</svg>' +
                '</div>',
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        });

        var marker = L.marker([${latitude}, ${longitude}], { icon: customIcon }).addTo(map);

        setTimeout(function() {
          map.invalidateSize();
        }, 250);

        if (${isInteractive}) {
          map.on('click', function(e) {
            var lat = e.latlng.lat;
            var lng = e.latlng.lng;
            marker.setLatLng(e.latlng);
            var payload = JSON.stringify({ latitude: lat, longitude: lng });
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(payload);
            } else if (window.parent) {
              window.parent.postMessage(payload, '*');
            }
          });
        }
      </script>
    </body>
    </html>
  `;

  const handleNativeMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.latitude && data.longitude && onLocationSelect) {
        onLocationSelect(data.latitude, data.longitude);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleWebMessage = (event: MessageEvent) => {
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.latitude && data.longitude && onLocationSelect) {
          onLocationSelect(data.latitude, data.longitude);
        }
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener("message", handleWebMessage);
    return () => window.removeEventListener("message", handleWebMessage);
  }, [onLocationSelect]);

  return (
    <View style={styles.container}>
      {Platform.OS === "web" ? (
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
      ) : (
        <WebView
          originWhitelist={["*"]}
          source={{ html: leafletHtml }}
          onMessage={handleNativeMessage}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
        />
      )}
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
  webView: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#e5e7eb",
  },
});
