const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Service URLs
const AUTH_SERVICE_URL = `http://localhost:${process.env.AUTH_PORT || 4001}`;

// CORS setup
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    message: 'Gateway is running'
  });
});


// Auth service routes - direct implementation for reliability
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Forwarding login request to auth service');
    const response = await axios.post(`${AUTH_SERVICE_URL}/login`, req.body);
    console.log('Auth login response received');
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Auth login error:', error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    console.log('Forwarding signup request to auth service');
    const response = await axios.post(`${AUTH_SERVICE_URL}/signup`, req.body);
    console.log('Auth signup response received');
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Auth signup error:', error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// In your gateway server
app.get('/api/auth/github-auth', async (req, res) => {
    try {
      // Get the authorization URL from your auth service
      const response = await axios.get(`${AUTH_SERVICE_URL}/github-auth`);
      res.json(response.data);
    } catch (error) {
      console.error('GitHub auth error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Add this route to handle the GitHub callback
  app.get('/api/auth/github-callback', async (req, res) => {
    try {
      // Forward the callback to your auth service
      const { code, state } = req.query;
      const response = await axios.get(`${AUTH_SERVICE_URL}/github-callback`, {
        params: { code, state }
      });
      
      // Redirect to your frontend with the token
      res.redirect(`${process.env.CLIENT_URL}?token=${response.data.token}`);
    } catch (error) {
      console.error('GitHub callback error:', error);
      res.redirect(`${process.env.CLIENT_URL}/signin?error=github_auth_failed`);
    }
  });
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    console.log('Forwarding password reset request to auth service');
    const response = await axios.post(`${AUTH_SERVICE_URL}/forgot-password`, req.body);
    console.log('Auth password reset response received');
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Auth password reset error:', error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    console.log('Forwarding logout request to auth service');
    const response = await axios.post(`${AUTH_SERVICE_URL}/logout`, req.body);
    console.log('Auth logout response received');
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Auth logout error:', error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  try {
    console.log('Forwarding token verification request to auth service');
    const response = await axios.post(`${AUTH_SERVICE_URL}/verify`, req.body);
    console.log('Auth verification response received');
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Auth verification error:', error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Test endpoints directly mapped for debugging
app.get('/api/auth/test', async (req, res) => {
  try {
    console.log('Testing auth service connectivity');
    const response = await axios.get(`${AUTH_SERVICE_URL}/test`);
    console.log('Auth test response:', response.data);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Auth test error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Auth service connection failed'
    });
  }
});

// Fall-back route for any auth requests not handled above
app.all('/api/auth/*', async (req, res) => {
  try {
    const path = req.path.replace('/api/auth', '');
    console.log(`Forwarding ${req.method} request to: ${AUTH_SERVICE_URL}${path}`);
    
    const response = await axios({
      method: req.method,
      url: `${AUTH_SERVICE_URL}${path}`,
      data: req.method !== 'GET' ? req.body : undefined,
      params: req.method === 'GET' ? req.query : undefined,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Response from auth service: ${response.status}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Auth proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Auth service error'
    });
  }
});

// Generic service proxy for other services
const proxyToService = async (req, res, serviceUrl, endpoint = '') => {
    try {
      const response = await axios({
        method: req.method,
        url: `${serviceUrl}${endpoint || req.path}`,
        data: req.method !== 'GET' ? req.body : undefined,
        params: req.query,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error(`Proxy error to ${serviceUrl}${endpoint || req.path}:`, error.message);
      res.status(error.response?.status || 500).json({
        error: error.message,
        details: error.response?.data
      });
    }
  };
  

// Health check
app.get('/health', async (req, res) => {
    try {
      const results = {
        gateway: { status: 'ok', timestamp: new Date() },
        services: {}
      };
      
      // Check each service
      const services = [
        { name: 'auth', url: `${AUTH_SERVICE_URL}/health` },
    
      ];
      
      for (const service of services) {
        try {
          const response = await axios.get(service.url, { timeout: 3000 });
          results.services[service.name] = { 
            status: 'ok', 
            data: response.data 
          };
        } catch (error) {
          results.services[service.name] = { 
            status: 'error', 
            error: error.message
          };
        }
      }
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  server.listen(process.env.PORT || 5000, () => {
    console.log(`Gateway listening on port ${process.env.PORT || 5000}`);
  });