/**
 * Socket.IO handler initialization
 * Exports a function to set up socket handlers
 */
const handlers = require('./handlers');

/**
 * Initialize socket handlers
 * @param {Object} io - The Socket.IO server instance 
 */
module.exports = function(io) {
    // Set the io instance for handlers to use
    if (typeof handlers.setIo === 'function') {
        handlers.setIo(io);
    }
    
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        
        // If handlers is an object with handleConnection method
        if (typeof handlers.handleConnection === 'function') {
            handlers.handleConnection(socket);
        } 
        // If handlers is the handleConnection function itself
        else if (typeof handlers === 'function') {
            handlers(socket);
        }
        // Otherwise, set up basic handlers directly here
        else {
            console.error("handlers.js doesn't export expected functions");
            // Set up basic functionality
            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        }
    });
};