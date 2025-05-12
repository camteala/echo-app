import React, { useState, useEffect, useRef } from 'react';
import { User, Bell, Shield, Key, Globe, Code, Loader2, Upload, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { checkMFAEnabled } = useAuth();
  
  // MFA states
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Profile states
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayAvatarUrl, setDisplayAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Check MFA status when component mounts or when activeTab changes to 'account'
  useEffect(() => {
    if (activeTab === 'account') {
      checkMfaStatus();
    }
  }, [activeTab]);

  // Function to check MFA status
  const checkMfaStatus = async () => {
    setMfaLoading(true);
    setMfaError(null);
    
    try {
      const isEnabled = await checkMFAEnabled();
      setMfaEnabled(isEnabled);
    } catch (err) {
      console.error('Error checking MFA status:', err);
      setMfaError('Could not check MFA status');
      setMfaEnabled(false);
    } finally {
      setMfaLoading(false);
    }
  };

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      setImageLoading(true);
      setImageError(false);

      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Fetch user profile from profiles table
          const { data, error } = await supabase
            .from('profiles')
            .select('display_name, bio, github_username, avatar_url')
            .eq('id', user.id)
            .single();

          if (error) {
            // Handle the "no rows returned" error specifically
            if (error.code === 'PGRST116') {
              console.log('No profile found. Creating one for the user...');

              // Create a new empty profile for the user
              const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: user.id,
                  display_name: '',
                  bio: '',
                  github_username: '',
                  avatar_url: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });

              if (insertError) {
                console.error('Error creating profile:', insertError);
              }
            } else {
              // Handle other errors
              throw error;
            }
          } else if (data) {
            // If data was returned, set the form values
            setDisplayName(data.display_name || '');
            setBio(data.bio || '');
            setGithubUsername(data.github_username || '');
            setAvatarUrl(data.avatar_url);

            // Enhanced image URL handling
            if (data.avatar_url) {
              try {
                // Extract the path part only if it's not a full URL
                let storagePath = data.avatar_url;
                if (data.avatar_url.startsWith('http')) {
                  // For full URLs, extract just the path after the bucket name
                  const urlParts = data.avatar_url.split('user-uploads/');
                  if (urlParts.length > 1) {
                    storagePath = urlParts[1];
                  } else {
                    // Just use the URL directly if we can't parse it
                    setDisplayAvatarUrl(data.avatar_url);
                    setImageLoading(false);
                    return;
                  }
                } else {
                  // Clean up any leading slashes
                  storagePath = data.avatar_url.replace(/^\//, '');
                }

                // Try to get a signed URL which is more reliable
                const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                  .from('user-uploads')
                  .createSignedUrl(storagePath, 60 * 60); // 1 hour expiry

                if (signedUrlError) {
                  console.error('Signed URL error:', signedUrlError);
                  // Fall back to getPublicUrl if signed URL fails
                  const { data: publicUrlData } = supabase.storage
                    .from('user-uploads')
                    .getPublicUrl(storagePath);

                  if (publicUrlData?.publicUrl) {
                    console.log('Using public URL instead');
                    setDisplayAvatarUrl(publicUrlData.publicUrl);
                  } else {
                    throw new Error('Could not get public URL either');
                  }
                } else if (signedUrlData?.signedUrl) {
                  console.log('Got signed URL');
                  setDisplayAvatarUrl(signedUrlData.signedUrl);
                }
              } catch (storageErr) {
                console.error('Error with storage:', storageErr);
                // Last resort - try to use the avatar_url directly
                if (data.avatar_url.startsWith('http')) {
                  setDisplayAvatarUrl(data.avatar_url);
                } else {
                  setImageError(true);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setImageError(true);
      } finally {
        setImageLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Handle avatar change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setProfileError('Please select a valid image file (JPG, PNG, or GIF)');
        return;
      }

      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        setProfileError('Image size should be less than 2MB');
        return;
      }

      // Preview the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setDisplayAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      setAvatarFile(file);
      setProfileError(null); // Clear any previous errors
      setImageError(false); // Reset image error state
    }
  };

  // Handle image load error
  const handleImageError = () => {
    console.error('Image failed to load:', displayAvatarUrl);
    setImageError(true);
    setDisplayAvatarUrl(null);
  };

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    setProfileLoading(true);
    setProfileError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No user logged in');

      let updatedAvatarUrl = avatarUrl;

      // Upload avatar if a new file was selected
      if (avatarFile) {
        // Generate a unique file path
        const filePath = `avatars/${user.id}/${Date.now()}_${avatarFile.name}`;

        // Upload the file
        const { error: uploadError } = await supabase.storage
          .from('user-uploads')
          .upload(filePath, avatarFile, {
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Get the public URL
        const { data } = supabase.storage
          .from('user-uploads')
          .getPublicUrl(filePath);

        updatedAvatarUrl = data.publicUrl;
      }

      // Update user profile
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: displayName,
          bio: bio,
          github_username: githubUsername,
          avatar_url: updatedAvatarUrl,
          updated_at: new Date().toISOString(),
        });

      // Add this code to also update user metadata with the avatar URL
      if (!error && updatedAvatarUrl) {
        await supabase.auth.updateUser({
          data: {
            avatar_url: updatedAvatarUrl
          }
        });
      }

      if (error) throw error;

      setProfileSuccess('Profile updated successfully');
      setAvatarFile(null);

      // Clear success message after some time
      setTimeout(() => {
        setProfileSuccess(null);
      }, 3000);

    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Password change handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);

    try {
      // Update password via Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordSuccess('Password updated successfully');

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Clear success message after some time
      setTimeout(() => {
        setPasswordSuccess(null);
      }, 3000);

    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="md:w-64">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'profile'
                  ? 'bg-[#be9269] text-[#101b2c]'
                  : 'text-gray-300 hover:bg-[#be9269]/10 hover:text-[#be9269]'
                  }`}
              >
                <User size={20} />
                <span>Profile</span>
              </button>

              <button
                onClick={() => setActiveTab('account')}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'account'
                  ? 'bg-[#be9269] text-[#101b2c]'
                  : 'text-gray-300 hover:bg-[#be9269]/10 hover:text-[#be9269]'
                  }`}
              >
                <Shield size={20} />
                <span>Account</span>
              </button>

              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'notifications'
                  ? 'bg-[#be9269] text-[#101b2c]'
                  : 'text-gray-300 hover:bg-[#be9269]/10 hover:text-[#be9269]'
                  }`}
              >
                <Bell size={20} />
                <span>Notifications</span>
              </button>

              <button
                onClick={() => setActiveTab('preferences')}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'preferences'
                  ? 'bg-[#be9269] text-[#101b2c]'
                  : 'text-gray-300 hover:bg-[#be9269]/10 hover:text-[#be9269]'
                  }`}
              >
                <Globe size={20} />
                <span>Preferences</span>
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 bg-[#172334] rounded-lg border border-[#be9269]/10 p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white">Profile Settings</h2>

                {profileError && (
                  <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                    <p className="text-sm text-red-400">{profileError}</p>
                  </div>
                )}

                {profileSuccess && (
                  <div className="mb-4 p-3 bg-green-900/30 border border-green-500/50 rounded-lg">
                    <p className="text-sm text-green-400">{profileSuccess}</p>
                  </div>
                )}

                <form onSubmit={handleProfileUpdate}>
                  <div className="flex items-center space-x-4 mb-6">
                    <div
                      className="w-20 h-20 rounded-full bg-[#be9269]/10 flex items-center justify-center overflow-hidden"
                    >
                      {!imageError && displayAvatarUrl ? (
                        <img
                          src={displayAvatarUrl}
                          alt={displayName || 'User'}
                          className="w-full h-full object-cover"
                          onError={handleImageError}
                        />
                      ) : (
                        <User size={40} className="text-[#be9269]" />
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-[#be9269]/10 text-[#be9269] rounded-md hover:bg-[#be9269]/20 transition-colors flex items-center"
                      >
                        <Upload size={16} className="mr-2" />
                        Change Avatar
                      </button>
                      <p className="text-xs text-gray-400 mt-1">
                        JPG, PNG or GIF, max 2MB
                      </p>
                      {imageLoading && (
                        <p className="text-xs text-yellow-400 mt-1">
                          Loading profile image...
                        </p>
                      )}
                      {imageError && (
                        <p className="text-xs text-red-400 mt-1">
                          Failed to load image
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Bio
                      </label>
                      <textarea
                        rows={4}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        GitHub Username
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-[#be9269]/30 bg-[#101b2c] text-gray-400">
                          <Code size={16} />
                        </span>
                        <input
                          type="text"
                          value={githubUsername}
                          onChange={(e) => setGithubUsername(e.target.value)}
                          className="flex-1 rounded-none rounded-r-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="px-4 py-2 bg-[#be9269] text-[#101b2c] rounded-md hover:bg-[#be9269]/90 font-semibold flex items-center justify-center"
                    >
                      {profileLoading ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white">Account Settings</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                      readOnly
                    />
                  </div>

                  {/* MFA Section */}
                  <div className="pt-6 border-t border-[#be9269]/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Multi-Factor Authentication</h3>
                    
                    {mfaLoading ? (
                      <div className="flex items-center space-x-2 text-gray-300">
                        <Loader2 className="animate-spin h-4 w-4" />
                        <span>Checking MFA status...</span>
                      </div>
                    ) : mfaError ? (
                      <div className="bg-red-900/30 border-l-4 border-red-500/50 p-4 mb-4 rounded-r-md">
                        <p className="text-sm text-red-400">{mfaError}</p>
                        <button 
                          onClick={checkMfaStatus} 
                          className="text-sm text-red-400 hover:text-red-300 mt-1"
                        >
                          Try again
                        </button>
                      </div>
                    ) : mfaEnabled ? (
                      <>
                        <div className="bg-green-900/30 border-l-4 border-green-500/50 p-4 mb-4 rounded-r-md">
                          <div className="flex">
                            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                            <p className="text-sm text-green-400">
                              Multi-factor authentication is enabled for your account.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex space-x-4">
                          <button
                            onClick={() => navigate('/authentication/mfa')}
                            className="px-4 py-2 bg-[#be9269]/20 text-[#be9269] rounded-md hover:bg-[#be9269]/30 transition-colors flex items-center"
                          >
                            <Shield size={16} className="mr-2" />
                            Manage MFA Settings
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-300 mb-4">
                          Add an extra layer of security to your account by enabling two-factor authentication.
                          When MFA is enabled, you'll need to provide a verification code in addition to your password when logging in.
                        </p>

                        <button
                          onClick={() => navigate('/authentication/mfa')}
                          className="px-4 py-2 bg-[#be9269]/20 text-[#be9269] rounded-md hover:bg-[#be9269]/30 transition-colors flex items-center"
                        >
                          <Shield size={16} className="mr-2" />
                          Set up MFA
                        </button>
                      </>
                    )}
                  </div>

                  {/* Password Change Section */}
                  <div className="pt-6 border-t border-[#be9269]/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Change Password</h3>

                    {passwordError && (
                      <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                        <p className="text-sm text-red-400">{passwordError}</p>
                      </div>
                    )}

                    {passwordSuccess && (
                      <div className="mb-4 p-3 bg-green-900/30 border border-green-500/50 rounded-lg">
                        <p className="text-sm text-green-400">{passwordSuccess}</p>
                      </div>
                    )}

                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Current Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Key size={16} className="text-gray-400" />
                          </div>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            className="pl-10 w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          New Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Key size={16} className="text-gray-400" />
                          </div>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            className="pl-10 w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Key size={16} className="text-gray-400" />
                          </div>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="pl-10 w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={passwordLoading}
                          className="px-4 py-2 bg-[#be9269] text-[#101b2c] rounded-md hover:bg-[#be9269]/90 font-semibold flex items-center justify-center"
                        >
                          {passwordLoading ? (
                            <>
                              <Loader2 className="animate-spin h-4 w-4 mr-2" />
                              Updating...
                            </>
                          ) : (
                            'Update Password'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white">Notification Preferences</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <h3 className="text-white font-medium">Email Notifications</h3>
                      <p className="text-sm text-gray-400">Receive email updates about your account</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-[#101b2c] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#be9269]"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <h3 className="text-white font-medium">Push Notifications</h3>
                      <p className="text-sm text-gray-400">Receive push notifications in your browser</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-[#101b2c] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#be9269]"></div>
                    </label>
                  </div>
                  
                  <div className="pt-4">
                    <button className="px-4 py-2 bg-[#be9269] text-[#101b2c] rounded-md hover:bg-[#be9269]/90 font-semibold">
                      Save Notification Settings
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white">Site Preferences</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <h3 className="text-white font-medium">Dark Mode</h3>
                      <p className="text-sm text-gray-400">Toggle dark mode theme</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-[#101b2c] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#be9269]"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Language
                    </label>
                    <select className="w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50">
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <button className="px-4 py-2 bg-[#be9269] text-[#101b2c] rounded-md hover:bg-[#be9269]/90 font-semibold">
                    Save Preferences
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;