const { v4: uuidv4 } = require('uuid');
const Document = require('./Document'); // Assuming Document model is in the same directory

class Session {
    /**
     * @param {string} documentId - The ID of the associated document
     */
    constructor(documentId) {
        this.id = uuidv4();
        this.documentId = documentId; // Link to the Document model instance
        this.path = ''; // Path for temporary execution files if needed
        this.container = null; // Track associated execution container
        this.createdAt = new Date();
        // Removed language and code, as they belong to the Document
    }

    setPath(path) {
        this.path = path;
    }

    setContainer(containerId) {
        this.container = containerId;
    }

    clearContainer() {
        this.container = null;
    }

    // Removed updateCode method

    getSessionInfo() {
        return {
            id: this.id,
            documentId: this.documentId,
            path: this.path,
            createdAt: this.createdAt,
            // Code and language info should be fetched via the documentId if needed
        };
    }
}

module.exports = Session;