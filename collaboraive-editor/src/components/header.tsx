import { useParams, useNavigate, } from 'react-router-dom';
import { Users, Code2, Video, VideoOff, Bell } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { User } from '../types';
import React, { useEffect, useState } from 'react';
import logoImage from '../assets/logo.png';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  showVideoChat?: boolean;
  toggleVideoChat?: () => void;
  pendingRequests?: number;
  hasNewRequests?: boolean;
  showRequestsModal?: () => void;
  isCreator?: boolean;
  refreshRequests?: () => void;
}

const Header: React.FC<HeaderProps> = ({ showVideoChat,
  toggleVideoChat,
  pendingRequests,
  hasNewRequests,
  showRequestsModal,
isCreator, refreshRequests }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { activeUsers, currentUser } = useUser();
  const [displayedUserCount, setDisplayedUserCount] = useState(activeUsers.length);
  const [userAvatars, setUserAvatars] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (activeUsers.length > displayedUserCount) {
      setDisplayedUserCount(activeUsers.length);
    } else {
      const timer = setTimeout(() => {
        setDisplayedUserCount(activeUsers.length);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [activeUsers.length, displayedUserCount]);

  const getUserInitial = (user: User): string => {
    if (!user.name) return '?';

    if (user.name.includes('@')) {
      const emailPart = user.name.split('@')[0];
      return emailPart.charAt(0).toUpperCase();
    }

    return user.name.charAt(0).toUpperCase();
  };

useEffect(() => {
  if (activeUsers.length) {
    fetchUserAvatars(activeUsers);
  }
}, [activeUsers]);


const fetchUserAvatars = async (users: User[]) => {
  if (!users.length) return;
  
  try {
    const userIds = users.map(user => user.id);
    console.log("Fetching avatars for users:", userIds);
    
    // Fetch profiles with more reliable query structure
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, avatar_url, display_name')
      .in('id', userIds);
      
    if (error) {
      console.error("Profile fetch error:", error);
      return;
    }
    
    console.log("Got profiles:", profiles);
    
  
    const avatarMap: {[key: string]: string} = {};
    
    for (const profile of profiles || []) {
      if (profile.avatar_url) {
        try {
          if (profile.avatar_url.startsWith('http')) {
            avatarMap[profile.id] = profile.avatar_url;
            console.log(`User ${profile.id}: Using direct URL ${profile.avatar_url}`);
            continue;
          }
          
          let avatarPath = profile.avatar_url;
          
          avatarPath = avatarPath.replace(/^\/+/, '');
          
          if (avatarPath.startsWith('user-uploads/')) {
            avatarPath = avatarPath.substring('user-uploads/'.length);
          }
          
          try {
            const { data: publicUrlData } = await supabase.storage
              .from('user-uploads')
              .getPublicUrl(avatarPath);
              
            if (publicUrlData?.publicUrl) {
              console.log(`User ${profile.id}: Got public URL: ${publicUrlData.publicUrl}`);
              avatarMap[profile.id] = publicUrlData.publicUrl;
              continue;
            }
          } catch (urlError) {
            console.error(`Error getting URL for path ${avatarPath}:`, urlError);
          }
          
          const altPath = `avatars/${avatarPath}`;
          try {
            const { data: altUrlData } = await supabase.storage
              .from('user-uploads')
              .getPublicUrl(altPath);
              
            if (altUrlData?.publicUrl) {
              console.log(`User ${profile.id}: Got alternate URL: ${altUrlData.publicUrl}`);
              avatarMap[profile.id] = altUrlData.publicUrl;
            }
          } catch (urlError) {
            console.error(`Error getting alternate URL:`, urlError);
          }
        } catch (err) {
          console.error(`Error processing avatar for user ${profile.id}:`, err);
        }
      }
    }
    
    console.log("Final avatar map:", avatarMap);
    setUserAvatars(avatarMap);
  } catch (err) {
    console.error("Error in fetchUserAvatars:", err);
  }
};
  
  return (
    <header className="bg-gradient-to-r from-gray-900 to-gray-800 shadow-lg">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Left Section: Logo and App Name */}
        <div className="flex items-center space-x-3">
          <img src={logoImage} alt="Echo Logo" className="h-12" />
        </div>

        {/* Right Section: Online Users, Room ID, and Video Toggle */}
        <div className="flex items-center space-x-6">

        {isCreator && refreshRequests && (
            <button
              onClick={refreshRequests}
              className="flex items-center bg-blue-600/80 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-sm transition-colors text-xs"
              title="Check for join requests"
            >
              <Users size={14} className="mr-1.5" />
              <span>Check Requests</span>
            </button>
          )}
          {/* Online Users with Avatars - Add animation for smooth transitions */}
          <div className="flex items-center space-x-2 bg-gray-700 px-4 py-2 rounded-lg shadow-sm">
            <Users className="w-5 h-5 text-blue-400" />

            {/* User Avatars with Overlapping Design */}
            <div className="flex -space-x-2 overflow-hidden mr-2">
              {activeUsers.map((user, index) => {
                const initial = getUserInitial(user);
                const hasAvatar = userAvatars[user.id];

                return (
                  <div key={user.id} className="relative animate-fadeIn" style={{ zIndex: activeUsers.length - index }} title={user.name}>
                  <div className={`h-7 w-7 rounded-full overflow-hidden flex items-center justify-center 
                    text-white text-xs font-medium border-2 ${user.id === currentUser?.id ? 'border-blue-400' : 'border-gray-800'}`}
                    style={{ backgroundColor: !hasAvatar ? (user.color || '#6366f1') : undefined }}
                  >
                  {hasAvatar ? (
  <img 
    src={userAvatars[user.id]} 
    alt={user.name || 'User'} 
    className="w-full h-full object-cover"
    onError={(e) => {
      console.error(`Failed to load avatar for ${user.id} from URL: ${userAvatars[user.id]}`);
      // Remove from avatars on error
      setUserAvatars(prev => {
        const updated = {...prev};
        delete updated[user.id];
        return updated;
      });
    }}
  />
) : (
  initial
)}
                  </div>
                  {user.id === currentUser?.id && (
                    <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-400 ring-1 ring-gray-800" />
                  )}
                </div>
              );
            })}
          </div>

            <span className="text-white font-medium min-w-[70px]">
              {displayedUserCount} Online
            </span>
          </div>


          {/* Request Notification Bell - Add this before the Room ID */}
          {(typeof pendingRequests === 'number' && pendingRequests > 0) && (
            <button
              onClick={showRequestsModal}
              className="flex items-center relative bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg shadow-sm transition-colors"
              title="Pending join requests"
            >
              <Bell
                size={18}
                className={hasNewRequests
                  ? "text-amber-400 animate-pulse"
                  : "text-blue-400"
                }
              />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {pendingRequests}
              </span>
            </button>
          )}

          
          {/* Room ID */}
          <div className="bg-gray-700 px-4 py-2 rounded-lg shadow-sm">
            <span className="text-white font-medium">
              Room: <span className="text-blue-400">{roomId}</span>
            </span>
          </div>

          {/* Video Chat Toggle - now visible on all screen sizes */}
          {toggleVideoChat && (
            <button
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center space-x-2"
              onClick={toggleVideoChat}
              title={showVideoChat ? "Hide Video Chat" : "Show Video Chat"}
            >
              {showVideoChat ? (
                <>
                  <VideoOff className="w-5 h-5 text-blue-400" />
                  <span className="hidden md:inline text-white">Hide Chat</span>
                </>
              ) : (
                <>
                  <Video className="w-5 h-5 text-blue-400" />
                  <span className="hidden md:inline text-white">Show Chat</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;