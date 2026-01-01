import { useState, useMemo } from "react";
import { alerts, sentinels, getTimeAgo, type Alert } from "@/lib/dummy-data";
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
  Radio
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

const threatIcons = {
  Excavator: Construction,
  Vehicle: Truck,
  'Water Pump': Droplets,
};

const Alerts = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "unverified">("all");
  const [threatFilter, setThreatFilter] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  // Extended alerts for demo
  const extendedAlerts: Alert[] = [
    ...alerts,
    { id: 'ALERT-003', sentinelId: 'ORN-001', threatType: 'Water Pump', timestamp: '2023-10-27T06:15:00Z', location: { lat: 5.6037, lng: -0.1870 }, isVerified: true },
    { id: 'ALERT-004', sentinelId: 'ORN-004', threatType: 'Excavator', timestamp: '2023-10-26T22:45:00Z', location: { lat: 5.5800, lng: -0.1700 }, isVerified: false },
    { id: 'ALERT-005', sentinelId: 'ORN-002', threatType: 'Vehicle', timestamp: '2023-10-26T14:20:00Z', location: { lat: 5.5560, lng: -0.2010 }, isVerified: true },
  ];

  const filteredAlerts = useMemo(() => {
    return extendedAlerts.filter(alert => {
      const matchesSearch = 
        alert.sentinelId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.threatType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "verified" && alert.isVerified) ||
        (statusFilter === "unverified" && !alert.isVerified);
      
      const matchesThreat = 
        threatFilter === "all" || alert.threatType === threatFilter;

      return matchesSearch && matchesStatus && matchesThreat;
    });
  }, [searchQuery, statusFilter, threatFilter, extendedAlerts]);

  const unverifiedCount = extendedAlerts.filter(a => !a.isVerified).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Alert Management</h1>
          <p className="text-muted-foreground text-sm">Monitor and verify detected threats</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
            {unverifiedCount} Unverified
          </Badge>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {extendedAlerts.length} Total
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
              <SelectItem value="Vehicle">Vehicle</SelectItem>
              <SelectItem value="Water Pump">Water Pump</SelectItem>
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
          {filteredAlerts.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No alerts match your filters</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const ThreatIcon = threatIcons[alert.threatType];
              const isSelected = selectedAlert?.id === alert.id;
              
              return (
                <div 
                  key={alert.id}
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
                        alert.threatType === 'Vehicle' && "bg-warning/10 text-warning",
                        alert.threatType === 'Water Pump' && "bg-blue-500/10 text-blue-400"
                      )}>
                        <ThreatIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{alert.threatType}</span>
                          <Badge variant="outline" className="text-xs">
                            {alert.id}
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
                <div className="aspect-video bg-background/50 rounded-lg flex items-center justify-center border border-border/50">
                  <div className="text-center text-muted-foreground">
                    <Construction className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Captured Image</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Alert ID</span>
                    <span className="font-mono">{selectedAlert.id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sentinel</span>
                    <span className="font-mono">{selectedAlert.sentinelId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Threat</span>
                    <span>{selectedAlert.threatType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time</span>
                    <span>{new Date(selectedAlert.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Coordinates</span>
                    <span className="font-mono text-xs">
                      {selectedAlert.location.lat.toFixed(6)}, {selectedAlert.location.lng.toFixed(6)}
                    </span>
                  </div>
                </div>
                <div className="pt-4 space-y-2">
                  {!selectedAlert.isVerified && (
                    <Button className="w-full" variant="glow">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify Alert
                    </Button>
                  )}
                  <Button variant="outline" className="w-full">
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
