import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, Lock, Github, Loader2, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showMfaInput, setShowMfaInput] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (showMfaInput) {
      // Handle MFA verification
      await handleMfaVerification();
    } else {
      // Regular sign in
      await handleSignIn();
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    
    try {
      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // Store the credentials in sessionStorage instead of localStorage for better security
      sessionStorage.setItem('tempAuthEmail', email);
      sessionStorage.setItem('tempAuthPassword', password);
      
      console.log("Authentication data:", data);
      
      // Check if MFA is required
      const { data: factors } = await supabase.auth.mfa.listFactors();
      console.log("MFA factors:", factors);
      
      const totpFactor = factors?.totp?.find(factor => factor.status === 'verified');
      
      if (totpFactor) {
        console.log("MFA is enabled, requiring verification");
        
        // Create MFA challenge while session is still active
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: totpFactor.id
        });
        
        if (challengeError) throw challengeError;
        
        // DO NOT sign out here - this was causing the error
        // Remove this line: await supabase.auth.signOut();
        
        // Show MFA input
        setMfaFactorId(totpFactor.id);
        setMfaChallengeId(challengeData?.id || null);
        setShowMfaInput(true);
      } else {
        // No MFA required, session is already established
        navigate('/');
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };
  
  const handleMfaVerification = async () => {
    if (!mfaFactorId || !mfaChallengeId || !mfaCode) {
      setError('MFA verification information is missing');
      return;
    }
    
    setLoading(true);
    
    try {
      // Verify MFA code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code: mfaCode
      });
      
      if (verifyError) throw verifyError;
      
      // No need to sign in again since we already have a valid session
      // that's now been verified with MFA
      
      // Clean up stored credentials
      sessionStorage.removeItem('tempAuthEmail');
      sessionStorage.removeItem('tempAuthPassword');
      
      console.log("MFA verification successful, session established");
      navigate('/');
    } catch (err) {
      console.error("MFA verification error:", err);
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Redirect to your backend GitHub OAuth endpoint
      window.location.href = 'http://localhost:4001/auth/github';
    } catch (err) {
      console.error('Error initiating GitHub sign in:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during GitHub sign in');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 bg-[#172334] p-8 rounded-lg border border-[#be9269]/10">
        <div>
          <h2 className="text-2xl font-bold text-center text-white">
            {showMfaInput ? 'Verification Required' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-gray-400">
            {showMfaInput 
              ? 'Enter the verification code from your authenticator app' 
              : 'Welcome back! Please enter your details'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {!showMfaInput ? (
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email address
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                    placeholder="Enter your email"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#be9269]/30 text-[#be9269] focus:ring-[#be9269]/50 bg-[#101b2c]"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <Link to="/forgot-password" className="text-[#be9269] hover:text-[#be9269]/80">
                    Forgot your password?
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="mfaCode" className="block text-sm font-medium text-gray-300">
                Verification Code
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield size={16} className="text-gray-400" />
                </div>
                <input
                  id="mfaCode"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={mfaCode}
                  onChange={(e) => {
                    // Only allow digits and limit to 6 characters
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setMfaCode(cleaned);
                  }}
                  className="pl-10 w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                  placeholder="Enter 6-digit code"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || (showMfaInput && mfaCode.length !== 6)}
              className="w-full flex justify-center items-center px-4 py-2 bg-[#be9269] text-[#101b2c] rounded-md hover:bg-[#be9269]/90 font-semibold disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  {showMfaInput ? 'Verifying...' : 'Signing in...'}
                </>
              ) : (
                <>
                  {showMfaInput ? 'Verify' : 'Sign in'}
                  <ArrowRight size={16} className="ml-2" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#172334] text-gray-400">Or continue with</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleGithubSignIn}
              disabled={loading}
              className="w-full flex justify-center items-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-white bg-transparent hover:bg-gray-700"
            >
              <Github size={16} className="mr-2" />
              GitHub
            </button>
          </div>
        </div>

        <div className="text-center mt-4">
          <span className="text-gray-400 text-sm">Don't have an account?</span>
          <Link to="/signup" className="text-[#be9269] hover:text-[#be9269]/80 font-medium ml-2">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignIn;