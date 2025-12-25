# Rider Communication Web App

A React web application for peer-to-peer voice communication between riders over mobile hotspot. Accessible via local network IP address.

## ✅ Setup Complete!

All dependencies installed and app built successfully.

## 🚀 How to Start

### Set Static IP (Recommended)

To keep the IP address constant, create a `.env` file:

```bash
STATIC_IP=192.168.43.1
PORT=3000
NODE_ENV=production
```

Replace `192.168.43.1` with your actual hotspot IP address.

### Start the Server

```bash
./start.sh
```

Or manually:

```bash
npm run serve
```

The server will display:
- **Local**: `http://localhost:3000`
- **Network**: `http://YOUR_STATIC_IP:3000` ← Share this with riders

**Note**: If you don't set STATIC_IP, the server will auto-detect, but it may change.

## 📱 Usage

### Host a Session

1. Enable mobile hotspot on your device
2. Start the server: `npm run serve`
3. Open browser: `http://YOUR_LOCAL_IP:3000`
4. Click "HOST"
5. Share Session ID and Network IP with riders
6. Click "Start Session"

### Join a Session

1. Connect to the host's mobile hotspot
2. Open browser: `http://HOST_IP:3000`
3. Click "JOIN"
4. Enter the Session ID provided by the host
5. Click "Join Session"

## 🔧 Commands

- `npm start` - Start React dev server (development)
- `npm run build` - Build for production
- `npm run serve` - Start production server
- `npm test` - Run tests

## 📋 Requirements

- Node.js (>= 16, works with 18+)
- Modern web browser with WebRTC support
- Mobile hotspot enabled on host device
- All devices on the same network

## ⚠️ Important Notes

- **Firewall**: Ensure port 3000 is open
- **Permissions**: Browser will ask for microphone permission
- **Network**: All devices must be on the same network (hotspot)
- **HTTPS**: Some browsers require HTTPS for microphone (localhost works without HTTPS)

## 📱 Running on Android

**Yes! The app works on Android phones!**

### Quick Setup:
1. Start server on computer: `./start.sh`
2. Enable hotspot on computer (or use same WiFi)
3. Open Chrome browser on Android phone
4. Go to: `http://YOUR_STATIC_IP:3000`
5. **Optional**: Install as PWA - Tap menu → "Add to Home screen"

The app is optimized for mobile and can be installed as a Progressive Web App (PWA)!

See `ANDROID_SETUP.md` for detailed instructions.

## 🎉 Ready to Use!

The app is built and ready. Just start the server and share the network IP address!
