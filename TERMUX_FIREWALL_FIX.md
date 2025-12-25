# Fixing Network Access Issues in Termux

When running the server in Termux on Android, other devices might not be able to access it even when connected to the hotspot. This is usually due to Android's firewall blocking incoming connections.

## Quick Fix

### Step 1: Install Termux API (Required for Network Access)

```bash
# Install Termux API app from F-Droid
# https://f-droid.org/en/packages/com.termux.api/

# Then in Termux, install the API package:
pkg install termux-api
```

### Step 2: Grant Network Permissions

```bash
# Grant Termux network access
termux-wake-lock
```

### Step 3: Open Firewall Port

You have several options:

#### Option A: Using Termux API (Recommended)

```bash
# Allow incoming connections on port 3000
termux-wake-lock
# Note: Android 10+ may require additional steps
```

#### Option B: Using Android Settings

1. Go to **Settings** → **Apps** → **Termux**
2. Tap **Permissions**
3. Enable **Network** permission
4. Some Android versions: Go to **Settings** → **Network & Internet** → **Firewall** → Allow Termux

#### Option C: Using ADB (If you have root/ADB access)

```bash
# On your computer with ADB:
adb shell "su -c 'iptables -I INPUT -p tcp --dport 3000 -j ACCEPT'"
```

### Step 4: Find Your Correct IP Address

When hosting a hotspot on Android, the phone's IP address is usually the gateway IP:

```bash
# In Termux, check your IP:
ip addr show | grep "inet " | grep -v 127.0.0.1

# Or use:
hostname -I

# Common hotspot IPs:
# - Android: 192.168.43.1 (most common)
# - Some Android: 192.168.1.1
# - iPhone: 172.20.10.1
```

### Step 5: Set Static IP in .env

```bash
# Edit .env file
nano .env

# Set the IP you found (usually 192.168.43.1 for Android hotspot)
STATIC_IP=192.168.43.1
PORT=3000
NODE_ENV=production
```

### Step 6: Verify Server is Accessible

1. Start the server:
   ```bash
   npm run serve
   ```

2. On the **same phone** (host), test:
   ```bash
   curl http://localhost:3000
   # Or open browser: http://localhost:3000
   ```

3. On **another device** connected to the hotspot, test:
   ```bash
   # From another device on the hotspot:
   curl http://192.168.43.1:3000
   # Or open browser: http://192.168.43.1:3000
   ```

## Troubleshooting

### Issue: Still can't access from other devices

1. **Check if server is binding correctly:**
   ```bash
   # In Termux, verify server is listening on 0.0.0.0:
   netstat -tuln | grep 3000
   # Should show: 0.0.0.0:3000
   ```

2. **Check Android firewall:**
   - Go to **Settings** → **Network & Internet** → **Firewall** (if available)
   - Ensure Termux is allowed

3. **Try a different port:**
   ```bash
   # Edit .env
   PORT=8080
   # Restart server
   ```

4. **Check hotspot is active:**
   - Settings → Network & Internet → Hotspot & tethering
   - Ensure hotspot is ON and devices are connected

5. **Verify IP address:**
   ```bash
   # In Termux:
   ip route | grep default
   # This shows the gateway IP (usually your phone's IP when hosting hotspot)
   ```

### Issue: IP detection is wrong

If the server shows the wrong IP:

1. Manually set it in `.env`:
   ```bash
   STATIC_IP=YOUR_ACTUAL_IP
   ```

2. Find your actual IP:
   ```bash
   # Method 1: Check all interfaces
   ip addr show
   
   # Method 2: Check default route
   ip route | grep default
   
   # Method 3: Check hotspot settings
   # Settings → Network & Internet → Hotspot & tethering
   # Look for "IP address" or "Gateway"
   ```

### Issue: Connection timeout

1. **Disable mobile data** (if hotspot is using WiFi):
   - Sometimes Android blocks connections when mobile data is active

2. **Check if devices are on same network:**
   ```bash
   # On host phone (Termux):
   hostname -I
   
   # On client device, ping the host:
   ping 192.168.43.1
   ```

3. **Try disabling VPN** (if any):
   - VPNs can interfere with local network access

## Alternative: Use Termux Widget (Advanced)

If you have root access, you can use Termux Widget to manage firewall rules automatically.

## Still Not Working?

If none of the above works:

1. **Use a different port** (some ISPs block common ports)
2. **Run server on a computer** instead and access from Android browsers
3. **Check Android version** - some versions have stricter firewall rules
4. **Try using Termux:Boot** to ensure network permissions persist

## Quick Test Script

Create a test script to verify network access:

```bash
# Create test-server.js
cat > test-server.js << 'EOF'
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Server is accessible!\n');
});
server.listen(3000, '0.0.0.0', () => {
  console.log('Test server running on 0.0.0.0:3000');
  console.log('Try accessing from another device on the hotspot');
});
EOF

# Run it
node test-server.js

# Test from another device:
# curl http://YOUR_IP:3000
```

If the test server works but your app doesn't, the issue is with the app configuration, not the network.

