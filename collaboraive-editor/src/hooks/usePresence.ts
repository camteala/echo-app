import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface UseUserPresenceProps {
  roomId: string;
  currentUser: User;
}

export function useUserPresence({ roomId, currentUser }: UseUserPresenceProps) {
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  
  useEffect(() => {
    if (!roomId || !currentUser) return;
    
    console.log("Setting up presence for", currentUser.name, "in room", roomId);
    
    // Always include the current user in active users immediately
    setActiveUsers(prev => {
      const exists = prev.some(u => u.id === currentUser.id);
      if (!exists) {
        return [...prev, currentUser];
      }
      return prev;
    });

    // Create a dedicated channel for this room
    const channel = supabase.channel(`presence:${roomId}`);
    
    // Handle users joining
    channel.on('broadcast', { event: 'user_joined' }, ({ payload }) => {
      console.log("User joined:", payload.user.name);
      
      // Add the new user to our state
      setActiveUsers(prev => {
        // Check if this user is already in our list
        if (!prev.some(u => u.id === payload.user.id)) {
          return [...prev, payload.user];
        }
        return prev;
      });
      
      // If another user just joined, announce our presence to them
      if (payload.user.id !== currentUser.id) {
        channel.send({
          type: 'broadcast',
          event: 'user_joined',
          payload: { user: currentUser }
        });
      }
    });
    
    // Handle users leaving
    channel.on('broadcast', { event: 'user_left' }, ({ payload }) => {
      console.log("User left:", payload.userId);
      
      // Remove the user from our state
      setActiveUsers(prev => prev.filter(u => u.id !== payload.userId));
    });
    
    // Subscribe to the channel
    channel.subscribe(status => {
      console.log("Channel subscription status:", status);
      
      if (status === 'SUBSCRIBED') {
        // Announce our presence once subscribed
        channel.send({
          type: 'broadcast',
          event: 'user_joined',
          payload: { user: currentUser }
        });
      }
    });
    
    // Periodically broadcast our presence as a heartbeat
    const intervalId = setInterval(() => {
      channel.send({
        type: 'broadcast',
        event: 'user_joined',
        payload: { user: currentUser }
      });
    }, 10000);
    
    // When unmounting, announce that we're leaving
    return () => {
      console.log("User leaving:", currentUser.name);
      channel.send({
        type: 'broadcast',
        event: 'user_left',
        payload: { userId: currentUser.id }
      }).then(() => {
        clearInterval(intervalId);
        channel.unsubscribe();
      });
    };
  }, [roomId, currentUser]);

  return { 
    activeUsers,
    currentUserId: currentUser?.id 
  };
}