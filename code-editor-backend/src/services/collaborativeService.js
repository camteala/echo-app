const { YSocketIO } = require('y-socket.io/dist/server');

class CollaborationService {
  constructor() {
    this.documents = new Map();
  }

  initialize(server, existingIo) {
    if (!existingIo) {
      console.error('No Socket.IO instance provided to Collaboration service!');
      return;
    }

    this.io = existingIo;
    console.log('Using existing Socket.IO instance for Collaboration service');

    // Initialize Y.js WebSocket adapter
    this.ySocketIO = new YSocketIO(this.io);

    // Document collaboration namespace
    this.docNamespace = this.io.of('/documents');

    this.docNamespace.on('connection', (socket) => {
      console.log('Document collaboration: User connected:', socket.id);
      
      // Join document room
      socket.on('join-document', (documentId) => {
        socket.join(documentId);
        console.log(`Document collaboration: User ${socket.id} joined document: ${documentId}`);
        
        // Broadcast user presence
        socket.to(documentId).emit('user-connected', { userId: socket.id });
      });
      
      socket.on('disconnect', () => {
        console.log('Document collaboration: User disconnected:', socket.id);
      });
    });

    console.log('Collaboration service initialized with namespace /documents');
  }
}

module.exports = new CollaborationService();