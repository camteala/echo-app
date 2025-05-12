import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarItem from './SidebarItem';
import { Files, Search, GitBranch, Play, Package, User, Settings, LogOut } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabase';

interface SidebarProps {
  activeTab: number;
  setActiveTab: (index: number) => void;
}
const localSidebarItems = [
  { icon: <Files size={24} />, label: 'Explorer', route: '/explorer' },
  { icon: <Play size={24} />, label: 'Run', route: '/run' },
  { icon: <Settings size={24} />, label: 'Settings', route: '/settings' },
];
const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Fetch user profile image from Supabase - IMPROVED
  useEffect(() => {
    const fetchUserProfile = async () => {
      setImageLoading(true);
      setImageError(false);
      
      try {
        if (currentUser?.id) {
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_url, display_name')
            .eq('id', currentUser.id)
            .single();
            
          if (error) {
            console.error('Error fetching profile data:', error);
            setImageError(true);
          } else if (data && data.avatar_url) {
            console.log('Profile data found:', data.display_name);
            
            // Try to create a signed URL for the image (works better with special characters)
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
                  setProfileImageUrl(data.avatar_url);
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
                  setProfileImageUrl(publicUrlData.publicUrl);
                } else {
                  throw new Error('Could not get public URL either');
                }
              } else if (signedUrlData?.signedUrl) {
                console.log('Got signed URL');
                setProfileImageUrl(signedUrlData.signedUrl);
              }
            } catch (storageErr) {
              console.error('Error with storage:', storageErr);
              // Last resort - try to use the avatar_url directly
              if (data.avatar_url.startsWith('http')) {
                setProfileImageUrl(data.avatar_url);
              } else {
                setImageError(true);
              }
            }
          } else {
            // No avatar URL found
            setProfileImageUrl(null);
          }
        }
      } catch (err) {
        console.error('Error in profile fetch:', err);
        setImageError(true);
      } finally {
        setImageLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [currentUser?.id]);

  // Function to get user initial as fallback
  const getUserInitial = (): string => {
    if (!currentUser?.name) return '?';
    
    if (currentUser.name.includes('@')) {
      const emailPart = currentUser.name.split('@')[0];
      return emailPart.charAt(0).toUpperCase();
    }
    
    return currentUser.name.charAt(0).toUpperCase();
  };
  
  // Handler for image load error
  const handleImageError = () => {
    console.error('Image failed to load:', profileImageUrl);
    setImageError(true);
    setProfileImageUrl(null);
  };

  // Modified to handle route errors
  const handleItemClick = (index: number) => {
    setActiveTab(index);
    
    // Get the route from sidebarItems
    const route = localSidebarItems[index]?.route;
    
    if (route) {
      try {
        navigate(route);
      } catch (err) {
        console.error(`Navigation error to route: ${route}`, err);
      }
    }
  };

  const handleLeaveRoom = () => {
    try {
      navigate('/collab');
    } catch (err) {
      console.error('Error navigating to /collab:', err);
    }
  };

  const handleProfileClick = () => {
    try {
      navigate('/settings');
    } catch (err) {
      console.error('Error navigating to /settings:', err);
    }
  };

  return (
    <div className="w-12 bg-gray-900 flex flex-col border-r border-gray-800">
      {/* Map through sidebar items with error handling */}
      {localSidebarItems.map((item, index) => (
        <SidebarItem
          key={index}
          icon={item.icon}
          isActive={activeTab === index}
          onClick={() => handleItemClick(index)}
        />
      ))}

      <div className="mt-auto flex flex-col items-center">
        {/* User Profile Picture - clickable to go to settings */}
        <div className="mb-3 relative group cursor-pointer" onClick={handleProfileClick}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border-2 border-blue-500">
            {!imageError && profileImageUrl ? (
              <img 
                src={profileImageUrl}
                alt={currentUser?.name || 'User'} 
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-white text-sm font-semibold"
                style={{ backgroundColor: currentUser?.color || '#6366f1' }}
              >
                {getUserInitial()}
              </div>
            )}
          </div>
          <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-400 border border-gray-900"></span>
          
          {/* Tooltip showing user name and profile status */}
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
            <div>{currentUser?.name || 'User'}</div>
            {imageLoading && <div className="text-yellow-400 text-[10px]">Loading profile...</div>}
            {imageError && <div className="text-red-400 text-[10px]">Failed to load image</div>}
            <div className="text-blue-400 text-[10px]">Click to edit profile</div>
          </div>
        </div>
        
        {/* Leave Room button with tooltip */}
        <div className="mb-4 relative group">
          <SidebarItem
            icon={<LogOut size={24} color="#ef4444" />}
            isActive={false}
            onClick={handleLeaveRoom}
          />
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
            Leave Room
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;