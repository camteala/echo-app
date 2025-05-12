import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useSupabaseAuth() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    async function syncAuthState() {
      if (isAuthenticated && user) {
        // User is authenticated in your custom system
        console.log("Syncing authenticated user to Supabase:", user);

        try {
          // Set a custom session in Supabase
          // This stores your custom user in localStorage that Supabase can read
          localStorage.setItem('supabase.auth.token', JSON.stringify({
            currentSession: {
              user: {
                id: user.id,
                email: user.email,
                user_metadata: {
                  name: user.name || user.email?.split('@')[0] || 'User'
                }
              }
            }
          }));
          
          // Force a refresh of the Supabase auth state
          await supabase.auth.refreshSession();
          
          console.log("Auth sync complete");
        } catch (err) {
          console.error("Failed to sync auth state with Supabase:", err);
        }
      } else {
        // Clear any Supabase auth if user is not authenticated
        localStorage.removeItem('supabase.auth.token');
      }
    }

    syncAuthState();
  }, [user, isAuthenticated]);
}