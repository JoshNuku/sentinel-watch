import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Video, Signal, WifiOff, X, AlertCircle, Moon, Camera, Maximize, RefreshCw, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStreamUrl, sentinelAPI, alertAPI, type Sentinel } from "@/services/api";
import { wsService } from "@/services/websocket";

interface LiveFeedProps {
  sentinel: Sentinel | null;
  onClose?: () => void;
  onStreamStateChange?: (isActive: boolean) => void;
  externalManualRequest?: boolean;
}

// Keep-alive interval (60 seconds as per Pi documentation)
const KEEPALIVE_INTERVAL = 60000;

const LiveFeed = ({ sentinel, onClose, onStreamStateChange, externalManualRequest }: LiveFeedProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [manualStreamRequested, setManualStreamRequested] = useState(false);
  const isManualRequested = externalManualRequest ?? manualStreamRequested;
  const [isActivating, setIsActivating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [showThreatOverlay, setShowThreatOverlay] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activatedSentinelRef = useRef<string | null>(null);
  // track user-stopped sentinel to avoid auto-reactivation
  const userStoppedDeviceRef = useRef<string | null>(null);
  // throttle stream requests
  const lastStreamRequestRef = useRef<number>(0);
  const navigate = useNavigate();

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

    // Throttle: don't request if we already did within 5 seconds
    const now = Date.now();
    if (now - lastStreamRequestRef.current < 5000) {
      console.log('🔄 Skipping duplicate manual stream request (throttled)');
      return;
    }
    lastStreamRequestRef.current = now;

    console.log('📹 Manual stream request for sentinel', sentinel.deviceId);
    setManualStreamRequested(true);
    setImageError(false);
    setImageLoaded(false);
    setRetryCount(0);

    // Clear any user-stop flag since user explicitly requested
    if (userStoppedDeviceRef.current === sentinel.deviceId) userStoppedDeviceRef.current = null;

    try {
      // Ask backend to request the stream from the device (backend will call the Pi)
      const res = await sentinelAPI.requestStream(sentinel.deviceId);

      if (res && res.success && res.data?.streamUrl) {
        // Backend returned a stream URL immediately
        const proxied = res.data.streamUrl.includes('ngrok') ? `${getStreamUrl({ ...sentinel, streamUrl: res.data.streamUrl } as Sentinel)}` : res.data.streamUrl;
        setStreamUrl(proxied);
        activatedSentinelRef.current = sentinel.deviceId;
        startKeepAlive(sentinel.deviceId);
        setManualStreamRequested(false);
        return;
      }

      // Otherwise poll the sentinel record until streamUrl appears (reduce polling)
      const start = Date.now();
      const timeout = 20000; // 20s max (reduced from 30s)
      const pollInterval = 5000; // 5 seconds (increased from 2s)

      while (Date.now() - start < timeout) {
        await new Promise((r) => setTimeout(r, pollInterval));
        try {
          const sresp = await sentinelAPI.getById(sentinel.deviceId);
          if (sresp && sresp.success && sresp.data?.streamUrl) {
            const url = sresp.data.streamUrl as string;
            const proxied = url.includes('ngrok') ? `${getStreamUrl({ ...sentinel, streamUrl: url } as Sentinel)}` : url;
            setStreamUrl(proxied);
            activatedSentinelRef.current = sentinel.deviceId;
            startKeepAlive(sentinel.deviceId);
            setManualStreamRequested(false);
            return;
          }
        } catch (err) {
          console.warn('Polling sentinel for streamUrl failed', err);
        }
      }

      console.error('Timed out waiting for streamUrl from sentinel');
      setManualStreamRequested(false);
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
    // mark that user intentionally stopped this sentinel to avoid auto-restart
    if (sentinel) userStoppedDeviceRef.current = sentinel.deviceId;
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

  // Update stream URL when sentinel changes (but preserve stream on status changes)
  useEffect(() => {
    const previousSentinel = activatedSentinelRef.current;
    const previousDeviceId = previousSentinel;
    const currentDeviceId = sentinel?.deviceId;

    // Only reset if the DEVICE changed, not just the status
    if (previousDeviceId !== currentDeviceId) {
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

      // Clear existing stream URL when device changes
      setStreamUrl(null);
    }
    // If sentinel status changes to 'alert' and stream is not active, we preserve state (don't clear)
    // The socket event handler will auto-start the stream

    return () => {
      cleanupTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinel?.deviceId]); // Only trigger on deviceId change, not status

  // Auto-start stream when threat is detected for this sentinel
  useEffect(() => {
    if (!sentinel) return;

    const unsubscribe = wsService.onNewAlert((data) => {
      // Check if this alert is for the currently selected sentinel
      if (data.sentinel.deviceId === sentinel.deviceId) {
        // Skip if stream is already active (don't interrupt existing stream)
        if (streamUrl && !imageError) {
          console.log('📹 Stream already active, just showing threat overlay');
          setShowThreatOverlay(true);
          return;
        }

        // Throttle: don't request stream if we already did within 5 seconds
        const now = Date.now();
        if (now - lastStreamRequestRef.current < 5000) {
          console.log('🔄 Skipping duplicate stream request (throttled)');
          return;
        }
        lastStreamRequestRef.current = now;

        console.log(`🚨 Auto-starting stream for ${sentinel.deviceId} due to threat detection`);

        // Clear any user-stopped flag since there's immediate threat
        userStoppedDeviceRef.current = null;

        // Auto-request the stream
        setManualStreamRequested(true);
        setImageError(false);
        setImageLoaded(false);
        setRetryCount(0);
        setShowThreatOverlay(true);

        // Request stream from backend
        sentinelAPI.requestStream(sentinel.deviceId).then((res) => {
          if (res && res.success && res.data?.streamUrl) {
            const url = res.data.streamUrl;
            const proxied = url.includes('ngrok')
              ? getStreamUrl({ ...sentinel, streamUrl: url })
              : url;
            if (proxied) {
              setStreamUrl(proxied);
              activatedSentinelRef.current = sentinel.deviceId;
              startKeepAlive(sentinel.deviceId);
            }
          } else if (sentinel.streamUrl) {
            // Use existing streamUrl if backend doesn't return new one
            const proxied = sentinel.streamUrl.includes('ngrok')
              ? getStreamUrl(sentinel)
              : sentinel.streamUrl;
            if (proxied) {
              setStreamUrl(proxied);
              activatedSentinelRef.current = sentinel.deviceId;
              startKeepAlive(sentinel.deviceId);
            }
          }
        }).catch((err) => {
          console.error('Failed to auto-start stream on threat:', err);
        });
      }
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinel?.deviceId]); // Only re-subscribe when deviceId changes

  // Auto-clear threat overlay after 30 seconds
  useEffect(() => {
    if (!showThreatOverlay) return;

    const timer = setTimeout(() => {
      setShowThreatOverlay(false);
    }, 30000); // Clear after 30 seconds

    return () => clearTimeout(timer);
  }, [showThreatOverlay]);

  // Reset threat overlay when sentinel changes
  useEffect(() => {
    setShowThreatOverlay(false);
  }, [sentinel?.deviceId]);

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
    if (sentinel?.status === 'inactive' && !isManualRequested) {
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
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="w-full max-w-lg bg-background/60 border border-border/50 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-muted/10 flex items-center justify-center">
                <Moon className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-lg">{sentinel.deviceId}</h4>
                    <p className="text-sm text-muted-foreground">Device in low-power mode</p>
                  </div>
                  <div className="text-sm">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/10 text-xs text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                      Standby
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">Camera will activate automatically on threat detection. You can request the live feed manually.</p>

                <div className="mt-4 flex items-center gap-3">
                  <Button
                    onClick={handleRequestStream}
                    disabled={isActivating}
                    className="flex items-center gap-2"
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
                  <Button variant="ghost" onClick={() => navigate('/dashboard/settings')}>Help</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Case 3: Stream connection lost — show subtle non-blocking status with actions
    // NOTE: if the user manually requested a stream (`manualStreamRequested`),
    // show the large active stream container (loading state) instead of the small card.
    if (imageError || (!streamUrl && !isManualRequested)) {
      return (
        <div className="flex-1 min-h-0 bg-background rounded-lg relative overflow-hidden border border-destructive/30">
          {/* subtle background to avoid full-screen takeover */}
          <div className="absolute inset-0 bg-background/60" />

          <div className="relative z-10 w-full h-full flex items-center justify-center p-6">
            <div className="w-full max-w-lg bg-background/80 border border-border rounded-xl p-8 flex flex-col items-center gap-6 text-center">
              <div className="flex-shrink-0 w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                {isReconnecting ? (
                  <RefreshCw className="h-10 w-10 text-primary animate-spin" />
                ) : (
                  <WifiOff className="h-10 w-10 text-destructive" />
                )}
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-xl">{isReconnecting ? 'Reconnecting...' : 'Connection Lost'}</div>
                <div className="text-sm text-muted-foreground">{isReconnecting ? `Attempting to reconnect (attempt ${retryCount + 1}/10)` : `Unable to connect to ${sentinel.deviceId}`}</div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="lg" onClick={handleManualReconnect} disabled={isReconnecting}>
                  {isReconnecting ? 'Reconnecting...' : 'Retry'}
                </Button>
                {sentinel.status !== 'inactive' && (
                  <Button size="lg" onClick={handleRequestStream} disabled={isReconnecting}>
                    Request Feed
                  </Button>
                )}
              </div>
              {retryCount >= 10 && (
                <div className="text-sm text-warning">Max reconnection attempts reached</div>
              )}
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
          className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
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

          {/* Scan lines effect (decorative) */}
          <div className="absolute inset-0 opacity-5 pointer-events-none" />
          {/* Threat overlay */}
          {showThreatOverlay && (
            <div className="absolute inset-0 flex items-start justify-center pointer-events-none z-20">
              <div className="mt-6 bg-destructive/80 text-white px-3 py-1 rounded-md font-bold">THREAT DETECTED</div>
            </div>
          )}

          {/* Small info panel */}
          {sentinel && (
            <div className="absolute bottom-3 left-3 z-20 bg-background/80 text-xs p-2 rounded-md border border-border/40">
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Battery: {sentinel.batteryLevel}%</p>
                <p>Status: {sentinel.status}</p>
                <p>
                  Location: {Number(sentinel.location?.lat).toFixed(4)}, {Number(sentinel.location?.lng).toFixed(4)}
                </p>
                <p>Last seen: {sentinel.lastSeen ? new Date(sentinel.lastSeen).toLocaleString() : 'Unknown'}</p>
              </div>
            </div>
          )}

          {/* LIVE indicator - top right */}
          {sentinel && streamUrl && !imageError && (
            <div className="absolute top-3 right-12 z-20 flex items-center gap-2 bg-background/80 px-2 py-1 rounded-md">
              <Signal className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-xs text-primary font-medium">LIVE</span>
            </div>
          )}
        </div>

        {/* Close button - pointer events enabled */}
        {sentinel && onClose && (
          <div className="absolute top-3 right-3 z-30">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 bg-background/50 hover:bg-background/80"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

    );
  };

  return (
    <div className="flex flex-col h-full">
      {renderContent()}

      {/* Action Buttons */}
      {sentinel && (streamUrl || isManualRequested) && !imageError && (
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
