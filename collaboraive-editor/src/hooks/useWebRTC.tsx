import { useEffect, useRef, useState } from 'react';
import { Socket, io } from 'socket.io-client';

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

export const useWebRTC = (roomId: string) => {
  const [peers, setPeers] = useState<Peers>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnections = useRef<PeerConnections>({});
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Initialize socket and local media
  useEffect(() => {
    if (!roomId) return;
    
    // Connect to the signaling server
    // Note the path matches your backend webRTCService configuration
    socketRef.current = io('http://localhost:5000', {
      path: '/webrtc-socket'
    });
    
    // Get local media stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Join the room using the roomId from the URL params
        const userId = socketRef.current!.id;
        socketRef.current!.emit('join-room', roomId, userId);
        
        // Listen for new users
        socketRef.current!.on('user-connected', (userId: string) => {
          console.log('New user connected:', userId);
          // Create a new peer connection for this user
          createPeerConnection(userId, true);
        });
        
        // Handle offers from other peers
        socketRef.current!.on('offer', (offer: RTCSessionDescriptionInit, userId: string) => {
          handleOffer(offer, userId);
        });
        
        // Handle answers to our offers
        socketRef.current!.on('answer', (answer: RTCSessionDescriptionInit, userId: string) => {
          handleAnswer(answer, userId);
        });
        
        // Handle ICE candidates
        socketRef.current!.on('ice-candidate', (candidate: RTCIceCandidateInit, userId: string) => {
          handleIceCandidate(candidate, userId);
        });
        
        // Handle user disconnection
        socketRef.current!.on('user-disconnected', (userId: string) => {
          if (peerConnections.current[userId]) {
            peerConnections.current[userId].close();
            delete peerConnections.current[userId];
          }
          
          setPeers(prevPeers => {
            const newPeers = { ...prevPeers };
            delete newPeers[userId];
            return newPeers;
          });
        });
        
        // Handle chat messages
        socketRef.current!.on('receive-message', (message: Message) => {
          setMessages(prevMessages => [...prevMessages, message]);
        });
      })
      .catch(error => {
        console.error("Error accessing media devices:", error);
      });
      
    return () => {
      // Clean up
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, [roomId]);
  
  // Toggle video
  const toggleVideo = (): void => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };
  
  // Toggle audio
  const toggleAudio = (): void => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setAudioEnabled(!audioEnabled);
    }
  };
  
  // Send a message
  const sendMessage = (message: string, username: string): void => {
    if (message.trim() && socketRef.current) {
      socketRef.current.emit('send-message', message, roomId, username);
    }
  };
  
  // Helper functions for WebRTC
  const createPeerConnection = (userId: string, isInitiator: boolean): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    peerConnections.current[userId] = pc;
    
    // Add local tracks to the connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
    
    // Listen for remote tracks
    pc.ontrack = (event: RTCTrackEvent) => {
      setPeers(prevPeers => ({
        ...prevPeers,
        [userId]: event.streams[0]
      }));
    };
    
    // ICE candidate handling
    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        socketRef.current!.emit('ice-candidate', event.candidate, roomId, socketRef.current!.id);
      }
    };
    
    // If we're the initiator, create and send an offer
    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socketRef.current!.emit('offer', pc.localDescription, roomId, socketRef.current!.id);
        })
        .catch(error => console.error("Error creating offer:", error));
    }
    
    return pc;
  };
  
  const handleOffer = (offer: RTCSessionDescriptionInit, userId: string): void => {
    const pc = peerConnections.current[userId] || createPeerConnection(userId, false);
    
    pc.setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => pc.createAnswer())
      .then(answer => pc.setLocalDescription(answer))
      .then(() => {
        socketRef.current!.emit('answer', pc.localDescription, roomId, socketRef.current!.id);
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
  
  return {
    localVideoRef,
    remoteStreams: peers,
    videoEnabled,
    audioEnabled,
    toggleVideo,
    toggleAudio,
    messages,
    sendMessage
  };
};