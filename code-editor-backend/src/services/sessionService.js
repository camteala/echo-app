
const fs = require('fs');
const path = require('path');
const Session = require('../models/Session');
const Document = require('../models/Document'); // Import Document model
const User = require('../models/User'); // Import User model

// In-memory storage for Session instances and User instances per session
const sessions = {}; // Stores Session instances keyed by sessionId
const documents = {}; // Stores Document instances keyed by documentId
const sessionUsers = {}; // Stores arrays of User instances keyed by sessionId

const tempBaseDir = path.join(__dirname, '../../temp');

// Ensure base temp directory exists
try {
    if (!fs.existsSync(tempBaseDir)) {
        fs.mkdirSync(tempBaseDir);
    }
} catch (error) {
    console.error(`Error creating base temp directory: ${error}`);
}


/**
 * Create a new coding session and associated document.
 * @param {string} language - Programming language for the session's document.
 * @param {string} [initialCode=''] - Initial code content for the document.
 * @returns {{session: Session, document: Document}} - The created Session and Document instances.
 */
const createSession = (language, initialCode = '') => {
    // 1. Create the Document
    const document = new Document(undefined, initialCode, language); // Let Document generate ID
    documents[document.id] = document;

    // 2. Create the Session, linking the document
    const session = new Session(document.id);
    session.setPath(path.join(tempBaseDir, session.id)); // Set session-specific temp path

    // Create a directory for this session if needed
    try {
        fs.mkdirSync(session.path);
    } catch (error) {
        console.error(`Error creating session directory: ${error}`);
        // Handle error appropriately, maybe return null or throw
        return null;
    }

    sessions[session.id] = session;
    sessionUsers[session.id] = []; // Initialize user list for the session
    document.setSessionId(session.id); // Link document back to session

    console.log(`Created Session ${session.id} linked to Document ${document.id}`);
    return { session, document };
};

/**
 * Get session instance.
 * @param {string} sessionId - ID of the session to retrieve.
 * @returns {Session|null} - Session instance or null if not found.
 */
const getSession = (sessionId) => {
    return sessions[sessionId] || null;
};

/**
 * Get document instance by ID.
 * @param {string} documentId - ID of the document to retrieve.
 * @returns {Document|null} - Document instance or null if not found.
 */
const getDocument = (documentId) => {
    return documents[documentId] || null;
};


/**
 * Add a user to a session.
 * @param {string} sessionId - ID of the session.
 * @param {User} user - User instance to add.
 * @returns {boolean} - True if user was added, false otherwise.
 */
const addUserToSession = (sessionId, user) => {
    if (sessions[sessionId] && sessionUsers[sessionId]) {
        // Avoid adding duplicates based on user ID
        if (!sessionUsers[sessionId].some(u => u.id === user.id)) {
            sessionUsers[sessionId].push(user);
            user.setCurrentRoomId(sessionId); // Update user's current room
            return true;
        }
    }
    return false;
};

/**
 * Remove a user from a session by user ID.
 * @param {string} sessionId - ID of the session.
 * @param {string} userId - ID of the user to remove.
 * @returns {User|null} - The removed User instance or null if not found/removed.
 */
const removeUserFromSession = (sessionId, userId) => {
    if (sessionUsers[sessionId]) {
        const index = sessionUsers[sessionId].findIndex(u => u.id === userId);
        if (index !== -1) {
            const removedUser = sessionUsers[sessionId].splice(index, 1)[0];
            if (removedUser) {
                removedUser.setCurrentRoomId(null); // Clear user's current room
            }
            return removedUser;
        }
    }
    return null;
};

/**
 * Get users in a specific session.
 * @param {string} sessionId - ID of the session.
 * @returns {User[]} - Array of User instances in the session.
 */
const getSessionUsers = (sessionId) => {
    return sessionUsers[sessionId] || [];
};


/**
 * End and clean up a session and its associated document.
 * @param {string} sessionId - ID of the session to end.
 * @returns {boolean} - Whether session was successfully ended.
 */
const endSession = (sessionId) => {
    const session = sessions[sessionId];
    if (session) {
        // Clean up session directory
        try {
            if (fs.existsSync(session.path)) {
                fs.rmSync(session.path, { recursive: true, force: true });
            }
        } catch (error) {
            console.error(`Error removing session directory ${session.path}: ${error}`);
        }

        // Remove document associated with the session
        if (session.documentId && documents[session.documentId]) {
            delete documents[session.documentId];
            console.log(`Removed Document ${session.documentId}`);
        }

        // Remove from memory
        delete sessions[sessionId];
        delete sessionUsers[sessionId]; // Clear user list for the session
        console.log(`Ended Session ${sessionId}`);
        return true;
    }
    return false;
};

// Export all functions and data structures
module.exports = {
    sessions, // Export Session instances map
    documents, // Export Document instances map
    sessionUsers, // Export User instances map per session
    createSession,
    getSession,
    getDocument, // Export function to get document
    addUserToSession,
    removeUserFromSession,
    getSessionUsers,
    endSession
};