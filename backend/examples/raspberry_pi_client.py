#!/usr/bin/env python3
"""
Project ORION - Raspberry Pi Sentinel Client Example
This script demonstrates how a Raspberry Pi device would communicate with the backend.
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BACKEND_URL = "http://your-server-ip:5000"  # Replace with actual backend URL
DEVICE_ID = "ORN-001"  # Unique device identifier
API_BASE = f"{BACKEND_URL}/api"

# Device location (GPS coordinates)
DEVICE_LOCATION = {
    "lat": 1.3521,
    "lng": 103.8198
}

class SentinelClient:
    """
    Raspberry Pi Sentinel Client
    Handles communication with Project ORION backend
    """
    
    def __init__(self, device_id, location):
        self.device_id = device_id
        self.location = location
        self.battery_level = 100
        self.ip_address = self._get_local_ip()
        
    def _get_local_ip(self):
        """Get device's local IP address"""
        import socket
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "unknown"
    
    def register_device(self):
        """
        Register/update this sentinel device with the backend
        Should be called on startup and periodically as heartbeat
        """
        endpoint = f"{API_BASE}/sentinels/register"
        
        payload = {
            "deviceId": self.device_id,
            "location": self.location,
            "batteryLevel": self.battery_level,
            "ipAddress": self.ip_address,
            "status": "active"
        }
        
        try:
            print(f"[{datetime.now()}] Registering device {self.device_id}...")
            response = requests.post(endpoint, json=payload, timeout=10)
            
            if response.status_code in [200, 201]:
                print(f"✅ Device registered successfully")
                return True
            else:
                print(f"❌ Registration failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Connection error: {e}")
            return False
    
    def send_alert(self, threat_type, confidence, threat_location=None):
        """
        Send threat detection alert to backend
        
        Args:
            threat_type: "excavator", "person", "car", or "speech" (lowercase)
            confidence: 0.0 to 1.0 (e.g., 0.95 = 95%)
            threat_location: Optional specific threat location, defaults to device location
        """
        endpoint = f"{API_BASE}/alerts"
        
        if threat_location is None:
            threat_location = self.location
        
        payload = {
            "sentinelId": self.device_id,
            "threatType": threat_type,
            "confidence": confidence,
            "location": threat_location,
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            print(f"\n[{datetime.now()}] 🚨 THREAT DETECTED!")
            print(f"   Type: {threat_type}")
            print(f"   Confidence: {confidence*100:.1f}%")
            print(f"   Location: {threat_location}")
            print(f"   Sending alert to backend...")
            
            response = requests.post(endpoint, json=payload, timeout=10)
            
            if response.status_code == 201:
                print(f"✅ Alert sent successfully!")
                print(f"   Response: {response.json()['message']}")
                return True
            else:
                print(f"❌ Alert failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Connection error: {e}")
            return False
    
    def update_battery(self, level):
        """Update battery level and send to backend"""
        self.battery_level = level
        return self.register_device()  # Heartbeat with updated battery
    
    def heartbeat(self):
        """
        Send periodic heartbeat to backend
        Updates lastSeen timestamp
        """
        return self.register_device()


def simulate_detection():
    """
    Simulate threat detection (for testing purposes)
    In real implementation, this would be replaced by MindSpore AI detection
    """
    
    # Initialize sentinel client
    sentinel = SentinelClient(DEVICE_ID, DEVICE_LOCATION)
    
    # Step 1: Register device on startup
    print("="*60)
    print("PROJECT ORION - Sentinel Device Starting Up")
    print("="*60)
    sentinel.register_device()
    
    # Step 2: Simulate periodic monitoring
    print("\n🔍 Monitoring area for threats...")
    time.sleep(2)
    
    # Step 3: Simulate threat detection
    print("\n⚡ AI Model processing camera feed...")
    time.sleep(1)
    
    # Example alerts
    threats = [
        {
            "type": "excavator",
            "confidence": 0.95,
            "location": {"lat": 1.3521, "lng": 103.8198}
        },
        {
            "type": "car",
            "confidence": 0.87,
            "location": {"lat": 1.3522, "lng": 103.8199}
        }
    ]
    
    # Send alerts
    for threat in threats:
        success = sentinel.send_alert(
            threat_type=threat["type"],
            confidence=threat["confidence"],
            threat_location=threat["location"]
        )
        
        if success:
            print(f"   📡 Backend notified")
            print(f"   📱 SMS sent to rangers")
            print(f"   🔌 Dashboard updated via WebSocket")
        
        time.sleep(2)
    
    # Step 4: Send heartbeat
    print(f"\n💓 Sending heartbeat...")
    sentinel.heartbeat()
    
    print("\n" + "="*60)
    print("Simulation complete!")
    print("="*60)


def continuous_monitoring():
    """
    Continuous monitoring mode
    Sends heartbeat every 5 minutes
    """
    sentinel = SentinelClient(DEVICE_ID, DEVICE_LOCATION)
    
    # Initial registration
    sentinel.register_device()
    
    print("\n🔍 Continuous monitoring started...")
    print("   Heartbeat interval: 5 minutes")
    print("   Press Ctrl+C to stop\n")
    
    try:
        while True:
            # In real implementation, this is where you would:
            # 1. Capture image from camera
            # 2. Run MindSpore AI inference
            # 3. If threat detected, call sentinel.send_alert()
            
            # For now, just send heartbeat
            time.sleep(300)  # 5 minutes
            print(f"[{datetime.now()}] Sending heartbeat...")
            sentinel.heartbeat()
            
    except KeyboardInterrupt:
        print("\n\n🛑 Monitoring stopped by user")
        print("Device going offline...")


if __name__ == "__main__":
    import sys
    
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║         PROJECT ORION - Sentinel Client v1.0            ║
    ║    AIoT Anti-Illegal Mining Surveillance System         ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Device ID: {DEVICE_ID}\n")
    
    # Check if backend is reachable
    try:
        response = requests.get(f"{BACKEND_URL}/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is reachable\n")
        else:
            print("⚠️  Backend returned unexpected status\n")
    except:
        print("❌ Cannot reach backend! Check BACKEND_URL configuration.\n")
        sys.exit(1)
    
    # Choose mode
    print("Select mode:")
    print("1. Simulation (demo)")
    print("2. Continuous monitoring")
    
    choice = input("\nEnter choice (1 or 2): ").strip()
    
    if choice == "1":
        simulate_detection()
    elif choice == "2":
        continuous_monitoring()
    else:
        print("Invalid choice. Exiting.")
