import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Loader2 } from 'lucide-react';
import CommentItem from './CommentItem';
import { useUser } from '../../context/UserContext';
import { useAuth } from '../../hooks/useAuth';
interface CommentSectionProps {
  questionId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ questionId }) => {
  const { currentUser } = useUser();
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Auth state in CommentSection:", {
      user,
      isAuthenticated,
      userId: user?.id,
      userName: user?.user_metadata?.name || user?.email
    });
  }, [user, isAuthenticated]);
  // Fetch comments
  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('question_id', questionId)
      .order('created_at', { ascending: true });
      
    if (!error && data) {
      setComments(data);
    } else {
      console.error('Error fetching comments:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
    
    // Set up realtime subscription for comments
    const subscription = supabase
      .channel(`comments_${questionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `question_id=eq.${questionId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setComments(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'DELETE') {
            setComments(prev => prev.filter(c => c.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setComments(prev => 
              prev.map(c => c.id === payload.new.id ? payload.new : c)
            );
          }
        }
      )
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [questionId]);
  
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    if (!isAuthenticated) {
      setError("You must be signed in to comment");
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Get the proper avatar URL from the profiles table
      let avatarUrl = null;
      if (user?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        
        if (profileData?.avatar_url) {
          // If it's already a direct URL
          if (profileData.avatar_url.startsWith('http')) {
            avatarUrl = profileData.avatar_url;
          } else {
            // Get public URL from storage
            const { data: urlData } = await supabase.storage
              .from('user-uploads')
              .getPublicUrl(profileData.avatar_url.replace(/^\//, ''));
            
            if (urlData?.publicUrl) {
              avatarUrl = urlData.publicUrl;
            }
          }
        }
      }
      
      const commentData = {
        content: newComment.trim(),
        question_id: questionId,
        user_id: user?.id || null,
        user_name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Anonymous',
        user_avatar: avatarUrl, // Use the properly fetched avatar URL
        parent_id: replyTo || null
      };
      console.log("Submitting comment with data:", commentData);
      
      const { data, error } = await supabase
        .from('comments')
        .insert([commentData])
        .select();
        
      if (error) {
        console.error("Full Supabase error details:", error);
        throw error;
      }
      
      console.log("Comment submitted successfully:", data);
      
      // Clear form and reset state
      setNewComment('');
      setReplyTo(null);
      
      // Refresh comments
      fetchComments();
      
    } catch (err) {
      console.error('Error submitting comment:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit comment');
    } finally {
      setSubmitting(false);
    }
  };
  // Delete a comment
  const handleDeleteComment = async (id: string) => {
    try {
      console.log(`Attempting to delete comment with ID: ${id}`);
      
      // Make sure the user is authenticated
      if (!user?.id) {
        console.error("Cannot delete comment: User not authenticated");
        alert("You must be signed in to delete comments");
        return;
      }
      
      // Add better logging
      const { error, count } = await supabase
        .from('comments')
        .delete({ count: 'exact' }) // Get count of affected rows
        .eq('id', id)
        .eq('user_id', user.id); // Ensure user can only delete their own comments
      
      if (error) {
        console.error("Delete error details:", error);
        alert(`Error deleting comment: ${error.message}`);
        throw error;
      }
      
      console.log(`Successfully deleted ${count} comment(s)`);
      
      // Manually update the UI since realtime might be delayed
      setComments(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert("Failed to delete comment. Please try again.");
    }
  };
  // Update a comment
  const handleUpdateComment = async (id: string, content: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .update({ content })
        .eq('id', id);
        
      if (error) throw error;
    } catch (err) {
      console.error('Error updating comment:', err);
    }
  };
  
  // Set up reply mode
  const handleReply = (parentId: string) => {
    setReplyTo(parentId);
    // Find the parent comment to get the username
    const parentComment = comments.find(c => c.id === parentId);
    if (parentComment) {
      setNewComment(`@${parentComment.user_name} `);
    }
    // Focus the comment input
    const commentInput = document.getElementById('comment-input');
    if (commentInput) {
      commentInput.focus();
    }
  };
  
  return (
    <div className="mt-8 bg-[#172334] border border-[#be9269]/10 rounded-lg p-5">
      <h3 className="text-lg font-medium text-white mb-4 flex items-center">
        <MessageSquare size={18} className="mr-2 text-[#be9269]" />
        Comments ({comments.length})
      </h3>
      
      {loading ? (
        <div className="flex justify-center p-6">
          <Loader2 size={24} className="animate-spin text-[#be9269]" />
        </div>
      ) : (
        <div className="space-y-1">
          {comments.length === 0 ? (
            <p className="text-gray-400 text-sm py-4">No comments yet. Be the first to comment!</p>
          ) : (
            comments.map(comment => (
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                onReply={handleReply}
                onDelete={handleDeleteComment}
                onUpdate={handleUpdateComment}
              />
            ))
          )}
        </div>
      )}
      
      {/* Comment form */}
{isAuthenticated ? (
  <form onSubmit={handleSubmitComment} className="mt-5">
    {replyTo && (
      <div className="bg-[#101b2c]/50 text-xs text-gray-300 px-3 py-2 rounded-t-md flex justify-between">
        <span>Replying to comment</span>
        <button 
          type="button" 
          onClick={() => {
            setReplyTo(null);
            setNewComment('');
          }}
          className="text-gray-400 hover:text-[#be9269]"
        >
          Cancel reply
        </button>
      </div>
    )}
    <textarea
      id="comment-input"
      value={newComment}
      onChange={(e) => setNewComment(e.target.value)}
      placeholder="Add a comment..."
      className={`w-full rounded-${replyTo ? 'b' : ''}md bg-[#101b2c] border border-[#be9269]/30 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50`}
      rows={3}
      required
    />
    <div className="flex justify-end mt-2">
      <button
        type="submit"
        disabled={submitting || !newComment.trim()}
        className="px-4 py-1.5 bg-[#be9269] text-[#101b2c] rounded-md hover:bg-[#be9269]/90 font-medium text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
      >
        {submitting ? (
          <>
            <Loader2 size={14} className="mr-2 animate-spin" />
            Posting...
          </>
        ) : (
          "Post Comment"
        )}
      </button>
    </div>
  </form>
) : (
  <div className="mt-5 bg-[#101b2c]/50 text-gray-300 p-4 rounded-md text-sm">
    Please <a href="/login" className="text-[#be9269]">login</a> to leave a comment.
  </div>
)}
    </div>
  );
};

export default CommentSection;