# Running Server on Android Phone

## Method 1: Using Termux (Recommended)

### Step 1: Install Termux
1. Download Termux from F-Droid (not Play Store for full features)
   - https://f-droid.org/en/packages/com.termux/
2. Install and open Termux

### Step 2: Install Node.js
```bash
# Update packages
pkg update && pkg upgrade

# Install Node.js
pkg install nodejs

# Verify installation
node --version
npm --version
```

### Step 3: Transfer App Files
Option A: Using Git (if you have the repo on GitHub)
```bash
pkg install git
git clone YOUR_REPO_URL
cd mobile-app
```

Option B: Using USB/ADB
```bash
# On computer, transfer files
adb push /path/to/mobile-app /sdcard/mobile-app

# In Termux
termux-setup-storage
cp -r ~/storage/shared/mobile-app ~/mobile-app
cd ~/mobile-app
```

Option C: Using Termux file manager
```bash
# Install file manager
pkg install termux-file-editor

# Copy files manually via file manager
```

### Step 4: Install Dependencies
```bash
cd ~/mobile-app
npm install --legacy-peer-deps
```

### Step 5: Build the App
```bash
npm run build
```

### Step 6: Configure Network (IMPORTANT!)

**Option A: Use the setup script (Recommended)**
```bash
# Run the automated setup script
./termux-setup.sh
```

**Option B: Manual configuration**
```bash
# Edit .env file
nano .env

# Set your hotspot IP (usually 192.168.43.1 for Android)
STATIC_IP=192.168.43.1
PORT=3000
NODE_ENV=production
```

**⚠️ CRITICAL: Configure Android Firewall**
Before starting the server, you MUST allow network access:
1. Install Termux API: `pkg install termux-api`
2. Go to: Settings → Apps → Termux → Permissions → Enable "Network"
3. See `TERMUX_FIREWALL_FIX.md` for detailed instructions

### Step 7: Start the Server
```bash
npm run serve
```

The server will show the IP address. Share it with riders!

## Method 2: Using Android Studio / ADB

More complex, requires Android development setup.

## Method 3: Run on Computer, Access from Android

**Easiest approach:**

1. **On Computer:**
   ```bash
   ./start.sh
   ```
   Note the IP address shown

2. **On Android Phone:**
   - Connect to same network/hotspot
   - Open Chrome browser
   - Go to: `http://COMPUTER_IP:3000`
   - Use the app!

## Troubleshooting

### Network Access Issues (Most Common Problem)

**If other devices can't access the server even when connected to hotspot:**

This is usually due to Android's firewall blocking incoming connections. See **[TERMUX_FIREWALL_FIX.md](TERMUX_FIREWALL_FIX.md)** for detailed instructions.

**Quick Fix:**
1. Install Termux API: `pkg install termux-api`
2. Grant network permissions in Android Settings → Apps → Termux → Permissions
3. Ensure your `.env` has the correct `STATIC_IP` (usually `192.168.43.1` for Android hotspot)
4. Verify server is listening on `0.0.0.0:3000` (not just `127.0.0.1`)

### Other Issues

- **Port 3000 blocked**: Use a different port in .env
- **Can't install Node.js**: Update Termux: `pkg update`
- **Permission denied**: Run `termux-setup-storage` first
- **Network issues**: Check firewall, ensure hotspot is active
- **Wrong IP address**: Manually set `STATIC_IP` in `.env` file

## Quick Start (Computer Method)

If running on computer is easier:

1. Start server on computer
2. Enable hotspot on computer (or use WiFi)
3. Share IP address with riders
4. Riders access from their Android browsers

This is the simplest method! 🎉

