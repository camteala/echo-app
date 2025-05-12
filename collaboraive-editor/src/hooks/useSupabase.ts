import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Define types for messages and signaling
interface ChatMessage {
  id?: string;
  room_id: string;
  sender: string;
  content: string;
  created_at?: string;
}

interface SignalingMessage {
  id?: string;
  room_id: string;
  type: 'join' | 'offer' | 'answer' | 'ice-candidate' | 'leave';
  sender: string;
  recipient?: string;
  payload: any;
  created_at?: string;
}

export const useSupabase = () => {
  const [supabase, setSupabase] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  
  // Initialize Supabase client
  useEffect(() => {
    try {
      // These should come from environment variables in a real app
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
      const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
      
      if (!supabaseUrl || !supabaseKey) {
        setSupabaseError('Supabase URL or key is missing');
        return;
      }
      
      const client = createClient(supabaseUrl, supabaseKey);
      setSupabase(client);
    } catch (error) {
      console.error('Error initializing Supabase:', error);
      setSupabaseError('Failed to initialize Supabase');
    }
  }, []);

  // Send a chat message
  const sendMessage = async (content: string, sender: string, roomId: string) => {
    if (!supabase || !content || !sender || !roomId) return;
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender,
          content
        });
        
      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      setSupabaseError('Failed to send message');
    }
  };

  // Subscribe to chat messages for a specific room
  const subscribeToMessages = async (roomId: string) => {
    if (!supabase || !roomId) return;
    
    try {
      // Get existing messages
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      setMessages(data || []);
      
      // Subscribe to new messages
      const subscription = supabase
        .channel(`room-messages:${roomId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        }, (payload: any) => {
          if (payload.new) {
            setMessages(prev => [...prev, payload.new]);
          }
        })
        .subscribe();
        
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error subscribing to messages:', error);
      setSupabaseError('Failed to load messages');
    }
  };

  // Send a signaling message
  const sendSignal = async (message: Omit<SignalingMessage, 'id' | 'created_at'>) => {
    if (!supabase) return;
    
    try {
      const { error } = await supabase
        .from('signaling')
        .insert(message);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error sending signal:', error);
      setSupabaseError('Failed to send signaling message');
    }
  };

  // Subscribe to signaling messages
  const subscribeToSignals = async (roomId: string, callback: (message: SignalingMessage) => void) => {
    if (!supabase || !roomId) return;
    
    try {
      const subscription = supabase
        .channel(`room-signaling:${roomId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'signaling',
          filter: `room_id=eq.${roomId}`
        }, (payload: any) => {
          if (payload.new) {
            callback(payload.new);
          }
        })
        .subscribe();
        
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error subscribing to signals:', error);
      setSupabaseError('Failed to subscribe to signals');
    }
  };

  return {
    supabase,
    messages,
    supabaseError,
    sendMessage,
    subscribeToMessages,
    sendSignal,
    subscribeToSignals
  };
};