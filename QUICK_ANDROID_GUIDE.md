# Quick Guide: Run on Android

## ✅ Fixed Issues

1. **WebRTC Error Fixed** - Peer connection creation logic corrected
2. **Connection Flow Fixed** - Clients now properly create offers when joining

## 🚀 Easiest Method: Run Server on Computer

**This is the simplest approach:**

1. **On your computer:**
   ```bash
   # Set static IP in .env
   echo "STATIC_IP=192.168.43.1" > .env
   
   # Start server
   ./start.sh
   ```  

2. **On Android phone (host):**
   - Enable mobile hotspot
   - Connect computer to hotspot
   - Open Chrome browser
   - Go to: `http://192.168.43.1:3000` (or IP shown by server)
   - Click "HOST"

3. **On other Android phones (riders):**
   - Connect to host's hotspot
   - Open Chrome browser
   - Go to: `http://192.168.43.1:3000`
   - Click "JOIN" and enter Session ID

## 📱 Run Server on Android (Advanced)

If you want to run the server directly on Android phone:

### Using Termux:

1. Install Termux from F-Droid
2. In Termux:
   ```bash
   pkg update && pkg upgrade
   pkg install nodejs git
   git clone YOUR_REPO_URL
   cd mobile-app
   npm install --legacy-peer-deps
   npm run build
   ```

3. Set static IP:
   ```bash
   echo "STATIC_IP=192.168.43.1" > .env
   ```

4. Start server:
   ```bash
   npm run serve
   ```

5. Access from any browser: `http://192.168.43.1:3000`

## 🎯 Recommended Setup

**Best approach**: Run server on computer, access from Android browsers.

- ✅ Easier to set up
- ✅ More reliable
- ✅ Better performance
- ✅ Easier to debug

See `RUN_ON_ANDROID.md` for detailed Termux setup.

