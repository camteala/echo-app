import { useState } from 'react';

export const useVideoCall = () => {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);

  return {
    isVideoOn,
    setIsVideoOn,
    isMicOn,
    setIsMicOn,
  };
};