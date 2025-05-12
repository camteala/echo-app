import React, { createContext, useState, useEffect, useRef, useContext, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { User, Selection, CursorPosition } from '../types';
import { Socket, io } from 'socket.io-client';

// WebRTC related interfaces
interface Message {
  content: string;
  sender: string;
  timestamp: string;
}

interface PeerConnections {
  [userId: string]: RTCPeerConnection;
}

interface Peers {
  [userId: string]: MediaStream;
}

interface UserContextType {
  // Existing properties
  currentUser: User;
  activeUsers: User[];
  isPresenceLoaded: boolean;
  selections: Record<string, Selection>;
  cursorPositions: Record<string, CursorPosition>;
  typingUsers: string[];
  updateSelection: (selection: Selection) => void;
  updateCursorPosition: (position: CursorPosition) => void;
  setUserTyping: (isTyping: boolean) => void;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  users: User[];
  
  // WebRTC related properties
  localStream: MediaStream | null;
  remoteStreams: Peers;
  messages: Message[];
  videoEnabled: boolean;
  audioEnabled: boolean;
  toggleVideo: () => void;
  toggleAudio: () => void;
  sendMessage: (message: string, username: string) => void;
}

const UserContext = createContext<UserContextType>({
  currentUser: { id: '', name: '', color: '' },
  activeUsers: [],
  isPresenceLoaded: false,
  selections: {},
  cursorPositions: {},
  typingUsers: [],
  updateSelection: () => {},
  updateCursorPosition: () => {},
  setUserTyping: () => {},
  user: null,
  setUser: () => {},
  users: [],
  
  // WebRTC defaults
  localStream: null,
  remoteStreams: {},
  messages: [],
  videoEnabled: true,
  audioEnabled: true,
  toggleVideo: () => {},
  toggleAudio: () => {},
  sendMessage: () => {}
});

// Function to generate a consistent color based on user ID
const generateUserColor = (userId: string): string => {
  const colors = [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7', 
    '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', 
    '#009688', '#4CAF50', '#8BC34A', '#CDDC39', 
    '#FFC107', '#FF9800', '#FF5722'
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

interface UserProviderProps {
  children: React.ReactNode;
  roomId: string | undefined;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children, roomId }) => {
  // Existing state
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [isPresenceLoaded, setIsPresenceLoaded] = useState(false);
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [cursorPositions, setCursorPositions] = useState<Record<string, CursorPosition>>({});
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const presenceChannelRef = useRef<any>(null);
  
  // Initialize current user from Supabase Auth first, then session storage as fallback
  const [currentUser, setCurrentUser] = useState<User>({ 
    id: '', 
    name: '', 
    color: '' 
  });
  
  // WebRTC related state
  const [remoteStreams, setRemoteStreams] = useState<Peers>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const webrtcSocketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnections = useRef<PeerConnections>({});
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Improved user initialization with better error handling
  useEffect(() => {
    const initUser = async () => {
      try {
        // Try Supabase auth first as it's more reliable
        if (supabase) {
          const { data: authData } = await supabase.auth.getSession();
          if (authData?.session?.user) {
            const userId = authData.session.user.id;
            const userEmail = authData.session.user.email || '';
            const userName = authData.session.user.user_metadata?.name || userEmail.split('@')[0] || 'User';
            
            setCurrentUser({
              id: userId,
              name: userName,
              color: generateUserColor(userId)
            });
            
            console.log("Using authenticated user from Supabase:", userName);
            return;
          }
        }
        
        // Fall back to custom auth if needed
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          try {
            // Add timeout to avoid hanging if server is down
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch('http://localhost:4001/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: authToken }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              console.warn(`Auth verification failed: ${response.status}. Using anonymous user.`);
              throw new Error('Auth verification failed');
            }
            
            const data = await response.json();
            if (data.valid) {
              const userId = data.user.id;
              const userName = data.user.name || data.user.email?.split('@')[0] || 'User';
              
              setCurrentUser({
                id: userId,
                name: userName,
                color: generateUserColor(userId)
              });
              
              console.log("Using authenticated user from custom auth:", userName);
              return;
            }
          } catch (error) {
            console.error("Error verifying custom auth:", error);
          }
        }
        
        // Create anonymous user if all auth methods fail
        const anonymousId = sessionStorage.getItem('anonymousUserId') || uuidv4();
        sessionStorage.setItem('anonymousUserId', anonymousId);
        
        // Generate a random name for anonymous users
        const adjectives = ['Happy', 'Swift', 'Clever', 'Bold', 'Quiet', 'Wise', 'Brave'];
        const nouns = ['Coder', 'Eagle', 'Panda', 'Tiger', 'Fox', 'Wolf', 'Bear'];
        const randomName = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
        
        setCurrentUser({
          id: anonymousId,
          name: randomName,
          color: generateUserColor(anonymousId)
        });
        
        console.log("Using anonymous user:", randomName);
      } catch (error) {
        console.error("Error initializing user:", error);
        
        // Last resort fallback
        const fallbackId = uuidv4();
        setCurrentUser({
          id: fallbackId,
          name: 'Anonymous',
          color: generateUserColor(fallbackId)
        });
      }
    };

    initUser();
  }, []);

  // Selection update function
  const updateSelection = (selection: Selection) => {
    if (!roomId || !supabase || !currentUser.id) return;
    
    // Broadcast selection to other users
    supabase.channel(`room:${roomId}`).send({
      type: 'broadcast',
      event: 'selection_change',
      payload: { 
        userId: currentUser.id,
        selection
      }
    });
  };
  
  // Cursor position update function
  const updateCursorPosition = (position: CursorPosition) => {
    if (!roomId || !supabase || !currentUser.id) return;
    
    // Broadcast cursor position to other users
    supabase.channel(`room:${roomId}`).send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: { 
        userId: currentUser.id,
        position
      }
    });
  };
  
  // Set user typing status
  const setUserTyping = (isTyping: boolean) => {
    if (!roomId || !supabase || !currentUser.id) return;
    
    // Broadcast typing status to other users
    supabase.channel(`room:${roomId}`).send({
      type: 'broadcast',
      event: 'typing_status',
      payload: { 
        userId: currentUser.id,
        isTyping
      }
    });
    
    // If user is typing, clear any existing timeout
    if (isTyping) {
      if (typingTimeoutRef.current[currentUser.id]) {
        clearTimeout(typingTimeoutRef.current[currentUser.id]);
      }
      
      // Set a new timeout to automatically turn off typing status after 2 seconds
      typingTimeoutRef.current[currentUser.id] = setTimeout(() => {
        setUserTyping(false);
      }, 2000);
    }
  };

  // Improved presence system using Supabase's dedicated presence feature
  const setupPresence = useCallback(() => {
    if (!roomId || !supabase || !currentUser.id) return;
    
    console.log(`Setting up presence for ${currentUser.name} in room ${roomId}`);
    
    // Include current user immediately for smoother UI
    setActiveUsers(prev => {
      if (!prev.some(u => u.id === currentUser.id)) {
        return [...prev, currentUser];
      }
      return prev;
    });
    
    // Clean up any existing channel
    if (presenceChannelRef.current) {
      presenceChannelRef.current.unsubscribe();
    }
    
    // Create a presence-enabled channel
    const channel = supabase.channel(`presence:${roomId}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });
    
    // Handle presence sync events
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      console.log('Presence state updated:', state);
      
      // Convert presence state to our user format
      const usersFromPresence = Object.entries(state).map(([userId, presences]) => {
        // Each user might have multiple presences, use the first one
        const userPresence = presences[0] as any;
        return {
          id: userId,
          name: userPresence.user_name || 'Anonymous',
          color: generateUserColor(userId)
        };
      });
      
      // Update active users with a smooth transition
      setActiveUsers(usersFromPresence);
    });
    
    // Handle presence join events for more responsive UI
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      const presence = newPresences[0] as any;
      console.log(`User joined: ${presence.user_name}`);
      
      setActiveUsers(prev => {
        if (!prev.some(u => u.id === key)) {
          return [...prev, {
            id: key,
            name: presence.user_name || 'Anonymous',
            color: generateUserColor(key)
          }];
        }
        return prev;
      });
    });
    
    // Handle presence leave events
    channel.on('presence', { event: 'leave' }, ({ key }) => {
      console.log(`User leaving: ${key}`);
      
      // Small delay before removing to prevent UI flashing if they reconnect
      setTimeout(() => {
        setActiveUsers(prev => {
          // Only remove if they're still gone after the delay
          if (channel.presenceState()[key]) {
            return prev;
          }
          return prev.filter(u => u.id !== key);
        });
        
        // Clean up their selection and cursor
        setSelections(prev => {
          const newSelections = {...prev};
          delete newSelections[key];
          return newSelections;
        });
        
        setCursorPositions(prev => {
          const newPositions = {...prev};
          delete newPositions[key];
          return newPositions;
        });
        
        // Remove typing status
        setTypingUsers(prev => prev.filter(id => id !== key));
      }, 1000);
    });
    
    // Subscribe to the channel and track the current user
    channel.subscribe(async (status) => {
      console.log(`Channel subscription status: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        // Track this user with their details
        await channel.track({
          user_id: currentUser.id,
          user_name: currentUser.name,
          joined_at: new Date().toISOString()
        });
        
        setIsPresenceLoaded(true);
      }
    });
    
    // Store the channel reference for cleanup
    presenceChannelRef.current = channel;
    
    // Set up a broadcast channel for collaborative features
    setupCollaborationChannel();
    
    // Return a cleanup function
    return () => {
      if (presenceChannelRef.current) {
        presenceChannelRef.current.unsubscribe();
      }
    };
  }, [roomId, currentUser]);
  
  // Set up the collaboration channel for selections and cursors
  const setupCollaborationChannel = useCallback(() => {
    if (!roomId || !supabase || !currentUser.id) return;
    
    // Create a dedicated channel for collaborative features
    const channel = supabase.channel(`collab:${roomId}`);
    
    // Handle selection changes from other users
    channel.on('broadcast', { event: 'selection_change' }, ({ payload }) => {
      const { userId, selection } = payload;
      if (userId !== currentUser.id) {
        setSelections(prev => ({
          ...prev,
          [userId]: selection
        }));
      }
    });
    
    // Handle cursor movements from other users
    channel.on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
      const { userId, position } = payload;
      if (userId !== currentUser.id) {
        setCursorPositions(prev => ({
          ...prev,
          [userId]: position
        }));
      }
    });
    
    // Handle typing status updates
    channel.on('broadcast', { event: 'typing_status' }, ({ payload }) => {
      const { userId, isTyping } = payload;
      if (userId !== currentUser.id) {
        setTypingUsers(prev => {
          if (isTyping && !prev.includes(userId)) {
            return [...prev, userId];
          } else if (!isTyping) {
            return prev.filter(id => id !== userId);
          }
          return prev;
        });
      }
    });
    
    // Subscribe to the channel
    channel.subscribe();
    
  }, [roomId, currentUser]);

  // Set up presence when currentUser or roomId changes
  useEffect(() => {
    if (currentUser.id && roomId) {
      const cleanup = setupPresence();
      return cleanup;
    }
  }, [currentUser.id, roomId, setupPresence]);

  // Initialize WebRTC with better error handling
  useEffect(() => {
    if (!roomId || !currentUser.id) return;
    
    let isComponentMounted = true; // Prevent state updates after unmount
    
    // Connect to the signaling server with the WebRTC namespace
    try {
      webrtcSocketRef.current = io('http://localhost:5000/webrtc', {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });
      
      webrtcSocketRef.current.on('connect_error', (err) => {
        console.warn('WebRTC socket connection error:', err.message);
      });
    } catch (err) {
      console.error('Error connecting to WebRTC server:', err);
    }

    // Get local media stream with better error handling
    const setupMediaStream = async () => {
      try {
        // First try with both video and audio
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        if (isComponentMounted) {
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
        
        // Setup WebRTC once we have media
        setupWebRTC(stream);
      } catch (videoAudioErr) {
        console.warn('Could not get video+audio, trying audio only:', videoAudioErr);
        
        try {
          // Fall back to audio only
          const audioStream = await navigator.mediaDevices.getUserMedia({ 
            video: false, 
            audio: true 
          });
          
          if (isComponentMounted) {
            setLocalStream(audioStream);
            setVideoEnabled(false);
          }
          
          // Setup WebRTC with audio only
          setupWebRTC(audioStream);
        } catch (audioErr) {
          console.error('Could not get audio access either:', audioErr);
          
          // Final fallback: no media
          if (isComponentMounted) {
            setVideoEnabled(false);
            setAudioEnabled(false);
          }
        }
      }
    };
    
    // Setup WebRTC connections
    const setupWebRTC = (stream: MediaStream) => {
      if (!webrtcSocketRef.current || !isComponentMounted) return;
      
      // Join the room using the roomId
      const socketId = webrtcSocketRef.current.id;
      webrtcSocketRef.current.emit('join-room', roomId, socketId, {
        userName: currentUser.name,
        userId: currentUser.id
      });
      
      // Listen for new users
      webrtcSocketRef.current.on('user-connected', (userId: string) => {
        console.log('WebRTC: New user connected:', userId);
        // Create a new peer connection for this user
        createPeerConnection(userId, true, stream);
      });
      
      // Handle offers from other peers
      webrtcSocketRef.current.on('offer', (offer: RTCSessionDescriptionInit, userId: string) => {
        handleOffer(offer, userId, stream);
      });
      
      // Handle answers to our offers
      webrtcSocketRef.current.on('answer', (answer: RTCSessionDescriptionInit, userId: string) => {
        handleAnswer(answer, userId);
      });
      
      // Handle ICE candidates
      webrtcSocketRef.current.on('ice-candidate', (candidate: RTCIceCandidateInit, userId: string) => {
        handleIceCandidate(candidate, userId);
      });
      
      // Handle user disconnection
      webrtcSocketRef.current.on('user-disconnected', (userId: string) => {
        if (peerConnections.current[userId]) {
          peerConnections.current[userId].close();
          delete peerConnections.current[userId];
        }
        
        if (isComponentMounted) {
          setRemoteStreams(prevStreams => {
            const newStreams = { ...prevStreams };
            delete newStreams[userId];
            return newStreams;
          });
        }
      });
      
      // Handle chat messages
      webrtcSocketRef.current.on('receive-message', (message: Message) => {
        if (isComponentMounted) {
          setMessages(prevMessages => [...prevMessages, message]);
        }
      });
    };
    
    setupMediaStream();
      
    return () => {
      isComponentMounted = false;
      
      // Clean up
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      if (webrtcSocketRef.current) {
        webrtcSocketRef.current.disconnect();
      }
      
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
    };
  }, [roomId, currentUser.id]);
  
  // Toggle video with state update
  const toggleVideo = (): void => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      
      // Only toggle if there are video tracks
      if (videoTracks.length > 0) {
        videoTracks.forEach(track => {
          track.enabled = !track.enabled;
        });
        setVideoEnabled(!videoEnabled);
      }
    }
  };
  
  // Toggle audio with state update
  const toggleAudio = (): void => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      
      // Only toggle if there are audio tracks
      if (audioTracks.length > 0) {
        audioTracks.forEach(track => {
          track.enabled = !track.enabled;
        });
        setAudioEnabled(!audioEnabled);
      }
    }
  };
  
  // Send a message with validation
  const sendMessage = (message: string, username: string): void => {
    if (!message || !message.trim()) return;
    
    if (webrtcSocketRef.current && roomId) {
      const formattedMessage = {
        content: message.trim(),
        sender: username || currentUser.name,
        timestamp: new Date().toISOString()
      };
      
      // Add message locally immediately for better UX
      setMessages(prevMessages => [...prevMessages, formattedMessage]);
      
      // Then send to others
      webrtcSocketRef.current.emit('send-message', formattedMessage.content, roomId, formattedMessage.sender);
    }
  };
  
  // Helper functions for WebRTC
  const createPeerConnection = (userId: string, isInitiator: boolean, stream: MediaStream): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });
    
    peerConnections.current[userId] = pc;
    
    // Add local tracks to the connection
    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }
    
    // Listen for remote tracks
    pc.ontrack = (event: RTCTrackEvent) => {
      setRemoteStreams(prevStreams => ({
        ...prevStreams,
        [userId]: event.streams[0]
      }));
    };
    
    // ICE candidate handling
    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate && webrtcSocketRef.current && roomId) {
        webrtcSocketRef.current.emit('ice-candidate', event.candidate, roomId, webrtcSocketRef.current.id);
      }
    };
    
    // Connection state monitoring
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${userId}: ${pc.iceConnectionState}`);
      
      // Handle disconnected peers
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'closed') {
        console.log(`Peer ${userId} disconnected`);
      }
    };
    
    // If we're the initiator, create and send an offer
    if (isInitiator && webrtcSocketRef.current && roomId) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          if (webrtcSocketRef.current && pc.localDescription) {
            webrtcSocketRef.current.emit('offer', pc.localDescription, roomId, webrtcSocketRef.current.id);
          }
        })
        .catch(error => console.error("Error creating offer:", error));
    }
    
    return pc;
  };
  
  const handleOffer = (offer: RTCSessionDescriptionInit, userId: string, stream: MediaStream): void => {
    const pc = peerConnections.current[userId] || createPeerConnection(userId, false, stream);
    
    pc.setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => pc.createAnswer())
      .then(answer => pc.setLocalDescription(answer))
      .then(() => {
        if (webrtcSocketRef.current && roomId && pc.localDescription) {
          webrtcSocketRef.current.emit('answer', pc.localDescription, roomId, webrtcSocketRef.current.id);
        }
      })
      .catch(error => console.error("Error handling offer:", error));
  };
  
  const handleAnswer = (answer: RTCSessionDescriptionInit, userId: string): void => {
    const pc = peerConnections.current[userId];
    if (pc) {
      pc.setRemoteDescription(new RTCSessionDescription(answer))
        .catch(error => console.error("Error handling answer:", error));
    }
  };
  
  const handleIceCandidate = (candidate: RTCIceCandidateInit, userId: string): void => {
    const pc = peerConnections.current[userId];
    if (pc) {
      pc.addIceCandidate(new RTCIceCandidate(candidate))
        .catch(error => console.error("Error handling ICE candidate:", error));
    }
  };

  return (
    <UserContext.Provider
      value={{
        // Existing properties
        currentUser,
        activeUsers,
        isPresenceLoaded,
        selections,
        cursorPositions,
        typingUsers,
        updateSelection,
        updateCursorPosition,
        setUserTyping,
        user,
        setUser,
        users,
        
        // WebRTC properties
        localStream,
        remoteStreams,
        messages,
        videoEnabled,
        audioEnabled,
        toggleVideo,
        toggleAudio,
        sendMessage
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

export default UserContext;