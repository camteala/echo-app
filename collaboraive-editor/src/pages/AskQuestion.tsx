import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code, Tags, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { Question } from '../types';
import { useAuth } from '../hooks/useAuth';

const AskQuestion: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useUser();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [code, setCode] = useState('');
    const [tags, setTags] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const { user, isAuthenticated } = useAuth();

    // Load draft on component mount
    useEffect(() => {
      // Load draft from localStorage if exists
      const draft = localStorage.getItem('question_draft');
      if (draft) {
        try {
          const { title: draftTitle, content: draftContent, code: draftCode, tags: draftTags } = JSON.parse(draft);
          setTitle(draftTitle || '');
          setContent(draftContent || '');
          setCode(draftCode || '');
          setTags(draftTags || '');
        } catch (e) {
          console.error('Failed to parse draft', e);
        }
      }
    }, []);

    // Auto-save draft when content changes
    useEffect(() => {
      if (title || content || code || tags) {
        const draft = { title, content, code, tags };
        localStorage.setItem('question_draft', JSON.stringify(draft));
      }
    }, [title, content, code, tags]);
    
    // Parse tags for preview
    const tagArray = tags
      .split(/[ ,]+/) // Split by spaces or commas
      .filter(tag => tag.trim().length > 0)
      .slice(0, 5); // Limit to 5 tags
   
      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Reset error state
        setError(null);
        
        // Validate inputs
        if (!title.trim() || !content.trim() || !tags.trim()) {
          setError("Please fill all required fields");
          return;
        }
        
        // Parse tags - ensure it's formatted as a proper array
        const tagArray = tags
          .split(/[ ,]+/) // Split by spaces or commas
          .filter(tag => tag.trim().length > 0)
          .slice(0, 5); // Limit to 5 tags
        
        if (tagArray.length === 0) {
          setError("Please add at least one tag");
          return;
        }
        
        setLoading(true);
        let userAvatarUrl = user?.user_metadata?.avatar_url || null;

// If no avatar in metadata, check profiles table
if (!userAvatarUrl && user?.id) {
  const { data: profileData } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .single();
    
  userAvatarUrl = profileData?.avatar_url || null;
}

        try {
          // Create question object with simplified structure
          const newQuestion = {
            title: title.trim(),
            excerpt: content.substring(0, 150) + (content.length > 150 ? '...' : ''),
            content: content.trim(),
            code: code.trim() || null,
            tags: tagArray,
            votes: 0,
            answers: 0,
            views: 0,
            asked_at: new Date().toISOString(),
            user_id: user?.id || null,
            user_name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Anonymous',
            user_avatar: userAvatarUrl, // Use the retrieved avatar URL
          };
          console.log("Submitting question:", newQuestion);
          
          // Insert into Supabase directly (skip the table check)
          const { data, error } = await supabase
            .from('questions')
            .insert(newQuestion)
            .select('id')
            .single();
            
          if (error) {
            console.error('Insert error details:', error);
            // Get more specific about the error
            if (error.code === '23502') {
              throw new Error('Required fields missing. Check your database schema.');
            } else if (error.code === '23503') {
              throw new Error('Foreign key violation. The user_id may not exist.');
            } else if (error.code === '42P01') {
              throw new Error("The 'questions' table doesn't exist in your database.");
            } else if (error.code === '42703') {
              throw new Error("Column doesn't exist in table. Check the schema.");
            } else if (error.message.includes('permission')) {
              throw new Error("Permission denied. Check your RLS policies.");
            } else {
              throw error;
            }
          }
          
          // Clear draft after successful submission
          localStorage.removeItem('question_draft');
          
          // Navigate to the new question
          navigate(`/question/${data.id}`);
          
        } catch (err) {
          console.error('Error submitting question:', err);
          
          // More specific error messages
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('Failed to submit question. Check console for details.');
          }
        } finally {
          setLoading(false);
        }
      };
  return (
    <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Ask a Question</h1>
          <p className="text-gray-300">Get help from the community by clearly describing your problem</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-md">
              <p>{error}</p>
            </div>
          )}
          
          {/* Writing Guidelines */}
          <div className="bg-[#172334] rounded-lg border border-[#be9269]/10 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <AlertCircle size={20} className="text-[#be9269]" />
              <h2 className="text-lg font-semibold text-white">Writing a good question</h2>
            </div>
            <ul className="text-gray-300 space-y-2 text-sm">
              <li>• Be specific about your problem</li>
              <li>• Include relevant code snippets</li>
              <li>• Describe what you've tried</li>
              <li>• Use appropriate tags</li>
            </ul>
          </div>

          {/* Preview Toggle */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-[#be9269] hover:text-[#be9269]/80 text-sm"
            >
              {showPreview ? "Edit Question" : "Preview Question"}
            </button>
          </div>

          {showPreview ? (
            <div className="bg-[#172334] rounded-lg border border-[#be9269]/10 p-6">
              <h1 className="text-2xl font-bold text-white mb-4">{title || "Your Question Title"}</h1>
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 whitespace-pre-wrap">{content || "Your question details will appear here"}</p>
                {code && (
                  <div className="mt-6 bg-[#101b2c] rounded-lg p-4 border border-[#be9269]/10">
                    <pre className="text-gray-300 overflow-x-auto whitespace-pre-wrap">
                      <code>{code}</code>
                    </pre>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-6">
                {tagArray.map((tag, index) => (
                  <span 
                    key={index}
                    className="text-sm bg-[#be9269]/10 text-[#be9269] px-3 py-1 rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Title */}
              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium text-gray-300">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's your programming question? Be specific."
                  className="w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                  required
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <label htmlFor="content" className="block text-sm font-medium text-gray-300">
                  Question Details
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  placeholder="Describe your problem in detail..."
                  className="w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                  required
                />
              </div>

              {/* Code */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="code" className="block text-sm font-medium text-gray-300">
                    Code
                  </label>
                  <button
                    type="button"
                    className="text-xs text-[#be9269] hover:text-[#be9269]/80"
                    onClick={() => setCode('')}
                  >
                    Clear
                  </button>
                </div>
                <div className="relative">
                  <Code size={16} className="absolute left-4 top-3 text-gray-400" />
                  <textarea
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    rows={8}
                    placeholder="Share your code..."
                    className="w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white pl-10 pr-4 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Tags size={16} className="text-gray-400" />
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-300">
                    Tags
                  </label>
                </div>
                <input
                  id="tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Add up to 5 tags (e.g., javascript react typescript)"
                  className="w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                  required
                />
                <p className="text-xs text-gray-400">
                  Add tags to describe what your question is about
                </p>
              </div>
            </>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#be9269] text-[#101b2c] rounded-md hover:bg-[#be9269]/90 font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post Your Question"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AskQuestion;