const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { exec } = require('child_process');
const config = require('./src/config');
const routes = require('./src/routes');
const socketHandler = require('./src/socket');
const webRTCService = require('./src/services/webrtcService');
const yjsService = require('./src/services/yjsService');
const { createClient } = require('@supabase/supabase-js');

// At the top of server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const app = express();
const server = http.createServer(app);
const port = config.server.port;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
//app.use('/api/auth', require('./src/services/auth-service'));
// Routes
app.use('/api', routes);

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Initialize socket handlers
socketHandler(io);

// Initialize WebRTC service
webRTCService.initialize(server, io);

// Initialize Yjs WebSocket server
yjsService.initialize(server);

// Start the server (SINGLE SERVER START)
server.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Try another port.`);
    } else {
        console.error('Server error:', error);
    }
    process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    process.exit(0);
});

// Create JWT middleware that works with Supabase tokens
const authenticateToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error) throw error;
      req.user = data.user;
      next();
    } catch (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
  };
  
  // Add protected routes
  app.get('/api/protected-resource', authenticateToken, (req, res) => {
    // Access req.user.id, req.user.email, etc.
    res.json({ message: 'Protected data', user: req.user });
  });