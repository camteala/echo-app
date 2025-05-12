import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageSquare, Eye, Share2, Bookmark, Code, Users, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import useTrackViews from '../hooks/useTrackViews';
import CommentSection from '../components/HomePage/CommentList';
import { Question } from '../types';
import VoteControls from '../components/HomePage/VoteControl';
import { useAuth } from '../hooks/useAuth';
import AnswerList from './AnswerList';


const QuestionDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [question, setQuestion] = useState<Question | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCollaborating, setIsCollaborating] = useState(false);
    const [activeUsers, setActiveUsers] = useState<any[]>([]);
    const [shareUrl, setShareUrl] = useState('');
    const [showShareTooltip, setShowShareTooltip] = useState(false);
    const { currentUser } = useUser();
    const { user, isAuthenticated } = useAuth();
    // Answer form state
    const [answerContent, setAnswerContent] = useState('');
    const [answerCode, setAnswerCode] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [submittingAnswer, setSubmittingAnswer] = useState(false);
    const [answerError, setAnswerError] = useState<string | null>(null);
    const [answerSuccess, setAnswerSuccess] = useState(false);
// Add this after your state declarations
const refreshQuestionData = useCallback(async () => {
    if (!id) return;
    
    try {
      // Get fresh question data including the answer count
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (data) {
        console.log("Refreshed question data:", data);
        setQuestion(data);
      }
    } catch (err) {
      console.error("Error refreshing question:", err);
    }
  }, [id]);
  
  // Call this function when the component loads
  useEffect(() => {
    refreshQuestionData();
    
    // Set up a refresh interval
    const intervalId = setInterval(refreshQuestionData, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [refreshQuestionData]);
    // Track views
    useTrackViews(id);
    useEffect(() => {
        console.log("Auth state in QuestionDetails:", {
            user,
            isAuthenticated,
            userId: user?.id,
            userName: user?.user_metadata?.name || user?.email
        });
    }, [user, isAuthenticated]);
    // Format date for display
    const formatDate = (dateString: string) => {
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
    // Add this near the top of your component, after state declarations
    useEffect(() => {
        console.log("Current authentication state:", {
            user,
            isAuthenticated: !!user,
            userId: user?.id,
            userName: currentUser?.name
        });
    }, [currentUser]);
    // Fetch question data
    useEffect(() => {
        const fetchQuestion = async () => {
            if (!id) return;

            setLoading(true);
            setError(null);

            try {
                const { data, error } = await supabase
                    .from('questions')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (!data) throw new Error("Question not found");

                setQuestion(data);
                setShareUrl(`${window.location.origin}/question/${id}`);
            } catch (err) {
                console.error('Error fetching question:', err);
                setError(err instanceof Error ? err.message : 'Failed to load question');
            } finally {
                setLoading(false);
            }
        };

        fetchQuestion();
    }, [id]);
    // Place it after this existing useEffect that fetches the question
    useEffect(() => {
        const fetchQuestion = async () => {
            // Your existing question fetching code...
        };

        fetchQuestion();
    }, [id]);

    // Add the new useEffect right here to watch for answer changes
    useEffect(() => {
        if (!id) return;

        const subscription = supabase
            .channel(`answers_count_${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'answers',
                    filter: `question_id=eq.${id}`
                },
                (payload) => {
                    console.log("New answer detected:", payload);
                    // Update question answer count
                    setQuestion(prev => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            answers: (prev.answers || 0) + 1
                        };
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'answers',
                    filter: `question_id=eq.${id}`
                },
                (payload) => {
                    console.log("Answer deleted:", payload);
                    // Update question answer count
                    setQuestion(prev => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            answers: Math.max((prev.answers || 0) - 1, 0)
                        };
                    });
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [id]);

    // Auto-save answer draft to localStorage
    useEffect(() => {
        if (!id) return;

        // Save draft when component unmounts or when answer/code changes
        const draftKey = `answer_draft_${id}`;
        const savedDraft = localStorage.getItem(draftKey);

        if (savedDraft) {
            try {
                const { content, code } = JSON.parse(savedDraft);
                if (!answerContent && !answerCode) {
                    setAnswerContent(content || '');
                    setAnswerCode(code || '');
                }
            } catch (e) {
                console.error("Error restoring draft:", e);
            }
        }

        // Save current draft
        const saveDraft = () => {
            if (answerContent || answerCode) {
                localStorage.setItem(draftKey, JSON.stringify({ content: answerContent, code: answerCode }));
            } else {
                localStorage.removeItem(draftKey);
            }
        };

        // Save when component unmounts or when values change
        const timeoutId = setTimeout(saveDraft, 1000);

        return () => {
            clearTimeout(timeoutId);
            saveDraft();
        };
    }, [id, answerContent, answerCode]);

    // Handle answer submission
    const handleSubmitAnswer = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!answerContent.trim()) {
            setAnswerError("Answer content cannot be empty");
            return;
        }

        if (!isAuthenticated || !user) {
            setAnswerError("You must be signed in to submit an answer");
            return;
        }

        setSubmittingAnswer(true);
        setAnswerError(null);
        setAnswerSuccess(false);

        try {
            console.log("Attempting to submit answer with:", {
                questionId: id,
                userId: user?.id, // Use the auth user ID, not currentUser
                contentLength: answerContent.length,
                codeLength: answerCode?.length || 0
            });

            // First, check if the answers table exists
            try {
                await supabase
                    .from('answers')
                    .select('id')
                    .limit(1);
            } catch (tableErr) {
                console.error("The answers table might not exist:", tableErr);
                // Create the answers table if it doesn't exist
                throw new Error("The answers table may not exist in your database. Please create it first.");
            }

            // Create the answer data object
            const answerData = {
                content: answerContent.trim(),
                code: answerCode.trim() || null,
                question_id: id,
                user_id: user?.id, // Make sure this is using user from useAuth()
                user_name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Anonymous',
                user_avatar: user?.user_metadata?.avatar_url || null,
                created_at: new Date().toISOString(),
                votes: 0
            };
            console.log("Submitting answer with data:", answerData);

            // Insert the answer
            const { data: insertedAnswer, error: insertError } = await supabase
                .from('answers')
                .insert([answerData])
                .select();

            if (insertError) {
                console.error("Full answer insertion error:", insertError);
                throw insertError;
            }

            console.log("Answer submitted successfully:", insertedAnswer);

            // Update the answer count on the question
            const { error: updateError } = await supabase
            .from('questions')
            .update({ answers: (question?.answers || 0) + 1 })
            .eq('id', id);
          
          if (updateError) {
            console.error("Error updating answer count:", updateError);
          } else {
            // Update the local question state
            setQuestion(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                answers: (prev.answers || 0) + 1
              };
            });
          }
            // Clear the saved draft
            localStorage.removeItem(`answer_draft_${id}`);

            // Reset form and show success message
            setAnswerContent('');
            setAnswerCode('');
            setAnswerSuccess(true);

            // Refresh question data
            const { data } = await supabase
                .from('questions')
                .select('*')
                .eq('id', id)
                .single();

            if (data) {
                setQuestion(data);
            }

            // Show success alert
            alert("Your answer has been posted successfully!");

            // Scroll to answer section
            document.getElementById('answers-section')?.scrollIntoView({ behavior: 'smooth' });

        } catch (err) {
            console.error('Error submitting answer:', err);
            setAnswerError(err instanceof Error ? err.message : "An error occurred while posting your answer");
            alert(`Failed to post answer: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            setSubmittingAnswer(false);
        }
    };
    // Handle share button click
    const handleShare = () => {
        navigator.clipboard.writeText(shareUrl);
        setShowShareTooltip(true);
        setTimeout(() => setShowShareTooltip(false), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <Loader2 size={40} className="text-[#be9269] animate-spin" />
            </div>
        );
    }

    if (error || !question) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="bg-[#172334] rounded-lg border border-red-500/30 p-6 max-w-md">
                    <h2 className="text-xl font-bold text-white mb-4">Error Loading Question</h2>
                    <p className="text-red-400">{error || "Question not found"}</p>
                    <Link to="/" className="mt-4 text-[#be9269] hover:underline flex items-center">
                        <ArrowLeft size={16} className="mr-2" />
                        Back to questions
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#101b2c] py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Back to questions link */}
                <Link to="/" className="flex items-center text-[#be9269] hover:underline mb-6">
                    <ArrowLeft size={16} className="mr-2" />
                    Back to questions
                </Link>

                {/* Question header */}
                <div className="flex justify-between items-start mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-white">{question.title}</h1>

                    <div className="flex space-x-2">
                        <button
                            className="p-2 rounded-md hover:bg-[#172334] text-gray-400"
                            onClick={handleShare}
                        >
                            <Share2 size={20} />
                            {showShareTooltip && (
                                <span className="absolute right-0 mt-10 bg-[#172334] text-white px-2 py-1 rounded text-xs">
                                    Link copied!
                                </span>
                            )}
                        </button>
                        <button className="p-2 rounded-md hover:bg-[#172334] text-gray-400">
                            <Bookmark size={20} />
                        </button>
                    </div>
                </div>

                {/* Question stats */}
                <div className="flex items-center text-sm text-gray-400 mb-6 space-x-4 flex-wrap">
                    <div className="flex items-center">
                        <Eye size={16} className="mr-1" />
                        <span>{question.views} views</span>
                    </div>
                    <div className="flex items-center">
                        <MessageSquare size={16} className="mr-1" />
                        <span>{question.answers} answers</span>
                    </div>
                    <div>
                        asked {formatDate(question.asked_at)} by <span className="text-[#be9269]">{question.user_name || 'Anonymous'}</span>
                    </div>
                </div>

                {/* Question content */}
                <div className="bg-[#172334] rounded-lg border border-[#be9269]/10 mb-8">
                    <div className="flex">
                        {/* Vote controls column */}
                        <div className="p-5 flex flex-col items-center">
                            {id && <VoteControls questionId={id} />}                        </div>

                        {/* Content column */}
                        <div className="flex-1 p-5 border-l border-[#be9269]/10">
                            <div className="prose prose-invert max-w-none">
                                <p className="text-gray-300 whitespace-pre-wrap">{question.content}</p>

                                {question.code && (
                                    <div className="mt-6 bg-[#101b2c] rounded-lg p-4 border border-[#be9269]/10">
                                        <pre className="text-gray-300 overflow-x-auto whitespace-pre-wrap">
                                            <code>{question.code}</code>
                                        </pre>
                                    </div>
                                )}
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mt-6">
                                {question.tags && question.tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="text-xs bg-[#be9269]/10 text-[#be9269] px-2.5 py-1 rounded-md"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>

                          
                        </div>
                    </div>
                </div>

                {/* Comments section */}
                {id && <CommentSection questionId={id} />}
                {/* Answers section */}
               

                {/* Your Answer Form */}
                <div id="answer-form" className="mt-10 bg-[#172334] rounded-lg border border-[#be9269]/10 p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Your Answer</h2>

                    {/* Error message */}
                    {answerError && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md mb-4">
                            {answerError}
                        </div>
                    )}

                    {/* Success message */}
                    {answerSuccess && (
                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-md mb-4">
                            Your answer has been posted successfully!
                        </div>
                    )}

                    {!isAuthenticated ? (
                        <div className="bg-[#101b2c]/50 text-gray-300 p-4 rounded-md text-sm mb-4">
                            Please <Link to="/signin" className="text-[#be9269]">sign in</Link> to answer this question.
                        </div>
                    ) : (
                        <form onSubmit={handleSubmitAnswer}>
                            {/* Editor tabs */}
                            <div className="mb-4 flex border-b border-[#be9269]/10">
                                <button
                                    type="button"
                                    className={`px-4 py-2 ${!showPreview ? 'text-[#be9269] border-b-2 border-[#be9269]' : 'text-gray-400'}`}
                                    onClick={() => setShowPreview(false)}
                                >
                                    Write
                                </button>
                                <button
                                    type="button"
                                    className={`px-4 py-2 ${showPreview ? 'text-[#be9269] border-b-2 border-[#be9269]' : 'text-gray-400'}`}
                                    onClick={() => setShowPreview(true)}
                                >
                                    Preview
                                </button>
                            </div>

                            {/* Editor / Preview */}
                            {showPreview ? (
                                <div className="min-h-[200px] bg-[#101b2c] rounded-md border border-[#be9269]/30 p-6">
                                    <div className="prose prose-invert max-w-none">
                                        <p className="text-gray-300 whitespace-pre-wrap">{answerContent}</p>

                                        {answerCode && (
                                            <div className="mt-6 bg-[#0c1521] rounded-lg p-4 border border-[#be9269]/10">
                                                <pre className="text-gray-300 overflow-x-auto whitespace-pre-wrap">
                                                    <code>{answerCode}</code>
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <textarea
                                        value={answerContent}
                                        onChange={(e) => setAnswerContent(e.target.value)}
                                        placeholder="Write your answer here..."
                                        className="w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                                        rows={8}
                                        disabled={submittingAnswer}
                                    />

                                    {/* Code section */}
                                    <div className="mt-4">
                                        <div className="flex items-center mb-2">
                                            <Code size={16} className="mr-2 text-[#be9269]" />
                                            <h3 className="text-sm font-medium text-white">Add code (optional)</h3>
                                        </div>
                                        <textarea
                                            value={answerCode}
                                            onChange={(e) => setAnswerCode(e.target.value)}
                                            placeholder="Add code snippet here..."
                                            className="w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50 font-mono text-sm"
                                            rows={5}
                                            disabled={submittingAnswer}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Submit button */}
                            <div className="flex justify-end mt-4">
                                <button
                                    type="submit"
                                    disabled={submittingAnswer || !answerContent.trim()}
                                    className="px-4 py-2 bg-[#be9269] text-[#101b2c] rounded-md hover:bg-[#be9269]/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                    {submittingAnswer ? (
                                        <>
                                            <Loader2 size={16} className="mr-2 animate-spin" />
                                            Posting...
                                        </>
                                    ) : (
                                        'Post Your Answer'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
                {/* Answers section */}
                <div id="answers-section" className="mt-10">
                    <h2 className="text-xl font-bold text-white mb-6">
                        {question.answers} {question.answers === 1 ? 'Answer' : 'Answers'}
                    </h2>

                    {/* Add the AnswerList component here */}
                    {id && <AnswerList questionId={id} />}
                </div>

            </div>
        </div>
    );
};

export default QuestionDetails;