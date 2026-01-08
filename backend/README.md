# Project ORION - Backend API

Production-ready Backend API for the AIoT Anti-Illegal Mining Surveillance System.

## 🏗️ Architecture

This backend acts as the **Command & Control Registry** for Project ORION. It receives lightweight JSON alerts from Raspberry Pi devices (Sentinels) over 4G, persists them to MongoDB, and immediately pushes real-time updates to the frontend dashboard via WebSockets. Additionally, it triggers SMS alerts via Huawei Cloud SMN.

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Real-Time**: Socket.io
- **Language**: TypeScript
- **SMS Service**: Huawei Cloud Simple Message Notification (SMN)

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Database connection
│   │   └── database.ts
│   ├── models/           # Mongoose schemas
│   │   ├── Sentinel.ts
│   │   ├── Alert.ts
│   │   └── index.ts
│   ├── controllers/      # Business logic
│   │   ├── sentinelController.ts
│   │   ├── alertController.ts
│   │   └── index.ts
│   ├── routes/           # API routes
│   │   ├── sentinelRoutes.ts
│   │   ├── alertRoutes.ts
│   │   └── index.ts
│   ├── services/         # External integrations
│   │   ├── huaweiSMN.ts
│   │   └── index.ts
│   ├── types/            # TypeScript types
│   │   └── index.ts
│   └── server.ts         # Entry point
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **MongoDB** 5.x or higher (local or MongoDB Atlas)
- **npm** or **yarn** or **bun**

### Installation

1. **Clone and navigate to backend directory**:

   ```bash
   cd backend
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:

   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file** with your configuration:

   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/project-orion
   FRONTEND_URL=http://localhost:3000
   ```

5. **Start MongoDB** (if running locally):

   ```bash
   # Windows
   net start MongoDB

   # macOS/Linux
   sudo systemctl start mongod
   ```

6. **Run the development server**:
   ```bash
   npm run dev
   ```

The server will start at `http://localhost:5000` 🎉

### Production Build

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

## 📡 API Endpoints

### Sentinels

| Method  | Endpoint                          | Description                        |
| ------- | --------------------------------- | ---------------------------------- |
| `POST`  | `/api/sentinels/register`         | Register or update sentinel device |
| `GET`   | `/api/sentinels`                  | Get all sentinels                  |
| `GET`   | `/api/sentinels/:deviceId`        | Get specific sentinel              |
| `PATCH` | `/api/sentinels/:deviceId/status` | Update sentinel status             |

### Alerts

| Method  | Endpoint                 | Description                          |
| ------- | ------------------------ | ------------------------------------ |
| `POST`  | `/api/alerts`            | Create new alert (from Raspberry Pi) |
| `GET`   | `/api/alerts`            | Get all alerts (with pagination)     |
| `GET`   | `/api/alerts/stats`      | Get alert statistics                 |
| `GET`   | `/api/alerts/:id`        | Get specific alert                   |
| `PATCH` | `/api/alerts/:id/verify` | Verify/unverify alert                |

### Health Check

| Method | Endpoint      | Description          |
| ------ | ------------- | -------------------- |
| `GET`  | `/api/health` | Server health status |
| `GET`  | `/`           | API information      |

## 📨 Data Models

### Sentinel Device

```typescript
{
  deviceId: string;        // Format: "ORN-001"
  status: "active" | "inactive" | "alert";
  location: {
    lat: number;
    lng: number;
  };
  batteryLevel: number;    // 0-100
  lastSeen: Date;
  ipAddress?: string;      // For direct video tunnel
}
```

### Alert Event

```typescript
{
  sentinelId: string; // Reference to Sentinel
  threatType: "Excavator" | "Water Pump" | "Dredge" | "Person";
  confidence: number; // 0-1 (e.g., 0.95 = 95%)
  location: {
    lat: number;
    lng: number;
  }
  timestamp: Date;
  isVerified: boolean;
}
```

## 🔌 WebSocket Events

The server uses Socket.io for real-time communication with the dashboard.

### Events Emitted by Server:

- `connected` - Sent when a client connects
- `new-alert` - Broadcast when a new alert is created
- `alert-verified` - Broadcast when an alert is verified

### Events Listened by Server:

- `request-sentinel-status` - Dashboard requests current sentinel status

### Client Connection Example:

```javascript
import io from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket", "polling"],
});

socket.on("connected", (data) => {
  console.log("Connected:", data);
});

socket.on("new-alert", (data) => {
  console.log("New Alert:", data.alert);
  console.log("Sentinel:", data.sentinel);
});
```

## 🔐 Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Prevents API abuse (100 requests per 15 minutes)
- **Input Validation**: Mongoose schema validation
- **Environment Variables**: Sensitive data protection

## 📱 SMS Integration (Huawei Cloud SMN)

The system includes a **mock SMS service** for development. When Huawei Cloud credentials are available:

1. Install the SDK:

   ```bash
   npm install @huaweicloud/huaweicloud-sdk-smn
   ```

2. Update `.env`:

   ```env
   HUAWEI_SMN_REGION=cn-north-1
   HUAWEI_SMN_ACCESS_KEY=your_access_key
   HUAWEI_SMN_SECRET_KEY=your_secret_key
   HUAWEI_SMN_TOPIC_URN=urn:smn:cn-north-1:xxxx:orion-alerts
   HUAWEI_SMN_PHONE_NUMBERS=+86xxxxxxxxxx,+86yyyyyyyyyy
   ```

3. Uncomment the real implementation in `src/services/huaweiSMN.ts`

## 🧪 Testing API with cURL

### Register a Sentinel:

```bash
curl -X POST http://localhost:5000/api/sentinels/register \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "ORN-001",
    "location": {"lat": 1.3521, "lng": 103.8198},
    "batteryLevel": 95,
    "ipAddress": "192.168.1.100"
  }'
```

### Create an Alert:

```bash
curl -X POST http://localhost:5000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "sentinelId": "ORN-001",
    "threatType": "Excavator",
    "confidence": 0.95,
    "location": {"lat": 1.3521, "lng": 103.8198}
  }'
```

### Get All Alerts:

```bash
curl http://localhost:5000/api/alerts
```

## 🐛 Troubleshooting

### MongoDB Connection Issues:

```bash
# Check if MongoDB is running
mongosh

# If connection refused, start MongoDB service
sudo systemctl start mongod  # Linux
net start MongoDB            # Windows
```

### Port Already in Use:

```bash
# Kill process using port 5000
# Linux/macOS
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

## 📊 Monitoring

The server logs key events:

- ✅ Sentinel registrations
- 🚨 New alerts
- 📡 WebSocket connections
- 📱 SMS notifications
- ❌ Errors

## 🔄 Development Scripts

```bash
# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Fix lint issues
npm run lint:fix
```

## 🌐 Environment Variables

| Variable       | Description               | Default                                   |
| -------------- | ------------------------- | ----------------------------------------- |
| `PORT`         | Server port               | `5000`                                    |
| `NODE_ENV`     | Environment mode          | `development`                             |
| `MONGODB_URI`  | MongoDB connection string | `mongodb://localhost:27017/project-orion` |
| `FRONTEND_URL` | Frontend URL for CORS     | `http://localhost:3000`                   |
| `HUAWEI_SMN_*` | Huawei Cloud SMS config   | (Optional)                                |

## 📝 License

MIT License - Project ORION Team

## 🤝 Support

For issues or questions, contact the Project ORION development team.

---

**Built with ❤️ for protecting natural resources through AIoT surveillance**
