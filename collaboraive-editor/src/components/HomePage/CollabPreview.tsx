import React from 'react';
import { Code, Users, MessageSquare, GitBranch } from 'lucide-react';
import collabImage from '../../assets/collab.png'; 
import { useNavigate } from 'react-router-dom';

const CollabPreview: React.FC = () => {
  const navigate = useNavigate();

  const handleTryCollabClick = () => {
    navigate('/collab');
  };


  return (
    <div className="py-16 bg-[#172334]/30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Real-time Collaborative Coding
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Code together in real-time with developers around the world. Share your screen, chat, and solve problems collaboratively.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Preview Image */}
          <div className="lg:w-3/5 relative">
            <div className="bg-[#101b2c] rounded-lg border border-[#be9269]/20 overflow-hidden shadow-2xl">
              <img
                src={collabImage}
                alt="Collaborative Coding Interface"
                className="w-full h-auto rounded-lg opacity-80"
              />
              {/* Overlay Features */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#101b2c] to-transparent">
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 bg-[#be9269]/10 text-[#be9269] px-3 py-1.5 rounded-full">
                        <Users size={14} />
                        <span>8 participants</span>
                      </div>
                      <div className="flex items-center space-x-2 bg-[#be9269]/10 text-[#be9269] px-3 py-1.5 rounded-full">
                        <MessageSquare size={14} />
                        <span>Live chat</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      <span>Live</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="lg:w-2/5 space-y-8">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-[#be9269]/10 p-3 rounded-lg">
                  <Code size={24} className="text-[#be9269]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-2">Live Code Editing</h3>
                  <p className="text-gray-300">
                    Write and edit code together in real-time. See changes as they happen and collaborate seamlessly.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-[#be9269]/10 p-3 rounded-lg">
                  <Users size={24} className="text-[#be9269]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-2">Multiple Participants</h3>
                  <p className="text-gray-300">
                    Invite team members or other developers to join your session and work together.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-[#be9269]/10 p-3 rounded-lg">
                  <MessageSquare size={24} className="text-[#be9269]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-2">Integrated Chat</h3>
                  <p className="text-gray-300">
                    Discuss ideas and share feedback with built-in chat functionality.
                  </p>
                </div>
              </div>
            </div>

            <button 
        onClick={handleTryCollabClick}
        className="w-full bg-[#be9269] text-[#101b2c] font-semibold py-3 px-6 rounded-lg hover:bg-[#be9269]/90 transition-colors"
      >
        Try Collaborative Coding
      </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollabPreview;