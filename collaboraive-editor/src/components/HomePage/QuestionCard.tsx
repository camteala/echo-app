import React, { useState, useEffect } from 'react';
import { MessageSquare, Eye, Activity, Award, Clock } from 'lucide-react';
import { Question } from '../../types';
import { Link } from 'react-router-dom';
import VoteControls from './VoteControl';


interface QuestionCardProps {
  question: Question;
}


const QuestionCard: React.FC<QuestionCardProps> = ({ question }) => {
  const [avatarError, setAvatarError] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(true);

  
  useEffect(() => {
    if (question.user_avatar) {
      console.log("Avatar URL check:", {
        user: question.user_name,
        avatarUrl: question.user_avatar,
        isFullUrl: question.user_avatar.startsWith('http'),
        userId: question.user_id
      });
  
      // Test if the URL is accessible
      fetch(question.user_avatar, { method: 'HEAD' })
        .then(res => console.log(`Avatar URL status for ${question.user_name}:`, res.status, res.ok))
        .catch(err => console.error(`Avatar URL error for ${question.user_name}:`, err));
    }
  }, [question]);
  useEffect(() => {
    setAvatarError(false);
  }, [question.id, question.user_avatar]);
  
  // Log the avatar URL for debugging
  useEffect(() => {
    console.log(`QuestionCard: User ${question.user_name} avatar: ${question.user_avatar}`);
  }, [question.user_name, question.user_avatar]);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.round(diffMs / 60000);

    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Check if question is trending (high view count or recent activity)
  const isTrending = question.views > 100 || (question.answers > 5);

  // Check if question is popular (high vote count)
  const isPopular = question.votes > 10;

  return (
    <div className="relative bg-gradient-to-br from-[#172334] to-[#1a2942] border border-[#be9269]/10 rounded-lg p-5 hover:border-[#be9269]/40 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-[#be9269]/10 overflow-hidden group">
      {/* Highlight for trending/popular questions */}
      {(isTrending || isPopular) && (
        <div className="absolute top-0 right-0">
          {isPopular && (
            <div className="bg-gradient-to-r from-[#be9269] to-amber-500 text-[#101b2c] text-xs font-bold px-3 py-1 flex items-center">
              <Award size={12} className="mr-1" /> Popular
            </div>
          )}
          {isTrending && !isPopular && (
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-3 py-1 flex items-center">
              <Activity size={12} className="mr-1" /> Trending
            </div>
          )}
        </div>
      )}

      {/* Decorative element */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-[#be9269]/5 blur-xl group-hover:bg-[#be9269]/10 transition-all duration-500"></div>

      <div className="flex flex-col md:flex-row gap-5">
        {/* Stats Column */}
        <div className="flex md:flex-col justify-start md:justify-center items-center space-x-6 md:space-x-0 md:space-y-4 md:w-20 py-2 md:border-r border-[#be9269]/10 md:pr-4">
          {/* Vote Controls */}
          <div className="transition-transform hover:scale-110">
            <VoteControls questionId={question.id} />
          </div>

          <div className="flex flex-col items-center text-gray-300 group/answers hover:text-[#be9269] transition-colors">
            <div className="p-1.5 rounded-full bg-[#be9269]/10 group-hover/answers:bg-[#be9269]/20 transition-colors">
              <MessageSquare size={16} className="group-hover/answers:scale-110 transition-transform" />
            </div>
            <span className="text-sm mt-1">{question.answers || 0}</span>
          </div>

          <div className="flex flex-col items-center text-gray-300 group/views hover:text-[#be9269] transition-colors">
            <div className="p-1.5 rounded-full bg-[#be9269]/10 group-hover/views:bg-[#be9269]/20 transition-colors">
              <Eye size={16} className="group-hover/views:scale-110 transition-transform" />
            </div>
            <span className="text-sm mt-1">{question.views || 0}</span>
          </div>
        </div>

        {/* Content Column */}
        <div className="flex-1">
          <Link to={`/question/${question.id}`}>
            <h3 className="text-xl font-bold text-white hover:text-[#be9269] transition-colors cursor-pointer group-hover:text-[#be9269]">
              {question.title}
            </h3>
          </Link>

          <p className="text-gray-300 text-sm mt-3 mb-4 line-clamp-2 leading-relaxed">{question.excerpt}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-4 mb-4">
            {question.tags && question.tags.map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-[#be9269]/10 text-[#be9269] px-3 py-1.5 rounded-full hover:bg-[#be9269]/20 transition-all hover:scale-105 cursor-pointer border border-[#be9269]/20"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Bottom Row - Author and Active Users */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#be9269]/10">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#be9269]/40 shadow-md shadow-[#be9269]/20">
              {question.user_avatar && !avatarError ? (
      <img
        src={question.user_avatar}
        alt={question.user_name || 'Anonymous'}
        className="object-cover w-full h-full"
        onError={(e) => {
          console.error(`Avatar load error for ${question.user_name}: ${question.user_avatar}`);
          setAvatarError(true);
        }}
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center bg-[#be9269]/20 text-[#be9269] font-medium">
        {question.user_name?.[0]?.toUpperCase() || 'A'}
      </div>
    )}
  </div>
              <div>
                <span className="text-xs text-gray-400 flex items-center">
                  <Clock size={12} className="mr-1 text-[#be9269]/70" />
                  {formatDate(question.asked_at)}
                </span>
                <span className="text-sm text-[#be9269] font-medium">{question.user_name || 'Anonymous'}</span>
              </div>
            </div>

            {/* Active Collaborators */}
            {question.active_users && question.active_users.length > 0 && (
              <div className="flex items-center bg-[#101b2c]/60 px-3 py-1 rounded-full">
                <div className="flex -space-x-2 mr-2">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 text-xs flex items-center justify-center text-green-400 border border-green-500/30">
                    {question.active_users.length}
                  </div>
                </div>
                <span className="text-xs text-green-400">active now</span>
                <Activity size={14} className="text-green-400 ml-1 animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;