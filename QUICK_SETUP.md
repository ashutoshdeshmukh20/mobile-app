# Quick Setup - Static IP

## Set Your Static IP Address

1. **Edit the `.env` file:**
   ```bash
   nano .env
   ```

2. **Set your hotspot IP:**
   ```
   STATIC_IP=192.168.43.1
   ```
   (Replace with your actual hotspot IP)

3. **Save and start the server:**
   ```bash
   ./start.sh
   ```

## Finding Your Hotspot IP

### Android Phone:
- Settings → Network & Internet → Hotspot & tethering
- Look for "AP address" or "Gateway" (usually 192.168.43.1)

### Or check on the server machine:
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

## Common Hotspot IPs:
- **Android**: `192.168.43.1`
- **iPhone**: `172.20.10.1`  
- **Windows**: `192.168.137.1`

Once set, the IP will stay the same every time! 🎉
