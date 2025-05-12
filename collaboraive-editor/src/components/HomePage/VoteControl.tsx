import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useVotes } from '../../hooks/useVotes';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

const VoteControls: React.FC<{ questionId: string }> = ({ questionId }) => {
  const { votes, userVote, voteQuestion } = useVotes(questionId);
  const { isAuthenticated } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleVote = (value: 1 | -1) => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      setTimeout(() => setShowLoginPrompt(false), 3000);
      return;
    }
    
    voteQuestion(value);
  };

  return (
    <div className="flex flex-col items-center relative">
      <button 
        className={`text-${userVote === 1 ? '[#be9269]' : 'gray-400'} hover:text-[#be9269]`}
        onClick={() => handleVote(1)}
      >
        <ThumbsUp size={18} />
      </button>
      
      <span className="text-white my-2">{votes}</span>
      
      <button 
        className={`text-${userVote === -1 ? '[#be9269]' : 'gray-400'} hover:text-[#be9269]`}
        onClick={() => handleVote(-1)}
      >
        <ThumbsDown size={18} />
      </button>
      
      {/* Login prompt tooltip */}
      {showLoginPrompt && (
        <div className="absolute left-full ml-2 bg-[#172334] text-white rounded p-2 text-xs w-48 shadow-lg z-10">
          Please <Link to="/signin" className="text-[#be9269] hover:underline">sign in</Link> to vote
        </div>
      )}
    </div>
  );
};

export default VoteControls;