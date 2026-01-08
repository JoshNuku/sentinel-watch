# 🚀 Project ORION Backend - Complete Setup & Deployment Guide

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Folder Structure](#folder-structure)
3. [API Endpoints](#api-endpoints)
4. [Installation & Setup](#installation--setup)
5. [Running the Server](#running-the-server)
6. [Testing](#testing)
7. [WebSocket Integration](#websocket-integration)
8. [Production Deployment](#production-deployment)
9. [Raspberry Pi Integration](#raspberry-pi-integration)

---

## 📖 Project Overview

**Project ORION** is an AIoT (Artificial Intelligence + Internet of Things) anti-illegal mining surveillance system. The backend serves as the **Command & Control Registry** that:

✅ Receives alerts from Raspberry Pi Sentinel devices  
✅ Stores data in MongoDB  
✅ Pushes real-time updates via WebSocket to dashboards  
✅ Sends SMS notifications via Huawei Cloud SMN

### Architecture Flow

```
┌─────────────────┐      4G/WiFi      ┌─────────────────┐
│   Raspberry Pi  │ ───────────────▶  │  Backend API    │
│   (Sentinel)    │    JSON/HTTP      │  (Express.js)   │
│   + MindSpore   │                   │  + Socket.io    │
└─────────────────┘                   └────────┬────────┘
                                               │
                    ┌──────────────────────────┼────────────────────────┐
                    │                          │                        │
                    ▼                          ▼                        ▼
            ┌──────────────┐          ┌──────────────┐        ┌──────────────┐
            │   MongoDB    │          │  Dashboard   │        │ Huawei SMN   │
            │   Database   │          │  (WebSocket) │        │     SMS      │
            └──────────────┘          └──────────────┘        └──────────────┘
```

---

## 📁 Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts           # MongoDB connection with retry logic
│   ├── models/
│   │   ├── Sentinel.ts           # Device schema (ORN-001, ORN-002, etc.)
│   │   ├── Alert.ts              # Threat detection event schema
│   │   └── index.ts              # Model exports
│   ├── controllers/
│   │   ├── sentinelController.ts # Sentinel registration & management
│   │   ├── alertController.ts    # Alert creation & retrieval
│   │   └── index.ts              # Controller exports
│   ├── routes/
│   │   ├── sentinelRoutes.ts     # Sentinel API routes
│   │   ├── alertRoutes.ts        # Alert API routes
│   │   └── index.ts              # Route aggregation
│   ├── services/
│   │   ├── huaweiSMN.ts          # SMS notification service (Mock + Real)
│   │   └── index.ts              # Service exports
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   └── server.ts                 # Main entry point
├── examples/
│   └── raspberry_pi_client.py    # Python client for Raspberry Pi
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript configuration
├── .env                           # Environment variables (DO NOT COMMIT)
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
├── .eslintrc.js                   # Code linting rules
├── test-api.js                    # API test suite
├── README.md                      # Main documentation
├── QUICKSTART.md                  # Quick start guide
└── Project_ORION_API.postman_collection.json  # Postman collection
```

---

## 📡 API Endpoints

### **Sentinels**

| Method  | Endpoint                          | Description            | Request Body                                      |
| ------- | --------------------------------- | ---------------------- | ------------------------------------------------- |
| `POST`  | `/api/sentinels/register`         | Register/update device | `{ deviceId, location, batteryLevel, ipAddress }` |
| `GET`   | `/api/sentinels`                  | Get all sentinels      | -                                                 |
| `GET`   | `/api/sentinels/:deviceId`        | Get specific sentinel  | -                                                 |
| `PATCH` | `/api/sentinels/:deviceId/status` | Update status          | `{ status: "active\|inactive\|alert" }`           |

### **Alerts**

| Method  | Endpoint                 | Description            | Request Body                                       |
| ------- | ------------------------ | ---------------------- | -------------------------------------------------- |
| `POST`  | `/api/alerts`            | Create alert           | `{ sentinelId, threatType, confidence, location }` |
| `GET`   | `/api/alerts`            | Get alerts (paginated) | Query: `?limit=10&page=1`                          |
| `GET`   | `/api/alerts/stats`      | Get statistics         | -                                                  |
| `GET`   | `/api/alerts/:id`        | Get specific alert     | -                                                  |
| `PATCH` | `/api/alerts/:id/verify` | Verify alert           | `{ isVerified: true }`                             |

### **Health**

| Method | Endpoint      | Description         |
| ------ | ------------- | ------------------- |
| `GET`  | `/api/health` | Server health check |
| `GET`  | `/`           | API information     |

---

## 🛠️ Installation & Setup

### **Prerequisites**

- Node.js 18+ ([Download](https://nodejs.org/))
- MongoDB 5+ ([Download](https://www.mongodb.com/try/download/community))
- Git

### **Step 1: Install Dependencies**

```bash
cd backend
npm install
```

This installs:

- Express.js (API framework)
- Mongoose (MongoDB ODM)
- Socket.io (Real-time WebSocket)
- TypeScript (Type safety)
- And more...

### **Step 2: Configure Environment**

The `.env` file is already created with sensible defaults:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/project-orion
FRONTEND_URL=http://localhost:3000
```

**For MongoDB Atlas (cloud database):**

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/project-orion
```

**For Huawei SMS (when credentials available):**

```env
HUAWEI_SMN_REGION=cn-north-1
HUAWEI_SMN_ACCESS_KEY=your_key_here
HUAWEI_SMN_SECRET_KEY=your_secret_here
HUAWEI_SMN_TOPIC_URN=urn:smn:cn-north-1:xxxx:orion-alerts
HUAWEI_SMN_PHONE_NUMBERS=+86xxxxxxxxxx,+86yyyyyyyyyy
```

### **Step 3: Start MongoDB**

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

**Verify it's running:**

```bash
mongosh
# Should connect successfully
```

---

## 🚀 Running the Server

### **Development Mode** (with hot-reload)

```bash
npm run dev
```

Output:

```
🚀 PROJECT ORION - BACKEND SERVER STARTED
📡 Server running on: http://localhost:5000
🔌 WebSocket: Enabled (0 connections)
🗄️  Database: Connected
📱 SMS Service: MOCK mode
```

### **Production Build**

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

---

## 🧪 Testing

### **Automated Test Suite**

```bash
npm test
```

This runs `test-api.js` which tests:

- ✅ Health check
- ✅ Sentinel registration
- ✅ Alert creation
- ✅ Data retrieval
- ✅ WebSocket connection

### **Manual Testing with cURL**

**1. Register a sentinel:**

```bash
curl -X POST http://localhost:5000/api/sentinels/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"ORN-001","location":{"lat":1.3521,"lng":103.8198},"batteryLevel":95}'
```

**2. Create an alert:**

```bash
curl -X POST http://localhost:5000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{"sentinelId":"ORN-001","threatType":"Excavator","confidence":0.95,"location":{"lat":1.3521,"lng":103.8198}}'
```

**3. Get all alerts:**

```bash
curl http://localhost:5000/api/alerts
```

### **Testing with Postman**

Import `Project_ORION_API.postman_collection.json` into Postman for a complete test suite.

---

## 🔌 WebSocket Integration

### **Frontend Connection (React/Next.js)**

```javascript
import io from "socket.io-client";

const socket = io("http://localhost:5000");

// Connection established
socket.on("connected", (data) => {
  console.log("Connected to ORION:", data);
});

// New alert received
socket.on("new-alert", (data) => {
  console.log("🚨 Alert:", data.alert);
  console.log("📍 Sentinel:", data.sentinel);
  // Update UI with new alert
});

// Alert verified
socket.on("alert-verified", (data) => {
  console.log("✅ Alert verified:", data.alertId);
  // Update alert status in UI
});
```

### **WebSocket Events**

| Event                     | Direction       | Data                               | Description                   |
| ------------------------- | --------------- | ---------------------------------- | ----------------------------- |
| `connected`               | Server → Client | `{ message, socketId, timestamp }` | Connection confirmation       |
| `new-alert`               | Server → Client | `{ alert, sentinel }`              | Broadcast when alert created  |
| `alert-verified`          | Server → Client | `{ alertId, isVerified }`          | Broadcast when alert verified |
| `request-sentinel-status` | Client → Server | -                                  | Request current sentinel data |

---

## 🌐 Production Deployment

### **Option 1: Traditional VPS (DigitalOcean, AWS EC2, etc.)**

1. **Install Node.js & MongoDB on server**
2. **Clone repository**
3. **Install dependencies:**

   ```bash
   npm install --production
   ```

4. **Build project:**

   ```bash
   npm run build
   ```

5. **Set up PM2 (Process Manager):**

   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name orion-backend
   pm2 save
   pm2 startup
   ```

6. **Configure Nginx as reverse proxy:**

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. **Set up SSL with Let's Encrypt:**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

### **Option 2: Docker Deployment**

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

Create `docker-compose.yml`:

```yaml
version: "3.8"
services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/project-orion
    depends_on:
      - mongo

  mongo:
    image: mongo:latest
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

Deploy:

```bash
docker-compose up -d
```

### **Option 3: Cloud Platform (Heroku, Railway, Render)**

These platforms auto-detect Node.js and deploy with minimal configuration.

**Environment Variables to Set:**

- `NODE_ENV=production`
- `MONGODB_URI=<your-mongodb-atlas-uri>`
- `FRONTEND_URL=<your-frontend-url>`

---

## 🔧 Raspberry Pi Integration

### **Setup on Raspberry Pi**

1. **Install Python dependencies:**

   ```bash
   pip3 install requests
   ```

2. **Copy client script:**

   ```bash
   scp backend/examples/raspberry_pi_client.py pi@your-pi-ip:/home/pi/
   ```

3. **Configure backend URL:**
   Edit `raspberry_pi_client.py`:

   ```python
   BACKEND_URL = "http://your-server-ip:5000"
   DEVICE_ID = "ORN-001"  # Unique for each device
   ```

4. **Run client:**
   ```bash
   python3 raspberry_pi_client.py
   ```

### **Integration with MindSpore AI**

In your MindSpore detection script:

```python
from raspberry_pi_client import SentinelClient

# Initialize
sentinel = SentinelClient("ORN-001", {"lat": 1.3521, "lng": 103.8198})
sentinel.register_device()

# When threat detected
if threat_detected:
    sentinel.send_alert(
        threat_type="Excavator",  # or "Water Pump", "Dredge", "Person"
        confidence=0.95,
        threat_location={"lat": 1.3521, "lng": 103.8198}
    )
```

---

## 📊 Monitoring & Logs

The server logs important events:

- ✅ **Sentinel registrations**: `New Sentinel registered: ORN-001`
- 🚨 **New alerts**: `NEW ALERT: Excavator detected by ORN-001`
- 📡 **WebSocket**: `Dashboard connected: abc123`
- 📱 **SMS**: `Sending SMS to Rangers: Threat Detected...`
- ❌ **Errors**: Full error messages with stack traces

---

## 🔐 Security Best Practices

1. **Never commit `.env` file** - Contains sensitive credentials
2. **Use HTTPS in production** - Set up SSL/TLS certificates
3. **Rate limiting is enabled** - 100 requests per 15 minutes
4. **Input validation** - Mongoose schemas validate all data
5. **CORS configured** - Only allowed origins can connect
6. **Helmet.js active** - Security headers protection

---

## 🐛 Troubleshooting

### **Port 5000 already in use**

```bash
# Find and kill process
lsof -ti:5000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :5000   # Windows
```

### **MongoDB connection refused**

```bash
# Check if MongoDB is running
mongosh

# If not, start it
sudo systemctl start mongod
```

### **CORS errors from frontend**

Update `FRONTEND_URL` in `.env` to match your frontend URL.

---

## 📞 Support

For issues or questions:

- Check the logs for error messages
- Refer to [QUICKSTART.md](./QUICKSTART.md) for common setup issues
- Review [README.md](./README.md) for API documentation

---

## 📝 License

MIT License - Project ORION Team

---

**Built with ❤️ to protect natural resources through AIoT surveillance** 🌍🛡️
