import { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

// API service to interact with auth backend
const API_URL = 'http://localhost:5000/api/auth'; // Gateway URL

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  // New MFA functions
  setupMFA: () => Promise<{qrCode: string, secret: string}>;
  verifyMFA: (code: string) => Promise<boolean>;
  disableMFA: () => Promise<void>;
  checkMFAEnabled: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setUser(data.session.user);
        setIsAuthenticated(true);
      }
    };
    
    checkSession();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        setIsAuthenticated(!!session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password
      });
      
      if (!response.data.session) {
        throw new Error('No session returned from server');
      }
      
      // Set the session in Supabase client
      await supabase.auth.setSession({
        access_token: response.data.session.access_token,
        refresh_token: response.data.session.refresh_token
      });
      
      setUser(response.data.user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    try {
      const response = await axios.post(`${API_URL}/signup`, {
        email,
        password,
        name,
        role
      });
      
      // Set the session in Supabase client if available
      if (response.data.session) {
        await supabase.auth.setSession({
          access_token: response.data.session.access_token,
          refresh_token: response.data.session.refresh_token
        });
        
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const loginWithGithub = async () => {
    try {
      console.log('GitHub login requested (direct Supabase)');
  
      // Always use direct Supabase for GitHub auth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
  
      if (error) throw error;
  
      console.log('Direct Supabase GitHub auth initiated');
  
      // After the redirect, handle the callback in your backend or frontend
      // If the user doesn't exist in your database, create their profile
    } catch (error) {
      console.error('GitHub auth error:', error);
      throw error;
    }
  };


  const requestPasswordReset = async (email: string) => {
    try {
      await axios.post(`${API_URL}/forgot-password`, {
        email,
        redirectTo: `${window.location.origin}/reset-password`
      });
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/logout`);
      
      // Also sign out locally
      await supabase.auth.signOut();
      
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // New MFA functions
  const setupMFA = async () => {
    try {
      const response = await axios.post(`${API_URL}/mfa/setup`);
      return {
        qrCode: response.data.qrCode,
        secret: response.data.secret
      };
    } catch (error) {
      console.error('MFA setup error:', error);
      throw error;
    }
  };

  const verifyMFA = async (code: string) => {
    try {
      const response = await axios.post(`${API_URL}/mfa/verify`, { code });
      return response.data.success;
    } catch (error) {
      console.error('MFA verification error:', error);
      throw error;
    }
  };

  const disableMFA = async () => {
    try {
      await axios.post(`${API_URL}/mfa/disable`);
    } catch (error) {
      console.error('MFA disable error:', error);
      throw error;
    }
  };

  const checkMFAEnabled = async () => {
    try {
      // First check with Supabase directly - this is most reliable
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) {
        console.error('Error checking MFA factors:', factorsError);
        
        // Fall back to API if direct Supabase check fails
        try {
          const response = await axios.get(`${API_URL}/mfa/status`, {
            withCredentials: true,
            headers: {
              'Cache-Control': 'no-cache',
            },
          });
          return response.data.enabled === true;
        } catch (apiError) {
          console.error('API MFA status check error:', apiError);
          throw new Error('Could not verify MFA status');
        }
      }
      
      // Check if any TOTP factors are verified
      const hasVerifiedTOTP = factors?.totp?.some(factor => factor.status === 'verified') || false;
      return hasVerifiedTOTP;
    } catch (error) {
      console.error('MFA status check error:', error);
      throw error;
    }
  };
  

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated, 
        user, 
        login, 
        register, 
        logout, 
        loginWithGithub, 
        requestPasswordReset,
        // Add new MFA functions to the context
        setupMFA,
        verifyMFA,
        disableMFA,
        checkMFAEnabled
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};