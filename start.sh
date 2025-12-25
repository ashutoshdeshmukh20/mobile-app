#!/bin/bash

echo "Starting Rider Communication App..."
echo ""

# Check if .env file exists, if not create from example
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env 2>/dev/null || echo "# Server Configuration
PORT=3000
STATIC_IP=
NODE_ENV=production" > .env
    echo "⚠️  Please edit .env file and set STATIC_IP to your hotspot IP address"
    echo "   Example: STATIC_IP=192.168.43.1"
    echo ""
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Build the React app
echo "Building React app..."
npm run build

# Load .env file if exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start the server in production mode
echo ""
echo "Starting server..."
echo "The app will be accessible on your local network IP"
echo ""

NODE_ENV=production node server.js
