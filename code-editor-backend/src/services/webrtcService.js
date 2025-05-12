const User = require('../models/User');
const ChatMessage = require('../models/ChatMessage');

class WebRTCService {
    constructor() {
        // Track rooms by roomId. Stores room metadata and User instances.
        // Structure: { roomId: { users: { socketId: UserInstance }, messages: ChatMessageInstance[] } }
        this.rooms = {};
        // Track users by username to prevent duplicates. Stores { socketId, roomId, lastUpdated }
        this.usernames = {};
        this.io = null;
        this.rtcNamespace = null;
    }

    initialize(server, existingIo) {
        if (existingIo) {
            this.io = existingIo;
            console.log('Using existing Socket.IO instance for WebRTC service');
        } else {
            console.error('No Socket.IO instance provided to WebRTC service!');
            return;
        }

        this.rtcNamespace = this.io.of('/webrtc');

        this.rtcNamespace.on('connection', (socket) => {
            console.log(`WebRTC: Socket connected: ${socket.id}`);

            // Join a room with username
            socket.on('join-room', (roomId, username) => {
                // Validate username
                if (!username || typeof username !== 'string' || username.trim() === '') {
                    console.log(`WebRTC: Rejecting connection with invalid username from ${socket.id}`);
                    socket.emit('error', { message: 'Valid username is required' });
                    socket.disconnect(true); // Disconnect invalid user
                    return;
                }
                const trimmedUsername = username.trim();

                // Prevent socket IDs from being used as usernames (basic check)
                if (trimmedUsername.includes('-') || trimmedUsername.includes('_') || trimmedUsername.length > 30) {
                    console.log(`WebRTC: Rejecting suspicious username: ${trimmedUsername}`);
                    socket.emit('error', { message: 'Invalid username format' });
                    socket.disconnect(true);
                    return;
                }

                console.log(`WebRTC: ${trimmedUsername} (${socket.id}) attempting to join room ${roomId}`);

                // Clean up any existing connections for this username in ANY room
                this.disconnectDuplicateUsernames(trimmedUsername, socket.id);

                // Initialize room if needed
                if (!this.rooms[roomId]) {
                    this.rooms[roomId] = {
                        users: {}, // Store User instances keyed by socketId
                        messages: [] // Store ChatMessage instances
                    };
                    console.log(`WebRTC: Initialized room ${roomId}`);
                }

              
                const user = new User(socket.id, trimmedUsername, socket.id, roomId);

                this.usernames[trimmedUsername] = {
                    socketId: socket.id,
                    roomId: roomId,
                    lastUpdated: Date.now()
                };

                // Store User instance in room
                this.rooms[roomId].users[socket.id] = user;

                // Store data on socket for easy access (redundant with User model but can be convenient)
                socket.username = trimmedUsername; 
                socket.currentRoom = roomId; 

                // Join the Socket.IO room
                socket.join(roomId);

                // Clean up any stale connections for this room *after* joining
                this.cleanupRoomConnections(roomId);

                // Log current room state
                console.log(`Room ${roomId} users:`, Object.values(this.rooms[roomId].users).map(
                    u => `${u.username} (${u.id})`
                ));

                // Send list of users (as plain info objects) to the new user
                socket.emit('user-list', Object.values(this.rooms[roomId].users).map(u => u.getInfo()));

                // Send chat history (as plain data objects) to the new user
                if (this.rooms[roomId].messages.length > 0) {
                    socket.emit('chat-history', this.rooms[roomId].messages.map(m => m.getData()));
                }

                // Notify others (send plain info object)
                socket.to(roomId).emit('user-joined', user.getInfo());
            });

            // Handle WebRTC signaling
            socket.on('signal', (data) => {
                const { type, to } = data;
                const senderUser = this.findUserBySocketId(socket.id); // Find User instance

                if (!senderUser) return; // Ignore signals from unknown users

                // Don't log ICE candidates (too verbose)
                if (type !== 'ice-candidate') {
                    console.log(`WebRTC signal: ${type} from ${senderUser.username} (${socket.id}) to ${to}`);
                }

                // Forward signal to recipient only, including sender info
                this.rtcNamespace.to(to).emit('signal', {
                    ...data,
                    from: socket.id, // Keep socket ID for routing
                    fromUsername: senderUser.username // Add username from model
                });
            });

            // Handle chat messages using ChatMessage model
            socket.on('chat', (message) => {
                const roomId = socket.currentRoom;
                const senderUser = this.findUserBySocketId(socket.id);

                if (!roomId || !senderUser) {
                     console.warn(`WebRTC: Chat message from unknown user/room: ${socket.id}`);
                     return;
                }

                // Validate message content
                if (!message || typeof message !== 'string') {
                    socket.emit('error', { message: 'Invalid chat message format' });
                    return;
                }

                const trimmedMessage = message.trim().substring(0, 1000); // Limit length
                if (trimmedMessage === '') return; // Skip empty messages

                // Rate limiting (basic)
                const now = Date.now();
                if (senderUser.lastMessageTime && (now - senderUser.lastMessageTime < 500)) {
                    // Optionally send an error, or just ignore
                    // socket.emit('error', { message: 'Please slow down your messages' });
                    return;
                }
                senderUser.lastMessageTime = now; // Store timestamp on User instance

                // Update activity timestamp
                this.updateUserActivity(socket);

                // Create ChatMessage instance
                const chatMessage = new ChatMessage(roomId, senderUser.username, trimmedMessage, senderUser.id);

                // Store message instance in room history
                if (this.rooms[roomId]) { // Check room still exists
                     this.rooms[roomId].messages.push(chatMessage);
                     // Keep only last 50 messages
                     if (this.rooms[roomId].messages.length > 50) {
                         this.rooms[roomId].messages = this.rooms[roomId].messages.slice(-50);
                     }
                } else {
                     console.warn(`WebRTC: Room ${roomId} not found while trying to store chat message.`);
                     return; // Don't try to emit if room is gone
                }


                // Send message data to all in room including sender
                this.rtcNamespace.to(roomId).emit('chat', chatMessage.getData()); // Use model's method
            });

            // Handle media status changes
            socket.on('media', (status) => {
                 const roomId = socket.currentRoom;
                 const user = this.findUserBySocketId(socket.id);

                 if (!roomId || !user) return;

                 // Validate status object (basic)
                 if (typeof status?.audio !== 'boolean' && typeof status?.video !== 'boolean') {
                     console.warn(`WebRTC: Invalid media status received from ${user.username}`);
                     return;
                 }

                 // Update User model state
                 user.setMediaStatus(status);

                 // Update activity timestamp
                 this.updateUserActivity(socket);

                 // Send to others in room
                 socket.to(roomId).emit('media', {
                     userId: user.id, // Use ID from model
                     username: user.username, // Use username from model
                     audio: user.mediaStatus.audio,
                     video: user.mediaStatus.video
                 });
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`WebRTC: Socket disconnected: ${socket.id} (${socket.username || 'unknown'})`);
                this.handleDisconnect(socket);
            });

            // Handle explicit leaving
            socket.on('leave', () => {
                console.log(`WebRTC: User ${socket.username || socket.id} leaving room ${socket.currentRoom}`);
                this.handleDisconnect(socket); // Treat leave same as disconnect
            });

            // Heartbeat to check liveness
            socket.on('heartbeat', () => {
                this.updateUserActivity(socket);
            });
        });

        // Setup periodic cleanup
        setInterval(() => this.cleanupInactiveSockets(), 15000); // Check every 15s
        setInterval(() => this.deepCleanup(), 120000); // Deeper check every 2 mins

        console.log('WebRTC service initialized with namespace /webrtc');
    }

    // Find User instance by socket ID across all rooms
    findUserBySocketId(socketId) {
        for (const roomId in this.rooms) {
            if (this.rooms[roomId].users && this.rooms[roomId].users[socketId]) {
                return this.rooms[roomId].users[socketId];
            }
        }
        return null;
    }

    // Update user activity timestamp on the User instance
    updateUserActivity(socket) {
        const user = this.findUserBySocketId(socket.id);
        if (user) {
            user.updateActivity(); // Use model's method

            // Also update username tracking timestamp
            if (this.usernames[user.username]) {
                this.usernames[user.username].lastUpdated = user.lastActivity;
            }
        }
    }

    // Handle disconnect/leave
    handleDisconnect(socket) {
        const user = this.findUserBySocketId(socket.id);
        if (!user) {
             // console.log(`WebRTC: Disconnected socket ${socket.id} not found in any room.`);
             return; // User already cleaned up or never fully joined
        }

        const roomId = user.currentRoomId;
        const username = user.username;

        console.log(`WebRTC: Handling disconnect for ${username} (${socket.id}) from room ${roomId}`);

        if (roomId && this.rooms[roomId] && this.rooms[roomId].users[socket.id]) {
            // Remove from room's user list
            delete this.rooms[roomId].users[socket.id];
            console.log(`WebRTC: Removed ${username} from room ${roomId} users list.`);

            // Notify others
            this.rtcNamespace.to(roomId).emit('user-left', {
                id: user.id, // Send user ID
                username: username
            });

            // Clean up empty room
            if (Object.keys(this.rooms[roomId].users).length === 0) {
                delete this.rooms[roomId];
                console.log(`WebRTC: Room ${roomId} deleted (empty)`);
            }
        } else {
             console.warn(`WebRTC: Room ${roomId} or user ${socket.id} not found during disconnect cleanup.`);
        }

        // Clean up username tracking IF this socket was the one associated
        if (username && this.usernames[username] && this.usernames[username].socketId === socket.id) {
            delete this.usernames[username];
            console.log(`WebRTC: Removed username tracking for ${username}`);
        }
    }

    // Clean up any other connections with the same username
    disconnectDuplicateUsernames(username, currentSocketId) {
        if (this.usernames[username]) {
            const { socketId, roomId } = this.usernames[username];

            // Skip if it's the same socket that's trying to join/rejoin
            if (socketId === currentSocketId) return;

            console.log(`WebRTC: Found duplicate user ${username} (${socketId}). Disconnecting old socket.`);

            // Get the old socket
            const oldSocket = this.rtcNamespace.sockets.get(socketId);

            if (oldSocket) {
                // Forcefully disconnect the duplicate
                oldSocket.emit('error', { message: 'You have connected from another location.' });
                oldSocket.disconnect(true);
                console.log(`WebRTC: Disconnected old socket ${socketId} for duplicate user ${username}.`);
            } else {
                 console.log(`WebRTC: Old socket ${socketId} for duplicate user ${username} not found, cleaning up data.`);
            }

            // Clean up room data - do this regardless of socket existence
            if (this.rooms[roomId] && this.rooms[roomId].users[socketId]) {
                const oldUser = this.rooms[roomId].users[socketId];
                delete this.rooms[roomId].users[socketId];

                // Notify others about this user leaving
                this.rtcNamespace.to(roomId).emit('user-left', {
                    id: oldUser.id,
                    username: oldUser.username
                });
                 console.log(`WebRTC: Cleaned up room data for old socket ${socketId}.`);

                 // Check if room became empty
                 if (Object.keys(this.rooms[roomId].users).length === 0) {
                     delete this.rooms[roomId];
                     console.log(`WebRTC: Room ${roomId} deleted (empty) after duplicate cleanup.`);
                 }
            }

            // Clean up username tracking immediately
            delete this.usernames[username];
             console.log(`WebRTC: Cleaned up username tracking for duplicate ${username}.`);
        }
    }

    // Clean up inactive sockets based on User model's lastActivity
    cleanupInactiveSockets() {
        const now = Date.now();
        const timeoutMs = 30000; // 30 second timeout


        for (const roomId in this.rooms) {
            if (!this.rooms[roomId] || !this.rooms[roomId].users) continue; // Room might have been deleted

            for (const socketId in this.rooms[roomId].users) {
                // Check room/user still exists as cleanup might happen concurrently
                if (!this.rooms[roomId] || !this.rooms[roomId].users || !this.rooms[roomId].users[socketId]) continue;

                const user = this.rooms[roomId].users[socketId];
                const socket = this.rtcNamespace.sockets.get(socketId);
                const isInactive = now - user.lastActivity > timeoutMs;

                // Clean up if socket doesn't exist OR is inactive
                if (!socket || isInactive) {
                    console.log(`WebRTC: Cleaning up ${isInactive ? 'inactive' : 'disconnected'} user ${user.username} (${socketId}) from room ${roomId}`);

                    // Disconnect it if it exists (and is inactive)
                    if (socket && isInactive) {
                        socket.disconnect(true);
                    }

                    this.handleDisconnect(socket || { id: socketId, currentRoom: roomId, username: user.username });
                }
            }

             // Check again if room became empty after potential cleanups in the loop
             if (this.rooms[roomId] && Object.keys(this.rooms[roomId].users).length === 0) {
                 delete this.rooms[roomId];
                 console.log(`WebRTC: Room ${roomId} deleted (empty) during inactive cleanup.`);
             }
        }
    }

    // Clean up any stale connections in a specific room (e.g., after joining)
    cleanupRoomConnections(roomId) {
        if (!this.rooms[roomId] || !this.rooms[roomId].users) return;

        const socketIdsInRoom = Object.keys(this.rooms[roomId].users);
        // console.log(`WebRTC: Checking ${socketIdsInRoom.length} connections in room ${roomId}`); // Verbose

        for (const socketId of socketIdsInRoom) {
             // Re-check user exists in case of concurrent modification
             if (!this.rooms[roomId] || !this.rooms[roomId].users[socketId]) continue;

            const socket = this.rtcNamespace.sockets.get(socketId);

            // If socket doesn't exist in the namespace, clean it up
            if (!socket) {
                const user = this.rooms[roomId].users[socketId]; // Get user info before deleting
                console.log(`WebRTC: Cleaning up stale connection for ${user?.username || 'unknown'} (${socketId}) in room ${roomId}`);

                // Manually trigger the disconnect handler logic
                 this.handleDisconnect({ id: socketId, currentRoom: roomId, username: user?.username });
            }
        }
    }

    // Perform a deep cleanup of all data structures (less frequent)
    deepCleanup() {
        console.log("WebRTC: Performing deep cleanup...");
        const now = Date.now();
        const staleThreshold = 120000; // 2 minutes

        // 1. Check username registry for stale entries
        for (const username in this.usernames) {
            const userData = this.usernames[username];
            const isStale = now - userData.lastUpdated > staleThreshold;
            const socketExists = this.rtcNamespace.sockets.get(userData.socketId);

            if (isStale || !socketExists) {
                console.log(`WebRTC: Removing stale/disconnected username record for ${username} (Socket ${userData.socketId} ${socketExists ? 'exists' : 'missing'})`);
                // Trigger cleanup via handleDisconnect if socket is missing but data exists
                if (!socketExists && this.findUserBySocketId(userData.socketId)) {
                     this.handleDisconnect({ id: userData.socketId, currentRoom: userData.roomId, username: username });
                } else {
                     // Just remove username tracking if user data is already gone
                     delete this.usernames[username];
                }
            }
        }

        // 2. Clean up rooms: check users against namespace and username registry
        for (const roomId in this.rooms) {
             if (!this.rooms[roomId] || !this.rooms[roomId].users) continue;

            for (const socketId in this.rooms[roomId].users) {
                 if (!this.rooms[roomId] || !this.rooms[roomId].users[socketId]) continue; // Recheck

                const user = this.rooms[roomId].users[socketId];
                const socket = this.rtcNamespace.sockets.get(socketId);
                const usernameData = this.usernames[user.username];

                // If socket doesn't exist, or username tracking is missing/mismatched, clean up
                if (!socket || !usernameData || usernameData.socketId !== socketId) {
                    console.log(`WebRTC Deep Clean: Mismatch or missing socket/username data for ${user.username} (${socketId}). Cleaning up.`);
                     this.handleDisconnect(socket || { id: socketId, currentRoom: roomId, username: user.username });
                }
            }
             // Final check if room became empty
             if (this.rooms[roomId] && Object.keys(this.rooms[roomId].users).length === 0) {
                 delete this.rooms[roomId];
                 console.log(`WebRTC: Room ${roomId} deleted (empty) during deep cleanup.`);
             }
        }
         console.log("WebRTC: Deep cleanup finished.");
    }
}

// Export a single instance
module.exports = new WebRTCService();