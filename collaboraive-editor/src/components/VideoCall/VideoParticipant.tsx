// Split the component to isolate video from chat re-renders
import { Mic, MicOff, VideoOff, Video, User } from 'lucide-react';
import React, { memo, useEffect, useState } from 'react';

// Updated interface to include hasEnabledMedia
interface VideoParticipantProps {
  participant: {
    id: string;
    name?: string;
    hasVideo: boolean;
    hasAudio: boolean;
    stream?: MediaStream;
    profileUrl?: string;
    hasEnabledMedia?: boolean; // Track if media has been enabled at all
  };
  isLocal: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  videoRefs: React.MutableRefObject<{ [userId: string]: HTMLVideoElement | null }>;
  onEnableMedia?: () => void; // New callback to enable media
}

const VideoParticipant = memo(({ 
  participant, 
  isLocal,
  localVideoRef, 
  localStreamRef, 
  videoRefs,
  onEnableMedia 
}: VideoParticipantProps) => {
  const [isActive, setIsActive] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Generate fallback avatar URL if profile picture isn't available or fails to load
  const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.name || 'User')}&background=0D8ABC&color=fff&size=128&bold=true`;

  // Optional: Add speaking detection effect
  useEffect(() => {
    if (participant.hasAudio && participant.stream && participant.id !== 'self') {
      // Simulate speaking detection with random intervals
      const interval = setInterval(() => {
        setIsActive(Math.random() > 0.7);
      }, 2000);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [participant.hasAudio, participant.stream, participant.id]);

  // Determine if media is enabled for this participant
  const hasEnabledMedia = participant.hasEnabledMedia || 
    (participant.hasVideo || participant.hasAudio) || 
    (participant.stream != null);

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-800 h-full shadow-md transition-all duration-300 group">
      {/* Show video if available and enabled */}
      {participant.hasVideo && participant.stream ? (
        <video
          ref={el => {
            if (participant.id === 'self') {
              if (el) {
                localVideoRef.current = el;
              }
              if (el && localStreamRef.current) {
                el.srcObject = localStreamRef.current;
              }
            } else {
              videoRefs.current[participant.id] = el;
              if (el && participant.stream) {
                el.srcObject = participant.stream;
              }
            }
          }}
          autoPlay
          muted={participant.id === 'self'}
          playsInline
          className={`w-full h-full object-cover ${participant.id === 'self' ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
          {/* If media is not enabled at all, show a different UI */}
          {!hasEnabledMedia ? (
            <div className="text-center p-4">
              <div className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <User size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-300 font-medium">{participant.name}</p>
              <p className="text-gray-400 text-sm mt-1 mb-3">Camera not enabled</p>
              
              {/* Only show enable button for self */}
              {isLocal && onEnableMedia && (
                <button
                  onClick={onEnableMedia}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                >
                  Enable camera & mic
                </button>
              )}
            </div>
          ) : (
            // Regular avatar display for users with enabled media but video off
            <>
              {participant.profileUrl && !imageError ? (
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-600/40 shadow-lg">
                  <img
                    src={participant.profileUrl}
                    alt={`${participant.name || 'User'}'s profile`}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                  <div className="absolute bottom-1 right-1 bg-gray-800 rounded-full p-1 border border-gray-700">
                    <VideoOff size={14} className="text-red-400" />
                  </div>
                </div>
              ) : (
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-600/40 shadow-lg">
                  <img
                    src={fallbackAvatarUrl}
                    alt={`${participant.name || 'User'}'s avatar`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 bg-gray-800 rounded-full p-1 border border-gray-700">
                    <VideoOff size={14} className="text-red-400" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Video border when actively speaking - only if media enabled */}
      {isActive && participant.hasAudio && hasEnabledMedia && (
        <div className="absolute inset-0 border-2 border-green-400 rounded-xl pointer-events-none"></div>
      )}

      {/* Improved participant name badge - show for all users */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-white flex items-center">
            {participant.name} {participant.id === 'self' && <span className="text-xs ml-1.5 opacity-70">(You)</span>}
          </span>
          
          {/* Only show audio status indicator if media is enabled */}
          {hasEnabledMedia && (
            <div className={`h-2.5 w-2.5 rounded-full ${participant.hasAudio
                ? isActive ? 'bg-green-400 animate-pulse' : 'bg-green-400'
                : 'bg-red-500'
              }`}
              title={participant.hasAudio ? 'Microphone on' : 'Microphone off'}>
            </div>
          )}
        </div>
      </div>

      {/* Media status indicators - only if media is enabled */}
      {hasEnabledMedia && (
        <div className="absolute top-2 right-2 flex space-x-1.5">
          {!participant.hasAudio && (
            <div className="bg-black/50 rounded-full p-1.5" title="Microphone off">
              <MicOff size={14} className="text-red-400" />
            </div>
          )}
        </div>
      )}

      {/* Hover overlay for self-view - only if video is enabled */}
      {participant.id === 'self' && participant.hasVideo && (
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="bg-black/60 px-3 py-1.5 rounded-lg text-white text-sm">Your camera</span>
        </div>
      )}
    </div>
  );
});

export default VideoParticipant;