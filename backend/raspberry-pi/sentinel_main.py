#!/usr/bin/env python3
"""
Project ORION - Sentinel Device Main Script
Raspberry Pi 4B with Camera
AI-Powered Anti-Illegal Mining Surveillance
"""

import time
import cv2
import numpy as np
import requests
import threading
import logging
from flask import Flask, Response
from datetime import datetime
import RPi.GPIO as GPIO

# Optional: MindSpore Lite (fallback to ONNX if not available)
try:
    import mindspore_lite as mslite
    MINDSPORE_AVAILABLE = True
except ImportError:
    MINDSPORE_AVAILABLE = False
    print("⚠️  MindSpore not available, will use ONNX Runtime")
    import onnxruntime as ort

# ============================================================================
# CONFIGURATION
# ============================================================================

DEVICE_ID = "ORN-001"
BACKEND_URL = "http://192.168.1.100:5000/api"  # CHANGE TO YOUR SERVER IP
VIDEO_PORT = 8080  # Match frontend expectation

# GPIO Pins
# (Hardware triggers removed, using vision/audio triggers)

# AI Model
MODEL_PATH = "orion_detector.ms" if MINDSPORE_AVAILABLE else "orion_detector.onnx"
CONFIDENCE_THRESHOLD = 0.75
INPUT_SIZE = 640  # YOLOv5 default

# Timing
SENSOR_POLL_INTERVAL = 0.5  # Seconds
ALERT_COOLDOWN = 30  # Seconds between alerts
STREAM_DURATION = 60  # Seconds to stay active after alert
HEARTBEAT_INTERVAL = 60  # Seconds between status updates

# Camera
CAMERA_INDEX = 0
CAMERA_WIDTH = 1280
CAMERA_HEIGHT = 720
CAMERA_FPS = 15

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('sentinel.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ============================================================================
# GLOBAL STATE
# ============================================================================

class SystemState:
    """Thread-safe system state manager"""
    def __init__(self):
        self.mode = "SENTRY"  # SENTRY or INTRUDER
        self.camera = None
        self.camera_lock = threading.Lock()
        self.last_alert_time = 0
        self.model_loaded = False
        
state = SystemState()
flask_app = Flask(__name__)

# ============================================================================
# HARDWARE INTERFACES
# ============================================================================

class GPSTracker:
    """GPS Module Interface (NEO-6M or similar)"""
    
    def __init__(self, serial_port='/dev/ttyUSB0', baudrate=9600):
        self.serial_port = serial_port
        self.baudrate = baudrate
        self.last_valid_location = {"lat": 6.6745, "lng": -1.5716}  # Accra default
        
    def get_location(self):
        """Get current GPS coordinates"""
        try:
            # TODO: Implement actual GPS NMEA parsing
            # For now, return last known location
            # You can use pynmea2 library for real GPS:
            # import serial, pynmea2
            # ser = serial.Serial(self.serial_port, self.baudrate, timeout=1)
            # data = ser.readline().decode('ascii', errors='replace')
            # msg = pynmea2.parse(data)
            # return {"lat": msg.latitude, "lng": msg.longitude}
            return self.last_valid_location
        except Exception as e:
            logger.warning(f"GPS read error: {e}")
            return self.last_valid_location

class Communicator:
    """Backend API Communication"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
    def register_device(self, gps_data):
        """Register sentinel with backend"""
        try:
            response = self.session.post(
                f"{BACKEND_URL}/sentinels/register",
                json={
                    "deviceId": DEVICE_ID,
                    "status": "active",
                    "location": gps_data,
                    "batteryLevel": self._get_battery_level(),
                    "ipAddress": self._get_local_ip()
                },
                timeout=5
            )
            if response.status_code == 201:
                logger.info("✅ Device registered successfully")
                return True
            else:
                logger.error(f"Registration failed: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Registration error: {e}")
            return False
    
    def send_alert(self, threat_type, confidence, gps_data, image_path=None):
        """Send threat alert to backend"""
        try:
            payload = {
                "sentinelId": DEVICE_ID,
                "threatType": threat_type,
                "confidence": float(confidence),
                "location": gps_data,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/alerts",
                json=payload,
                timeout=5
            )
            
            if response.status_code == 201:
                logger.info(f"🚨 ALERT SENT: {threat_type} ({confidence:.2%})")
                return True
            else:
                logger.error(f"Alert send failed: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Alert error: {e}")
            return False
    
    def update_status(self, status, gps_data):
        """Send heartbeat status update"""
        try:
            response = self.session.put(
                f"{BACKEND_URL}/sentinels/{DEVICE_ID}/status",
                json={
                    "status": status,
                    "location": gps_data,
                    "batteryLevel": self._get_battery_level(),
                    "lastSeen": datetime.utcnow().isoformat()
                },
                timeout=3
            )
            return response.status_code == 200
        except:
            return False
    
    def _get_battery_level(self):
        """Read battery level (requires INA219 or similar)"""
        # TODO: Implement actual battery monitoring
        return 85  # Placeholder
    
    def _get_local_ip(self):
        """Get Raspberry Pi's local IP address"""
        import socket
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "192.168.1.100"

# ============================================================================
# AI INFERENCE ENGINE
# ============================================================================

class IntelligenceUnit:
    """AI-powered threat detection"""
    
    def __init__(self, model_path):
        self.model_path = model_path
        self.model = None
        self.session = None
        self.use_mindspore = MINDSPORE_AVAILABLE
        
        # YOLO class names (customize based on your training)
        self.class_names = [
            "Excavator", "JCB", "Bulldozer", "Dump-Truck", 
            "Drill-Rig", "Water-Pump", "Illegal-Structure"
        ]
    
    def load_model(self):
        """Load AI model into memory"""
        try:
            if self.use_mindspore:
                self._load_mindspore()
            else:
                self._load_onnx()
            state.model_loaded = True
            logger.info("🧠 AI Model loaded successfully")
        except Exception as e:
            logger.error(f"Model load failed: {e}")
            state.model_loaded = False
    
    def _load_mindspore(self):
        """Load MindSpore Lite model"""
        context = mslite.Context()
        context.target = ["cpu"]
        context.cpu.thread_num = 2
        context.cpu.thread_affinity_mode = 1
        
        self.model = mslite.Model()
        self.model.build_from_file(self.model_path, mslite.ModelType.MINDIR, context)
    
    def _load_onnx(self):
        """Load ONNX model"""
        self.session = ort.InferenceSession(
            self.model_path,
            providers=['CPUExecutionProvider']
        )
    
    def unload_model(self):
        """Free model memory"""
        self.model = None
        self.session = None
        state.model_loaded = False
        logger.info("💤 AI Model unloaded")
    
    def analyze_frame(self, frame):
        """
        Run inference on camera frame
        Returns: (threat_type, confidence, bbox) or (None, 0.0, None)
        """
        if not state.model_loaded:
            return None, 0.0, None
        
        try:
            # Preprocess
            img = cv2.resize(frame, (INPUT_SIZE, INPUT_SIZE))
            img = img.astype(np.float32) / 255.0
            img = np.transpose(img, (2, 0, 1))  # HWC -> CHW
            img = np.expand_dims(img, axis=0)   # Add batch dimension
            
            # Inference
            if self.use_mindspore:
                outputs = self._infer_mindspore(img)
            else:
                outputs = self._infer_onnx(img)
            
            # Post-process YOLOv5 output
            detections = self._postprocess_yolo(outputs, frame.shape)
            
            if detections:
                # Return highest confidence detection
                best = max(detections, key=lambda x: x['confidence'])
                return best['class_name'], best['confidence'], best['bbox']
            
            return None, 0.0, None
            
        except Exception as e:
            logger.error(f"Inference error: {e}")
            return None, 0.0, None
    
    def _infer_mindspore(self, img):
        """Run MindSpore inference"""
        inputs = self.model.get_inputs()
        inputs[0].set_data_from_numpy(img)
        outputs = self.model.predict(inputs)
        return outputs[0].get_data_to_numpy()
    
    def _infer_onnx(self, img):
        """Run ONNX inference"""
        input_name = self.session.get_inputs()[0].name
        outputs = self.session.run(None, {input_name: img})
        return outputs[0]
    
    def _postprocess_yolo(self, output, orig_shape):
        """
        Parse YOLOv5 output format: [batch, num_detections, 85]
        85 = [x, y, w, h, obj_conf, class1_conf, ..., classN_conf]
        """
        detections = []
        
        # Assuming output shape: [1, 25200, 85] for 80 classes
        # Adjust based on your model's output
        output = output[0]  # Remove batch dimension
        
        for detection in output:
            obj_conf = detection[4]
            if obj_conf < CONFIDENCE_THRESHOLD:
                continue
            
            # Get class with highest confidence
            class_scores = detection[5:]
            class_id = np.argmax(class_scores)
            class_conf = class_scores[class_id]
            
            confidence = obj_conf * class_conf
            if confidence < CONFIDENCE_THRESHOLD:
                continue
            
            if class_id < len(self.class_names):
                # Convert bbox from YOLO format to pixel coordinates
                x_center, y_center, width, height = detection[:4]
                h, w = orig_shape[:2]
                
                x1 = int((x_center - width/2) * w / INPUT_SIZE)
                y1 = int((y_center - height/2) * h / INPUT_SIZE)
                x2 = int((x_center + width/2) * w / INPUT_SIZE)
                y2 = int((y_center + height/2) * h / INPUT_SIZE)
                
                detections.append({
                    'class_name': self.class_names[class_id],
                    'confidence': float(confidence),
                    'bbox': (x1, y1, x2, y2)
                })
        
        return detections

# ============================================================================
# VIDEO STREAMING
# ============================================================================

def generate_video_stream():
    """Generate MJPEG stream for Flask"""
    while True:
        with state.camera_lock:
            if state.camera and state.camera.isOpened():
                success, frame = state.camera.read()
                if success:
                    # Encode as JPEG
                    ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    if ret:
                        yield (b'--frame\r\n'
                               b'Content-Type: image/jpeg\r\n\r\n' + 
                               buffer.tobytes() + b'\r\n')
        time.sleep(0.033)  # ~30 FPS

@flask_app.route('/stream')
def video_stream():
    """Video stream endpoint (matches frontend expectation)"""
    return Response(
        generate_video_stream(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

@flask_app.route('/health')
def health_check():
    """Health check endpoint"""
    return {
        "status": "online",
        "deviceId": DEVICE_ID,
        "mode": state.mode,
        "modelLoaded": state.model_loaded,
        "cameraActive": state.camera is not None
    }

def start_flask():
    """Start Flask server in background thread"""
    flask_app.run(host='0.0.0.0', port=VIDEO_PORT, debug=False, use_reloader=False, threaded=True)

# ============================================================================
# CAMERA MANAGEMENT
# ============================================================================

def initialize_camera():
    """Initialize camera with optimal settings"""
    with state.camera_lock:
        state.camera = cv2.VideoCapture(CAMERA_INDEX)
        state.camera.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_WIDTH)
        state.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)
        state.camera.set(cv2.CAP_PROP_FPS, CAMERA_FPS)
        state.camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce latency
        
        if state.camera.isOpened():
            logger.info("📷 Camera initialized")
            return True
        else:
            logger.error("Camera initialization failed")
            return False

def release_camera():
    """Release camera resources"""
    with state.camera_lock:
        if state.camera:
            state.camera.release()
            state.camera = None
            logger.info("📷 Camera released")

# ============================================================================
# MAIN CONTROL LOOP
# ============================================================================

def main():
    """Main sentinel control logic"""
    
    # Initialize hardware
    # GPIO.setmode(GPIO.BCM) - removed in favor of acoustic-first architecture
    
    # Initialize modules
    gps = GPSTracker()
    comms = Communicator()
    ai = IntelligenceUnit(MODEL_PATH)
    
    # Start video server
    threading.Thread(target=start_flask, daemon=True).start()
    time.sleep(2)  # Wait for Flask to start
    
    # Register with backend
    location = gps.get_location()
    comms.register_device(location)
    
    logger.info("=" * 60)
    logger.info("✅ PROJECT ORION SENTINEL ONLINE")
    logger.info(f"Device ID: {DEVICE_ID}")
    logger.info(f"Mode: {state.mode}")
    logger.info(f"Video Stream: http://<PI_IP>:{VIDEO_PORT}/stream")
    logger.info("=" * 60)
    
    last_heartbeat = time.time()
    
    try:
        while True:
            current_time = time.time()
            
            # ==================== SENTRY MODE ====================
            if state.mode == "SENTRY":
                # With hardware sensors removed, we could rely on intermittent camera scans or 
                # await audio-first triggers. For this standalone demo stub, 
                # we'll simulate a scan trigger every 30 seconds.
                if current_time - last_heartbeat > 30:
                    logger.warning("🚨 (Simulated Audio Pipeline) TRIGGER DETECTED! Switching to INTRUDER MODE")
                    trigger_type = "microphone"
                    
                    # Switch to INTRUDER mode
                    state.mode = "INTRUDER"
                    ai.load_model()
                    initialize_camera()
                    state.last_alert_time = current_time
                    
                    # Update backend status
                    comms.update_status("alert", gps.get_location())
                
                # Periodic heartbeat
                if current_time - last_heartbeat > HEARTBEAT_INTERVAL:
                    comms.update_status("active", gps.get_location())
                    last_heartbeat = current_time
                
                time.sleep(SENSOR_POLL_INTERVAL)
            
            # ==================== INTRUDER MODE ====================
            elif state.mode == "INTRUDER":
                with state.camera_lock:
                    if state.camera and state.camera.isOpened():
                        ret, frame = state.camera.read()
                        
                        if ret:
                            # Run AI detection
                            threat, confidence, bbox = ai.analyze_frame(frame)
                            
                            if threat and confidence >= CONFIDENCE_THRESHOLD:
                                # Alert cooldown check
                                if current_time - state.last_alert_time >= ALERT_COOLDOWN:
                                    logger.warning(f"⚠️  THREAT DETECTED: {threat} ({confidence:.2%})")
                                    
                                    # Send alert to backend
                                    location = gps.get_location()
                                    comms.send_alert(threat, confidence, location)
                                    state.last_alert_time = current_time
                            
                            # Optional: Draw bounding box on frame for debugging
                            # if bbox:
                            #     x1, y1, x2, y2 = bbox
                            #     cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                
                # Check if should return to SENTRY mode
                if current_time - state.last_alert_time > STREAM_DURATION:
                    logger.info("💤 Returning to SENTRY MODE")
                    state.mode = "SENTRY"
                    ai.unload_model()
                    release_camera()
                    comms.update_status("active", gps.get_location())
                
                time.sleep(0.1)  # Fast loop for real-time detection
    
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        # Cleanup
        release_camera()
        logger.info("Shutdown complete")

# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    main()
