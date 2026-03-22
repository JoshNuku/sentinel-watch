import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { sentinelAPI, alertAPI, getStreamUrl, type Sentinel } from "@/services/api";
import { sentinels as dummySentinels } from "@/lib/dummy-data";
import { wsService, type NewAlertEvent, type StartStreamEvent } from "@/services/websocket";
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
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [alertStats, setAlertStats] = useState({
    total: 0,
    last24Hours: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const { toast } = useToast();
  
  // last fetch timestamp to throttle background calls
  const lastFetchRef = useRef<number>(0);

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

  // Shared handler for requesting a live stream (used by Grid and Map)
  const handleViewStream = useCallback(async (s: Sentinel) => {
    setSelectedSentinel(s);
    setManualRequestingDevice(s.deviceId);
    try {
      const res = await sentinelAPI.requestStream(s.deviceId);
      if (res && res.success && res.data?.streamUrl) {
        setSelectedSentinel(prev => prev ? { ...prev, streamUrl: res.data!.streamUrl } : prev);
        setIsStreamActive(true);
        fetchSentinels();
        toast({ title: 'Stream started', description: `${s.deviceId} stream available` });
      } else if (res && res.success) {
        toast({ title: 'Stream requested', description: `Waiting for ${s.deviceId} to publish stream`, variant: 'default' });
      }
    } catch (err) {
      console.error('Failed to request stream:', err);
      toast({ title: 'Stream request failed', description: 'Unable to start stream', variant: 'destructive' });
    } finally {
      setTimeout(() => setManualRequestingDevice(null), 5000);
    }
  }, [fetchSentinels, toast]);

  // Setup WebSocket connection and listeners
  useEffect(() => {
    // Connect to WebSocket
    wsService.connect();
    setWsConnected(wsService.isConnected());

    // Listen for connection status changes
    const checkConnection = setInterval(() => {
      setWsConnected(wsService.isConnected());
    }, 10000); // check less frequently to reduce load

    // Subscribe to new alert events
    const unsubscribeAlerts = wsService.onNewAlert((data: NewAlertEvent) => {
      console.log('🚨 New alert received:', data);
      
      // Show toast notification
      toast({
        title: "🚨 New Threat Detected!",
        description: `${data.alert.threatType} detected by ${data.alert.sentinelId}`,
        variant: "destructive",
      });

      // Auto-select the sentinel with the alert immediately using fresh data from event
      // This ensures we have the latest stream URL and status
      if (data.sentinel) {
        console.log('📡 Selecting alerted sentinel with fresh data:', data.sentinel.deviceId);
        setSelectedSentinel(data.sentinel);

        // If the sentinel has a streamUrl, auto-start the stream without requiring manual request
        if (data.sentinel.streamUrl) {
          console.log('📹 Auto-starting stream from alert for', data.sentinel.deviceId);
          setManualRequestingDevice(data.sentinel.deviceId);
          setIsStreamActive(true);
          // Clear the requesting flag after a short delay so LiveFeed picks up the URL
          setTimeout(() => setManualRequestingDevice(null), 3000);
        }
      }

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

    // Subscribe to start-stream events (backend sends this when alert has a stored streamUrl)
    const unsubscribeStartStream = wsService.onStartStream((data: StartStreamEvent) => {
      console.log('📹 start-stream received:', data);

      // Update the sentinel's streamUrl in our local list
      setSentinels(prev => prev.map(s =>
        s.deviceId === data.deviceId
          ? { ...s, streamUrl: data.streamUrl }
          : s
      ));

      // If this sentinel is currently selected, update it and auto-start the stream
      setSelectedSentinel(prev => {
        if (prev?.deviceId === data.deviceId) {
          setManualRequestingDevice(data.deviceId);
          setIsStreamActive(true);
          setTimeout(() => setManualRequestingDevice(null), 3000);
          return { ...prev, streamUrl: data.streamUrl };
        }
        return prev;
      });
    });

    // Cleanup on unmount
    return () => {
      unsubscribeAlerts();
      unsubscribeVerified();
      unsubscribeStatusUpdate();
      unsubscribeStartStream();
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
  const hasRestoredStreamInit = useRef(false);

  useEffect(() => {
    if (sentinels.length === 0) return;

    const state = location.state as { sentinelId?: string, autoStartStream?: boolean } | null;
    const targetId = state?.sentinelId || sessionStorage.getItem('selectedSentinelId');

    if (targetId) {
      const match = sentinels.find(s => s.deviceId === targetId);
      if (match) {
        setSelectedSentinel(match);

        // Auto-start stream if navigated from LiveMap with that intent
        if (state?.autoStartStream && !hasRestoredStreamInit.current) {
          hasRestoredStreamInit.current = true;
          handleViewStream(match);
        }
      }
    }
  }, [sentinels, location.state, handleViewStream]);

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

      {/* Sentinels Horizontal List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Active Devices</h2>
        <SentinelsGrid
          sentinels={sentinels}
          onFocus={(s) => {
            setSelectedSentinel(s);
            setFocusTrigger(f => f + 1);
          }}
          onViewStream={handleViewStream}
        />
      </div>

      {/* Map & Live Feed */}
      <div className="grid lg:grid-cols-5 gap-6">
        <div id="map-container" className="lg:col-span-3 h-[480px]">
          <MapComponent 
            sentinels={sentinels}
            selectedSentinel={selectedSentinel}
            onSentinelSelect={(s) => {
              setSelectedSentinel(s);
              setFocusTrigger(f => f + 1);
            }}
            onStopFeed={() => {
              setSelectedSentinel(null);
              setIsStreamActive(false);
            }}
            onViewLiveFeed={handleViewStream}
            loading={loading}
            isStreamActive={isStreamActive}
            focusTrigger={focusTrigger}
          />
        </div>

        <div id="feed-container" className="lg:col-span-2 h-[480px]">
          <LiveFeed 
            sentinel={selectedSentinel}
            externalManualRequest={manualRequestingDevice === selectedSentinel?.deviceId}
            onClose={() => {
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
