import { useState, useEffect, useRef } from "react";
import { Video, Signal, WifiOff, X, AlertCircle, Moon, Camera, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStreamUrl, type Sentinel } from "@/services/api";

interface LiveFeedProps {
  sentinel: Sentinel | null;
  onClose?: () => void;
}

const LiveFeed = ({ sentinel, onClose }: LiveFeedProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  // Toggle fullscreen
  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  // Update stream URL when sentinel changes
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
    
    if (sentinel) {
      const url = getStreamUrl(sentinel);
      setStreamUrl(url);
    } else {
      setStreamUrl(null);
    }
  }, [sentinel]);

  // Handle image load error
  const handleImageError = () => {
    console.error(`Failed to load stream for ${sentinel?.deviceId}`);
    setImageError(true);
    setImageLoaded(false);
  };

  // Handle image load success
  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  // Determine what to render
  const renderContent = () => {
    // Case 1: No sentinel selected
    if (!sentinel) {
      return (
        <div className="flex-1 min-h-0 bg-background rounded-lg relative overflow-hidden flex flex-col items-center justify-center border border-border/50">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/30 to-background" />
          <div className="relative z-10 text-center space-y-4 px-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Camera className="h-8 w-8 text-primary/50" />
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-2">No Device Selected</h4>
              <p className="text-sm text-muted-foreground max-w-sm">
                Click on a sentinel marker on the map to view its live feed
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Case 2: Sentinel is inactive (sleeping/low-power mode)
    if (sentinel.status === 'inactive') {
      return (
        <div className="flex-1 min-h-0 bg-background rounded-lg relative overflow-hidden flex flex-col items-center justify-center border border-border/50">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/30 to-background" />
          
          {/* Animated background pulse */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-primary/5 animate-pulse" />
          </div>
          
          <div className="relative z-10 text-center space-y-4 px-6">
            <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
              <Moon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-2">Device in Low-Power Mode</h4>
              <p className="text-sm text-muted-foreground max-w-sm">
                {sentinel.deviceId} is sleeping. Waiting for motion trigger...
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                <span>Standby Mode</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Case 3: Stream connection lost
    if (imageError || !streamUrl) {
      return (
        <div className="flex-1 min-h-0 bg-background rounded-lg relative overflow-hidden flex flex-col items-center justify-center border border-destructive/30">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-background" />
          <div className="relative z-10 text-center space-y-4 px-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <WifiOff className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-2">Connection Lost</h4>
              <p className="text-sm text-muted-foreground max-w-sm">
                Unable to connect to video stream from {sentinel.deviceId}
              </p>
              {!streamUrl && (
                <p className="text-xs text-muted-foreground mt-2">
                  No stream URL available
                </p>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => {
                  setImageError(false);
                  setImageLoaded(false);
                }}
              >
                Retry Connection
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Case 4: Active stream (active or alert status)
    return (
      <div ref={containerRef} className="video-stream-container flex-1 min-h-0 bg-background rounded-lg relative overflow-hidden flex items-center justify-center border border-primary/30">
        {/* Loading state */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/50 to-background flex items-center justify-center z-10">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Connecting to stream...</p>
            </div>
          </div>
        )}
        
        {/* Video Stream */}
        <img
          src={streamUrl}
          alt={`Live feed from ${sentinel.deviceId}`}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
        
        {/* Stream overlays */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Corner decorations */}
          <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-primary/50 rounded-tl" />
          <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-primary/50 rounded-tr" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-primary/50 rounded-bl" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-primary/50 rounded-br" />
          
          {/* Scan lines effect */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground) / 0.05) 2px, hsl(var(--foreground) / 0.05) 4px)',
            }}
          />
          
          {/* Timestamp */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 glass px-3 py-1 rounded text-xs font-mono backdrop-blur-md">
            {new Date().toLocaleTimeString()}
          </div>
          
          {/* Alert indicator */}
          {sentinel.status === 'alert' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-warning/90 text-warning-foreground px-3 py-1.5 rounded-full animate-pulse">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-bold">THREAT DETECTED</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="glass rounded-xl p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Video className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">
              {sentinel ? `Live Feed: ${sentinel.deviceId}` : 'Live Feed'}
            </h3>
            {sentinel && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Battery: {sentinel.batteryLevel}%</p>
                <p>Status: {sentinel.status}</p>
                <p>
                  Location: {Number(sentinel.location?.lat).toFixed(4)}, {Number(sentinel.location?.lng).toFixed(4)}
                </p>
                <p>Last seen: {sentinel.lastSeen ? new Date(sentinel.lastSeen).toLocaleString() : 'Unknown'}</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sentinel && streamUrl && !imageError && (
            <>
              <Signal className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-xs text-primary font-medium">LIVE</span>
            </>
          )}
          {sentinel && onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Content Area */}
      {renderContent()}
      
      {/* Action Buttons */}
      {sentinel && streamUrl && !imageError && (
        <div className="flex gap-2 mt-4">
          <Button variant="secondary" size="sm" className="flex-1">
            Snapshot
          </Button>
          <Button 
            variant="glow" 
            size="sm" 
            className="flex-1"
            onClick={handleFullscreen}
          >
            <Maximize className="mr-2 h-4 w-4" /> Full Screen
          </Button>
        </div>
      )}
    </div>
  );
};

export default LiveFeed;
