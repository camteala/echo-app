const { v4: uuidv4 } = require('uuid');

class ChatMessage {
    /**
     * @param {string} roomId - ID of the room/session this message belongs to
     * @param {string} senderUsername - Username of the sender
     * @param {string} content - The text content of the message
     * @param {string} [senderUserId] - (Optional) Unique ID of the sending user
     */
    constructor(roomId, senderUsername, content, senderUserId = null) {
        this.id = uuidv4(); // Unique ID for the message itself
        this.roomId = roomId;
        this.senderUsername = senderUsername;
        this.senderUserId = senderUserId;
        this.content = content;
        this.timestamp = new Date();
    }

    /**
     * Get message data suitable for sending over socket.
     * @returns {object}
     */
    getData() {
        return {
            id: this.id,
            roomId: this.roomId,
            sender: this.senderUsername, // Keep 'sender' for compatibility?
            senderUsername: this.senderUsername,
            senderUserId: this.senderUserId,
            content: this.content,
            timestamp: this.timestamp.toISOString(),
        };
    }
}

module.exports = ChatMessage;