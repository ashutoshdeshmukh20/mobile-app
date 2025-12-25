#!/bin/bash

echo "Starting Rider Communication App..."
echo ""

# Check if .env file exists, if not create from example
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env 2>/dev/null || echo "# Server Configuration
# IP detection is automatic - STATIC_IP is optional
# Only set STATIC_IP if auto-detection fails
PORT=3000
# STATIC_IP=
NODE_ENV=production" > .env
    echo "✅ IP address will be auto-detected dynamically"
    echo "   (You can optionally set STATIC_IP in .env if needed)"
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
echo "IP address will be auto-detected and displayed"
echo ""

NODE_ENV=production node server.js
