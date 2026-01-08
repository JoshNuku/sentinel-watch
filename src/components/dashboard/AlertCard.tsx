import { type Alert } from "@/services/api";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, Truck, Droplets, Construction, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface AlertCardProps {
  alert: Alert;
}

const threatIcons: Record<string, any> = {
  Excavator: Construction,
  Vehicle: Truck,
  "Water Pump": Droplets,
  person: User,
  car: Truck,
  truck: Truck,
  Person: User,
};

const getTimeAgo = (timestamp: string) => {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return 'Unknown time';
  }
};

const AlertCard = ({ alert }: AlertCardProps) => {
  const ThreatIcon = threatIcons[alert.threatType] || AlertTriangle;
  
  return (
    <div 
      className={cn(
        "rounded-lg p-4 transition-all duration-200",
        alert.isVerified 
          ? "bg-secondary/50 border border-border" 
          : "bg-warning/10 border border-warning/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
          alert.isVerified ? "bg-secondary" : "bg-warning/20"
        )}>
          <ThreatIcon className={cn(
            "h-5 w-5",
            alert.isVerified ? "text-muted-foreground" : "text-warning"
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{alert.sentinelId}</span>
            {alert.isVerified && (
              <CheckCircle className="h-4 w-4 text-primary" />
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <span className={cn(
              "font-medium",
              alert.isVerified ? "text-muted-foreground" : "text-warning"
            )}>
              {alert.threatType}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground text-xs">
              {getTimeAgo(alert.timestamp)}
            </span>
          </div>
        </div>
        
        {!alert.isVerified && (
          <Button variant="glow" size="sm">
            Verify
          </Button>
        )}
      </div>
    </div>
  );
};

export default AlertCard;
