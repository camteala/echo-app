import React from 'react';
import { Video, VideoOff, Mic, MicOff, Phone } from 'lucide-react';

interface VideoControlsProps {
  isVideoOn: boolean;
  setIsVideoOn: (value: boolean) => void;
  isMicOn: boolean;
  setIsMicOn: (value: boolean) => void;
}

const VideoControls: React.FC<VideoControlsProps> = ({ isVideoOn, setIsVideoOn, isMicOn, setIsMicOn }) => (
  <div className="flex justify-center space-x-4">
    <button
      onClick={() => setIsVideoOn(!isVideoOn)}
      className={`p-2 rounded-full ${
        isVideoOn ? 'bg-gray-700 text-gray-300' : 'bg-red-500/20 text-red-500'
      }`}
    >
      {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
    </button>
    <button
      onClick={() => setIsMicOn(!isMicOn)}
      className={`p-2 rounded-full ${
        isMicOn ? 'bg-gray-700 text-gray-300' : 'bg-red-500/20 text-red-500'
      }`}
    >
      {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
    </button>
    <button className="p-2 rounded-full bg-red-500/20 text-red-500">
      <Phone size={20} />
    </button>
  </div>
);

export default VideoControls;