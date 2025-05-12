const express = require('express');
const sessionRoutes = require('./sessions');

const router = express.Router();

// Use session routes
router.use('/sessions', sessionRoutes);

module.exports = router;