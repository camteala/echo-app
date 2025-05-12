import React, { useEffect, useRef, memo } from 'react';
import { Send } from 'lucide-react';

interface Message {
  sender: string;
  content: string;
  timestamp?: string;
}

interface MessagesDisplayProps {
  messages: Message[];
  currentUsername: string;
}

const MessagesDisplay = memo(({ messages, currentUsername }: MessagesDisplayProps) => {
  const scrollToBottomRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollToBottomRef.current) {
      scrollToBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  return (
    <div 
      ref={messagesEndRef} 
      className="flex-grow overflow-y-auto p-3 space-y-4"
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full opacity-70">
          <Send size={32} className="text-gray-500 mb-2" />
          <p className="text-gray-500 text-center text-sm">No messages yet</p>
          <p className="text-gray-600 text-xs mt-1">Be the first to send a message!</p>
        </div>
      ) : (
        messages.map((message, index) => {
          const isOwnMessage = message.sender === currentUsername;
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const isSameUser = prevMsg && prevMsg.sender === message.sender;
          const showSender = !isSameUser || index === 0;
          
          return (
            <div
              key={index}
              className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} ${isSameUser ? 'mt-1' : 'mt-4'}`}
            >
              {showSender && !isOwnMessage && (
                <span className="text-xs text-gray-400 ml-2 mb-1">{message.sender}</span>
              )}
              
              <div
                className={`px-3 py-2 rounded-2xl max-w-[85%] shadow-sm relative
                  ${isOwnMessage 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-white'
                  } ${!showSender && !isOwnMessage ? 'rounded-tl-md' : ''}`}
              >
                <p className="text-sm break-words leading-relaxed pr-12">{message.content}</p>
                
                {/* Timestamp inside bubble */}
                {message.timestamp && (
                  <span className={`absolute bottom-1.5 right-2.5 text-[10px] ${
                    isOwnMessage ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}
      <div ref={scrollToBottomRef} />
    </div>
  );
});

export default MessagesDisplay;