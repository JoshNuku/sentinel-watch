import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Sentinel } from "@/services/api";
import { formatDistanceToNow } from "date-fns";
import { Battery, Wifi } from "lucide-react";
import { SensorChip, TriggerBadge } from "@/lib/sensorIcons";

interface Props {
  sentinels: Sentinel[];
  onFocus?: (s: Sentinel) => void;
  onViewStream?: (s: Sentinel) => void;
}

const SentinelsGrid: React.FC<Props> = ({ sentinels, onFocus, onViewStream }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sentinels.map((s) => (
        <div key={s._id} className="glass rounded-xl p-4 flex flex-col justify-between h-40">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm text-muted-foreground">Device</div>
                <div className="font-medium">{s.deviceId || s._id}</div>
              </div>
              <div className="text-right space-y-1">
                <Badge className={s.status === 'alert' ? 'bg-warning/10 text-warning' : s.status === 'active' ? 'bg-primary/10 text-primary' : ''}>
                  {s.status}
                </Badge>
                {s.triggerType && (
                  <div className="mt-1">
                    <TriggerBadge type={s.triggerType} />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Battery className="h-4 w-4" />
                <span>{s.batteryLevel ?? 'n/a'}%</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Wifi className="h-4 w-4" />
                <span>Last seen {s.lastSeen ? formatDistanceToNow(new Date(s.lastSeen), { addSuffix: true }) : 'unknown'}</span>
              </div>
            </div>

            {s.triggeredSensors && s.triggeredSensors.length > 0 && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {s.triggeredSensors.slice(0, 4).map((t, i) => (
                  <SensorChip key={i} name={t} />
                ))}
              </div>
            )}

            <div className="mt-3 text-xs text-muted-foreground">
              <div>Location: <span className="font-mono text-xs">{s.location?.lat?.toFixed(4) ?? '—'}, {s.location?.lng?.toFixed(4) ?? '—'}</span></div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onFocus && onFocus(s)}>
              Focus
            </Button>
            <Button
              className="px-3 bg-emerald-500 text-white hover:bg-emerald-600"
              onClick={() => {
                if (onFocus) onFocus(s);
                if (onViewStream) onViewStream(s);
              }}
            >
              View Stream
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SentinelsGrid;
