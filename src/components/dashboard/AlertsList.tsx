import { useState, useEffect } from "react";
import { alertAPI, type Alert } from "@/services/api";
import { wsService } from "@/services/websocket";
import AlertCard from "./AlertCard";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";

const AlertsList = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      const response = await alertAPI.getAll({ limit: 10 });
      if (response.success && response.data) {
        setAlerts(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (alertId: string, isVerified: boolean) => {
    try {
      setVerifying(alertId);
      
      // Optimistic update
      setAlerts(prev => prev.map(a => 
        a._id === alertId ? { ...a, isVerified } : a
      ));
      
      await alertAPI.verify(alertId, isVerified);
      toast.success('Alert verified successfully');
    } catch (error) {
      // Revert on error
      setAlerts(prev => prev.map(a => 
        a._id === alertId ? { ...a, isVerified: !isVerified } : a
      ));
      console.error('Failed to verify alert:', error);
      toast.error('Failed to verify alert');
    } finally {
      setVerifying(null);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Listen for new alerts via WebSocket
    wsService.connect();
    const unsubscribe = wsService.onNewAlert((data) => {
      setAlerts(prev => {
        // Avoid duplicates by checking if alert already exists
        const exists = prev.some(a => a._id === data.alert._id);
        if (exists) return prev;
        return [data.alert, ...prev.slice(0, 9)];
      });
    });

    return () => unsubscribe();
  }, []);

  const unverifiedCount = alerts.filter(a => !a.isVerified).length;

  return (
    <div className="glass rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="h-5 w-5 text-warning" />
        <h3 className="font-semibold">Recent Alerts</h3>
        <span className="ml-auto bg-warning/20 text-warning text-xs font-medium px-2 py-0.5 rounded-full">
          {unverifiedCount} unverified
        </span>
      </div>
      
      <div className="flex-1 space-y-3 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-10 w-10 mb-2 animate-spin text-primary" />
            <p className="text-sm">Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Bell className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">No recent alerts</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <AlertCard 
              key={alert._id} 
              alert={alert} 
              onVerify={handleVerify}
              verifying={verifying === alert._id}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AlertsList;
