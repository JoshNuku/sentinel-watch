# Project ORION — Master README

**Protecting Ghana’s Natural Resources with AI, IoT, and Edge Computing**

---

## Table of Contents
- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Features](#features)
- [Quick Start](#quick-start)
- [Software Stack](#software-stack)
- [Hardware Setup](#hardware-setup)
- [Testing & Demo Flow](#testing--demo-flow)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)
- [Support & Documentation](#support--documentation)

---

## Overview
Project ORION is an end-to-end AIoT system for real-time detection and reporting of illegal mining activities. It combines edge AI sentinels (Raspberry Pi), a robust backend API, and a modern web dashboard for authorities and stakeholders.

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
│  - Microphone (audio) + Camera AI inference             │
│  - Audio-first detection pipeline                       │
│  - Video streaming (Port 8080)                          │
│  - Reports to backend API                               │
└─────────────────────────────────────────────────────────┘
```

---

## Features
- **Authentication**: JWT-based login/register
- **Dashboard**: Real-time sentinel monitoring
- **Live Map**: Interactive sentinel locations
- **Alerts**: Threat detection history
- **Video Streaming**: Direct from Raspberry Pi devices
- **WebSocket**: Real-time notifications
- **Responsive**: Mobile-friendly UI
- **Settings**: User profile management

---

## Quick Start
See QUICKSTART.md for a full step-by-step guide.

---

## Software Stack
### Backend API
- Node.js, Express.js, TypeScript
- MongoDB (Mongoose ODM)
- Socket.io for real-time updates
- Huawei Cloud SMN for SMS alerts (optional)
- RESTful API for sentinels, alerts, users

### Frontend Dashboard
- React (Vite, TypeScript)
- shadcn-ui for UI components
- WebSocket for live updates
- Pages: Dashboard, Live Map, Alerts, Settings

### Raspberry Pi Sentinel
- Python 3 (tested on Pi 4B)
- Microphone (audio sensor) and Camera
- AI: Audio FFT heuristics (mic), YOLO vision (OpenCV DNN, ONNX/MindSpore)
- Local Flask server for video streaming
- Modular drivers for hardware components

---

## Hardware Setup
### Essential Components
- Raspberry Pi 4B (4GB+ recommended)
- Microphone (e.g. MAX9814 or USB mic)
- Camera Module V2 or USB webcam
- MicroSD Card (32GB+)
- Power Supply (5V 3A USB-C)

### Optional
- GPS Module (NEO-6M)
- INA219 Sensor (battery monitoring)
- 4G/LTE Modem
- Solar Panel + Battery

### Software Installation (on Pi)
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-opencv libatlas-base-dev libopenjp2-7 libtiff5 libhdf5-dev git cmake build-essential
# Enable camera and GPIO via raspi-config, then reboot
```
#### Python Setup
```bash
cd orion-sentinel/orion
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
#### Model Files
- Place YOLO weights/config in `model/` (see orion/README.md)
#### Run Sentinel
```bash
python3 main.py
```

---

## Testing & Demo Flow
1. **Landing Page**: Show hero, features, problem/solution
2. **Authentication**: Login as admin
3. **Dashboard**: Live sentinel count, alert stats
4. **Live Map**: Click markers, view locations, live feed
5. **Alerts**: View/verify threat history
6. **Settings**: User profile, system info

---

## Troubleshooting
- **MongoDB not connecting**: Ensure service is running
- **Port in use**: Kill process using `netstat`/`taskkill`
- **Cannot login**: Check backend, MongoDB, demo user
- **WebSocket issues**: Check backend, CORS, token in localStorage
- **Pi hardware errors**: Check wiring, enable interfaces, test with `i2cdetect`/`raspistill`

---

## Production Deployment
- **Backend**: Deploy to Heroku, Railway, DigitalOcean, AWS; use MongoDB Atlas; set env vars; enable HTTPS
- **Frontend**: Deploy to Vercel, Netlify, Cloudflare Pages; update API URLs
- **Raspberry Pi**: See `backend/raspberry-pi/SETUP_GUIDE.md` for auto-start, remote access

---

## Support & Documentation
- **Backend**: [backend/README.md](backend/README.md)
- **Pi Setup**: [backend/raspberry-pi/SETUP_GUIDE.md](backend/raspberry-pi/SETUP_GUIDE.md)
- **Sentinel Code**: [orion-sentinel/orion/README.md](orion-sentinel/orion/README.md)
- **API Docs**: `/backend/DELIVERABLES.md`
- **Auth Guide**: `/AUTH_SETUP.md`

---

**🇬🇭 Project ORION — Protecting Ghana’s Natural Resources with AI**
