#!/bin/bash

echo "Starting Rider Communication App in Development Mode..."
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Start React dev server and Node server in parallel
echo "Starting React dev server and signaling server..."
echo ""

# Start the signaling server in background
node server.js &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Start React dev server (this will block)
npm start

# Cleanup on exit
trap "kill $SERVER_PID 2>/dev/null" EXIT

