import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { sentinelAPI, type Sentinel } from "@/services/api";
import MapComponent from "@/components/dashboard/MapComponent";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const LiveMap = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sentinels, setSentinels] = useState<Sentinel[]>([]);
  const [selectedSentinel, setSelectedSentinel] = useState<Sentinel | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSentinels = async () => {
    try {
      setLoading(true);
      const response = await sentinelAPI.getAll();
      setSentinels(response.data);
      
      // If navigated from alerts page, auto-select the sentinel
      const state = location.state as { sentinelId?: string };
      if (state?.sentinelId && response.data) {
        const sentinel = response.data.find(s => s.deviceId === state.sentinelId);
        if (sentinel) {
          setSelectedSentinel(sentinel);
        }
      }
    } catch (error) {
      console.error('Failed to fetch sentinels:', error);
      toast.error('Failed to load sentinels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentinels();
    const interval = setInterval(fetchSentinels, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const activeSentinels = sentinels.filter(s => s.status === "active").length;
  const inactiveSentinels = sentinels.filter(s => s.status === "inactive").length;

  if (loading && sentinels.length === 0) {
    return (
      <div className="p-4 md:p-6 h-[calc(100vh-2rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading sentinels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Live Map</h1>
          <p className="text-muted-foreground text-sm">Real-time sentinel network visualization</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchSentinels} 
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Online ({activeSentinels})</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-muted-foreground" />
            <span className="text-muted-foreground">Offline ({inactiveSentinels})</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-muted-foreground">Total ({sentinels.length})</span>
          </div>
        </div>
      </div>

      {/* Full-height Map */}
      <div className="flex-1 min-h-[500px] h-[calc(100vh-12rem)]">
        <MapComponent 
          sentinels={sentinels} 
          selectedSentinel={selectedSentinel}
          onSentinelSelect={setSelectedSentinel}
            onViewLiveFeed={(s) => navigate('/dashboard', { state: { sentinelId: s.deviceId } })}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default LiveMap;
