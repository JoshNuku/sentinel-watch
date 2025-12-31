import { sentinels, alerts } from "@/lib/dummy-data";
import StatCard from "@/components/dashboard/StatCard";
import MapComponent from "@/components/dashboard/MapComponent";
import LiveFeed from "@/components/dashboard/LiveFeed";
import AlertsList from "@/components/dashboard/AlertsList";
import { Radio, Activity, AlertTriangle, WifiOff, Bell } from "lucide-react";

const Dashboard = () => {
  const activeSentinels = sentinels.filter(s => s.status === "active").length;
  const inactiveSentinels = sentinels.filter(s => s.status === "inactive").length;
  const alertingSentinels = sentinels.filter(s => s.status === "alert").length;
  const todayAlerts = alerts.length; // In a real app, filter by today's date

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mission Control</h1>
          <p className="text-muted-foreground">Real-time surveillance network monitoring</p>
        </div>
        <div className="flex items-center gap-2 glass px-4 py-2 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium">System Online</span>
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
          value={todayAlerts} 
          icon={<Bell className="h-5 w-5 text-warning" />}
          variant={todayAlerts > 0 ? "warning" : "default"}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Map - 60% */}
        <div className="lg:col-span-3 min-h-[500px]">
          <MapComponent />
        </div>

        {/* Right Panel - 40% */}
        <div className="lg:col-span-2 space-y-6">
          <LiveFeed sentinelId="ORN-002" />
          <AlertsList />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
