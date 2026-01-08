import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { sentinelAPI, alertAPI, type Sentinel } from "@/services/api";
import { sentinels as dummySentinels } from "@/lib/dummy-data";
import { wsService, type NewAlertEvent } from "@/services/websocket";
import StatCard from "@/components/dashboard/StatCard";
import MapComponent from "@/components/dashboard/MapComponent";
import LiveFeed from "@/components/dashboard/LiveFeed";
import AlertsList from "@/components/dashboard/AlertsList";
import { Radio, Activity, AlertTriangle, WifiOff, Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const location = useLocation();
  const [sentinels, setSentinels] = useState<Sentinel[]>([]);
  const [selectedSentinel, setSelectedSentinel] = useState<Sentinel | null>(null);
  const [alertStats, setAlertStats] = useState({
    total: 0,
    last24Hours: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const { toast } = useToast();

  // Fetch sentinels from backend
  const fetchSentinels = async () => {
    try {
      // Don't set loading on poll updates to avoid UI flicker
      // only set loading on initial fetch
      if (sentinels.length === 0) setLoading(true);
      setError(null);
      
      const response = await sentinelAPI.getAll();
      console.log('📡 Fetched sentinels:', response.data?.length);
      
      if (response.success && response.data) {
        setSentinels(response.data);
        
        // If a sentinel was previously selected, update it with new data
        if (selectedSentinel) {
          const updatedSelected = response.data.find(
            s => s.deviceId === selectedSentinel.deviceId
          );
          // Only update if found, otherwise keep existing (might be temporary glitch)
          if (updatedSelected) {
            setSelectedSentinel(updatedSelected);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch sentinels:", err);
      if (sentinels.length === 0) {
        setError("Failed to connect to backend. Please check connection.");

        // Dev-friendly fallback so the map still shows markers
        const mapped: Sentinel[] = dummySentinels.map((s) => ({
          _id: s.id,
          deviceId: s.id,
          status: s.status,
          location: s.location,
          batteryLevel: s.battery,
          lastSeen: s.lastSeen,
        }));
        setSentinels(mapped);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch alert statistics
  const fetchAlertStats = async () => {
    try {
      const response = await alertAPI.getStats();
      if (response.success && response.data) {
        setAlertStats({
          total: response.data.total,
          last24Hours: response.data.last24Hours
        });
      }
    } catch (err) {
      console.error("Failed to fetch alert stats:", err);
    }
  };

  // Setup WebSocket connection and listeners
  useEffect(() => {
    // Connect to WebSocket
    wsService.connect();
    setWsConnected(wsService.isConnected());

    // Listen for connection status changes
    const checkConnection = setInterval(() => {
      setWsConnected(wsService.isConnected());
    }, 2000);

    // Subscribe to new alert events
    const unsubscribeAlerts = wsService.onNewAlert((data: NewAlertEvent) => {
      console.log('🚨 New alert received:', data);
      
      // Show toast notification
      toast({
        title: "🚨 New Threat Detected!",
        description: `${data.alert.threatType} detected by ${data.alert.sentinelId}`,
        variant: "destructive",
      });

      // Refresh data
      fetchSentinels();
      fetchAlertStats();

      // Auto-select the sentinel with the alert
      const alertedSentinel = sentinels.find(s => s.deviceId === data.alert.sentinelId);
      if (alertedSentinel) {
        setSelectedSentinel(alertedSentinel);
      }
    });

    // Subscribe to alert verified events
    const unsubscribeVerified = wsService.onAlertVerified((data) => {
      console.log('✅ Alert verified:', data);
      toast({
        title: "Alert Verified",
        description: `Alert ${data.alertId} has been ${data.isVerified ? 'verified' : 'unverified'}`,
      });
      fetchAlertStats();
    });

    // Cleanup on unmount
    return () => {
      unsubscribeAlerts();
      unsubscribeVerified();
      clearInterval(checkConnection);
    };
  }, [sentinels, toast]);

  // Initial data fetch
  useEffect(() => {
    fetchSentinels();
    fetchAlertStats();

    // Auto-refresh every 30 seconds
    const intervalId = setInterval(() => {
      fetchSentinels();
      fetchAlertStats();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // Restore selection when navigated from LiveMap or from previous tab (sessionStorage)
  useEffect(() => {
    if (sentinels.length === 0) return;

    const state = location.state as { sentinelId?: string } | null;
    const targetId = state?.sentinelId || sessionStorage.getItem('selectedSentinelId');

    if (targetId) {
      const match = sentinels.find(s => s.deviceId === targetId);
      if (match) {
        setSelectedSentinel(match);
      }
    }
  }, [sentinels, location.state]);

  // Persist selection for tab switches
  useEffect(() => {
    if (selectedSentinel) {
      sessionStorage.setItem('selectedSentinelId', selectedSentinel.deviceId);
    }
  }, [selectedSentinel]);

  // Calculate stats from fetched data
  const activeSentinels = sentinels.filter(s => s.status === "active").length;
  const inactiveSentinels = sentinels.filter(s => s.status === "inactive").length;
  const alertingSentinels = sentinels.filter(s => s.status === "alert").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mission Control</h1>
          <p className="text-muted-foreground">Real-time surveillance network monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <div className="flex items-center gap-2 glass px-4 py-2 rounded-lg border border-warning/50">
              <WifiOff className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium text-warning">Offline Mode</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchSentinels();
              fetchAlertStats();
            }}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className={`flex items-center gap-2 glass px-4 py-2 rounded-lg ${wsConnected ? 'border-primary/50' : 'border-muted'}`}>
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
            <span className="text-sm font-medium">{wsConnected ? 'Live Updates' : 'Polling Mode'}</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Sentinels" 
          value={sentinels.length} 
          icon={<Radio className="h-5 w-5 text-primary" />}
        />
        <StatCard 
          title="Active" 
          value={activeSentinels} 
          icon={<Activity className="h-5 w-5 text-primary" />}
          variant="success"
        />
        <StatCard 
          title="Inactive" 
          value={inactiveSentinels} 
          icon={<WifiOff className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard 
          title="Alerts Today" 
          value={alertStats.last24Hours} 
          icon={<Bell className="h-5 w-5 text-warning" />}
          variant={alertStats.last24Hours > 0 ? "warning" : "default"}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Map + Alerts stacked */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="h-[440px]">
            <MapComponent 
              sentinels={sentinels}
              selectedSentinel={selectedSentinel}
              onSentinelSelect={setSelectedSentinel}
              loading={loading}
            />
          </div>
          <div className="flex-1 min-h-[220px]">
            <AlertsList />
          </div>
        </div>

        {/* Right: Full-height Live Feed */}
        <div className="lg:col-span-2 h-[440px]">
          <LiveFeed 
            sentinel={selectedSentinel}
            onClose={() => setSelectedSentinel(null)}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
