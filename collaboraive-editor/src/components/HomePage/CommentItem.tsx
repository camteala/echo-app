import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabase';
import { Reply, Trash2, Edit } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface CommentProps {
  comment: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    user_name: string;
    user_avatar: string | null;
    question_id: string;
    parent_id: string | null;
  };
  onReply: (parentId: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
}

const CommentItem: React.FC<CommentProps> = ({ 
  comment, 
  onReply, 
  onDelete,
  onUpdate
}) => {
  const { user, isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Return relative time
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
  
  const handleSaveEdit = () => {
    if (editContent.trim()) {
      onUpdate(comment.id, editContent);
      setIsEditing(false);
    }
  };
  
  const isOwner = user?.id === comment.user_id;
  
  return (
    <div className="py-3 border-b border-[#be9269]/10 last:border-b-0">
      <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full overflow-hidden border border-[#be9269]/30 flex-shrink-0">
  {comment.user_avatar ? (
    <img 
      src={comment.user_avatar} 
      alt={comment.user_name} 
      className="object-cover w-full h-full"
      onError={(e) => {
        console.error(`Failed to load avatar for ${comment.user_name}`);
        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user_name)}&background=be9269&color=101b2c`;
      }}
    />
  ) : (
    <div className="w-full h-full bg-[#be9269]/20 text-[#be9269] flex items-center justify-center">
      {comment.user_name?.[0]?.toUpperCase() || 'A'}
    </div>
  )}
</div>
        
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <span className="text-sm font-medium text-[#be9269]">{comment.user_name}</span>
            <span className="text-xs text-gray-400 ml-2">{formatDate(comment.created_at)}</span>
          </div>
          
          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                rows={3}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-xs text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-xs bg-[#be9269] text-[#101b2c] rounded-md"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-300 text-sm whitespace-pre-wrap">{comment.content}</p>
          )}
          
          <div className="flex items-center gap-4 mt-2">
            <button 
              onClick={() => onReply(comment.id)}
              className="text-xs text-gray-400 hover:text-[#be9269] flex items-center gap-1"
            >
              <Reply size={14} />
              Reply
            </button>
            
            {isOwner && (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-gray-400 hover:text-[#be9269] flex items-center gap-1"
                >
                  <Edit size={14} />
                  Edit
                </button>
                <button 
                  onClick={() => onDelete(comment.id)}
                  className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentItem;