import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, MessageSquare, User, Menu, X, Code, LogOut, ChevronDown, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import logo from '../../assets/logo2.png';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('User');
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Check if user is logged in and fetch profile data
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const loggedIn = !!data.session;
      setIsLoggedIn(loggedIn);
      
      // If logged in, fetch profile picture
      if (loggedIn && data.session?.user) {
        fetchUserProfile(data.session.user.id);
      }
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const loggedIn = event !== 'SIGNED_OUT';
      setIsLoggedIn(loggedIn);
      
      // If logged in, fetch profile picture
      if (loggedIn && session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setProfilePicture(null);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Function to fetch user profile data
  const fetchUserProfile = async (userId: string) => {
    setLoading(true);
    setImageError(false);
    
    try {
      // Fetch profile from database
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        setImageError(true);
        return;
      }
      
      // Set display name if available
      if (data?.display_name) {
        setUserName(data.display_name);
      }
      
      // Handle avatar URL
      if (data?.avatar_url) {
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
              setProfilePicture(data.avatar_url);
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
              setProfilePicture(publicUrlData.publicUrl);
            } else {
              throw new Error('Could not get public URL either');
            }
          } else if (signedUrlData?.signedUrl) {
            setProfilePicture(signedUrlData.signedUrl);
          }
        } catch (storageErr) {
          console.error('Error with storage:', storageErr);
          // Last resort - try to use the avatar_url directly
          if (data.avatar_url.startsWith('http')) {
            setProfilePicture(data.avatar_url);
          } else {
            setImageError(true);
          }
        }
      }
    } catch (err) {
      console.error('Error in profile fetch:', err);
      setImageError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };
  
  // Function to get user initial as fallback
  const getUserInitial = (): string => {
    if (!userName) return '?';
    
    if (userName.includes('@')) {
      return userName.split('@')[0].charAt(0).toUpperCase();
    }
    
    return userName.charAt(0).toUpperCase();
  };
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-[#121928]/90 backdrop-blur-md border-b border-[#be9269]/20 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo and Brand */}
        <Link to="/" className="flex items-center space-x-2">
          <img 
            src={logo} 
            alt="ECHO Logo" 
            className="h-16 w-auto" 
          />
        </Link>
        
        {/* Navigation - Desktop */}
        <nav className="hidden md:flex items-center space-x-4">
          {isLoggedIn ? (
            <>
              <Link
                to="/collab"
                className="flex items-center text-[#be9269] hover:text-[#be9269]/80 transition-colors px-3 py-1.5"
              >
                <Code size={18} className="mr-1.5" />
                <span>Code Together</span>
              </Link>

              {/* Profile dropdown */}
              <div className="relative" ref={profileMenuRef}>
                <button 
                  className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors px-3 py-1.5 rounded-md" 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#be9269]/40 shadow-md shadow-[#be9269]/20">
                    {!imageError && profilePicture ? (
                      <img
                        src={profilePicture}
                        alt={userName || 'User'}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center text-white text-sm font-semibold"
                        style={{ backgroundColor: '#6366f1' }}
                      >
                        {getUserInitial()}
                      </div>
                    )}
                  </div>
                  <span className="text-gray-300">{userName}</span>
                  <ChevronDown size={16} className={`transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#172334] border border-[#be9269]/20 rounded-md shadow-lg py-1 z-50">
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setShowProfileMenu(false);
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-gray-300 hover:bg-[#be9269]/10 hover:text-[#be9269]"
                    >
                      <Settings size={16} className="mr-2" />
                      Settings
                    </button>
                    <div className="border-t border-[#be9269]/10 my-1"></div>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setShowProfileMenu(false);
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10"
                    >
                      <LogOut size={16} className="mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="text-gray-300 hover:text-white transition-colors px-3 py-1.5"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="text-[#101b2c] bg-[#be9269] hover:bg-[#be9269]/90 transition-colors px-4 py-1.5 rounded-md font-medium"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu button remains the same */}
        <button 
          className="md:hidden text-gray-300 p-1" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu - let's improve this too */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#101b2c] border-t border-[#be9269]/20 mt-3 py-3 px-4 flex flex-col space-y-4">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search questions..."
              className="w-full bg-[#172334] text-gray-300 border border-[#be9269]/30 rounded-md py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <nav className="flex flex-col space-y-3">
            {isLoggedIn ? (
              <>
                {/* User Profile in Mobile Menu */}
                {profilePicture && (
                  <div className="flex items-center justify-between py-2 border-b border-[#be9269]/10">
                    <div className="flex items-center space-x-2">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#be9269]/40">
                        {!imageError && profilePicture ? (
                          <img
                            src={profilePicture}
                            alt={userName || 'User'}
                            className="w-full h-full object-cover"
                            onError={() => setImageError(true)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-sm font-semibold"
                            style={{ backgroundColor: '#6366f1' }}>
                            {getUserInitial()}
                          </div>
                        )}
                      </div>
                      <span className="text-white font-medium">{userName}</span>
                    </div>
                    
                    <button
                      onClick={() => navigate('/settings')}
                      className="bg-[#be9269]/10 text-[#be9269] p-2 rounded-md hover:bg-[#be9269]/20"
                    >
                      <Settings size={18} />
                    </button>
                  </div>
                )}
                
                <Link
                  to="/collab"
                  className="flex items-center text-[#be9269] hover:text-[#be9269]/80 py-2"
                >
                  <Code size={20} className="mr-2" />
                  <span>Code Together</span>
                </Link>
                
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center text-white bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 py-2 px-4 rounded-md text-center font-medium"
                >
                  <LogOut size={20} className="mr-2" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/signin" className="text-gray-300 hover:text-white py-2">
                  Sign in
                </Link>
                <Link to="/signup" className="text-[#101b2c] bg-[#be9269] hover:bg-[#be9269]/90 py-2 px-4 rounded-md text-center font-medium">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;