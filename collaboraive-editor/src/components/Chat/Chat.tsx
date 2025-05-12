import React from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { ChatMessage as ChatMessageType } from '../../interfaces';

interface ChatProps {
  messages: ChatMessageType[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
}

const Chat: React.FC<ChatProps> = ({ messages, newMessage, setNewMessage, handleSendMessage }) => (
  <div className="flex-1 flex flex-col">
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="space-y-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
      </div>
    </div>
    <ChatInput
      newMessage={newMessage}
      setNewMessage={setNewMessage}
      handleSendMessage={handleSendMessage}
    />
  </div>
);

export default Chat;