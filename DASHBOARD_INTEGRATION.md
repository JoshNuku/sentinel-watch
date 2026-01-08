# Dashboard Integration Guide

## Overview

The dashboard has been updated to integrate with the backend API and support real-time video streaming from Sentinel devices.

## Files Updated

### 1. **src/services/api.ts** (NEW)

Complete API service for backend communication:

- `sentinelAPI.getAll()` - Fetch all sentinels
- `sentinelAPI.getById(deviceId)` - Get specific sentinel
- `sentinelAPI.updateStatus(deviceId, status)` - Update sentinel status
- `alertAPI.getAll(params)` - Fetch alerts with pagination
- `alertAPI.getStats()` - Get alert statistics
- `alertAPI.verify(id, isVerified)` - Verify/unverify alert
- `getStreamUrl(sentinel)` - Build video stream URL

### 2. **src/services/websocket.ts** (NEW)

Real-time WebSocket service for live updates:

- Auto-reconnection with exponential backoff
- `wsService.connect()` - Connect to backend WebSocket
- `wsService.onNewAlert(callback)` - Subscribe to new alerts
- `wsService.onAlertVerified(callback)` - Subscribe to alert verifications
- Connection status monitoring

### 3. **src/pages/Dashboard.tsx** (UPDATED)

Main dashboard with live data:

- Fetches sentinels from backend API
- Real-time alert notifications via WebSocket
- Selected sentinel state management
- Auto-refresh every 30 seconds
- Error handling and offline mode
- Toast notifications for new alerts

### 4. **src/components/dashboard/LiveFeed.tsx** (UPDATED)

Video streaming component with intelligent states:

- **No Sentinel Selected**: Shows placeholder
- **Inactive Sentinel**: Shows "Low-Power Mode" message
- **Active/Alert Sentinel**: Displays live video stream via direct <img> tag
- **Connection Error**: Shows "Connection Lost" with retry option
- Direct stream URL connection (no proxying)
- Error handling and loading states

### 5. **src/components/dashboard/MapComponent.tsx** (UPDATED)

Interactive map with sentinel markers:

- Accepts sentinels array as prop
- Click markers to select sentinel
- Updates markers when data changes
- Visual indication of selected sentinel
- "View Live Feed" button in popup
- Real-time marker updates

### 6. **.env** and **.env.example** (NEW)

Environment configuration:

```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=http://localhost:5000
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install socket.io-client
```

Or run:

```bash
npm install
```

### 2. Start Backend Server

```bash
cd backend
npm run dev
```

Backend should be running on `http://localhost:5000`

### 3. Start Frontend

```bash
npm run dev
```

Frontend runs on `http://localhost:5173` (or `http://localhost:3000`)

## How It Works

### Data Flow

```
┌─────────────────┐
│  Backend API    │
│  (Port 5000)    │
└────────┬────────┘
         │
         │ HTTP REST API
         │ WebSocket (Socket.io)
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│   Dashboard     │◄─────┤   WebSocket  │
│   Component     │      │   Service    │
└────────┬────────┘      └──────────────┘
         │
         │ Props
         │
    ┌────┴─────┬──────────┬─────────┐
    ▼          ▼          ▼         ▼
┌────────┐ ┌──────┐ ┌─────────┐ ┌───────┐
│  Map   │ │Stats │ │LiveFeed │ │Alerts │
└────────┘ └──────┘ └─────────┘ └───────┘
```

### Video Streaming

The video stream works via **direct connection**:

1. Sentinel device has `ipAddress` (e.g., "192.168.1.100")
2. Backend stores this in the database
3. Frontend fetches sentinel data including IP
4. `getStreamUrl()` constructs: `http://192.168.1.100:8080/stream`
5. LiveFeed component renders: `<img src="http://192.168.1.100:8080/stream" />`
6. Browser connects directly to Raspberry Pi's video stream

**Important**: The stream URL must be accessible from the browser. For local networks, this works fine. For remote access, you'll need port forwarding or VPN.

### Sentinel States

The LiveFeed component handles these states:

| Status     | Display                   | Description                          |
| ---------- | ------------------------- | ------------------------------------ |
| `null`     | Placeholder               | No sentinel selected                 |
| `inactive` | Low-Power Mode            | Device sleeping, waiting for trigger |
| `active`   | Live Video                | Shows video stream                   |
| `alert`    | Live Video + Alert Banner | Shows video with threat indicator    |

### Real-Time Updates

WebSocket events:

1. **new-alert**: Triggered when Raspberry Pi detects threat

   - Updates dashboard statistics
   - Shows toast notification
   - Auto-selects the alerting sentinel
   - Refreshes sentinel data

2. **alert-verified**: Triggered when operator verifies alert
   - Updates alert status
   - Shows toast notification

## Testing

### 1. Test API Connection

Open browser console and check for:

```
✅ WebSocket connected: abc123
📡 Server confirmation: {...}
```

### 2. Register Test Sentinel

```bash
curl -X POST http://localhost:5000/api/sentinels/register \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "ORN-001",
    "location": {"lat": 5.6037, "lng": -0.1870},
    "batteryLevel": 95,
    "ipAddress": "192.168.1.100",
    "status": "active"
  }'
```

### 3. Create Test Alert

```bash
curl -X POST http://localhost:5000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "sentinelId": "ORN-001",
    "threatType": "Excavator",
    "confidence": 0.95,
    "location": {"lat": 5.6037, "lng": -0.1870}
  }'
```

You should see:

- Toast notification in dashboard
- Sentinel marker turns orange/alert color
- Stats update
- LiveFeed shows video stream

## Customization

### Change Video Stream Port

Edit `src/services/api.ts`:

```typescript
export const getStreamUrl = (sentinel: Sentinel): string | null => {
  if (sentinel.ipAddress) {
    return `http://${sentinel.ipAddress}:8080/stream`; // Change 8080 to your port
  }
  return null;
};
```

### Change Refresh Interval

Edit `src/pages/Dashboard.tsx`:

```typescript
// Change 30000 (30 seconds) to desired interval
const intervalId = setInterval(() => {
  fetchSentinels();
  fetchAlertStats();
}, 30000);
```

### Add Custom Stream URL

If your Raspberry Pi has a custom stream URL, add `streamUrl` to the sentinel registration:

```json
{
  "deviceId": "ORN-001",
  "streamUrl": "http://custom-url.com/stream/device-001"
}
```

The frontend will use this instead of constructing from IP address.

## Troubleshooting

### "Failed to connect to backend"

1. Check backend is running: `http://localhost:5000/api/health`
2. Check CORS settings in backend `.env`:
   ```
   FRONTEND_URL=http://localhost:5173
   ```
3. Check browser console for errors

### "Connection Lost" in Live Feed

1. Verify sentinel has `ipAddress` in database
2. Check Raspberry Pi is accessible from browser
3. Verify video stream is running on Raspberry Pi
4. Check firewall/network settings

### WebSocket Not Connecting

1. Check backend WebSocket is enabled
2. Verify `VITE_WS_URL` in `.env`
3. Check browser console for connection errors
4. Try disabling VPN/proxy

### No Sentinels Showing on Map

1. Register at least one sentinel via API
2. Check backend database has sentinels
3. Verify API endpoint: `http://localhost:5000/api/sentinels`
4. Check browser console for fetch errors

## Production Deployment

### Update Environment Variables

```env
# .env.production
VITE_API_URL=https://your-domain.com/api
VITE_WS_URL=https://your-domain.com
```

### Build for Production

```bash
npm run build
```

### Serve Static Files

```bash
npm run preview
```

Or deploy to:

- Vercel
- Netlify
- GitHub Pages
- Your own server with Nginx

## Backend Integration Requirements

The backend must provide:

1. **GET /api/sentinels** - Return sentinel array:

   ```json
   {
     "success": true,
     "data": [
       {
         "_id": "...",
         "deviceId": "ORN-001",
         "status": "active",
         "location": { "lat": 5.6, "lng": -0.19 },
         "batteryLevel": 95,
         "ipAddress": "192.168.1.100",
         "lastSeen": "2024-01-07T10:00:00Z"
       }
     ]
   }
   ```

2. **GET /api/alerts/stats** - Return statistics:

   ```json
   {
     "success": true,
     "data": {
       "total": 10,
       "last24Hours": 3
     }
   }
   ```

3. **WebSocket Events**:
   - `new-alert` - Emitted when alert created
   - `alert-verified` - Emitted when alert verified

## Next Steps

1. ✅ Frontend dashboard integrated with backend
2. ✅ Real-time WebSocket updates working
3. ✅ Video streaming ready (requires Raspberry Pi setup)
4. 🔄 Set up Raspberry Pi video streaming
5. 🔄 Configure network for remote access
6. 🔄 Deploy to production

---

**Dashboard is now fully integrated and ready for live operations! 🚀**
