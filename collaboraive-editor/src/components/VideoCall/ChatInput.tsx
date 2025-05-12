import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Mic, MicOff, Video, VideoOff, Send, UserPlus, Phone, PhoneOff, Users, ChevronRight } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import VideoParticipant from './VideoParticipant';
import { debounce } from 'lodash';
import { supabase } from '../../lib/supabase';

// Create a separate ChatInput component to isolate re-renders
const ChatInput = memo(({ onSendMessage, isConnected }: { 
    onSendMessage: (message: string) => void,
    isConnected: boolean 
  }) => {
    const [inputValue, setInputValue] = useState('');
    
    const handleSend = () => {
      if (inputValue.trim() && isConnected) {
        onSendMessage(inputValue.trim());
        setInputValue('');
      }
    };
    
    return (
      <div className="p-3 bg-gray-750 border-t border-gray-700">
        <div className="flex items-center space-x-2 bg-gray-700 rounded-full p-1 pl-4 shadow-inner">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-400"
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            className={`p-2 rounded-full ${inputValue.trim() && isConnected 
              ? 'bg-blue-600 hover:bg-blue-500 transition-colors' 
              : 'bg-gray-600 cursor-not-allowed opacity-50'}`}
            disabled={!inputValue.trim() || !isConnected}
          >
            <Send className="text-white" size={16} />
          </button>
        </div>
      </div>
    );
  });
  
  // Create a separate MessagesDisplay component
  const MessagesDisplay = memo(({ messages, currentUsername }: {
    messages: Message[],
    currentUsername: string
  }) => {
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

export default ChatInput;