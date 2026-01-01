import MapComponent from "@/components/dashboard/MapComponent";
import { sentinels } from "@/lib/dummy-data";
import { Radio, Activity, WifiOff, AlertTriangle } from "lucide-react";

const LiveMap = () => {
  const activeSentinels = sentinels.filter(s => s.status === "active").length;
  const inactiveSentinels = sentinels.filter(s => s.status === "inactive").length;
  const alertingSentinels = sentinels.filter(s => s.status === "alert").length;

  return (
    <div className="p-4 md:p-6 space-y-6 h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Live Map</h1>
          <p className="text-muted-foreground text-sm">Real-time sentinel network visualization</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Active ({activeSentinels})</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-muted-foreground">Alert ({alertingSentinels})</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-muted-foreground" />
            <span className="text-muted-foreground">Inactive ({inactiveSentinels})</span>
          </div>
        </div>
      </div>

      {/* Full-height Map */}
      <div className="flex-1 min-h-[500px] h-[calc(100vh-12rem)]">
        <MapComponent />
      </div>
    </div>
  );
};

export default LiveMap;
