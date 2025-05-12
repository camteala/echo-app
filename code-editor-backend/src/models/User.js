class User {
    /**
     * @param {string} id - Unique identifier (e.g., from auth provider or internal)
     * @param {string} username - Display name for the user
     * @param {string} [socketId] - The primary Socket.IO ID associated with the user
     * @param {string} [currentRoomId] - The ID of the room the user is currently in
     */
    constructor(id, username, socketId = null, currentRoomId = null) {
        this.id = id;
        this.username = username;
        this.socketId = socketId;
        this.currentRoomId = currentRoomId;
        this.mediaStatus = { audio: false, video: false }; // Example default
        this.lastActivity = Date.now();
        this.joinTime = Date.now();
    }

    /**
     * Updates the user's primary socket ID.
     * @param {string} socketId
     */
    setSocketId(socketId) {
        this.socketId = socketId;
        this.updateActivity();
    }

    /**
     * Sets the current room ID for the user.
     * @param {string} roomId
     */
    setCurrentRoomId(roomId) {
        this.currentRoomId = roomId;
        this.updateActivity();
    }

    /**
     * Updates the user's media status.
     * @param {object} status - e.g., { audio: boolean, video: boolean }
     */
    setMediaStatus(status) {
        this.mediaStatus = { ...this.mediaStatus, ...status };
        this.updateActivity();
    }

    /**
     * Updates the last activity timestamp.
     */
    updateActivity() {
        this.lastActivity = Date.now();
    }

    /**
     * Get basic user info.
     * @returns {object}
     */
    getInfo() {
        return {
            id: this.id,
            username: this.username,
            socketId: this.socketId,
            currentRoomId: this.currentRoomId,
            mediaStatus: this.mediaStatus,
            lastActivity: this.lastActivity,
            joinTime: this.joinTime,
        };
    }
}

module.exports = User;