# Setting a Static IP Address

The server IP address can change if you have multiple network interfaces. To keep it static, you have two options:

## Option 1: Using .env file (Recommended)

1. Create a `.env` file in the project root:
   ```bash
   STATIC_IP=192.168.43.1
   PORT=3000
   NODE_ENV=production
   ```

2. Replace `192.168.43.1` with your actual hotspot IP address

3. Start the server:
   ```bash
   ./start.sh
   ```

The `.env` file will be automatically loaded.

## Option 2: Using config.js

1. Copy the example config:
   ```bash
   cp config.js config.local.js
   ```

2. Edit `config.local.js` and set your IP:
   ```javascript
   module.exports = {
     staticIP: '192.168.43.1', // Your hotspot IP
     port: 3000,
   };
   ```

3. Rename it to `config.js`:
   ```bash
   mv config.local.js config.js
   ```

## Option 3: Environment Variable

Set it when starting the server:
```bash
STATIC_IP=192.168.43.1 npm run serve
```

## Finding Your Hotspot IP

### On Android:
1. Enable mobile hotspot
2. Go to Settings → Network & Internet → Hotspot & tethering
3. Check the IP address shown (usually 192.168.43.1)

### On Linux:
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

### On the server machine:
The server will try to detect it automatically, but you can check:
```bash
hostname -I
```

## Common Hotspot IPs:
- Android: `192.168.43.1`
- iPhone: `172.20.10.1`
- Windows: `192.168.137.1`

Once set, the IP will remain constant every time you start the server!

