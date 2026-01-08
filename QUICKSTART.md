# 🚀 Project ORION - Quick Start Guide

## Complete System Setup in 5 Minutes

### Prerequisites

- Node.js 18+ installed
- MongoDB running locally or connection string ready
- Git installed

### Step 1: Install Dependencies (2 minutes)

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ..
npm install
```

### Step 2: Configure Environment (30 seconds)

Backend `.env` file is already configured with:

- MongoDB: `mongodb://localhost:27017/project-orion`
- Port: `5000`
- JWT Secret: (change in production!)

Frontend `.env` file is already configured with:

- API URL: `http://localhost:5000/api`
- WebSocket URL: `http://localhost:5000`

### Step 3: Start MongoDB (if local)

```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

### Step 4: Create Demo User (10 seconds)

```bash
cd backend
npm run seed
```

Output:

```
✅ Demo user created successfully:
   Email: admin@orion.gh
   Password: password
   Role: admin
```

### Step 5: Start Backend (30 seconds)

```bash
# In backend folder
npm run dev
```

You should see:

```
✅ MongoDB connected
🚀 Server running on port 5000
🔌 Socket.IO initialized
```

### Step 6: Start Frontend (30 seconds)

```bash
# In root folder
npm run dev
```

You should see:

```
  VITE v7.3.0  ready in XXX ms

  ➜  Local:   http://localhost:5173/
```

### Step 7: Login & Test (1 minute)

1. Open browser: `http://localhost:5173`
2. Click "Get Started" or navigate to `/login`
3. Login with:
   - **Email**: `admin@orion.gh`
   - **Password**: `password`
4. You're in! 🎉

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                     │
│                  http://localhost:5173                  │
│  - Landing Page                                         │
│  - Login/Register                                       │
│  - Dashboard (Protected)                                │
│  - Live Map (Protected)                                 │
│  - Alerts (Protected)                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP + WebSocket
                     │
┌────────────────────▼────────────────────────────────────┐
│              BACKEND (Node.js/Express)                  │
│                http://localhost:5000                    │
│  - JWT Authentication                                   │
│  - RESTful API                                          │
│  - Socket.IO (Real-time)                                │
│  - Rate Limiting                                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Mongoose ODM
                     │
┌────────────────────▼────────────────────────────────────┐
│                   MongoDB Database                      │
│           mongodb://localhost:27017                     │
│  Collections:                                           │
│  - users (authentication)                               │
│  - sentinels (device registry)                          │
│  - alerts (threat detections)                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Raspberry Pi Sentinels                     │
│  - Python script running on each device                 │
│  - PIR + Vibration sensors                              │
│  - Camera + AI inference                                │
│  - Video streaming (Port 8080)                          │
│  - Reports to backend API                               │
└─────────────────────────────────────────────────────────┘
```

---

## Features Available

### ✅ Implemented

- **Authentication**: JWT-based login/register
- **Dashboard**: Real-time sentinel monitoring
- **Live Map**: Interactive sentinel locations
- **Alerts**: Threat detection history
- **Video Streaming**: Direct from Raspberry Pi devices
- **WebSocket**: Real-time notifications
- **Responsive**: Mobile-friendly UI
- **Settings**: User profile management

### 🔄 Backend APIs

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Current user
- `GET /api/sentinels` - List sentinels
- `POST /api/sentinels/register` - Register sentinel
- `GET /api/alerts` - List alerts
- `POST /api/alerts` - Create alert
- `PUT /api/alerts/:id/verify` - Verify alert

### 🎯 Ready for Demo

- Clean, modern UI
- Authentication flow
- Real-time updates
- Video streaming support
- Mobile responsive
- Production-ready code

---

## Testing the System

### 1. Test Authentication

```bash
# Register new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@orion.gh",
    "password": "test123",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@orion.gh",
    "password": "password"
  }'
```

### 2. Test Sentinel Registration

```bash
# Get your token from login response, then:
curl -X POST http://localhost:5000/api/sentinels/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "deviceId": "ORN-001",
    "location": {"lat": 6.6745, "lng": -1.5716},
    "batteryLevel": 95,
    "ipAddress": "192.168.1.100"
  }'
```

### 3. Test Alert Creation

```bash
curl -X POST http://localhost:5000/api/alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "sentinelId": "ORN-001",
    "threatType": "Excavator",
    "confidence": 0.95,
    "location": {"lat": 6.6745, "lng": -1.5716}
  }'
```

---

## Demo Flow

1. **Start with Landing Page**

   - Show the hero section
   - Highlight features
   - Explain the problem and solution

2. **Show Authentication**

   - Navigate to Login
   - Enter credentials
   - Show secure access

3. **Dashboard Overview**

   - Live sentinel count
   - Alert statistics
   - Real-time status

4. **Interactive Map**

   - Click sentinel markers
   - Show locations
   - View live feed

5. **Alert Management**

   - View threat history
   - Verify alerts
   - See timestamps

6. **Settings**
   - User profile
   - System info

---

## Common Issues

### MongoDB Connection Failed

```bash
# Check if MongoDB is running
mongosh

# Start MongoDB
# Windows: net start MongoDB
# Linux: sudo systemctl start mongod
```

### Port Already in Use

```bash
# Backend (5000)
# Find process: netstat -ano | findstr :5000
# Kill process: taskkill /PID <PID> /F

# Frontend (5173)
# Vite will automatically use next available port
```

### Cannot Login

- Ensure backend is running
- Check MongoDB is connected
- Verify demo user was created: `npm run seed`
- Check browser console for errors

### WebSocket Not Connecting

- Ensure backend is running
- Check CORS configuration
- Verify token is stored in localStorage

---

## Production Deployment

### Backend (Node.js)

- Deploy to: Heroku, Railway, DigitalOcean, AWS
- Use MongoDB Atlas for database
- Set environment variables
- Change JWT_SECRET
- Enable HTTPS

### Frontend (React/Vite)

- Deploy to: Vercel, Netlify, Cloudflare Pages
- Build: `npm run build`
- Update API URLs in `.env.production`

### Raspberry Pi Sentinels

- See: `backend/raspberry-pi/SETUP_GUIDE.md`
- Configure IP addresses
- Set up auto-start
- Enable remote access

---

## Support

- **Documentation**: See `/backend/README.md`
- **API Docs**: See `/backend/DELIVERABLES.md`
- **Auth Guide**: See `/AUTH_SETUP.md`
- **Raspberry Pi**: See `/backend/raspberry-pi/SETUP_GUIDE.md`

---

**🇬🇭 Project ORION - Protecting Ghana's Natural Resources with AI**
