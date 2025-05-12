import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, Send, UserPlus, Phone, PhoneOff, Users, ChevronRight } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import VideoParticipant from './VideoParticipant';
import { debounce } from 'lodash';
import { supabase } from '../../lib/supabase';
import MessagesDisplay from './MessagesDisplay';
import ChatInput from './ChatInput';
interface User {
  id: string;
  username: string;
}

interface Message {
  sender: string;
  content: string;
  timestamp?: string;
}

interface Participant {
  id: string;
  name: string;
  hasVideo: boolean;
  hasAudio: boolean;
  stream?: MediaStream;
  profileUrl?: string;
  hasEnabledMedia?: boolean; 
}

interface VideoChatProps {
  onCollapse?: () => void;
}

const HEARTBEAT_INTERVAL = 10000; 

const VideoChat: React.FC<VideoChatProps> = ({ onCollapse }) => {
  const { roomId } = useParams<{ roomId?: string }>();
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [videoEnabled, setVideoEnabled] = useState(false); 
  const [audioEnabled, setAudioEnabled] = useState(false); 
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [mediaEnabled, setMediaEnabled] = useState(false);
  const [participantsWithMedia, setParticipantsWithMedia] = useState<Set<string>>(new Set());

 
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<{ [userId: string]: RTCPeerConnection }>({});
  const videoRefs = useRef<{ [userId: string]: HTMLVideoElement | null }>({});
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const usernameRef = useRef<string>('');
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottomRef = useRef<HTMLDivElement>(null);
  const MemoizedVideoParticipant = React.memo(VideoParticipant);

  const debouncedSetNewMessage = useCallback(
    debounce((value: string) => setNewMessage(value), 100),
    []
  );
  
  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollToBottomRef.current) {
      scrollToBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  useEffect(() => {
    if (isJoined) {
      cleanupDuplicates();

      cleanupTimerRef.current = setInterval(() => {
        cleanupDuplicates();
      }, 3000); 

      fetchProfilePicture();

      return () => {
        if (cleanupTimerRef.current) {
          clearInterval(cleanupTimerRef.current);
        }
      };
    }
  }, [isJoined, participants.length]);

  useEffect(() => {
    if (!isJoined || !roomId) return;
  
   
    socketRef.current = io('http://localhost:5000/webrtc');
  
    socketRef.current.on('connect', () => {
      console.log('Connected to WebRTC server with ID:', socketRef.current?.id);
      setIsConnected(true);
      setConnectionError(null);
  
      if (socketRef.current && roomId) {
        socketRef.current.emit('join-room', roomId, username);
      }
  
      startHeartbeat();
    });
    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionError('Failed to connect to video chat server');
    });

    socketRef.current.on('user-list', (users: User[]) => {
      console.log('Received user list:', users);

      ensureLocalParticipant();

      const validUsers = users.filter(user =>
        user.id !== socketRef.current?.id &&
        !isLikelySocketId(user.username)
      );

      const userIds = new Set<string>();

      validUsers.forEach(user => {
        userIds.add(user.id);

        setParticipants(prev => {
          if (prev.some(p => p.id === user.id)) return prev;

          return [...prev, {
            id: user.id,
            name: user.username,
            hasVideo: false, 
            hasAudio: false, 
            hasEnabledMedia: false 
          }];
        });

        
      });

      setParticipants(prev =>
        prev.filter(p => p.id === 'self' || userIds.has(p.id))
      );
    });

    socketRef.current.on('user-joined', (user: User) => {
      console.log('User joined:', user);

      if (isLikelySocketId(user.username)) {
        console.log(`Ignoring user with invalid name: ${user.username}`);
        return;
      }

      setParticipants(prev => {
        if (prev.some(p => p.id === user.id)) return prev;

        return [...prev, {
          id: user.id,
          name: user.username,
          hasVideo: false, 
          hasAudio: false, 
          hasEnabledMedia: false 
        }];
      });

      if (mediaEnabled && localStreamRef.current) {
        createPeerConnection(user.id, false);
      }
    });

    socketRef.current.on('user-left', (user: User) => {
      console.log('User left:', user);

      setParticipants(prev => prev.filter(p => p.id !== user.id));

      if (peersRef.current[user.id]) {
        peersRef.current[user.id].close();
        delete peersRef.current[user.id];
      }

      if (videoRefs.current[user.id]) {
        delete videoRefs.current[user.id];
      }

      setParticipantsWithMedia(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.id);
        return newSet;
      });
    });

    // Handle WebRTC signaling
    socketRef.current.on('signal', async (data: any) => {
      const { type, from, fromUsername, payload } = data;

      // Skip logging ice candidates (too noisy)
      if (type !== 'ice-candidate') {
        console.log(`Received ${type} from ${fromUsername} (${from})`);
      }

      // Skip users with invalid names
      if (isLikelySocketId(fromUsername)) {
        console.log(`Ignoring signal from user with invalid name: ${fromUsername}`);
        return;
      }

      // Create or get peer connection
      const pc = await getOrCreatePeerConnection(from);

      try {
        if (type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          // Send answer
          sendSignal(from, 'answer', pc.localDescription);

          // Make sure the user is in our participant list with correct username
          ensureParticipantExists(from, fromUsername);

        } else if (type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload));

        } else if (type === 'ice-candidate' && payload) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload));
          } catch (err) {
            // Only log error if connection isn't closed
            if (pc.connectionState !== 'closed') {
              console.error('Error adding ICE candidate:', err);
            }
          }
        }
      } catch (err) {
        console.error(`Error handling ${type} from ${from}:`, err);
      }
    });

    // Handle media updates
    socketRef.current.on('media', (data: { userId: string, username: string, video: boolean, audio: boolean }) => {
      console.log('Media update:', data);

      // Skip users with invalid names
      if (isLikelySocketId(data.username)) {
        console.log(`Ignoring media update from user with invalid name: ${data.username}`);
        return;
      }

      // Ensure the participant exists with correct name
      ensureParticipantExists(data.userId, data.username);

      setParticipants(prev =>
        prev.map(p =>
          p.id === data.userId
            ? { 
                ...p, 
                hasVideo: data.video, 
                hasAudio: data.audio,
                hasEnabledMedia: true 
              }
            : p
        )
      );

      // If they have enabled media (either audio or video), add to set
      if (data.video || data.audio) {
        setParticipantsWithMedia(prev => {
          const newSet = new Set(prev);
          newSet.add(data.userId);
          return newSet;
        });

        // If we have media but no connection to this user yet, create one
        if (mediaEnabled && localStreamRef.current && !peersRef.current[data.userId]) {
          createPeerConnection(data.userId, true);
        }
      }
    });

    // Handle errors from server
    socketRef.current.on('error', (error: { message: string }) => {
      console.error('Server error:', error);
      setConnectionError(error.message);
    });

    // Handle chat messages
    socketRef.current.on('chat', (message: Message) => {
      console.log('Chat message received:', message);
      setMessages(prev => [...prev, message]);
    });

    socketRef.current.on('chat-history', (history: Message[]) => {
      console.log('Received chat history:', history);
      setMessages(history);
    });
    
    // Cleanup on unmount
    return () => {
      console.log('Cleaning up video chat connections');

      // Stop heartbeat
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      // Stop cleanup timer
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
        cleanupTimerRef.current = null;
      }

      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      // Close all peer connections
      Object.values(peersRef.current).forEach(pc => pc.close());

      // Disconnect socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [isJoined, roomId]);

  // Helper to check if a string looks like a socket ID
  const isLikelySocketId = (str: string): boolean => {
    // Check for common socket.io ID patterns (contains dashes, underscores, very long, etc)
    return !str ||
      str.includes('-') ||
      str.includes('_') ||
      str.length > 20 ||
      /^[a-zA-Z0-9-_]{20,}$/.test(str);
  };

  // Start heartbeat to keep connection alive
  const startHeartbeat = () => {
    // Clear any existing interval
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    // Start a new interval
    heartbeatRef.current = setInterval(() => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('heartbeat');
      }
    }, HEARTBEAT_INTERVAL);
  };

  // Ensure a participant exists with the correct name
  const ensureParticipantExists = (id: string, username: string) => {
    // Skip if this looks like a socket ID
    if (isLikelySocketId(username)) return;

    setParticipants(prev => {
      // Check if already exists
      const exists = prev.some(p => p.id === id);

      if (!exists) {
        return [...prev, {
          id,
          name: username,
          hasVideo: false,
          hasAudio: false,
          hasEnabledMedia: false
        }];
      }

      // Update name if different
      return prev.map(p =>
        p.id === id && p.name !== username
          ? { ...p, name: username }
          : p
      );
    });
  };

  // Make sure local participant exists
  const ensureLocalParticipant = () => {
    setParticipants(prev => {
      // Check if self already exists
      const selfExists = prev.some(p => p.id === 'self');

      if (!selfExists) {
        return [
          ...prev,
          {
            id: 'self',
            name: usernameRef.current,
            hasVideo: false,
            hasAudio: false,
            stream: localStreamRef.current ?? undefined, // Convert null to undefined
            hasEnabledMedia: mediaEnabled
          }
        ];
      }

      return prev;
    });
  };

  // Helper to send signals
  const sendSignal = (to: string, type: string, payload: any) => {
    if (!socketRef.current) return;

    socketRef.current.emit('signal', {
      to,
      type,
      payload
    });
  };

  // Get or create a peer connection
  const getOrCreatePeerConnection = async (userId: string, initiateOffer = false): Promise<RTCPeerConnection> => {
    // Return existing connection if available
    if (peersRef.current[userId]) {
      return peersRef.current[userId];
    }
    console.log(`Creating new peer connection for ${userId}${initiateOffer ? ' (as initiator)' : ''}`);

    // Create new connection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Store reference
    peersRef.current[userId] = pc;

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        if (localStreamRef.current) {
          pc.addTrack(track, localStreamRef.current);
        }
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = event => {
      if (event.candidate) {
        sendSignal(userId, 'ice-candidate', event.candidate);
      }
    };

    // Handle tracks
    pc.ontrack = event => {
      console.log(`Received track from ${userId}`, event.streams);

      if (event.streams && event.streams[0]) {
        // Update participant with stream
        setParticipants(prev =>
          prev.map(p =>
            p.id === userId
              ? { ...p, stream: event.streams[0], hasEnabledMedia: true }
              : p
          )
        );
        
        // Update participantsWithMedia
        setParticipantsWithMedia(prev => {
          const newSet = new Set(prev);
          newSet.add(userId);
          return newSet;
        });
      }
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}: ${pc.connectionState}`);

      // Clean up failed connections
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        console.log(`Connection with ${userId} ${pc.connectionState}, cleaning up`);

        delete peersRef.current[userId];
      }
    };

    // Create offer if we're the initiator
    if (initiateOffer) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(userId, 'offer', pc.localDescription);
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    }

    return pc;
  };

  // Create a peer connection 
  const createPeerConnection = (userId: string, initiateOffer = false) => {
    console.log(`Creating peer connection to ${userId}, initiateOffer: ${initiateOffer}`);
    
    // If we already have a connection, close it and recreate
    if (peersRef.current[userId]) {
      console.log(`Closing existing connection to ${userId}`);
      peersRef.current[userId].close();
    }
    
    // Create new connection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    // Store reference
    peersRef.current[userId] = pc;
  
    // Add local tracks if we have them
    if (localStreamRef.current) {
      console.log(`Adding ${localStreamRef.current.getTracks().length} local tracks to connection`);
      localStreamRef.current.getTracks().forEach(track => {
        if (localStreamRef.current) {
          pc.addTrack(track, localStreamRef.current);
        }
      });
    }
  
    // Handle ICE candidates
    pc.onicecandidate = event => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('signal', {
          to: userId,
          type: 'ice-candidate',
          payload: event.candidate
        });
      }
    };
  
    // Handle incoming tracks
    pc.ontrack = event => {
      console.log(`Received track from ${userId}`, event.streams);
      
      if (event.streams && event.streams[0]) {
        setParticipants(prev => 
          prev.map(p => 
            p.id === userId
              ? { ...p, stream: event.streams[0], hasEnabledMedia: true }
              : p
          )
        );
      }
    };
  
    // Create offer if we're the initiator
    if (initiateOffer) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          if (socketRef.current && pc.localDescription) {
            socketRef.current.emit('signal', {
              to: userId,
              type: 'offer',
              payload: pc.localDescription
            });
          }
        })
        .catch(err => {
          console.error('Error creating offer:', err);
        });
    }
  
    return pc;
  };
  
  // Fix the handleJoin function - simplify it
  const handleJoin = () => {
    if (username.trim()) {
      setIsJoined(true);
      setConnectionError(null);
      usernameRef.current = username;
    }
  };

  // Enable media separately
  const enableMedia = async () => {
    try {
      console.log('Attempting to get user media...');
      
      // First try with both video and audio
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      }).catch(async () => {
        // If that fails, try with just audio
        console.log('Failed to get video+audio, trying audio only');
        return await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        });
      });
  
      console.log('Got media stream:', stream.getTracks().map(t => t.kind).join(', '));
      localStreamRef.current = stream;
      
      // Set default enabled state based on what tracks we got
      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;
      
      setVideoEnabled(hasVideo);
      setAudioEnabled(hasAudio);
      setMediaEnabled(true);
      
      // Update self participant
      setParticipants(prev => {
        return prev.map(p => 
          p.id === 'self'
            ? { 
                ...p, 
                stream, 
                hasVideo, 
                hasAudio,
                hasEnabledMedia: true
              } 
            : p
        );
      });
  
      // Create connections to all existing participants
      participants.forEach(participant => {
        if (participant.id !== 'self' && !peersRef.current[participant.id]) {
          console.log(`Creating connection to existing participant: ${participant.id}`);
          createPeerConnection(participant.id, true);
        }
      });
  
      // Tell others about our media state
      if (socketRef.current) {
        console.log('Notifying others about our media state');
        socketRef.current.emit('media', {
          video: hasVideo,
          audio: hasAudio
        });
      }
    } catch (err) {
      console.error('Failed to get any media:', err);
      setConnectionError('Could not access camera or microphone. Check permissions.');
    }
  };

  // Fetch profile picture from Supabase
  const fetchProfilePicture = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch profile picture URL from profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url, display_name')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }
        
        if (data?.avatar_url) {
          // More robust handling of the profile URL
          try {
            let profileUrl = null;
            
            if (data.avatar_url.startsWith('http')) {
              // If it's already a full URL, use it directly
              profileUrl = data.avatar_url;
            } else {
              // Otherwise try to get public URL from storage
              const { data: publicUrlData } = supabase.storage
                .from('user-uploads')
                .getPublicUrl(data.avatar_url.replace(/^\//, ''));
                
              if (publicUrlData?.publicUrl) {
                profileUrl = publicUrlData.publicUrl;
              }
            }
            
            // Only update if we successfully got a URL
            if (profileUrl) {
              // Update self participant with profile URL
              setParticipants(prev =>
                prev.map(p => p.id === 'self' 
                  ? { ...p, profileUrl: profileUrl }
                  : p
                )
              );
            }
          } catch (err) {
            console.error('Error processing profile image URL:', err);
          }
        }
      }
    } catch (err) {
      console.error('Error in fetchProfilePicture:', err);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (!mediaEnabled) {
      enableMedia();
      return;
    }
    
    if (localStreamRef.current) {
      const newState = !videoEnabled;

      // Update tracks
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = newState;
      });

      // Update state
      setVideoEnabled(newState);

      // Update self in participants
      setParticipants(prev =>
        prev.map(p => p.id === 'self' ? { ...p, hasVideo: newState } : p)
      );

      // Notify others
      if (socketRef.current) {
        socketRef.current.emit('media', {
          video: newState,
          audio: audioEnabled
        });
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (!mediaEnabled) {
      enableMedia();
      return;
    }
    
    if (localStreamRef.current) {
      const newState = !audioEnabled;

      // Update tracks
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = newState;
      });

      // Update state
      setAudioEnabled(newState);

      // Update self in participants
      setParticipants(prev =>
        prev.map(p => p.id === 'self' ? { ...p, hasAudio: newState } : p)
      );

      // Notify others
      if (socketRef.current) {
        socketRef.current.emit('media', {
          video: videoEnabled,
          audio: newState
        });
      }
    }
  };

  // Send chat message
  const handleSendMessage = () => {
    if (newMessage.trim() && socketRef.current) {
      socketRef.current.emit('chat', newMessage);
      setNewMessage('');
    }
  };

  // Leave room
  const handleLeave = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave');
      socketRef.current.disconnect();
    }

    // Clean up
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    if (cleanupTimerRef.current) {
      clearInterval(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

    // Stop media
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close connections
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};

    // Reset state
    setIsConnected(false);
    setIsJoined(false);
    setParticipants([]);
    setMessages([]);
    setMediaEnabled(false);
    setParticipantsWithMedia(new Set());
  };

  // Calculate grid layout
  const getGridClass = () => {
    const count = participants.length;
    if (count <= 1) return "";
    if (count === 2) return "grid-cols-2 grid-rows-1"; // Two participants side by side
    if (count <= 4) return "grid-cols-2 grid-rows-2";  // Up to 4 in a 2x2 grid
    if (count <= 9) return "grid-cols-3 grid-rows-3";  // Up to 9 in a 3x3 grid
    return "grid-cols-4 grid-rows-3";                  // More than 9
  };

  // Clean up duplicate users
  const cleanupDuplicates = () => {
    // First check if any participants have socket IDs as usernames
    const invalidParticipants = participants.filter(p =>
      p.id !== 'self' && isLikelySocketId(p.name)
    );

    if (invalidParticipants.length > 0 && socketRef.current) {
      console.log('Found invalid participants, rejoining room to force cleanup', invalidParticipants);

      // Force rejoin to clean up server state
      socketRef.current.emit('leave');

      setTimeout(() => {
        if (socketRef.current && roomId) {
          socketRef.current.emit('join-room', roomId, username);
        }
      }, 500);

      return; // Skip the rest of the cleanup to avoid state conflicts
    }

    // Get unique participants by username
    const uniqueParticipants = new Map();

    // First add self
    const self = participants.find(p => p.id === 'self');
    if (self) uniqueParticipants.set('self', self);

    // Then add one instance of each remote user, preferring those with streams
    participants.forEach(p => {
      if (p.id !== 'self' && !isLikelySocketId(p.name)) {
        const key = p.name; // Use username as key

        if (!uniqueParticipants.has(key) ||
          (!uniqueParticipants.get(key).stream && p.stream)) {
          uniqueParticipants.set(key, p);
        }
      }
    });

    // Set the filtered list
    const newParticipants = Array.from(uniqueParticipants.values());
    if (JSON.stringify(newParticipants) !== JSON.stringify(participants)) {
      setParticipants(newParticipants);
    }

    // Clean up orphaned connections
    Object.keys(peersRef.current).forEach(id => {
      if (!newParticipants.some(p => p.id === id)) {
        if (peersRef.current[id]?.connectionState !== 'closed') {
          console.log(`Closing orphaned connection to ${id}`);
          peersRef.current[id].close();
        }
        delete peersRef.current[id];
      }
    });
  };

  return (
    <div className="w-96 bg-gray-800 flex flex-col relative h-full will-change-transform">
      {/* Collapse button */}
      <button 
        onClick={onCollapse}
        className="absolute -left-4 top-24 transform bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-l-md z-50 shadow-lg"
        title="Hide video chat"
      >
        <ChevronRight size={20} />
      </button>

      {/* Username at top when joined */}
      {isJoined && (
        <div className="p-2 bg-gray-900 text-center flex justify-between items-center">
          <p className="text-sm text-gray-300">Logged in as <span className="font-medium text-white">{username}</span></p>
          <div className="flex items-center">
            <Users size={16} className="text-gray-400 mr-1" />
            <span className="text-gray-300 text-sm">{participants.length}</span>
          </div>
        </div>
      )}

      {/* Username input if not joined */}
      {!isJoined && (
        <div className="p-4 bg-gray-900">
          <h3 className="text-lg font-medium mb-2">Join Video Chat</h3>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 px-4 py-2 rounded-md bg-gray-700 text-white"
              onKeyPress={(e) => e.key === 'Enter' && username.trim() && handleJoin()}
            />
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white disabled:opacity-50"
              disabled={!username.trim()}
              onClick={handleJoin}
            >
              <UserPlus size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {connectionError && (
        <div className="p-2 bg-red-600 text-white text-sm">
          {connectionError}
        </div>
      )}

      {/* Enhanced video container */}
      {isJoined && (
        <div className="bg-gradient-to-b from-gray-900 to-gray-800 p-3 pb-16 relative flex-grow shadow-inner" 
             style={{ minHeight: "280px", willChange: 'transform' }}>
          
          {/* Video container */}
          <div className={`h-full w-full rounded-lg overflow-hidden ${
              participants.length > 1 ? 'grid gap-3 ' + getGridClass() : ''
            }`}
          >
            {participants.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full bg-gray-800 bg-opacity-50 rounded-xl">
                <Users size={40} className="text-gray-600 mb-2" />
                <p className="text-gray-400 text-center">Waiting for others to join...</p>
                <p className="text-gray-500 text-xs mt-2">Share your room link to invite people</p>
              </div>
            ) : (
              participants.map(participant => {
                
                const hasEnabledMedia = participant.id === 'self' ? 
                  mediaEnabled : participant.hasEnabledMedia;
              
                // Show placeholder if media not enabled
                if (!hasEnabledMedia) {
                  return (
                    <div key={participant.id} className="flex flex-col items-center justify-center h-full bg-gray-800 bg-opacity-50 rounded-xl">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Users size={24} className="text-gray-500" />
                        </div>
                        <p className="text-gray-300 font-medium">{participant.name}</p>
                        <p className="text-gray-500 text-sm mt-1">Camera not enabled</p>
                        
                        {/* Only show enable button for self */}
                        {participant.id === 'self' && (
                          <button
                            onClick={enableMedia}
                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                          >
                            Enable camera & mic
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
                
                // Regular video participant
                return (
                  <MemoizedVideoParticipant 
                  key={participant.id}
                  participant={participant}
                  isLocal={participant.id === 'self'}
                  localVideoRef={localVideoRef as React.RefObject<HTMLVideoElement>}
                  localStreamRef={localStreamRef}
                  videoRefs={videoRefs}
                  onEnableMedia={participant.id === 'self' ? enableMedia : undefined}
                />
              );
            })
            )}
          </div>

          {/* Video controls */}
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex items-center space-x-3 z-10 
                          bg-gray-800 bg-opacity-80 backdrop-blur-sm px-4 py-2.5 rounded-full 
                          border border-gray-700 shadow-xl">
            <button
              onClick={toggleVideo}
              className={`p-2.5 rounded-full transition-all duration-200 ${
                mediaEnabled && videoEnabled 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-red-600 hover:bg-red-500'
              }`}
              title={mediaEnabled && videoEnabled ? "Turn off camera" : "Turn on camera"}
            >
              {mediaEnabled && videoEnabled 
                ? <Video className="text-white" size={20} /> 
                : <VideoOff className="text-white" size={20} />
              }
            </button>
            <button
              onClick={toggleAudio}
              className={`p-2.5 rounded-full transition-all duration-200 ${
                mediaEnabled && audioEnabled 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-red-600 hover:bg-red-500'
              }`}
              title={mediaEnabled && audioEnabled ? "Mute microphone" : "Unmute microphone"}
            >
              {mediaEnabled && audioEnabled 
                ? <Mic className="text-white" size={20} /> 
                : <MicOff className="text-white" size={20} />
              }
            </button>
            <div className="h-8 border-l border-gray-600 mx-1"></div>
            <button
              onClick={handleLeave}
              className="p-2.5 rounded-full bg-red-600 hover:bg-red-700 transition-all duration-200"
              title="Leave call"
            >
              <PhoneOff className="text-white" size={20} />
            </button>
          </div>
        </div>
      )}

{isJoined && (
  <div className="flex-grow flex flex-col min-h-0 overflow-hidden border-t border-gray-700">
    {/* Chat header */}
    <div className="p-3 bg-gray-800 border-b border-gray-700">
      <h3 className="text-white font-semibold flex items-center">
        <Send size={16} className="mr-2 text-blue-400" /> 
        Chat
      </h3>
    </div>
    
    <MessagesDisplay 
      messages={messages}
      currentUsername={username} 
    />
    
    <ChatInput 
      onSendMessage={(message) => {
        if (socketRef.current) {
          socketRef.current.emit('chat', message);
        }
      }}
      isConnected={isConnected}
    />
  </div>
)}

      {/* Message when not joined */}
      {!isJoined && (
        <div className="flex-grow flex items-center justify-center p-4 text-center">
          <p className="text-gray-400">Enter your username to join the video chat</p>
        </div>
      )}
    </div>
  );
};

export default VideoChat;