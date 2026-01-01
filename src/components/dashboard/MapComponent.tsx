import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { sentinels, type Sentinel } from "@/lib/dummy-data";

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

const createCustomIcon = (status: Sentinel["status"]) => {
  const color = getMarkerColor(status);
  const svgIcon = `
    <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24c0-8.84-7.16-16-16-16z" fill="${color}"/>
      <circle cx="16" cy="16" r="8" fill="white" opacity="0.9"/>
      <circle cx="16" cy="16" r="4" fill="${color}"/>
      ${status === "alert" ? `<circle cx="16" cy="16" r="12" fill="none" stroke="${color}" stroke-width="2" opacity="0.5"><animate attributeName="r" from="8" to="16" dur="1s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.8" to="0" dur="1s" repeatCount="indefinite"/></circle>` : ""}
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: "custom-marker",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  });
};

const MapComponent = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

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

    // Add sentinel markers
    sentinels.forEach((sentinel) => {
      const marker = L.marker([sentinel.location.lat, sentinel.location.lng], {
        icon: createCustomIcon(sentinel.status),
      }).addTo(map);

      const statusColor = getMarkerColor(sentinel.status);
      const statusLabel = sentinel.status.charAt(0).toUpperCase() + sentinel.status.slice(1);
      
      marker.bindPopup(`
        <div style="min-width: 180px; padding: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <div style="width: 10px; height: 10px; border-radius: 50%; background: ${statusColor};"></div>
            <span style="font-weight: 600; font-size: 16px;">${sentinel.id}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Status</span>
              <span style="color: ${statusColor}; font-weight: 500;">${statusLabel}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Battery</span>
              <span style="font-weight: 500;">${sentinel.battery}%</span>
            </div>
            <div style="width: 100%; height: 4px; background: #1e293b; border-radius: 2px; overflow: hidden;">
              <div style="width: ${sentinel.battery}%; height: 100%; background: ${sentinel.battery > 50 ? '#22c55e' : sentinel.battery > 20 ? '#f59e0b' : '#ef4444'};"></div>
            </div>
          </div>
        </div>
      `, {
        className: 'custom-popup',
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border isolate">
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
