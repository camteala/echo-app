import React from 'react';
import type { ChatMessage as ChatMessageType } from '../../interfaces'; // Use type-only import

interface ChatMessageProps {
  message: ChatMessageType; // Use the renamed type
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => (
  <div className="flex flex-col">
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm font-medium text-gray-300">{message.user}</span>
      <span className="text-xs text-gray-500">{message.time}</span>
    </div>
    <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300">
      {message.message}
    </div>
  </div>
);

export default ChatMessage;