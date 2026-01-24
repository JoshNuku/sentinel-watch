import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { sentinelAPI, alertAPI, type Sentinel } from "@/services/api";
import { sentinels as dummySentinels } from "@/lib/dummy-data";
import { wsService, type NewAlertEvent } from "@/services/websocket";
import StatCard from "@/components/dashboard/StatCard";
import MapComponent from "@/components/dashboard/MapComponent";
import LiveFeed from "@/components/dashboard/LiveFeed";
import SentinelsGrid from "@/components/dashboard/SentinelsGrid";
import { Radio, Activity, AlertTriangle, WifiOff, Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const location = useLocation();
  const [sentinels, setSentinels] = useState<Sentinel[]>([]);
  const [selectedSentinel, setSelectedSentinel] = useState<Sentinel | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [manualRequestingDevice, setManualRequestingDevice] = useState<string | null>(null);
  const [alertStats, setAlertStats] = useState({
    total: 0,
    last24Hours: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const stopCooldownRef = useRef<number>(0); // Prevent notifications after stopping feed
  const { toast } = useToast();



  // Fetch sentinels from backend
  const fetchSentinels = useCallback(async () => {
    // throttle: avoid backend flooding
    const now = Date.now();
    if (lastFetchRef.current && now - lastFetchRef.current < 5000) {
      // skip if we fetched less than 5s ago
      return;
    }
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
      lastFetchRef.current = Date.now();
    }
  }, [selectedSentinel, sentinels.length]);

  // last fetch timestamp to throttle background calls
  const lastFetchRef = useRef<number>(0);

  // Fetch alert statistics
  const fetchAlertStats = useCallback(async () => {
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
  }, []);

  // Setup WebSocket connection and listeners
  useEffect(() => {
    // Connect to WebSocket
    wsService.connect();
    setWsConnected(wsService.isConnected());

    // Listen for connection status changes
    const checkConnection = setInterval(() => {
      setWsConnected(wsService.isConnected());
    }, 10000); // check less frequently to reduce load

    // Track last alert to prevent duplicate toast notifications
    let lastAlertId: string | null = null;
    let lastAlertTime = 0;

    // Subscribe to new alert events
    const unsubscribeAlerts = wsService.onNewAlert((data: NewAlertEvent) => {
      console.log('🚨 New alert received:', data);

      // Deduplicate: skip if same alert ID or if received within 3 seconds
      const alertId = data.alert._id || data.alert.sentinelId + data.alert.timestamp;
      const now = Date.now();
      if (alertId === lastAlertId || now - lastAlertTime < 3000) {
        console.log('🔄 Skipping duplicate alert notification');
        return;
      }

      // Skip if user just stopped the feed (5 second cooldown)
      if (now - stopCooldownRef.current < 5000) {
        console.log('🔄 Skipping alert notification (stop feed cooldown)');
        return;
      }

      // Skip 'unknown' threat types - these are often false positives
      if (data.alert.threatType === 'unknown') {
        console.log('🔄 Skipping unknown threat type alert (suppressed)');
        return;
      }

      lastAlertId = alertId;
      lastAlertTime = now;

      // Show toast notification
      toast({
        title: "🚨 New Threat Detected!",
        description: `${data.alert.threatType} detected by ${data.alert.sentinelId}`,
        variant: "destructive",
      });

      // NOTE: We do NOT auto-select the sentinel to avoid interrupting existing streams
      // The LiveFeed component will handle auto-starting if the sentinel is already selected
      console.log('📡 Alert received for sentinel:', data.sentinel?.deviceId);

      // Refresh data in background (throttled)
      if (!lastFetchRef.current || Date.now() - lastFetchRef.current > 5000) {
        fetchSentinels();
      }
      if (!lastFetchRef.current || Date.now() - lastFetchRef.current > 60000) {
        fetchAlertStats();
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

    // Subscribe to sentinel status updates (e.g., auto-reset from alert to active)
    const unsubscribeStatusUpdate = wsService.onSentinelStatusUpdate((data) => {
      console.log('🔄 Sentinel status update:', data);

      // Update the sentinel in the list
      setSentinels(prev => prev.map(s =>
        s.deviceId === data.deviceId
          ? { ...s, status: data.status }
          : s
      ));

      // Update selected sentinel if it's the one that changed
      setSelectedSentinel(prev =>
        prev?.deviceId === data.deviceId
          ? { ...prev, status: data.status }
          : prev
      );
    });

    // Cleanup on unmount
    return () => {
      unsubscribeAlerts();
      unsubscribeVerified();
      unsubscribeStatusUpdate();
      clearInterval(checkConnection);
    };
  }, [fetchSentinels, fetchAlertStats, toast]);

  // Initial data fetch
  useEffect(() => {
    fetchSentinels();
    fetchAlertStats();

    // Auto-refresh every 60 seconds (reduced frequency to lower backend load)
    const intervalId = setInterval(() => {
      fetchSentinels();
      fetchAlertStats();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [fetchSentinels, fetchAlertStats]);

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
  const activeSentinels = sentinels.filter(s => s.status === "active" || s.status === "alert").length;
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
              onStopFeed={() => {
                setSelectedSentinel(null);
                setIsStreamActive(false);
              }}
              loading={loading}
              isStreamActive={isStreamActive}
            />
          </div>
          <div className="flex-1 min-h-[220px]">
            <SentinelsGrid
              sentinels={sentinels}
              onFocus={(s) => setSelectedSentinel(s)}
              onViewStream={async (s) => {
                setSelectedSentinel(s);
                setManualRequestingDevice(s.deviceId);
                try {
                  const res = await sentinelAPI.requestStream(s.deviceId);
                  if (res && res.success && res.data?.streamUrl) {
                    // update selected sentinel with returned streamUrl so LiveFeed can use it
                    setSelectedSentinel(prev => prev ? { ...prev, streamUrl: res.data!.streamUrl } : prev);
                    setIsStreamActive(true);
                    fetchSentinels();
                    toast({ title: 'Stream started', description: `${s.deviceId} stream available` });
                  } else if (res && res.success) {
                    // success but no streamUrl yet — backend is polling; notify user
                    toast({ title: 'Stream requested', description: `Waiting for ${s.deviceId} to publish stream`, variant: 'default' });
                  }
                } catch (err) {
                  console.error('Failed to request stream:', err);
                  toast({ title: 'Stream request failed', description: 'Unable to start stream', variant: 'destructive' });
                } finally {
                  // clear requesting flag; LiveFeed will still show loading if it set internal flag or other flows
                  setTimeout(() => setManualRequestingDevice(null), 5000);
                }
              }}
            />
          </div>
        </div>

        {/* Right: Full-height Live Feed */}
        <div className="lg:col-span-2 h-[440px]">
          <LiveFeed
            sentinel={selectedSentinel}
            externalManualRequest={manualRequestingDevice === selectedSentinel?.deviceId}
            onClose={() => {
              stopCooldownRef.current = Date.now(); // Prevent false threat notifications
              setSelectedSentinel(null);
              setIsStreamActive(false);
            }}
            onStreamStateChange={setIsStreamActive}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
