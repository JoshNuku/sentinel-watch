import { useState, useEffect, useRef, useCallback } from "react";
import { Video, Signal, WifiOff, X, AlertCircle, Moon, Camera, Maximize, RefreshCw, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStreamUrl, sentinelAPI, type Sentinel } from "@/services/api";

interface LiveFeedProps {
  sentinel: Sentinel | null;
  onClose?: () => void;
  onStreamStateChange?: (isActive: boolean) => void;
}

// Keep-alive interval (60 seconds as per Pi documentation)
const KEEPALIVE_INTERVAL = 60000;

const LiveFeed = ({ sentinel, onClose, onStreamStateChange }: LiveFeedProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [manualStreamRequested, setManualStreamRequested] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activatedSentinelRef = useRef<string | null>(null);

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

  // Cleanup function for timers
  const cleanupTimers = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  }, []);

  // Start keep-alive interval
  const startKeepAlive = useCallback((deviceId: string) => {
    // Clear any existing keep-alive interval
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
    }
    
    console.log(`💓 Starting keep-alive for ${deviceId} (every ${KEEPALIVE_INTERVAL / 1000}s)`);
    
    keepAliveIntervalRef.current = setInterval(async () => {
      try {
        await sentinelAPI.keepAlive(deviceId);
        console.log(`💓 Keep-alive sent to ${deviceId}`);
      } catch (error) {
        console.error(`❌ Keep-alive failed for ${deviceId}:`, error);
      }
    }, KEEPALIVE_INTERVAL);
  }, []);

  // Stop keep-alive interval
  const stopKeepAlive = useCallback(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
      console.log('💓 Keep-alive stopped');
    }
  }, []);

  // Activate sentinel for streaming (enter INTRUDER mode)
  const activateSentinel = useCallback(async (deviceId: string): Promise<boolean> => {
    console.log(`🟢 Activating sentinel ${deviceId}...`);
    setIsActivating(true);
    
    try {
      const response = await sentinelAPI.activate(deviceId);
      if (response.success) {
        console.log(`✅ Sentinel ${deviceId} activated - Mode: ${response.data?.mode}`);
        activatedSentinelRef.current = deviceId;
        startKeepAlive(deviceId);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Failed to activate sentinel ${deviceId}:`, error);
      return false;
    } finally {
      setIsActivating(false);
    }
  }, [startKeepAlive]);

  // Deactivate sentinel (return to SENTRY mode)
  const deactivateSentinel = useCallback(async (deviceId: string): Promise<void> => {
    console.log(`🔴 Deactivating sentinel ${deviceId}...`);
    setIsDeactivating(true);
    stopKeepAlive();
    
    try {
      await sentinelAPI.deactivate(deviceId);
      console.log(`✅ Sentinel ${deviceId} deactivated`);
    } catch (error) {
      console.error(`❌ Failed to deactivate sentinel ${deviceId}:`, error);
      // Don't throw - just log the error. The Pi will auto-deactivate after timeout anyway.
    } finally {
      setIsDeactivating(false);
      activatedSentinelRef.current = null;
    }
  }, [stopKeepAlive]);

  // Reconnect with exponential backoff
  const attemptReconnect = () => {
    if (!sentinel) return;

    cleanupTimers();
    setIsReconnecting(true);

    // Calculate exponential backoff delay (max 30 seconds)
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
    console.log(`🔄 Attempting reconnect in ${delay}ms (attempt ${retryCount + 1})`);

    retryTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Reconnecting stream...');
      setImageError(false);
      setImageLoaded(false);
      setRetryCount(prev => prev + 1);
      
      // Force URL refresh by appending timestamp
      const url = getStreamUrl(sentinel);
      if (url) {
        const separator = url.includes('?') ? '&' : '?';
        setStreamUrl(`${url}${separator}_t=${Date.now()}`);
      }
      
      setIsReconnecting(false);
    }, delay);
  };

  // Manual reconnect
  const handleManualReconnect = () => {
    console.log('🔄 Manual reconnect triggered');
    setRetryCount(0); // Reset retry count for fresh start
    setImageError(false);
    setImageLoaded(false);
    setIsReconnecting(false);
    
    if (sentinel) {
      const url = getStreamUrl(sentinel);
      if (url) {
        const separator = url.includes('?') ? '&' : '?';
        setStreamUrl(`${url}${separator}_t=${Date.now()}`);
      }
    }
  };

  // Request stream for inactive sentinel
  const handleRequestStream = async () => {
    if (!sentinel) return;
    
    console.log('📹 Manual stream request for inactive sentinel');
    setManualStreamRequested(true);
    setImageError(false);
    setImageLoaded(false);
    setRetryCount(0);
    
    try {
      // Activate the sentinel first (this turns on camera + AI)
      const activated = await activateSentinel(sentinel.deviceId);
      
      if (activated) {
        // Set stream URL after activation
        const url = getStreamUrl(sentinel);
        if (url) {
          const separator = url.includes('?') ? '&' : '?';
          setStreamUrl(`${url}${separator}_t=${Date.now()}`);
        }
      } else {
        console.error('❌ Failed to activate sentinel');
        setManualStreamRequested(false);
      }
    } catch (error) {
      console.error('❌ Failed to request stream:', error);
      setManualStreamRequested(false);
    }
  };

  // Stop manually requested stream
  const handleStopStream = async () => {
    console.log('🛑 Stopping stream');
    
    if (sentinel && activatedSentinelRef.current === sentinel.deviceId) {
      await deactivateSentinel(sentinel.deviceId);
    }
    
    setManualStreamRequested(false);
    setStreamUrl(null);
    setImageError(false);
    setImageLoaded(false);
    cleanupTimers();
    
    // Notify parent that stream is inactive
    if (onStreamStateChange) {
      onStreamStateChange(false);
    }
  };

  // Take snapshot of current stream
  const handleSnapshot = () => {
    if (!imgRef.current || !sentinel) return;
    
    try {
      // Create a canvas to capture the current frame
      const canvas = document.createElement('canvas');
      const img = imgRef.current;
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        
        // Convert to blob and download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${sentinel.deviceId}_snapshot_${new Date().getTime()}.jpg`;
            link.click();
            URL.revokeObjectURL(url);
            console.log('📸 Snapshot saved');
          }
        }, 'image/jpeg', 0.95);
      }
    } catch (error) {
      console.error('❌ Failed to take snapshot:', error);
    }
  };

  // Update stream URL when sentinel changes
  useEffect(() => {
    // Cleanup previous sentinel's resources
    const previousSentinel = activatedSentinelRef.current;
    cleanupTimers();
    setImageError(false);
    setImageLoaded(false);
    setRetryCount(0);
    setIsReconnecting(false);
    setManualStreamRequested(false);
    
    // Notify parent that stream is inactive during transition
    if (onStreamStateChange) {
      onStreamStateChange(false);
    }
    
    // If we had a previous sentinel activated, deactivate it
    if (previousSentinel && (!sentinel || previousSentinel !== sentinel.deviceId)) {
      console.log(`🔄 Sentinel changed, deactivating previous: ${previousSentinel}`);
      deactivateSentinel(previousSentinel);
    }
    
    if (sentinel) {
      // Only auto-start stream if sentinel is active or alert status
      // Inactive sentinels require manual request
      const shouldAutoStream = sentinel.status === 'active' || sentinel.status === 'alert';
      
      if (shouldAutoStream) {
        // Activate the sentinel and start streaming
        (async () => {
          const activated = await activateSentinel(sentinel.deviceId);
          
          if (activated) {
            const url = getStreamUrl(sentinel);
            setStreamUrl(url);

            // Set up periodic refresh every 30 seconds to keep connection alive
            refreshIntervalRef.current = setInterval(() => {
              if (!imageError && (sentinel.status === 'active' || sentinel.status === 'alert')) {
                const refreshUrl = getStreamUrl(sentinel);
                if (refreshUrl) {
                  const separator = refreshUrl.includes('?') ? '&' : '?';
                  setStreamUrl(`${refreshUrl}${separator}_t=${Date.now()}`);
                  console.log('🔄 Periodic stream refresh');
                }
              }
            }, 30000);
          }
        })();
      } else {
        setStreamUrl(null);
      }
    } else {
      setStreamUrl(null);
    }

    return () => {
      cleanupTimers();
    };
  }, [sentinel?.deviceId, sentinel?.status, activateSentinel, deactivateSentinel, cleanupTimers, onStreamStateChange]);

  // Cleanup on unmount - deactivate sentinel
  useEffect(() => {
    return () => {
      cleanupTimers();
      // Deactivate sentinel when component unmounts
      if (activatedSentinelRef.current) {
        console.log(`🔄 Component unmounting, deactivating: ${activatedSentinelRef.current}`);
        sentinelAPI.deactivate(activatedSentinelRef.current).catch(console.error);
      }
    };
  }, [cleanupTimers]);

  // Handle image load error
  const handleImageError = () => {
    console.error(`❌ Stream error for ${sentinel?.deviceId}`);
    setImageError(true);
    setImageLoaded(false);
    
    // Notify parent that stream is inactive
    if (onStreamStateChange) {
      onStreamStateChange(false);
    }
    
    // Don't auto-retry for inactive sentinels unless manually requested
    if (sentinel?.status === 'inactive' && !manualStreamRequested) {
      console.log('Stream ended for inactive sentinel (expected behavior)');
      setStreamUrl(null);
      return;
    }
    
    // Automatically attempt to reconnect (max 10 attempts)
    if (retryCount < 10) {
      attemptReconnect();
    } else {
      console.error('❌ Max reconnection attempts reached');
      setIsReconnecting(false);
    }
  };

  // Handle image load success
  const handleImageLoad = () => {
    console.log(`✅ Stream connected for ${sentinel?.deviceId}`);
    setImageLoaded(true);
    setImageError(false);
    setRetryCount(0); // Reset retry count on successful connection
    setIsReconnecting(false);
    
    // Notify parent that stream is active
    if (onStreamStateChange) {
      onStreamStateChange(true);
    }
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

    // Case 2: Sentinel is inactive (sleeping/low-power mode) and no manual stream requested
    if (sentinel.status === 'inactive' && !streamUrl) {
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
                {sentinel.deviceId} is conserving power. Camera activates on threat detection.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                <span>Standby Mode</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4 gap-2"
                onClick={handleRequestStream}
                disabled={isActivating}
              >
                {isActivating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    Request Live Feed
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Manually activate camera to see current view
              </p>
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
              {isReconnecting ? (
                <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              ) : (
                <WifiOff className="h-8 w-8 text-destructive" />
              )}
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-2">
                {isReconnecting ? 'Reconnecting...' : 'Connection Lost'}
              </h4>
              <p className="text-sm text-muted-foreground max-w-sm">
                {isReconnecting ? (
                  <>Attempting to reconnect to {sentinel.deviceId} (attempt {retryCount + 1}/10)</>
                ) : (
                  <>Unable to connect to video stream from {sentinel.deviceId}</>
                )}
              </p>
              {!streamUrl && (
                <p className="text-xs text-muted-foreground mt-2">
                  No stream URL available
                </p>
              )}
              {retryCount >= 10 && (
                <p className="text-xs text-warning mt-2">
                  Max reconnection attempts reached
                </p>
              )}
              <div className="flex gap-2 mt-4 justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={handleManualReconnect}
                  disabled={isReconnecting}
                >
                  <RefreshCw className={`h-4 w-4 ${isReconnecting ? 'animate-spin' : ''}`} />
                  {isReconnecting ? 'Reconnecting...' : 'Retry Connection'}
                </Button>
                {sentinel.status !== 'inactive' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={handleRequestStream}
                    disabled={isReconnecting}
                  >
                    <Camera className="h-4 w-4" />
                    Request Feed
                  </Button>
                )}
              </div>
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
          ref={imgRef}
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
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1"
            onClick={handleSnapshot}
          >
            Snapshot
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 gap-2"
            onClick={handleStopStream}
            disabled={isDeactivating}
          >
            <Power className="h-4 w-4" />
            {isDeactivating ? 'Stopping...' : 'Stop Feed'}
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
