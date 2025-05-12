import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check for the auth callback and set session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/'); 
      } else {
        navigate('/signin');
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl text-white mb-4">Completing authentication...</h2>
        <div className="w-16 h-16 border-t-4 border-[#be9269] border-solid rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
};

export default AuthCallback;