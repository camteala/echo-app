import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Track views only once per session
const viewedQuestions = new Set<string>();

const useTrackViews = (questionId?: string) => { // Make parameter optional
  useEffect(() => {
    // Only proceed if questionId exists
    if (!questionId) return;

    // Only track if not already viewed in this session
    if (viewedQuestions.has(questionId)) return;
    
    const incrementViews = async () => {
      try {
        viewedQuestions.add(questionId);
        
        // FIXED VERSION - use single() before error checking
        const { data, error } = await supabase
          .from('questions')
          .select('views')
          .eq('id', questionId)
          .single();
          
        if (error) {
          console.error('Error fetching view count:', error);
          return; // Exit early if error
        }
        
        // Only update if we successfully got the current count
        const { error: updateError } = await supabase
          .from('questions')
          .update({ views: (data?.views || 0) + 1 })
          .eq('id', questionId);
          
        if (updateError) {
          console.error('Error updating view count:', updateError);
        }
      } catch (err) {
        console.error('Failed to increment views:', err);
      }
    };
    
    incrementViews();
  }, [questionId]);
};

export default useTrackViews;