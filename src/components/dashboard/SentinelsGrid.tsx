import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Sentinel } from "@/services/api";
import { formatDistanceToNow } from "date-fns";
import { Battery, Wifi, MapPin, Video, Crosshair } from "lucide-react";
import { SensorChip, TriggerBadge } from "@/lib/sensorIcons";

interface Props {
  sentinels: Sentinel[];
  onFocus?: (s: Sentinel) => void;
  onViewStream?: (s: Sentinel) => void;
}

const SentinelsGrid: React.FC<Props> = ({ sentinels, onFocus, onViewStream }) => {
  if (sentinels.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground border border-dashed rounded-xl">
        No sentinels found.
      </div>
    );
  }

  return (
    <div className="flex overflow-x-auto gap-4 pb-4 px-1 snap-x scrollbar-thin">
      {sentinels.map((s) => (
        <div key={s._id} className="snap-start glass rounded-xl p-5 flex flex-col justify-between min-w-[320px] shadow-sm border border-border/50 hover:border-primary/30 transition-colors flex-shrink-0">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs text-muted-foreground font-medium tracking-wide uppercase">Device</div>
                <div className="font-semibold text-lg">{s.deviceId || s._id}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge variant="outline" className={s.status === 'alert' ? 'bg-destructive/15 text-destructive border-transparent font-bold' : s.status === 'active' ? 'bg-primary/15 text-primary border-transparent' : 'bg-muted/50 text-muted-foreground border-transparent'}>
                  <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${s.status === 'alert' ? 'bg-destructive animate-pulse' : s.status === 'active' ? 'bg-primary' : 'bg-muted-foreground'}`}></div>
                  {s.status.toUpperCase()}
                </Badge>
                {s.triggerType && (
                  <TriggerBadge type={s.triggerType} />
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Battery className={`h-4 w-4 ${s.batteryLevel && s.batteryLevel < 20 ? 'text-destructive' : 'text-primary'}`} />
                <span>{s.batteryLevel ?? 'n/a'}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                <span className="truncate">
                  {s.lastSeen ? formatDistanceToNow(new Date(s.lastSeen), { addSuffix: true }) : 'unknown'}
                </span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <MapPin className="h-4 w-4" />
                <span className="font-mono text-xs">{s.location?.lat?.toFixed(4) ?? '—'}, {s.location?.lng?.toFixed(4) ?? '—'}</span>
              </div>
            </div>

            {s.triggeredSensors && s.triggeredSensors.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                {s.triggeredSensors.slice(0, 3).map((t, i) => (
                  <SensorChip key={i} name={t} />
                ))}
                {s.triggeredSensors.length > 3 && (
                  <span className="text-xs text-muted-foreground ml-1">+{s.triggeredSensors.length - 3}</span>
                )}
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full gap-1.5 bg-background/50 hover:bg-background" 
              onClick={() => {
                if (onFocus) onFocus(s);
                // Scroll to map smoothly
                setTimeout(() => {
                  document.getElementById('map-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 50);
              }}
            >
              <Crosshair className="h-4 w-4" />
              Focus
            </Button>
            <Button
              size="sm"
              className="w-full gap-1.5 bg-primary/90 hover:bg-primary shadow-sm"
              onClick={() => {
                if (onFocus) onFocus(s);
                if (onViewStream) onViewStream(s);
                // Scroll to video feed smoothly
                setTimeout(() => {
                  document.getElementById('feed-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 50);
              }}
            >
              <Video className="h-4 w-4" />
              Live Feed
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SentinelsGrid;
