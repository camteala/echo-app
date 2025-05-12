import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Github, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Make sure this path is correct

const roles = [
  { id: 'student', label: 'Student' },
  { id: 'expert', label: 'Expert Developer' },
  { id: 'mentor', label: 'Mentor' },
  { id: 'professional', label: 'Professional' }
];

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [enableMfa, setEnableMfa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    try {
     
      
      // Then proceed with signup
      const response = await fetch('http://localhost:4001/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
          role,
        }),
      });
  
      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error("Non-JSON response:", textResponse.substring(0, 150));
        throw new Error("Backend returned HTML instead of JSON. Server may be misconfigured.");
      }
  
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }
  
      // Set the auth session via Supabase
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
      }
      
      // Navigate to home page or MFA setup if enabled
      navigate(enableMfa ? '/authentication/post-signup-mfa' : '/');
    } catch (err) {
      console.error('Error signing up:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };
  const handleGithubSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
      // The redirect is handled by Supabase OAuth flow
    } catch (err) {
      console.error('Error signing in with GitHub:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during GitHub sign in');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 bg-[#172334] p-8 rounded-lg border border-[#be9269]/10">
        <div>
          <h2 className="text-2xl font-bold text-center text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-gray-400">
            Join our community of developers
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGithubSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center px-4 py-2 bg-[#24292e] text-white rounded-md hover:bg-[#24292e]/90 transition-colors disabled:opacity-70"
        >
          {loading ? (
            <Loader2 size={20} className="mr-2 animate-spin" />
          ) : (
            <Github size={20} className="mr-2" />
          )}
          Continue with GitHub
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#be9269]/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[#172334] text-gray-400">Or continue with</span>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">
              Full name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
              placeholder="Enter your full name"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
              placeholder="Choose a strong password"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-300">
              I am a...
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
              disabled={loading}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
 {/* Add MFA option */}
 <div className="flex items-center">
            <input
              id="enableMfa"
              name="enableMfa"
              type="checkbox"
              checked={enableMfa}
              onChange={(e) => setEnableMfa(e.target.checked)}
              className="h-4 w-4 rounded border-[#be9269]/30 text-[#be9269] focus:ring-[#be9269]/50 bg-[#101b2c]"
              disabled={loading}
            />
            <label htmlFor="enableMfa" className="ml-2 block text-sm text-gray-300">
              Enable multi-factor authentication (recommended)
            </label>
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center px-4 py-2 bg-[#be9269] text-[#101b2c] rounded-md hover:bg-[#be9269]/90 font-semibold disabled:opacity-70"
            >
              {loading ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <>
                  Create account
                  <ArrowRight size={16} className="ml-2" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/signin" className="text-[#be9269] hover:text-[#be9269]/80 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;