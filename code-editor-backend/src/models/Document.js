const { v4: uuidv4 } = require('uuid');

class Document {
    /**
     * @param {string} [id] - Unique document identifier (generated if not provided)
     * @param {string} [initialContent] - Initial content of the document
     * @param {string} [language] - Associated programming language (optional)
     * @param {string} [sessionId] - Associated session ID (optional)
     */
    constructor(id = uuidv4(), initialContent = '', language = null, sessionId = null) {
        this.id = id; // Corresponds to documentId used in collaborativeService
        this.content = initialContent; // Note: Actual sync managed by Yjs/Redis
        this.language = language;
        this.sessionId = sessionId;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    /**
     * Updates the document's content representation and timestamp.
     * (Actual content sync is external)
     * @param {string} newContent
     */
    updateContent(newContent) {
        this.content = newContent;
        this.updatedAt = new Date();
    }

    /**
     * Sets the associated language.
     * @param {string} language
     */
    setLanguage(language) {
        this.language = language;
        this.updatedAt = new Date();
    }

     /**
     * Sets the associated session ID.
     * @param {string} sessionId
     */
    setSessionId(sessionId) {
        this.sessionId = sessionId;
    }

    /**
     * Get document info.
     * @returns {object}
     */
    getInfo() {
        return {
            id: this.id,
            language: this.language,
            sessionId: this.sessionId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            // Content might be too large or managed externally,
            // so maybe don't include it by default here.
            // content: this.content
        };
    }
}

module.exports = Document;