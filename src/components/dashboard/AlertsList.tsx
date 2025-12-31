import { alerts, getTimeAgo, type Alert } from "@/lib/dummy-data";
import AlertCard from "./AlertCard";
import { Bell } from "lucide-react";

const AlertsList = () => {
  return (
    <div className="glass rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="h-5 w-5 text-warning" />
        <h3 className="font-semibold">Recent Alerts</h3>
        <span className="ml-auto bg-warning/20 text-warning text-xs font-medium px-2 py-0.5 rounded-full">
          {alerts.filter(a => !a.isVerified).length} unverified
        </span>
      </div>
      
      <div className="flex-1 space-y-3 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Bell className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">No recent alerts</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))
        )}
      </div>
    </div>
  );
};

export default AlertsList;
