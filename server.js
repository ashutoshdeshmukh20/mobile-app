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
    credentials: true,
  },
  transports: ['polling', 'websocket'], // Try polling first (more reliable)
  allowEIO3: true, // Allow Engine.IO v3 clients
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  connectTimeout: 20000, // 20 seconds connection timeout
  upgradeTimeout: 10000, // 10 seconds for upgrade from polling to websocket
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

// Get all available IP addresses (define functions before routes)
function getAllIPs() {
  const interfaces = os.networkInterfaces();
  const allIPs = [];
  const hotspotRanges = [];
  const otherIPs = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const addr = iface.address;
        // Skip Docker/container IPs (172.17.x.x, 172.18.x.x, etc.)
        if (addr.startsWith('172.17.') || 
            addr.startsWith('172.18.') ||
            addr.startsWith('172.19.')) {
          continue;
        }
        // Prioritize common hotspot ranges
        if (addr.startsWith('192.168.') || 
            addr.startsWith('172.20.') ||
            addr.startsWith('10.0.')) {
          hotspotRanges.push(addr);
        } else {
          otherIPs.push(addr);
        }
      }
    }
  }
  
  // Combine: hotspot ranges first, then others
  return [...hotspotRanges, ...otherIPs];
}

// Get primary local IP address (for backward compatibility)
function getLocalIP() {
  // Use static IP if configured (optional)
  if (STATIC_IP) {
    return STATIC_IP;
  }
  
  const allIPs = getAllIPs();
  // Always prefer network IPs over localhost
  // Only return localhost if no network IPs are available
  if (allIPs.length > 0) {
    return allIPs[0];
  }
  
  // Fallback to localhost only if no network interfaces found
  return 'localhost';
}

// API routes MUST be defined BEFORE static file serving
// API endpoint to get server IP address(es)
app.get('/api/ip', (req, res) => {
  console.log('API /api/ip requested from:', req.ip, req.headers.host);
  try {
    const allIPs = getAllIPs();
    const primaryIP = getLocalIP();
    
    // Get client's access method
    const clientIP = req.ip || req.connection.remoteAddress;
    const isLocalhost = req.headers.host && (
      req.headers.host.includes('localhost') || 
      req.headers.host.includes('127.0.0.1')
    );
    
    res.setHeader('Content-Type', 'application/json');
    res.json({
      primary: primaryIP,
      all: allIPs,
      port: PORT,
      url: `http://${primaryIP}:${PORT}`,
      urls: allIPs.map(ip => `http://${ip}:${PORT}`),
      accessedVia: isLocalhost ? 'localhost' : 'network',
      // Include all network IPs (excluding localhost)
      networkIPs: allIPs.filter(ip => ip !== 'localhost' && ip !== '127.0.0.1')
    });
  } catch (error) {
    console.error('Error in /api/ip:', error);
    res.status(500).json({ error: 'Failed to get IP address' });
  }
});

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
  console.log('Socket transport:', socket.conn.transport.name);

  socket.on('join-room', (roomId, role) => {
    if (!roomId) {
      console.error('Invalid roomId:', roomId);
      socket.emit('error', { message: 'Invalid room ID' });
      return;
    }
    
    try {
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
      
      // Send confirmation to client
      socket.emit('room-joined', { roomId, role: socket.role });
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room: ' + error.message });
    }
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

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('User disconnected:', socket.id, 'Reason:', reason);
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

// Functions moved above - they're now defined before the API route

// Fallback route for React Router (production only) - MUST be last
// This catches all routes not matched above (like /host, /join, /call)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes (shouldn't happen, but safety check)
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  const allIPs = getAllIPs();
  
  console.log('\n🚀 Server is running!');
  console.log(`📱 Local:   http://localhost:${PORT}`);
  
  if (allIPs.length > 0) {
    console.log(`\n🌐 Network Addresses (use any of these):`);
    allIPs.forEach((ip, index) => {
      const marker = index === 0 ? ' ⭐' : '';
      console.log(`   http://${ip}:${PORT}${marker}`);
    });
    if (STATIC_IP && STATIC_IP !== localIP) {
      console.log(`\n⚠️  Note: STATIC_IP is set to ${STATIC_IP}, but detected IP is ${localIP}`);
      console.log(`   Using detected IP: ${localIP}`);
    }
  } else {
    console.log(`🌐 Network: http://${localIP}:${PORT}`);
    console.log(`⚠️  Could not detect network IP. Using: ${localIP}`);
  }
  
  console.log(`\nMode: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️  Run "npm start" in another terminal for React dev server');
    console.log('   Or run "npm run build" then restart for production mode\n');
  } else {
    console.log('\n💡 Tip: IP address is auto-detected dynamically');
    console.log('   Share any of the network addresses above with riders to join!\n');
  }
});

