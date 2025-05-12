import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [hasMfa, setHasMfa] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check if we have a token in the URL
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if the user has valid session from the reset link
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData?.session) {
          console.log('User has active session from password reset link');
          
          // Check if user has MFA enabled
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const totpFactor = factorsData?.totp?.find(f => f.status === 'verified');
          
          if (totpFactor) {
            console.log('User has MFA enabled, will need verification code');
            setHasMfa(true);
            setFactorId(totpFactor.id);
            
            // Create challenge for MFA verification
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
              factorId: totpFactor.id
            });
            
            if (challengeError) {
              console.error('Error creating MFA challenge:', challengeError);
              setError('Failed to prepare MFA verification. Please try again or contact support.');
            } else if (challengeData) {
              setChallengeId(challengeData.id);
            }
          }
        }
      } catch (err) {
        console.error('Error checking session:', err);
      }
    };
    
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Password validation
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // If the user has MFA enabled, verify the MFA code first
      if (hasMfa && factorId && challengeId) {
        if (!mfaCode || mfaCode.length !== 6 || !/^\d+$/.test(mfaCode)) {
          setError('Please enter a valid 6-digit verification code');
          setLoading(false);
          return;
        }
        
        // Verify MFA code
        const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
          factorId,
          challengeId,
          code: mfaCode
        });
        
        if (verifyError) {
          console.error('MFA verification error:', verifyError);
          setError('Invalid verification code. Please try again.');
          setLoading(false);
          return;
        }
        
        // MFA verification successful, continue with password reset
        console.log('MFA verification successful, proceeding with password reset');
      }
      
      // Update the user's password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      setSuccess('Your password has been successfully reset. You will be redirected to sign in.');
      
      // Clear form fields
      setNewPassword('');
      setConfirmPassword('');
      setMfaCode('');
      
      // Redirect to sign in page after a short delay
      setTimeout(() => {
        navigate('/signin');
      }, 3000);
      
    } catch (err) {
      console.error('Password reset error:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'Failed to reset password. The reset link may have expired.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 bg-[#172334] p-8 rounded-lg border border-[#be9269]/10">
        <div>
          <h2 className="text-2xl font-bold text-center text-white">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-gray-400">
            Please enter your new password below
          </p>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-md text-sm flex items-start">
            <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-md text-sm flex items-start">
            <CheckCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}
        
        {hasMfa && (
          <div className="bg-blue-500/10 border border-blue-500/50 text-blue-400 px-4 py-3 rounded-md text-sm flex items-start mb-4">
            <Shield size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>Your account has MFA enabled. Please enter your verification code from your authenticator app.</span>
          </div>
        )}
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          {hasMfa && (
            <div>
              <label htmlFor="mfaCode" className="block text-sm font-medium text-gray-300">
                MFA Verification Code
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield size={16} className="text-gray-400" />
                </div>
                <input
                  id="mfaCode"
                  type="text"
                  inputMode="numeric"
                  required={hasMfa}
                  value={mfaCode}
                  onChange={(e) => {
                    // Only allow digits and limit to 6 characters
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setMfaCode(cleaned);
                  }}
                  className="pl-10 w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                  placeholder="Enter 6-digit code"
                  disabled={loading || !!success}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Enter the 6-digit verification code from your authenticator app
              </p>
            </div>
          )}
          
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300">
              New Password
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={16} className="text-gray-400" />
              </div>
              <input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                placeholder="Enter new password"
                disabled={loading || !!success}
                minLength={8}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
              Confirm New Password
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={16} className="text-gray-400" />
              </div>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                placeholder="Confirm new password"
                disabled={loading || !!success}
                minLength={8}
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading || !!success || (hasMfa && mfaCode.length !== 6)}
              className="w-full flex justify-center items-center px-4 py-2 bg-[#be9269] text-[#101b2c] rounded-md hover:bg-[#be9269]/90 font-semibold disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;