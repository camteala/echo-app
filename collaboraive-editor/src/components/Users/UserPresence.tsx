import React from 'react';
import { User } from '../../types';

interface UserPresenceProps {
  activeUsers: User[];
  currentUserId: string;
  theme: any;
}

const UserPresence: React.FC<UserPresenceProps> = ({ activeUsers, currentUserId, theme }) => {
  console.log("Rendering UserPresence with users:", activeUsers);
  
  return (
    <div className="flex items-center px-2">
      <div className="flex -space-x-2 overflow-hidden">
        {activeUsers.map((user) => {
          // Get the first character of the email username part
          const initial = user.name.includes('@') 
            ? user.name.split('@')[0].charAt(0).toUpperCase()
            : user.name.charAt(0).toUpperCase();
            
          return (
            <div
              key={user.id}
              className={`relative ${user.id === currentUserId ? 'z-10 ring-2 ring-white' : ''}`}
              title={user.name}
            >
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-white text-sm font-medium border-2 border-white"
                style={{ backgroundColor: user.color || '#6366f1' }}
              >
                {initial}
              </div>
              {user.id === currentUserId && (
                <span className="absolute bottom-0 right-0 block h-1.5 w-1.5 rounded-full bg-green-400 ring-2 ring-white" />
              )}
            </div>
          );
        })}
      </div>
      {activeUsers.length > 0 && (
        <span className="ml-3 text-xs font-medium">
          {activeUsers.length} user{activeUsers.length !== 1 ? 's' : ''} online
        </span>
      )}
    </div>
  );
};

export default UserPresence;