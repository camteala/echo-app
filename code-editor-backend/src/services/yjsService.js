/**
 * Y.js WebSocket Service
 * 
 * This service handles real-time document synchronization using Y.js over WebSockets.
 * It manages:
 * - Document persistence (in-memory with optional database integration)
 * - WebSocket connections for collaborative editing
 * - Document state binding
 * 
 * Note: This service carefully avoids handling Socket.IO connections by checking URL paths.
 */


const WebSocket = require('ws');
const http = require('http');
const Y = require('yjs');
const { setupWSConnection, setPersistence } = require('y-websocket/bin/utils');
const { debounce } = require('lodash');

// In-memory document store
const docs = new Map();

// Optional: document persistence handlers
const persistence = {
  bindState: async (docName, ydoc) => {
    // Here you could load document content from a database
    docs.set(docName, ydoc);
  },
  writeState: async (docName, ydoc) => {
    // Here you could save document content to a database
    // This is debounced to prevent saving on every change
    debouncedSave(docName, ydoc);
  }
};

// Debounce save operations to reduce writes
const debouncedSave = debounce((docName, ydoc) => {
  console.log(`Saving document: ${docName}`);
  // Implement your persistence logic here
  // e.g. save ydoc.getText('monaco').toString() to your database
}, 2000);

const initialize = (server) => {
  // Create WebSocket server using the existing HTTP server
  const wss = new WebSocket.Server({ 
    noServer: true,
    perMessageDeflate: false
  });

  // Set up persistence
  setPersistence(persistence);

  // Handle upgrade requests
  server.on('upgrade', (request, socket, head) => {
    // Only handle WebSocket connections that aren't for Socket.IO
    if (request.url.startsWith('/socket.io/')) {
      return; // Let Socket.IO handle its own connections
    }
    
    const url = new URL(request.url, `http://${request.headers.host}`);
    const docName = url.pathname.slice(1);
    
    if (docName) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, { docName });
      });
    } else {
      socket.destroy();
    }
  });

  // Handle WebSocket connections
  wss.on('connection', (conn, req, { docName }) => {
    console.log(`New Yjs connection to document: ${docName}`);
    setupWSConnection(conn, req, { docName });
    
    // Optional: Track active connections
    conn.on('close', () => {
      console.log(`Yjs connection to document ${docName} closed`);
    });
  });

  console.log('Yjs WebSocket server initialized');
  return wss;
};

module.exports = {
  initialize
};