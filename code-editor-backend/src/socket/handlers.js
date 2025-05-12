const sessionService = require('../services/sessionService');
const containerService = require('../services/containerService');
const User = require('../models/User'); // Import User model
const ChatMessage = require('../models/ChatMessage'); // Import ChatMessage model
const { v4: uuidv4 } = require('uuid');

// Track active container processes (keyed by sessionId)
const activeContainers = {};

module.exports = {
    io: null,

    setIo: function(ioInstance) {
        this.io = ioInstance;
    },

    handleConnection: function(socket) {
        let currentSessionId = null;
        let currentUser = null; // This will hold a User instance
        const self = this;

        // Handle join session event
        socket.on('join', ({ sessionId, username }) => {
            const session = sessionService.getSession(sessionId);
            if (!session) {
                socket.emit('error', 'Session not found');
                return;
            }

            // Create a User instance
            // Use provided username, fallback to generated. Use socket.id as the user ID for now.
            // In a real app, you might use an authenticated user ID from a JWT.
            const userDisplayName = username || `User-${socket.id.substring(0, 4)}`;
            currentUser = new User(socket.id, userDisplayName, socket.id, sessionId);

            // Add user to the session using the service
            const added = sessionService.addUserToSession(sessionId, currentUser);

            if (!added) {
                // Handle case where user might already be in the session list (e.g., reconnect)
                // For simplicity, we'll just log it here. A real app might update the existing user's socketId.
                console.warn(`User ${currentUser.id} might already be in session ${sessionId}`);
                // Find existing user and update socket ID if necessary
                const existingUser = sessionService.getSessionUsers(sessionId).find(u => u.id === currentUser.id);
                if (existingUser) {
                    existingUser.setSocketId(socket.id);
                    currentUser = existingUser; // Use the existing instance
                } else {
                     socket.emit('error', 'Failed to add user to session');
                     return;
                }
            }

            socket.join(sessionId);
            currentSessionId = sessionId;

            const document = sessionService.getDocument(session.documentId);
            const usersInSession = sessionService.getSessionUsers(sessionId);

            // Emit 'joined' event with structured data
            socket.emit('joined', {
                sessionId: session.id,
                documentId: session.documentId,
                language: document ? document.language : null,
                // Initial code state should ideally come from the collaborative service (Yjs/WebRTC)
                // For now, we might omit it or send the potentially stale version from the document model
                // initialCode: document ? document.content : '', // Be cautious with this
                users: usersInSession.map(u => u.getInfo()) // Send user info using model's method
            });

            // Notify others that a user joined
            socket.to(sessionId).emit('userJoined', {
                user: currentUser.getInfo(), // Send new user's info
                users: usersInSession.map(u => u.getInfo()) // Send updated full list
            });

            console.log(`User ${currentUser.username} (${currentUser.id}) joined session ${sessionId}`);
        });

        // REMOVED 'codeUpdate' handler - This should be managed by the collaborative service (e.g., Yjs/WebRTC)

        // Execute code using Docker containers
        socket.on('execute', async ({ sessionId, code }) => { // Keep receiving code for execution trigger
            const session = sessionService.getSession(sessionId);
            if (!session) {
                socket.emit('error', 'Session not found');
                return;
            }
            if (!currentUser) {
                 socket.emit('error', 'User not identified in session');
                 return;
            }

            const document = sessionService.getDocument(session.documentId);
            if (!document) {
                socket.emit('error', 'Associated document not found');
                return;
            }

            // NOTE: The 'code' received here might be slightly stale in a highly collaborative scenario.
            // Ideally, the execution trigger might just signal to run the *current* state
            // from the collaborative document source (Yjs/Redis).
            // For now, we use the code sent with the event and update the document model's potentially stale copy.
            document.updateContent(code); // Update the model's representation

            // Notify all users that execution started
            const executionStartData = {
                userId: currentUser.id,
                username: currentUser.username
            };
            socket.emit('executionStarted', executionStartData); // Notify self
            socket.to(sessionId).emit('executionStarted', executionStartData); // Notify others

            // Stop any existing container for this session
            if (activeContainers[sessionId]) {
                console.log(`Stopping existing container for session ${sessionId}`);
                await containerService.stopContainer(activeContainers[sessionId].containerId);
                delete activeContainers[sessionId];
            }

            // Execute in container and handle output
            try {
                 console.log(`Executing code for session ${sessionId}, language: ${document.language}`);
                 const container = await containerService.executeInContainer(
                    session.id, // Use session ID for context if needed by containerService
                    session.path, // Pass the session-specific temp path
                    document.language, // Get language from the document model
                    code, // Use the code received in the event
                    (output, waitingForInput, finished) => {
                        // Send output to all clients in the session
                        if (output) {
                            self.io.to(sessionId).emit('output', output);
                        }

                        // Signal if waiting for input
                        if (waitingForInput) {
                             self.io.to(sessionId).emit('waitingForInput', true);
                        }

                        // Signal when execution is complete
                        if (finished) {
                            console.log(`Execution finished for session ${sessionId}`);
                            self.io.to(sessionId).emit('executionEnded', {});
                            delete activeContainers[sessionId]; // Clean up tracking
                        }
                    }
                );

                if (container) {
                    activeContainers[sessionId] = container; // Track the new container
                    console.log(`Started container ${container.containerId} for session ${sessionId}`);
                } else {
                     console.error(`Failed to start container for session ${sessionId}`);
                     self.io.to(sessionId).emit('output', 'Error: Failed to start execution environment.\r\n');
                     self.io.to(sessionId).emit('executionEnded', { error: true });
                }
            } catch (error) {
                 console.error(`Error during execution for session ${sessionId}:`, error);
                 self.io.to(sessionId).emit('output', `Error executing code: ${error.message}\r\n`);
                 self.io.to(sessionId).emit('executionEnded', { error: true });
                 delete activeContainers[sessionId];
            }
        });

        // Handle chat messages (using ChatMessage model)
        // Note: This might be redundant if WebRTC service handles chat. Choose one primary method.
        socket.on('chatMessage', ({ sessionId, message }) => {
            if (!currentUser || !sessionId || !message || typeof message !== 'string') {
                console.warn('Invalid chat message received:', { sessionId, userId: socket.id, message });
                return; // Ignore invalid messages
            }

            const session = sessionService.getSession(sessionId);
             if (!session) {
                 // User might be sending message to a session they aren't technically in?
                 console.warn(`Chat message from ${currentUser.username} for non-existent session ${sessionId}`);
                 return;
             }

            const trimmedMessage = message.trim().substring(0, 1000);
            if (trimmedMessage === '') return; // Ignore empty messages

            // Create ChatMessage instance
            const chatMsg = new ChatMessage(sessionId, currentUser.username, trimmedMessage, currentUser.id);

            // Send to all clients in the session including sender
            self.io.to(sessionId).emit('newChatMessage', chatMsg.getData()); // Use model's method
        });

        // Handle user input to running containers
        socket.on('input', ({ sessionId, input }) => {
            if (!sessionService.getSession(sessionId)) {
                socket.emit('error', 'Session not found');
                return;
            }
             if (!currentUser) {
                 socket.emit('error', 'User not identified');
                 return;
             }

            if (!activeContainers[sessionId] || !activeContainers[sessionId].process) {
                socket.emit('output', 'No active process to receive input\r\n');
                return;
            }

            // Send input to container
            const result = containerService.sendInput(activeContainers[sessionId].process, input);

            if (result) {
                // Echo the input back to the sender (optional)
                // socket.emit('inputEcho', input);

                // Broadcast to other users that input was sent
                socket.to(sessionId).emit('userInput', {
                    input,
                    userId: currentUser.id,
                    username: currentUser.username
                });
            } else {
                socket.emit('output', 'Failed to send input to process\r\n');
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            if (currentUser && currentSessionId) {
                console.log(`User ${currentUser.username} (${currentUser.id}) disconnected from session ${currentSessionId}`);
                const removedUser = sessionService.removeUserFromSession(currentSessionId, currentUser.id);

                if (removedUser) {
                    // Notify remaining users
                    const remainingUsers = sessionService.getSessionUsers(currentSessionId);
                    socket.to(currentSessionId).emit('userLeft', {
                        user: removedUser.getInfo(), // Send info of the user who left
                        users: remainingUsers.map(u => u.getInfo()) // Send updated list
                    });
                }

                 // If the session becomes empty, consider ending it (optional)
                 // if (sessionService.getSessionUsers(currentSessionId).length === 0) {
                 //     console.log(`Session ${currentSessionId} is empty, ending.`);
                 //     sessionService.endSession(currentSessionId);
                 // }
            } else {
                 console.log(`Client disconnected: ${socket.id} (was not in a session)`);
            }

            // Clean up any container associated with the session if the user was the last one (or based on policy)
            // This logic might need refinement depending on whether containers persist beyond user presence.
            // For now, we don't automatically stop containers on disconnect here.
        });
    }
};