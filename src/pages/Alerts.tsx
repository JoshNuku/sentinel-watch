import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { alertAPI, getImageUrl, type Alert } from "@/services/api";
import { wsService } from "@/services/websocket";
import { 
  Bell, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle,
  Construction,
  Truck,
  Droplets,
  MapPin,
  Clock,
  Radio,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { SensorChip, TriggerBadge } from "@/lib/sensorIcons";

const threatIcons = {
  Excavator: Construction,
  'Dump-Truck': Truck,
  'Water Pump': Droplets,
  Person: Radio,
};

const Alerts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "unverified">("all");
  const [threatFilter, setThreatFilter] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    // Reset image-failed state whenever a new alert is selected
    setImgFailed(false);
  }, [selectedAlert?._id]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await alertAPI.getAll({ limit: 50 });
      setAlerts(response.data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Connect to WebSocket for real-time alerts
    wsService.connect();

    // Listen for new alerts
    const unsubscribe = wsService.onNewAlert((data) => {
      console.log('📡 New alert received via WebSocket:', data);
      setAlerts(prev => [data.alert, ...prev]);
      toast.success(`New ${data.alert.threatType} detected by ${data.alert.sentinelId}!`);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  // If navigated with a specific alertId in state, auto-select that alert
  useEffect(() => {
    const stateObj = (location.state as { alertId?: string } | null) || null;
    const alertId = stateObj?.alertId;
    if (alertId && alerts.length > 0) {
      const match = alerts.find(a => a._id === alertId);
      if (match) {
        setSelectedAlert(match);
        // clear navigation state so selecting again doesn't retrigger
        try {
          navigate(location.pathname, { replace: true, state: {} });
        } catch (e) {
          // ignore
        }
      }
    }
  }, [alerts, location, navigate]);

  const handleVerify = async (alertId: string, isVerified: boolean) => {
    try {
      setVerifying(alertId);
      await alertAPI.verify(alertId, isVerified);
      setAlerts(prev => prev.map(a => 
        a._id === alertId ? { ...a, isVerified } : a
      ));
      toast.success(isVerified ? 'Alert verified' : 'Alert unverified');
    } catch (error) {
      console.error('Failed to verify alert:', error);
      toast.error('Failed to update alert');
    } finally {
      setVerifying(null);
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = 
        alert.sentinelId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.threatType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert._id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "verified" && alert.isVerified) ||
        (statusFilter === "unverified" && !alert.isVerified);
      
      const matchesThreat = 
        threatFilter === "all" || alert.threatType === threatFilter;

      return matchesSearch && matchesStatus && matchesThreat;
    });
  }, [searchQuery, statusFilter, threatFilter, alerts]);

  const unverifiedCount = alerts.filter(a => !a.isVerified).length;

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Alert Management</h1>
          <p className="text-muted-foreground text-sm">Monitor and verify detected threats</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
            {unverifiedCount} Unverified
          </Badge>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {alerts.length} Total
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: "all" | "verified" | "unverified") => setStatusFilter(v)}>
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
            </SelectContent>
          </Select>
          <Select value={threatFilter} onValueChange={setThreatFilter}>
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="Threat Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Threats</SelectItem>
              <SelectItem value="Excavator">Excavator</SelectItem>
              <SelectItem value="Dump-Truck">Dump Truck</SelectItem>
              <SelectItem value="Water Pump">Water Pump</SelectItem>
              <SelectItem value="Person">Person</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setThreatFilter("all");
            }}
            className="bg-background/50"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Alerts List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="glass rounded-xl p-8 text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
              <p className="text-muted-foreground">Loading alerts...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No alerts match your filters</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const ThreatIcon = threatIcons[alert.threatType] || Radio;
              const isSelected = selectedAlert?._id === alert._id;
              const isVerifyingThisAlert = verifying === alert._id;
              
              return (
                <div 
                  key={alert._id}
                  onClick={() => setSelectedAlert(alert)}
                  className={cn(
                    "glass rounded-xl p-4 cursor-pointer transition-all duration-200 hover:bg-card/80",
                    isSelected && "ring-2 ring-primary bg-primary/5",
                    !alert.isVerified && "border-l-4 border-l-warning"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        alert.threatType === 'Excavator' && "bg-destructive/10 text-destructive",
                        ['car','truck','motorcycle','bus'].includes(alert.threatType) && "bg-warning/10 text-warning",
                        alert.threatType === 'Water Pump' && "bg-blue-500/10 text-blue-400"
                      )}>
                        <ThreatIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{alert.threatType}</span>
                          <Badge variant="outline" className="text-xs">
                            {alert._id.slice(-8)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Radio className="h-3 w-3" />
                            {alert.sentinelId}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeAgo(alert.timestamp)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {alert.isVerified ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge className="bg-warning/10 text-warning border-warning/20">
                          <XCircle className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Alert Details Panel */}
        <div className="lg:col-span-1">
          <div className="glass rounded-xl p-4 sticky top-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Alert Details
            </h3>
            {selectedAlert ? (
              <div className="space-y-4">
                <div className="aspect-video bg-background/50 rounded-lg flex items-center justify-center border border-border/50 overflow-hidden">
                  {selectedAlert.imageUrl && !imgFailed ? (
                    <img
                      src={getImageUrl(selectedAlert.imageUrl)}
                      alt="Captured"
                      className="w-full h-full object-cover"
                      onError={() => setImgFailed(true)}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground p-4">
                      <Construction className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Captured Image</p>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Alert ID</span>
                    <span className="font-mono">{selectedAlert._id.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sentinel</span>
                    <span className="font-mono">{selectedAlert.sentinelId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Threat</span>
                    <span>{selectedAlert.threatType}</span>
                  </div>
                  {selectedAlert.triggerType && (
                    <div className="flex flex-col text-sm">
                      <span className="text-muted-foreground">Trigger</span>
                      <div className="mt-1"><TriggerBadge type={selectedAlert.triggerType} /></div>
                    </div>
                  )}
                  {selectedAlert.triggeredSensors && selectedAlert.triggeredSensors.length > 0 && (
                    <div className="flex flex-col text-sm">
                      <span className="text-muted-foreground">Sensors</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedAlert.triggeredSensors.map((s, i) => (
                          <SensorChip key={i} name={s} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time</span>
                    <span>{format(new Date(selectedAlert.timestamp), 'PPpp')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Coordinates</span>
                    <span className="font-mono text-xs">
                      {selectedAlert.location.lat.toFixed(6)}, {selectedAlert.location.lng.toFixed(6)}
                    </span>
                  </div>
                </div>
                <div className="pt-4 space-y-2">
                  {!selectedAlert.isVerified ? (
                    <Button 
                      className="w-full" 
                      variant="glow"
                      onClick={() => handleVerify(selectedAlert._id, true)}
                      disabled={verifying === selectedAlert._id}
                    >
                      {verifying === selectedAlert._id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Verify Alert
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => handleVerify(selectedAlert._id, false)}
                      disabled={verifying === selectedAlert._id}
                    >
                      {verifying === selectedAlert._id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Unverify Alert
                        </>
                      )}
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/dashboard/map', { state: { sentinelId: selectedAlert.sentinelId } })}
                  >
                    View on Map
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select an alert to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
