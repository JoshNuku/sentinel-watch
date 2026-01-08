# Quick Start Guide for Project ORION Backend

This guide will help you get the backend up and running in minutes.

## Prerequisites Check

Before starting, ensure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] MongoDB installed and running (`mongosh`)
- [ ] Terminal/Command Prompt open

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

This will install all required packages (Express, MongoDB, Socket.io, etc.)

### 2. Start MongoDB

**Windows:**

```bash
net start MongoDB
```

**macOS/Linux:**

```bash
sudo systemctl start mongod
# or
brew services start mongodb-community
```

**Or use MongoDB Atlas (cloud):**
Update `.env` with your Atlas connection string:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/project-orion
```

### 3. Environment Setup

The `.env` file is already created with default values. No changes needed for local development.

### 4. Start the Server

```bash
npm run dev
```

You should see:

```
🚀 PROJECT ORION - BACKEND SERVER STARTED
📡 Server running on: http://localhost:5000
✅ System ready to receive alerts from Sentinels
```

## Testing the API

### Method 1: Using cURL (Command Line)

**Test 1: Check if server is running**

```bash
curl http://localhost:5000/api/health
```

**Test 2: Register a sentinel device**

```bash
curl -X POST http://localhost:5000/api/sentinels/register \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"ORN-001\",\"location\":{\"lat\":1.3521,\"lng\":103.8198},\"batteryLevel\":95}"
```

**Test 3: Create an alert**

```bash
curl -X POST http://localhost:5000/api/alerts \
  -H "Content-Type: application/json" \
  -d "{\"sentinelId\":\"ORN-001\",\"threatType\":\"Excavator\",\"confidence\":0.95,\"location\":{\"lat\":1.3521,\"lng\":103.8198}}"
```

**Test 4: Get all alerts**

```bash
curl http://localhost:5000/api/alerts
```

### Method 2: Using Browser

Open your browser and visit:

- http://localhost:5000 - API information
- http://localhost:5000/api/health - Health check
- http://localhost:5000/api/sentinels - View all sentinels
- http://localhost:5000/api/alerts - View all alerts

### Method 3: Using Postman

1. Import `Project_ORION_API.postman_collection.json`
2. Run the requests in order:
   - Health Check
   - Register Sentinel
   - Create Alert
   - Get All Alerts

## Testing WebSocket Connection

Create a simple HTML file to test Socket.io:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>ORION WebSocket Test</title>
    <script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
  </head>
  <body>
    <h1>Project ORION - WebSocket Test</h1>
    <div id="status">Connecting...</div>
    <div id="messages"></div>

    <script>
      const socket = io("http://localhost:5000");

      socket.on("connected", (data) => {
        document.getElementById("status").innerHTML =
          '<span style="color: green">✅ Connected to ORION</span>';
        console.log("Connected:", data);
      });

      socket.on("new-alert", (data) => {
        const msg = document.createElement("div");
        msg.innerHTML = `🚨 New Alert: ${data.alert.threatType} from ${data.alert.sentinelId}`;
        msg.style.padding = "10px";
        msg.style.background = "#fee";
        msg.style.margin = "10px 0";
        document.getElementById("messages").appendChild(msg);
      });
    </script>
  </body>
</html>
```

Save as `websocket-test.html` and open in browser while server is running.

## Verify Everything Works

Run this complete test:

```bash
# 1. Health check
curl http://localhost:5000/api/health

# 2. Register Sentinel ORN-001
curl -X POST http://localhost:5000/api/sentinels/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"ORN-001","location":{"lat":1.3521,"lng":103.8198},"batteryLevel":95}'

# 3. Register Sentinel ORN-002
curl -X POST http://localhost:5000/api/sentinels/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"ORN-002","location":{"lat":1.3625,"lng":103.8295},"batteryLevel":88}'

# 4. Create alert from ORN-001
curl -X POST http://localhost:5000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{"sentinelId":"ORN-001","threatType":"Excavator","confidence":0.95,"location":{"lat":1.3521,"lng":103.8198}}'

# 5. Create alert from ORN-002
curl -X POST http://localhost:5000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{"sentinelId":"ORN-002","threatType":"Dredge","confidence":0.87,"location":{"lat":1.3625,"lng":103.8295}}'

# 6. Get all sentinels
curl http://localhost:5000/api/sentinels

# 7. Get all alerts
curl http://localhost:5000/api/alerts

# 8. Get alert statistics
curl http://localhost:5000/api/alerts/stats
```

## Expected Output

After running the tests, you should see in the server console:

```
✅ New Sentinel registered: ORN-001
✅ New Sentinel registered: ORN-002
🚨 NEW ALERT: Excavator detected by ORN-001 (95% confidence)
📡 Alert broadcasted to connected dashboards via WebSocket
📱 ================== MOCK SMS ALERT ==================
🚨 NEW ALERT: Dredge detected by ORN-002 (87% confidence)
```

## Common Issues

### Port 5000 already in use

```bash
# Change PORT in .env file
PORT=5001
```

### MongoDB connection error

```bash
# Check if MongoDB is running
mongosh

# If not running, start it
sudo systemctl start mongod  # Linux
net start MongoDB            # Windows
```

### Cannot connect to localhost from frontend

Make sure CORS is configured in `.env`:

```env
FRONTEND_URL=http://localhost:3000
```

## Next Steps

1. ✅ Backend is running
2. 🔌 WebSocket is working
3. 📡 API endpoints are responding
4. 📱 SMS service is in MOCK mode (ready for Huawei credentials)

Now you can:

- Connect your frontend dashboard
- Integrate with Raspberry Pi sentinels
- Configure Huawei SMS service with real credentials

## Production Deployment

For production:

1. Build the project:

   ```bash
   npm run build
   ```

2. Set environment to production:

   ```env
   NODE_ENV=production
   ```

3. Use a process manager like PM2:

   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name orion-backend
   ```

4. Configure reverse proxy (Nginx/Apache)

5. Set up SSL/TLS certificates

---

**Ready to protect natural resources! 🌍🛡️**
