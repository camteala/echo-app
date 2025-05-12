import React, { useState, memo } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isConnected: boolean;
}

const ChatInput = memo(({ onSendMessage, isConnected }: ChatInputProps) => {
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

export default ChatInput;