const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.AUTH_PORT || 4001;

// CORS setup0
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
async function createUserProfile(userId, displayName) {
  return await supabase.from('profiles').insert({
    id: userId,
    display_name: displayName || 'User',
    bio: '',
    github_username: '',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}
// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body); // Debug: Log incoming request

    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('Supabase response:', { data, error }); // Debug: Log Supabase response

    if (error) throw error;

    res.json({
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/auth/github', async (req, res) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${process.env.AUTH_SERVICE_URL}/auth/callback/github`,
        },
      });
      
      if (error) throw error;
      
      res.redirect(data.url);
    } catch (error) {
      console.error('GitHub auth initialization error:', error);
      res.redirect(`${process.env.CLIENT_URL}/auth/error?message=${encodeURIComponent('Failed to initialize GitHub login')}`);
    }
  });

// GitHub OAuth callback handling
app.get('/auth/callback/github', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'No code provided' });
    }
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) throw error;
    
    // Create profile for GitHub user if it doesn't exist
    if (data?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select()
        .eq('id', data.user.id)
        .single();
        
      if (!profile) {
        // Use the same helper function to create the profile
        await createUserProfile(
          data.user.id, 
          data.user.user_metadata?.name || data.user.user_metadata?.preferred_username
        );
      }
    }
    
    res.redirect(`${process.env.CLIENT_URL}/auth/success`);
  } catch (error) {
    console.error('GitHub auth error:', error);
    res.redirect(`${process.env.CLIENT_URL}/auth/error?message=${encodeURIComponent(error.message)}`);
  }
});

// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: name,
        role: role || 'user'
      },
      email_confirm: true
    });
    
    if (error) throw error;
    
    if (data.user) {
      // Use the helper function instead
      const { error: profileError } = await createUserProfile(data.user.id, name);
      
      if (profileError) throw profileError;
    }
    
    res.status(201).json({
      user: data.user,
      session: data.session
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({ error: error.message });
  }
});
// Add this after your other endpoints, before the app.listen call

// Password reset request endpoint
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email, redirectTo } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Use Supabase to send the password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || `${process.env.CLIENT_URL}/reset-password`
    });
    
    if (error) throw error;
    
    // Always return success to prevent email enumeration
    res.json({ 
      success: true, 
      message: 'If an account exists with this email, a password reset link has been sent.' 
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: error.message });
  }
});
// Token verification endpoint (fallback to Supabase token verification only)
app.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    const { data, error } = await supabase.auth.getUser(token);
    
    if (error) throw error;
    
    res.json({ valid: true, user: data.user });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(400).json({ valid: false, error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});