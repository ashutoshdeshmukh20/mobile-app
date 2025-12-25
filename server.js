// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Load config if exists
let config = {};
try {
  if (fs.existsSync(path.join(__dirname, 'config.js'))) {
    config = require('./config');
  }
} catch (e) {
  // Config file doesn't exist or has errors, use defaults
}

const PORT = process.env.PORT || config.port || 3000;
const STATIC_IP = process.env.STATIC_IP || config.staticIP || null;

// Middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Serve static files from React app (if built)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
} else {
  // In development, proxy to React dev server or serve a simple message
  app.get('/', (req, res) => {
    res.send(`
      <html>
        <head><title>Rider Communication</title></head>
        <body>
          <h1>Server is running!</h1>
          <p>Please run <code>npm start</code> in another terminal to start the React dev server.</p>
          <p>Or run <code>npm run build</code> then restart this server for production mode.</p>
        </body>
      </html>
    `);
  });
}

// Socket.IO connection handling
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, role) => {
    if (!roomId) {
      console.error('Invalid roomId:', roomId);
      return;
    }
    
    socket.join(roomId);
    socket.roomId = roomId;
    socket.role = role || 'client';

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    
    const room = rooms.get(roomId);
    const existingUsers = Array.from(room);
    room.add(socket.id);

    // Notify the new user about existing users (if any)
    if (existingUsers.length > 0) {
      existingUsers.forEach(userId => {
        socket.emit('user-joined', userId);
      });
    }

    // Notify others in the room about the new user
    socket.to(roomId).emit('user-joined', socket.id);
    console.log(`User ${socket.id} joined room ${roomId} as ${socket.role}`);
  });

  socket.on('offer', (data) => {
    if (!data || !data.to || !data.offer) {
      console.error('Invalid offer data:', data);
      return;
    }
    socket.to(data.to).emit('offer', {
      offer: data.offer,
      from: socket.id,
    });
  });

  socket.on('answer', (data) => {
    if (!data || !data.to || !data.answer) {
      console.error('Invalid answer data:', data);
      return;
    }
    socket.to(data.to).emit('answer', {
      answer: data.answer,
      from: socket.id,
    });
  });

  socket.on('ice-candidate', (data) => {
    if (!data || !data.to || !data.candidate) {
      console.error('Invalid ice-candidate data:', data);
      return;
    }
    socket.to(data.to).emit('ice-candidate', {
      candidate: data.candidate,
      from: socket.id,
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.roomId) {
      socket.to(socket.roomId).emit('user-left', socket.id);
      if (rooms.has(socket.roomId)) {
        rooms.get(socket.roomId).delete(socket.id);
        if (rooms.get(socket.roomId).size === 0) {
          rooms.delete(socket.roomId);
        }
      }
    }
  });
});

// Get local IP address
function getLocalIP() {
  // Use static IP if configured
  if (STATIC_IP) {
    return STATIC_IP;
  }
  
  // Try to find hotspot IP (common patterns)
  const interfaces = os.networkInterfaces();
  const preferredInterfaces = ['wlan0', 'wlp', 'wifi', 'eth0', 'en0'];
  
  // First, try preferred interfaces (usually WiFi/hotspot)
  for (const prefName of preferredInterfaces) {
    for (const name of Object.keys(interfaces)) {
      if (name.toLowerCase().includes(prefName.toLowerCase())) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            return iface.address;
          }
        }
      }
    }
  }
  
  // Fallback: find any non-internal IPv4
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Skip Docker/container IPs (172.17.x.x, 172.18.x.x, etc.)
        if (!iface.address.startsWith('172.17.') && 
            !iface.address.startsWith('172.18.') &&
            !iface.address.startsWith('172.19.')) {
          return iface.address;
        }
      }
    }
  }
  
  return 'localhost';
}

// Fallback route for React Router (production only)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('\n🚀 Server is running!');
  console.log(`📱 Local:   http://localhost:${PORT}`);
  console.log(`🌐 Network: http://${localIP}:${PORT}`);
  console.log(`\nMode: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️  Run "npm start" in another terminal for React dev server');
    console.log('   Or run "npm run build" then restart for production mode\n');
  } else {
    console.log('\nShare the network address with riders to join!\n');
  }
});

