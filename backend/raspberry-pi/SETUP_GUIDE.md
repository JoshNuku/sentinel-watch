# Raspberry Pi Sentinel Setup Guide

## Hardware Requirements

### Essential Components

- **Raspberry Pi 4B** (4GB RAM recommended)
- **Camera Module V2** or USB webcam
- **MicroSD Card** (32GB+ Class 10)
- **Power Supply** (5V 3A USB-C)

### Optional Components

- **GPS Module** (NEO-6M) - for accurate location tracking
- **INA219 Sensor** - for battery level monitoring
- **4G/LTE Modem** - for remote locations
- **Solar Panel + Battery** - for off-grid deployment

## GPIO Pin Connections

```
Raspberry Pi GPIO (BCM Mode)
============================


GPS Module (Optional):
- VCC  → 5V
- GND  → GND
- TX   → RX (GPIO 15 / Pin 10)
- RX   → TX (GPIO 14 / Pin 8)

Camera:
- CSI ribbon cable to camera port
```

## Software Installation

### 1. Prepare Raspberry Pi OS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install system dependencies
sudo apt install -y \
    python3-pip \
    python3-opencv \
    libatlas-base-dev \
    libopenjp2-7 \
    libtiff5 \
    libhdf5-dev \
    git \
    cmake \
    build-essential
```

### 2. Enable Camera and GPIO

```bash
# Enable camera interface
sudo raspi-config
# Navigate to: Interface Options → Camera → Enable

# Reboot
sudo reboot
```

### 3. Install Python Dependencies

```bash
cd /home/pi/sentinel
pip3 install -r requirements.txt
```

### 4. Choose AI Framework

#### Option A: ONNX Runtime (Recommended)

**Pros:**

- Easier installation
- Better compatibility
- Supports YOLOv5, YOLOv8
- Good performance on Raspberry Pi 4

```bash
pip3 install onnxruntime==1.16.3
```

**Convert your model to ONNX:**

```python
# If you trained with YOLOv5
python export.py --weights best.pt --include onnx --img 640

# Rename to: orion_detector.onnx
```

#### Option B: MindSpore Lite (Advanced)

**Pros:**

- Optimized for Huawei NPU (if available)
- Potential better performance
- Smaller model size

**Installation:**

```bash
# Download ARM64 wheel from:
# https://www.mindspore.cn/lite/docs/en/master/use/downloads.html

# Install (replace with actual filename)
pip3 install mindspore_lite-2.2.0-cp39-cp39-linux_aarch64.whl
```

**Convert your model:**

```bash
# Use MindSpore Lite converter tool
# Follow: https://www.mindspore.cn/lite/docs/en/master/use/converter_tool.html
```

## Configuration

### 1. Update Script Settings

Edit `sentinel_main.py`:

```python
# Line 19-20: Set your backend server IP
DEVICE_ID = "ORN-001"  # Unique ID for this sentinel
BACKEND_URL = "http://YOUR_SERVER_IP:5000/api"


# Line 34: Set model path
MODEL_PATH = "orion_detector.onnx"  # or .ms for MindSpore

# Line 37-38: Adjust detection settings
CONFIDENCE_THRESHOLD = 0.75  # 75% confidence required
INPUT_SIZE = 640  # Model input size (320, 416, 640)
```

### 2. Train Your AI Model

#### Step 1: Collect Training Data

- Record video of mining equipment in your region
- Extract frames with equipment visible
- Annotate using [Roboflow](https://roboflow.com) or [LabelImg](https://github.com/heartexlabs/labelImg)

#### Step 2: Train YOLOv5 Model

```bash
git clone https://github.com/ultralytics/yolov5
cd yolov5
pip install -r requirements.txt

# Train
python train.py --data dataset.yaml --weights yolov5s.pt --epochs 100 --img 640

# Export to ONNX
python export.py --weights runs/train/exp/weights/best.pt --include onnx
```

#### Step 3: Define Classes

Update line 127 in `sentinel_main.py`:

```python
self.class_names = [
    "Excavator", "JCB", "Bulldozer", "Dump-Truck",
    "Drill-Rig", "Water-Pump", "Illegal-Structure"
]
```

### 3. Test Camera

```bash
# Test camera capture
raspistill -o test.jpg

# Test with Python
python3 << EOF
import cv2
cap = cv2.VideoCapture(0)
ret, frame = cap.read()
if ret:
    print("✅ Camera working!")
    cv2.imwrite("test_frame.jpg", frame)
else:
    print("❌ Camera failed")
cap.release()
EOF
```


## Running the Sentinel

### Manual Start

```bash
cd /home/pi/sentinel
sudo python3 sentinel_main.py
```

Expected output:

```
2026-01-07 10:00:00 [INFO] ✅ Device registered successfully
2026-01-07 10:00:00 [INFO] 📷 Camera initialized
2026-01-07 10:00:00 [INFO] ============================================================
2026-01-07 10:00:00 [INFO] ✅ PROJECT ORION SENTINEL ONLINE
2026-01-07 10:00:00 [INFO] Device ID: ORN-001
2026-01-07 10:00:00 [INFO] Mode: SENTRY
2026-01-07 10:00:00 [INFO] Video Stream: http://192.168.1.100:8080/stream
2026-01-07 10:00:00 [INFO] ============================================================
```

### Auto-Start on Boot

Create systemd service:

```bash
sudo nano /etc/systemd/system/sentinel.service
```

Add:

```ini
[Unit]
Description=Project ORION Sentinel Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/sentinel
ExecStart=/usr/bin/python3 /home/pi/sentinel/sentinel_main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable sentinel.service
sudo systemctl start sentinel.service

# Check status
sudo systemctl status sentinel.service

# View logs
sudo journalctl -u sentinel.service -f
```

## Network Configuration

### Local Network (LAN)

If backend is on same network:

```python
BACKEND_URL = "http://192.168.1.100:5000/api"  # Replace with server IP
```

### Remote Access (Internet)

#### Option 1: Port Forwarding

1. Forward port 8080 on router to Raspberry Pi
2. Use public IP or DDNS (e.g., No-IP, DuckDNS)
3. Update frontend `.env`:
   ```
   VITE_API_URL=http://your-public-ip:8080
   ```

#### Option 2: VPN (Recommended for Security)

- Set up WireGuard or OpenVPN
- Connect all sentinels to VPN network
- Use VPN IPs in configuration

#### Option 3: Ngrok (Testing Only)

```bash
# Install ngrok
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.tgz
tar xvzf ngrok-v3-stable-linux-arm64.tgz
sudo mv ngrok /usr/local/bin

# Expose port 8080
ngrok http 8080
```

## Troubleshooting

### Camera Not Working

```bash
# Check camera detection
vcgencmd get_camera

# Should show: supported=1 detected=1

# If using USB camera, list devices
v4l2-ctl --list-devices

# Try different camera index (0, 1, 2...)
```


### AI Model Not Loading

```bash
# Check model file exists
ls -lh orion_detector.onnx

# Test ONNX model
python3 << EOF
import onnxruntime as ort
session = ort.InferenceSession("orion_detector.onnx")
print("✅ Model loaded successfully")
print("Inputs:", [i.name for i in session.get_inputs()])
print("Outputs:", [o.name for o in session.get_outputs()])
EOF
```

### Backend Connection Failed

```bash
# Test backend reachability
ping YOUR_SERVER_IP

# Test API endpoint
curl http://YOUR_SERVER_IP:5000/api/health

# Check firewall
sudo ufw status
```

### High CPU Usage

```bash
# Monitor resources
htop

# Reduce camera resolution
# In sentinel_main.py:
CAMERA_WIDTH = 640  # Instead of 1280
CAMERA_HEIGHT = 480  # Instead of 720
CAMERA_FPS = 10     # Instead of 15

# Reduce AI input size
INPUT_SIZE = 320    # Instead of 640
```

## Performance Optimization

### 1. Overclock Raspberry Pi 4 (Optional)

```bash
sudo nano /boot/config.txt
```

Add:

```ini
over_voltage=6
arm_freq=2000
gpu_freq=750
```

### 2. Use Lite OS

Install Raspberry Pi OS Lite (no desktop) for better performance:

```bash
# Download from: https://www.raspberrypi.com/software/operating-systems/
```

### 3. Disable Unnecessary Services

```bash
sudo systemctl disable bluetooth
sudo systemctl disable cups
sudo systemctl disable avahi-daemon
```

## Security Best Practices

1. **Change Default Password**

   ```bash
   passwd
   ```

2. **Enable SSH Key Authentication**

   ```bash
   ssh-keygen -t rsa -b 4096
   ssh-copy-id pi@raspberry-pi-ip
   ```

3. **Configure Firewall**

   ```bash
   sudo apt install ufw
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 8080/tcp  # Video stream
   sudo ufw enable
   ```

4. **Use HTTPS** (for production)
   - Set up SSL certificates
   - Use Let's Encrypt

## Deployment Checklist

- [ ] Raspberry Pi OS installed and updated
- [ ] Camera enabled and tested
- [ ] GPIO pins connected and tested
- [ ] Python dependencies installed
- [ ] AI model trained and converted
- [ ] Backend server IP configured
- [ ] Device registered with backend
- [ ] Video stream accessible
- [ ] Sensors triggering correctly
- [ ] Systemd service enabled
- [ ] Network connectivity verified
- [ ] Logs directory created with write permissions
- [ ] Power supply is adequate (5V 3A minimum)

## Maintenance

### Weekly

- Check log files: `tail -f sentinel.log`
- Verify backend connection
- Test camera quality

### Monthly

- Update OS: `sudo apt update && sudo apt upgrade`
- Check sensor calibration
- Clean camera lens
- Backup model and configuration

### As Needed

- Retrain model with new data
- Adjust confidence threshold
- Update firmware

## Support

For issues or questions:

1. Check logs: `sudo journalctl -u sentinel.service`
2. Review this guide
3. Contact backend administrator

---

**Project ORION Sentinel - Protecting Ghana's Natural Resources with AI 🇬🇭**
