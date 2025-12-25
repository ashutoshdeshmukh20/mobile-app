#!/bin/bash

# Termux Setup Script for Mobile App
# This script helps set up the server on Termux with proper network configuration

echo "=========================================="
echo "Termux Network Setup for Mobile App"
echo "=========================================="
echo ""

# Check if running in Termux
if [ ! -d "$PREFIX" ]; then
    echo "⚠️  Warning: This script is designed for Termux"
    echo "   Continuing anyway..."
    echo ""
fi

# Step 1: Check Termux API
echo "Step 1: Checking Termux API..."
if ! command -v termux-wake-lock &> /dev/null; then
    echo "❌ Termux API not installed"
    echo ""
    echo "Please install Termux API:"
    echo "1. Install 'Termux:API' app from F-Droid:"
    echo "   https://f-droid.org/en/packages/com.termux.api/"
    echo "2. Then run: pkg install termux-api"
    echo ""
    read -p "Press Enter after installing Termux API, or Ctrl+C to exit..."
else
    echo "✅ Termux API is installed"
    termux-wake-lock
fi
echo ""

# Step 2: Find IP address
echo "Step 2: Finding your IP address..."
echo ""

# Try multiple methods to find IP
IP_ADDRESS=""

# Method 1: Check default route
if command -v ip &> /dev/null; then
    DEFAULT_IFACE=$(ip route | grep default | awk '{print $5}' | head -1)
    if [ ! -z "$DEFAULT_IFACE" ]; then
        IP_ADDRESS=$(ip addr show "$DEFAULT_IFACE" 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d'/' -f1 | head -1)
    fi
fi

# Method 2: Use hostname
if [ -z "$IP_ADDRESS" ] && command -v hostname &> /dev/null; then
    IP_ADDRESS=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

# Method 3: Check all interfaces
if [ -z "$IP_ADDRESS" ] && command -v ip &> /dev/null; then
    IP_ADDRESS=$(ip addr show | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | cut -d'/' -f1 | head -1)
fi

if [ ! -z "$IP_ADDRESS" ]; then
    echo "📍 Detected IP address: $IP_ADDRESS"
    echo ""
    echo "Common Android hotspot IPs:"
    echo "  - 192.168.43.1 (most common)"
    echo "  - 192.168.1.1"
    echo "  - Check Settings → Network → Hotspot for actual IP"
    echo ""
    read -p "Is $IP_ADDRESS correct? (y/n) [y]: " confirm
    if [[ "$confirm" =~ ^[Nn]$ ]]; then
        read -p "Enter your hotspot IP address: " IP_ADDRESS
    fi
else
    echo "⚠️  Could not auto-detect IP address"
    echo ""
    echo "Please find your hotspot IP:"
    echo "  Settings → Network & Internet → Hotspot & tethering"
    echo ""
    read -p "Enter your hotspot IP address: " IP_ADDRESS
fi

echo ""

# Step 3: Create/Update .env file
echo "Step 3: Configuring .env file..."

if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
PORT=3000
STATIC_IP=$IP_ADDRESS
NODE_ENV=production
EOF
else
    echo "Updating .env file..."
    # Update STATIC_IP if it exists, or add it
    if grep -q "STATIC_IP" .env; then
        sed -i "s/STATIC_IP=.*/STATIC_IP=$IP_ADDRESS/" .env
    else
        echo "STATIC_IP=$IP_ADDRESS" >> .env
    fi
    
    # Ensure PORT is set
    if ! grep -q "PORT=" .env; then
        echo "PORT=3000" >> .env
    fi
    
    # Ensure NODE_ENV is set
    if ! grep -q "NODE_ENV=" .env; then
        echo "NODE_ENV=production" >> .env
    fi
fi

echo "✅ .env file configured"
echo ""

# Step 4: Display configuration
echo "Step 4: Current Configuration"
echo "=========================================="
cat .env
echo "=========================================="
echo ""

# Step 5: Network test instructions
echo "Step 5: Network Access Setup"
echo ""
echo "⚠️  IMPORTANT: Android firewall may block incoming connections"
echo ""
echo "To allow network access:"
echo ""
echo "1. Go to: Settings → Apps → Termux → Permissions"
echo "   Enable 'Network' permission"
echo ""
echo "2. Some Android versions:"
echo "   Settings → Network & Internet → Firewall"
echo "   Allow Termux"
echo ""
echo "3. Ensure hotspot is active:"
echo "   Settings → Network & Internet → Hotspot & tethering"
echo "   Turn ON mobile hotspot"
echo ""
read -p "Press Enter after completing the above steps..."

# Step 6: Test server
echo ""
echo "Step 6: Testing Server Configuration"
echo ""
echo "To test if the server is accessible:"
echo ""
echo "1. Start the server:"
echo "   npm run serve"
echo ""
echo "2. On the SAME phone, test:"
echo "   curl http://localhost:3000"
echo "   Or open browser: http://localhost:3000"
echo ""
echo "3. On ANOTHER device connected to hotspot, test:"
echo "   curl http://$IP_ADDRESS:3000"
echo "   Or open browser: http://$IP_ADDRESS:3000"
echo ""
echo "If step 2 works but step 3 doesn't, the firewall is blocking connections."
echo "See TERMUX_FIREWALL_FIX.md for detailed troubleshooting."
echo ""

# Step 7: Verify port binding
echo "Step 7: Quick Network Check"
echo ""
echo "To verify the server will bind correctly, run:"
echo "  netstat -tuln | grep 3000"
echo ""
echo "After starting the server, it should show:"
echo "  tcp  0  0  0.0.0.0:3000  0.0.0.0:*  LISTEN"
echo ""
echo "If it shows 127.0.0.1:3000 instead, the server won't accept external connections."
echo ""

echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Ensure hotspot is ON"
echo "2. Start server: npm run serve"
echo "3. Share the IP address ($IP_ADDRESS:3000) with other devices"
echo "4. Other devices must connect to your hotspot"
echo ""
echo "For troubleshooting, see: TERMUX_FIREWALL_FIX.md"
echo ""

