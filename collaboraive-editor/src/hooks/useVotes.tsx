import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast'; 

export function useVotes(questionId: string) {
  const [votes, setVotes] = useState(0);
  const [userVote, setUserVote] = useState<1 | -1 | 0>(0);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchVotes = async () => {
      try {
        // Get question votes
        const { data: question, error } = await supabase
          .from('questions')
          .select('votes')
          .eq('id', questionId)
          .single();

        if (error) throw error;

        setVotes(question?.votes || 0);

        // If user is authenticated, check their vote
        if (isAuthenticated && user) {
          const { data: userVoteData, error: voteError } = await supabase
            .from('votes')
            .select('value')
            .eq('question_id', questionId)
            .eq('user_id', user.id)
            .single();

          if (!voteError && userVoteData) {
            setUserVote(userVoteData.value as 1 | -1 | 0);
          }
        }
      } catch (err) {
        console.error("Error fetching vote data:", err);
      }
    };

    fetchVotes();
  }, [questionId, isAuthenticated, user]);

  // Vote function
  const voteQuestion = async (value: 1 | -1) => {
    if (!isAuthenticated || !user) {
      // This is the line causing the error (line 81)
      console.log("Must be logged in to vote");
      toast?.error("You must be signed in to vote");
      return;
    }

    try {
      const previousVote = userVote;

      setUserVote(value === previousVote ? 0 : value);
      setVotes(current => {
        if (value === previousVote) {
          // Cancelling vote
          return current - previousVote;
        } else if (previousVote !== 0) {
          // Changing vote direction
          return current - previousVote + value;
        } else {
          // New vote
          return current + value;
        }
      });

      // Check if user has already voted
      const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('question_id', questionId)
        .eq('user_id', user.id)
        .single();

      if (existingVote) {
        // Update or delete existing vote
        if (value === previousVote) {
          // User is canceling their vote
          await supabase
            .from('votes')
            .delete()
            .eq('id', existingVote.id);
        } else {
          // User is changing their vote
          await supabase
            .from('votes')
            .update({ value })
            .eq('id', existingVote.id);
        }
      } else {
        // Create new vote
        await supabase
          .from('votes')
          .insert({
            question_id: questionId,
            user_id: user.id,
            value
          });
      }

      // Update question vote count in database
      const newVoteCount = previousVote === value
        ? votes - value  // Canceling vote
        : previousVote !== 0
          ? votes - previousVote + value  // Changing vote 
          : votes + value;  // New vote

      // Update question vote count in database
      await supabase
        .from('questions')
        .update({ votes: newVoteCount })
        .eq('id', questionId);

    } catch (err) {
      console.error("Error voting:", err);
      toast?.error("Failed to register your vote");

      setUserVote(userVote);
    }
  };

  return { votes, userVote, voteQuestion };
}