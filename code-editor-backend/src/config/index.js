const config = {
    server: {
        port: process.env.PORT || 5000,
        host: process.env.HOST || 'localhost',
    },
    session: {
        maxAge: 3600000, // 1 hour in milliseconds
    },
    docker: {
        image: 'node:16-alpine', // Default Docker image
    },
    webRTC: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    },
};

module.exports = config;