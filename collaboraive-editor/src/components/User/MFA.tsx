import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Loader2, Check, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function MFASetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  // Function to reset the MFA setup process
  const resetMFASetup = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    
    try {
      // If there's a factorId, try to unenroll it
      if (factorId) {
        await supabase.auth.mfa.unenroll({
          factorId,
        });
      }
      
      // Create fresh enrollment
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Echo',
        friendlyName: `Echo Authenticator ${Date.now()}` 
      });
      
      if (error) throw error;
      
      if (data) {
        setQrCode(data.totp?.qr_code || null);
        setSecret(data.totp?.secret || null);
        setFactorId(data.id || null);
        console.log("New enrollment created:", { id: data.id });
      }
      
      setVerificationCode('');
    } catch (err) {
      setError(`Could not reset MFA setup: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function setupMFA() {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);
        
        // Get current MFA status
        const { data: enrollments, error: enrollmentsError } = await supabase.auth.mfa.listFactors();
        
        if (enrollmentsError) throw enrollmentsError;
        
        console.log("Current MFA factors:", enrollments);
        
        // Check if user already has MFA enrolled (both verified and pending)
        const verifiedFactor = enrollments?.totp?.find(factor => factor.status === 'verified');
        const pendingFactor = enrollments?.totp?.find(factor => factor.status === 'unverified');
        
        if (verifiedFactor) {
          // User already has verified MFA
          setIsEnrolled(true);
          setFactorId(verifiedFactor.id);
          setLoading(false);
          return;
        }
        
        if (pendingFactor) {
          // For pending factors, we need to unenroll and create a fresh one
          // This solves many common issues with stuck pending enrollments
          try {
            console.log("Found pending factor, unenrolling it first:", pendingFactor.id);
            await supabase.auth.mfa.unenroll({
              factorId: pendingFactor.id,
            });
          } catch (unenrollError) {
            console.warn("Error unenrolling pending factor:", unenrollError);
            // Continue anyway as we'll try to create a new one
          }
        }
        
        // Create new enrollment (either because no factors exist or we just unenrolled a pending one)
        console.log("Creating new MFA enrollment");
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          issuer: 'Echo',
          friendlyName: `Echo Authenticator ${Date.now()}` // Add timestamp to make it unique
        });
        
        if (error) throw error;
        
        // Update with correct properties based on Supabase response
        if (data) {
          setQrCode(data.totp?.qr_code || null);
          setSecret(data.totp?.secret || null);
          setFactorId(data.id || null);
          
          console.log("Enrollment created successfully:", {
            factorId: data.id,
            hasQrCode: !!data.totp?.qr_code,
            hasSecret: !!data.totp?.secret
          });
        } else {
          throw new Error("No data returned from MFA enrollment");
        }
        
      } catch (err) {
        console.error("MFA setup error:", err);
        setError(err instanceof Error ? err.message : 'Failed to set up MFA');
      } finally {
        setLoading(false);
      }
    }
    
    setupMFA();
  }, []);
  
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !verificationCode) return;
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Validate verification code is 6 digits
      if (!/^\d{6}$/.test(verificationCode)) {
        throw new Error('Verification code must be 6 digits');
      }
      
      // Create a challenge for the verification
      console.log("Creating MFA challenge for factor:", factorId);
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      
      if (challengeError) throw challengeError;
      
      // Get the challenge ID
      const newChallengeId = challengeData?.id;
      if (!newChallengeId) {
        throw new Error('No challenge ID returned');
      }
      
      console.log("Challenge created:", { challengeId: newChallengeId });
      setChallengeId(newChallengeId);
      
      // Verify the OTP code
      console.log("Verifying OTP code:", { 
        factorId,
        challengeId: newChallengeId,
        codeLength: verificationCode.length
      });
      
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: newChallengeId,
        code: verificationCode,
      });
      
      console.log("Verification result:", { data: verifyData, error: verifyError });
      
      if (verifyError) throw verifyError;
      
      setIsEnrolled(true);
      setSuccess('Multi-factor authentication has been successfully enabled for your account.');
      
    } catch (err) {
      console.error("MFA verification error:", err);
      setError(err instanceof Error ? err.message : 'Failed to verify MFA code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!factorId) return;
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      console.log("Disabling MFA for factor:", factorId);
      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });
      
      if (error) throw error;
      
      setIsEnrolled(false);
      setSuccess('Multi-factor authentication has been disabled.');
      
      // Reset state to allow re-enrollment
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      
      // Create fresh enrollment for re-setup
      setTimeout(() => {
        resetMFASetup();
      }, 1000);
      
    } catch (err) {
      console.error("Disable MFA error:", err);
      setError(err instanceof Error ? err.message : 'Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#be9269]" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-[#172334] rounded-lg border border-[#be9269]/10 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-[#be9269] mr-2" />
          <h2 className="text-2xl font-bold text-white">Multi-Factor Authentication</h2>
        </div>
        <button 
          onClick={() => navigate('/settings')}
          className="text-gray-400 hover:text-white"
          aria-label="Back to settings"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>
      
      {error && (
        <div className="bg-red-900/30 border-l-4 border-red-500/50 p-4 mb-4 rounded-r-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
          
          {!isEnrolled && (
            <button
              onClick={resetMFASetup}
              className="mt-2 flex items-center text-sm text-red-400 hover:text-red-300"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Try Again
            </button>
          )}
        </div>
      )}
      
      {success && (
        <div className="bg-green-900/30 border-l-4 border-green-500/50 p-4 mb-4 rounded-r-md">
          <div className="flex">
            <Check className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-sm text-green-400">{success}</p>
          </div>
        </div>
      )}
      
      {isEnrolled ? (
        <div>
          <div className="bg-green-900/30 border-l-4 border-green-500/50 p-4 mb-6 rounded-r-md">
            <div className="flex">
              <Check className="h-5 w-5 text-green-400 mr-2" />
              <p className="text-sm text-green-400">
                MFA is currently enabled for your account.
              </p>
            </div>
          </div>
          
          <p className="text-gray-300 mb-6">
            If you disable MFA, you will no longer be required to enter a verification code when signing in.
            This will make your account less secure.
          </p>
          
          <div className="flex flex-col space-y-4">
            <button
              onClick={handleDisableMFA}
              disabled={loading}
              className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600/70 hover:bg-red-600/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Processing...
                </div>
              ) : (
                'Disable MFA'
              )}
            </button>
            
            <button
              onClick={() => navigate('/settings')}
              className="w-full py-2 px-4 bg-[#be9269]/20 text-[#be9269] rounded-md hover:bg-[#be9269]/30 transition-colors flex items-center justify-center"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Settings
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-gray-300 mb-6">
            Enhance your account security by setting up multi-factor authentication. 
            When enabled, you'll be asked for a verification code from your authenticator app when signing in.
          </p>
          
          {qrCode ? (
            <div className="mb-6">
              <p className="font-medium mb-2 text-white">Scan this QR code with your authenticator app:</p>
              <div className="flex justify-center bg-[#101b2c] p-6 rounded-md border border-[#be9269]/30">
                <img 
                  src={qrCode} 
                  alt="QR Code for MFA setup" 
                  className="max-w-full h-auto" 
                />
              </div>
              
              {secret && (
                <div className="mt-4">
                  <p className="text-sm text-gray-300 mb-1">Or enter this code manually:</p>
                  <div className="bg-[#101b2c] p-3 rounded font-mono text-center break-all select-all border border-[#be9269]/30 text-white">
                    {secret}
                  </div>
                </div>
              )}

              <div className="mt-4 p-4 bg-[#101b2c]/50 rounded-md border border-[#be9269]/10">
                <h3 className="font-medium text-[#be9269] mb-2">Recommended Authenticator Apps</h3>
                <ul className="text-sm text-gray-300 list-disc pl-5 space-y-1">
                  <li>Google Authenticator</li>
                  <li>Microsoft Authenticator</li>
                  <li>Authy</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-900/30 border-l-4 border-yellow-500/50 p-4 mb-4 rounded-r-md">
              <p className="text-sm text-yellow-400">
                Unable to generate QR code. Please try again.
              </p>
            </div>
          )}
          
          <form onSubmit={handleVerify}>
            <div className="mb-6">
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-300 mb-1">
                Verification Code
              </label>
              <input
                type="text"
                id="verificationCode"
                value={verificationCode}
                onChange={(e) => {
                  // Only allow digits and limit to 6 characters
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(cleaned);
                }}
                placeholder="Enter 6-digit code"
                pattern="\d{6}"
                maxLength={6}
                className="w-full px-4 py-2 border rounded-md bg-[#101b2c] border-[#be9269]/30 text-white focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
            
            <div className="flex flex-col space-y-4">
              <button
                type="submit"
                disabled={loading || !factorId || verificationCode.length !== 6}
                className="w-full py-2 px-4 bg-[#be9269] text-[#101b2c] rounded-md hover:bg-[#be9269]/90 font-medium flex items-center justify-center disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Verifying...
                  </div>
                ) : (
                  'Verify and Enable MFA'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="w-full py-2 px-4 bg-transparent border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 font-medium flex items-center justify-center"
              >
                Cancel and Return to Settings
              </button>
            </div>
          </form>

          {!qrCode && !loading && (
            <button
              onClick={resetMFASetup}
              className="mt-4 w-full flex items-center justify-center py-2 px-4 border border-[#be9269]/30 rounded-md text-sm text-[#be9269] hover:bg-[#be9269]/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate QR Code
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default MFASetup;