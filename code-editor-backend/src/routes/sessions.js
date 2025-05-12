const express = require('express');
const sessionService = require('../services/sessionService');
const Document = require('../models/Document'); // Import Document model
const Session = require('../models/Session'); // Import Session model

const router = express.Router();

// Create a new coding session
router.post('/', (req, res) => {
    const { language = 'python', code = '' } = req.body; // Keep accepting language/code for creation

    // Use the updated service function
    const result = sessionService.createSession(language, code);

    if (!result) {
        return res.status(500).json({ error: 'Failed to create session' });
    }

    const { session, document } = result;

    // Return IDs of created resources
    res.status(201).json({
        sessionId: session.id,
        documentId: document.id,
        language: document.language // Return language from the document
    });
});

// Get session details (including document info)
router.get('/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = sessionService.getSession(sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    // Optionally, fetch and include document details
    const document = sessionService.getDocument(session.documentId);

    res.json({
        session: session.getSessionInfo(), // Use model's method
        document: document ? document.getInfo() : null // Use model's method
        // Users are typically managed via sockets, not usually returned here
    });
});

module.exports = router;