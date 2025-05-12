import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface Answer {
  id: string;
  content: string;
  code: string | null;
  created_at: string;
  user_id: string | null;
  user_name: string;
  user_avatar: string | null;
  votes: number;
}

const AnswerList: React.FC<{ questionId: string }> = ({ questionId }) => {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Add this near the top of your component
const updateAnswerCount = useCallback(async () => {
    if (!questionId) return;
    
    try {
      // Get the actual count of answers
      const { data: answerCount, error: countError } = await supabase
        .from('answers')
        .select('id', { count: 'exact' })
        .eq('question_id', questionId);
      
      if (countError) throw countError;
      
      const count = answerCount?.length || 0;
      
      // Update the question with the accurate count
      const { error: updateError } = await supabase
        .from('questions')
        .update({ answers: count })
        .eq('id', questionId);
      
      if (updateError) throw updateError;
      
      console.log(`Updated answer count to ${count} for question ${questionId}`);
    } catch (err) {
      console.error('Error updating answer count:', err);
    }
  }, [questionId]);
  
  // Call this in your useEffect
  useEffect(() => {
    fetchAnswers();
    updateAnswerCount(); // Add this line
    
    // Rest of your useEffect code...
  }, [questionId, updateAnswerCount]);
  // Fetch answers
  const fetchAnswers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('answers')
        .select('*')
        .eq('question_id', questionId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      console.log("Fetched answers:", data);
      setAnswers(data || []);
    } catch (err) {
      console.error("Error fetching answers:", err);
      setError(err instanceof Error ? err.message : "Failed to load answers");
    } finally {
      setLoading(false);
    }
  };
  
  // Listen for real-time updates
  useEffect(() => {
    fetchAnswers();
    
    // Set up subscription for real-time updates
    const subscription = supabase
      .channel(`answers_${questionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'answers',
          filter: `question_id=eq.${questionId}`
        },
        (payload) => {
          console.log("Answer change detected:", payload);
          
          if (payload.eventType === 'INSERT') {
            // Add new answer to the list
            setAnswers(prev => [payload.new as Answer, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            // Update the modified answer
            setAnswers(prev => 
              prev.map(a => a.id === payload.new.id ? payload.new as Answer : a)
            );
          } else if (payload.eventType === 'DELETE') {
            // Remove the deleted answer
            setAnswers(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [questionId]);

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "some time ago";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={24} className="animate-spin text-[#be9269]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-md">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-2">
      {answers.length === 0 ? (
        <p className="text-gray-400 italic">No answers yet. Be the first to answer!</p>
      ) : (
        answers.map(answer => (
          <div 
            key={answer.id} 
            className="bg-[#172334] rounded-lg border border-[#be9269]/10"
          >
            <div className="flex">
              {/* Vote controls */}
              <div className="p-5 flex flex-col items-center">
                <button className="text-gray-400 hover:text-[#be9269]">
                  <ThumbsUp size={18} />
                </button>
                <span className="text-white my-2">{answer.votes}</span>
                <button className="text-gray-400 hover:text-[#be9269]">
                  <ThumbsDown size={18} />
                </button>
              </div>
              
              {/* Answer content */}
              <div className="flex-1 p-5 border-l border-[#be9269]/10">
                {/* Answer text */}
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 whitespace-pre-wrap">{answer.content}</p>
                  
                  {/* Code block if it exists */}
                  {answer.code && (
                    <div className="mt-6 bg-[#101b2c] rounded-lg p-4 border border-[#be9269]/10">
                      <pre className="text-gray-300 overflow-x-auto whitespace-pre-wrap">
                        <code>{answer.code}</code>
                      </pre>
                    </div>
                  )}
                </div>
                
                {/* User info */}
                <div className="mt-6 pt-4 border-t border-[#be9269]/10 flex justify-between items-center text-sm">
                  <div className="flex items-center">
                    {answer.user_avatar ? (
                      <img 
                        src={answer.user_avatar} 
                        alt={answer.user_name} 
                        className="w-8 h-8 rounded-full mr-2"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#be9269]/20 text-[#be9269] flex items-center justify-center mr-2">
                        {answer.user_name?.[0]?.toUpperCase() || 'A'}
                      </div>
                    )}
                    <div>
                      <span className="text-[#be9269]">{answer.user_name}</span>
                      <span className="text-gray-400 ml-2">
                        answered {formatDate(answer.created_at)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Actions (comment, etc) */}
                  <div>
                    <button className="text-gray-400 hover:text-[#be9269] flex items-center">
                      <MessageSquare size={16} className="mr-1" />
                      <span>Comment</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AnswerList;