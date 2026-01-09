import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type Sentinel } from "@/services/api";

interface MapComponentProps {
  sentinels: Sentinel[];
  selectedSentinel: Sentinel | null;
  onSentinelSelect: (sentinel: Sentinel) => void;
  loading?: boolean;
  onViewLiveFeed?: (sentinel: Sentinel) => void;
  onStopFeed?: (sentinel: Sentinel) => void;
  isStreamActive?: boolean; // Track if stream is actually active
}

const getMarkerColor = (status: Sentinel["status"]) => {
  switch (status) {
    case "active":
      return "#22c55e"; // primary green
    case "alert":
      return "#f59e0b"; // warning amber
    case "inactive":
      return "#64748b"; // muted gray
    default:
      return "#64748b";
  }
};

const createCustomIcon = (status: Sentinel["status"], isSelected: boolean = false) => {
  const color = getMarkerColor(status);
  const scale = isSelected ? 1.2 : 1;
  const svgIcon = `
    <svg width="${32 * scale}" height="${40 * scale}" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24c0-8.84-7.16-16-16-16z" fill="${color}"/>
      <circle cx="16" cy="16" r="8" fill="white" opacity="${isSelected ? '1' : '0.9'}"/>
      <circle cx="16" cy="16" r="4" fill="${color}"/>
      ${isSelected ? `<circle cx="16" cy="16" r="12" fill="none" stroke="${color}" stroke-width="2" opacity="0.8"><animate attributeName="r" from="8" to="16" dur="1s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.8" to="0" dur="1s" repeatCount="indefinite"/></circle>` : ''}
      ${status === "alert" ? `<circle cx="16" cy="16" r="12" fill="none" stroke="${color}" stroke-width="2" opacity="0.5"><animate attributeName="r" from="8" to="16" dur="1s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.8" to="0" dur="1s" repeatCount="indefinite"/></circle>` : ""}
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: "custom-marker",
    iconSize: [32 * scale, 40 * scale],
    iconAnchor: [16 * scale, 40 * scale],
    popupAnchor: [0, -40 * scale],
  });
};

const MapComponent = ({ sentinels, selectedSentinel, onSentinelSelect, loading, onViewLiveFeed, onStopFeed, isStreamActive = false }: MapComponentProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!mapRef.current) return;
    
    // Always cleanup previous instance if it exists (shouldn't happen with cleanup, but safety first)
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize map centered on Ghana
    const map = L.map(mapRef.current, {
      center: [5.6, -0.19],
      zoom: 11,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    // Add dark-themed tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Initial markers render if data is already available
    if (sentinels.length > 0) {
      // Logic duplicated in the other effect, but we need it here to ensure immediate render
      // Actually, better to just let the other effect handle it.
      // The other effect has [sentinels] as dep, so it will run on mount + sentinel update.
    }

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current.clear();
      }
    };
  }, []); // Only run on mount/unmount

  // Update markers when sentinels change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    
    // Remove markers that no longer exist
    markersRef.current.forEach((marker, deviceId) => {
      if (!sentinels.find(s => s.deviceId === deviceId)) {
        marker.remove();
        markersRef.current.delete(deviceId);
      }
    });

    // Add or update markers
    sentinels.forEach((sentinel) => {
      const lat = Number(sentinel.location?.lat);
      const lng = Number(sentinel.location?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.warn('Skipping sentinel with invalid location:', {
          deviceId: sentinel.deviceId,
          location: sentinel.location,
        });
        return;
      }

      const isSelected = selectedSentinel?.deviceId === sentinel.deviceId;
      let marker = markersRef.current.get(sentinel.deviceId);

      if (marker) {
        // Update existing marker
        marker.setLatLng([lat, lng]);
        marker.setIcon(createCustomIcon(sentinel.status, isSelected));
      } else {
        // Create new marker
        marker = L.marker([lat, lng], {
          icon: createCustomIcon(sentinel.status, isSelected),
        }).addTo(map);

        markersRef.current.set(sentinel.deviceId, marker);
      }

      // Update popup
      const statusColor = getMarkerColor(sentinel.status);
      const statusLabel = sentinel.status.charAt(0).toUpperCase() + sentinel.status.slice(1);
      const batteryColor = sentinel.batteryLevel > 50 ? '#22c55e' : sentinel.batteryLevel > 20 ? '#f59e0b' : '#ef4444';
      
      // Only show "Stop Video Feed" if this sentinel is selected AND stream is active
      const showStopButton = isSelected && isStreamActive;
      
      marker.bindPopup(`
        <div style="min-width: 200px; padding: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <div style="width: 10px; height: 10px; border-radius: 50%; background: ${statusColor};"></div>
            <span style="font-weight: 600; font-size: 16px;">${sentinel.deviceId}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Status</span>
              <span style="color: ${statusColor}; font-weight: 500;">${statusLabel}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Battery</span>
              <span style="font-weight: 500;">${sentinel.batteryLevel}%</span>
            </div>
            <div style="width: 100%; height: 4px; background: #1e293b; border-radius: 2px; overflow: hidden;">
              <div style="width: ${sentinel.batteryLevel}%; height: 100%; background: ${batteryColor};"></div>
            </div>
            ${sentinel.ipAddress ? `
              <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                <span style="color: #94a3b8;">IP Address</span>
                <span style="font-weight: 500; font-size: 12px; font-family: monospace;">${sentinel.ipAddress}</span>
              </div>
            ` : ''}
            <button
              type="button"
              class="view-live-feed"
              data-device-id="${sentinel.deviceId}"
              style="margin-top: 8px; padding: 6px 12px; background: ${showStopButton ? '#ef4444' : statusColor}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;"
            >
              ${showStopButton ? 'Stop Video Feed' : 'View Live Feed'}
            </button>
          </div>
        </div>
      `, {
        className: 'custom-popup',
      });

      // Wire popup button to React handler (more reliable than inline onclick strings)
      marker.off('popupopen');
      marker.on('popupopen', () => {
        const popupEl = marker.getPopup()?.getElement();
        const button = popupEl?.querySelector<HTMLButtonElement>('button.view-live-feed');
        if (button) {
          button.onclick = () => {
            if (showStopButton && onStopFeed) {
              // Stop the feed
              onStopFeed(sentinel);
            } else {
              // Select and start viewing feed
              onSentinelSelect(sentinel);
            }
            map.closePopup();
          };
        }
      });
    });

    // Pan to selected sentinel
    if (selectedSentinel) {
      const selectedLat = Number(selectedSentinel.location?.lat);
      const selectedLng = Number(selectedSentinel.location?.lng);
      if (Number.isFinite(selectedLat) && Number.isFinite(selectedLng)) {
        map.setView([selectedLat, selectedLng], 13, { animate: true });
      }
    }
  }, [sentinels, selectedSentinel, onSentinelSelect]);

  // (Popup button now calls onSentinelSelect directly)

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border isolate">
      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass px-4 py-2 rounded-lg flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <span className="text-sm">Loading sentinels...</span>
        </div>
      )}
      
      <div ref={mapRef} className="w-full h-full z-0" style={{ minHeight: "400px" }} />
      
      {/* Map overlay legend */}
      <div className="absolute bottom-4 left-4 rounded-lg p-3 z-10 bg-card/90 backdrop-blur-sm border border-border">
        <p className="text-xs font-medium mb-2 text-muted-foreground">Status Legend</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-xs">Alert</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted-foreground" />
            <span className="text-xs">Inactive</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
