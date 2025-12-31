import { Play, Video, Signal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LiveFeedProps {
  sentinelId?: string;
}

const LiveFeed = ({ sentinelId = "ORN-002" }: LiveFeedProps) => {
  return (
    <div className="glass rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Video className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Live Feed: {sentinelId}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Signal className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-xs text-primary font-medium">LIVE</span>
        </div>
      </div>
      
      <div className="flex-1 bg-background rounded-lg relative overflow-hidden min-h-[200px] flex items-center justify-center border border-border">
        {/* Simulated video placeholder */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/50 to-background" />
        
        {/* Scan lines effect */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground) / 0.03) 2px, hsl(var(--foreground) / 0.03) 4px)',
          }}
        />
        
        {/* Play button */}
        <button className="relative z-10 w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors group">
          <Play className="h-8 w-8 text-primary group-hover:scale-110 transition-transform ml-1" />
        </button>
        
        {/* Corner decorations */}
        <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-primary/30 rounded-tl" />
        <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-primary/30 rounded-tr" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-primary/30 rounded-bl" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-primary/30 rounded-br" />
        
        {/* Timestamp */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 glass px-3 py-1 rounded text-xs font-mono">
          {new Date().toLocaleTimeString()}
        </div>
      </div>
      
      <div className="flex gap-2 mt-4">
        <Button variant="secondary" size="sm" className="flex-1">
          Snapshot
        </Button>
        <Button variant="glow" size="sm" className="flex-1">
          Request Full Stream
        </Button>
      </div>
    </div>
  );
};

export default LiveFeed;
