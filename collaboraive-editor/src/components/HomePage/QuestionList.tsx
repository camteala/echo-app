import React, { useState, useEffect } from 'react';
import { ArrowDownAZ, Flame, Clock, Filter, PlusCircle, Loader2, Search } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import QuestionCard from './QuestionCard';
import { supabase } from '../../lib/supabase';
import { Question } from '../../types';


const QuestionsList: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('newest');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const questionsPerPage = 10;
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, [location.search]);

  // Fetch questions based on filter
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('questions')
          .select('*');

        // Apply search filter if query exists
        if (searchQuery.trim()) {
          query = query.ilike('title', `%${searchQuery}%`);
        }

        // Apply pagination
        query = query.range(0, questionsPerPage - 1);

        // Apply different sorting based on filter
        if (activeFilter === 'newest') {
          query = query.order('asked_at', { ascending: false });
        } else if (activeFilter === 'trending') {
          // For trending, consider questions with most recent activity
          query = query.order('views', { ascending: false });
        } else if (activeFilter === 'top') {
          // For top, sort by votes
          query = query.order('votes', { ascending: false });
        }

        const { data, error } = await query;

        if (error) throw error;
        const userIds = [...new Set(data?.map(q => q.user_id) || [])];

        // Make sure to fetch avatar_url from profiles!
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds);

        if (profilesError) console.error("Error fetching profiles:", profilesError);

        // Replace the forEach loop with a for...of loop to use await
        const displayNameMap = {};
        const avatarUrlMap = {};

        // We need a for...of loop to use await inside
        for (const profile of profiles || []) {
          displayNameMap[profile.id] = profile.display_name;
          
          if (profile.avatar_url) {
            try {
              // Generate a signed URL with a long expiration (1 week)
              const { data: signedUrlData } = await supabase.storage
                .from('user-uploads')
                .createSignedUrl(profile.avatar_url, 60 * 60 * 24 * 7);
                
              if (signedUrlData?.signedUrl) {
                avatarUrlMap[profile.id] = signedUrlData.signedUrl;
                console.log(`Got signed URL for ${profile.id}: ${signedUrlData.signedUrl.substring(0, 50)}...`);
              }
            } catch (err) {
              console.error(`Error getting signed URL for ${profile.id}:`, err);
            }
          }
        }

        // Format questions with display names and avatar URLs
        const questionsWithFormattedAvatars = data?.map(q => ({
          ...q,
          answers: q.answers || 0,
          views: q.views || 0,
          votes: q.votes || 0,
          // Use the display name from the map, or fall back to user_name
          user_name: displayNameMap[q.user_id] || q.user_name || 'Anonymous',
          // Use avatarUrlMap for profile avatars (properly signed URLs)
          user_avatar: avatarUrlMap[q.user_id] || (q.user_avatar?.startsWith('http') ? q.user_avatar : null)
        }));

        setQuestions(questionsWithFormattedAvatars || []);
        setHasMore((data || []).length === questionsPerPage);
        setPage(0);
      } catch (err) {
        console.error("Error fetching questions:", err);
        setError("Failed to load questions");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [activeFilter, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Update URL with search parameter
    navigate(`?search=${encodeURIComponent(searchQuery)}`);
  };

  // Load more questions
  const loadMoreQuestions = async () => {
    if (loading || !hasMore) return;

    setLoading(true);

    try {
      const nextPage = page + 1;

      let query = supabase
        .from('questions')
        .select('*')
        .range(nextPage * questionsPerPage, (nextPage + 1) * questionsPerPage - 1);

      // Apply different sorting based on filter
      if (activeFilter === 'newest') {
        query = query.order('asked_at', { ascending: false });
      } else if (activeFilter === 'trending') {
        query = query.order('views', { ascending: false });
      } else if (activeFilter === 'top') {
        query = query.order('votes', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // In the loadMoreQuestions function
      const userIds = [...new Set(data?.map(q => q.user_id) || [])];

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      if (profilesError) console.error("Error fetching profiles:", profilesError);

      // Maps for user data
      const displayNameMap = {};
      const avatarUrlMap = {};

      // We need a for...of loop to use await inside
      for (const profile of profiles || []) {
        displayNameMap[profile.id] = profile.display_name;
        
        if (profile.avatar_url) {
          try {
            const { data: signedUrlData } = await supabase.storage
              .from('user-uploads')
              .createSignedUrl(profile.avatar_url, 60 * 60 * 24 * 7);
              
            if (signedUrlData?.signedUrl) {
              avatarUrlMap[profile.id] = signedUrlData.signedUrl;
            }
          } catch (err) {
            console.error(`Error getting signed URL for ${profile.id}:`, err);
          }
        }
      }
      
      // Format questions with proper profile data
      const questionsWithFormattedAvatars = data?.map(q => ({
        ...q,
        answers: q.answers || 0,
        views: q.views || 0,
        votes: q.votes || 0,
        // Use the display name from the map or default
        user_name: displayNameMap[q.user_id] || q.user_name || 'Anonymous',
        // Use signed URLs from the map or the GitHub URL (if it's a full URL)
        user_avatar: avatarUrlMap[q.user_id] || (q.user_avatar?.startsWith('http') ? q.user_avatar : null)
      }));

      setQuestions(prev => [...prev, ...(questionsWithFormattedAvatars || [])]);
      setHasMore(data?.length === questionsPerPage);
      setPage(nextPage);
    } catch (err) {
      console.error("Error loading more questions:", err);
      setError("Failed to load more questions");
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription for new questions
  useEffect(() => {
    const subscription = supabase
      .channel('public:questions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'questions'
        },
        (payload) => {
          // Only prepend if we're on the newest filter to avoid confusion
          if (activeFilter === 'newest') {
            setQuestions(prev => [payload.new as Question, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [activeFilter]);

  return (
    <div className="bg-[#101b2c] py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 md:mb-0">Questions</h2>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {/* Ask Question Button */}
            <Link
              to="/ask"
              className="flex items-center justify-center px-4 py-2 bg-[#be9269] text-[#101b2c] rounded-md hover:bg-[#be9269]/90 font-semibold transition-colors"
            >
              <PlusCircle size={18} className="mr-2" />
              Ask Question
            </Link>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <button
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md ${activeFilter === 'newest'
                    ? 'bg-[#be9269]/20 text-[#be9269]'
                    : 'bg-[#172334] text-gray-300 hover:bg-[#172334]/70'
                  } text-sm transition-colors`}
                onClick={() => setActiveFilter('newest')}
              >
                <Clock size={14} />
                <span>Newest</span>
              </button>

              <button
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md ${activeFilter === 'trending'
                    ? 'bg-[#be9269]/20 text-[#be9269]'
                    : 'bg-[#172334] text-gray-300 hover:bg-[#172334]/70'
                  } text-sm transition-colors`}
                onClick={() => setActiveFilter('trending')}
              >
                <Flame size={14} />
                <span>Trending</span>
              </button>

              <button
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md ${activeFilter === 'top'
                    ? 'bg-[#be9269]/20 text-[#be9269]'
                    : 'bg-[#172334] text-gray-300 hover:bg-[#172334]/70'
                  } text-sm transition-colors`}
                onClick={() => setActiveFilter('top')}
              >
                <ArrowDownAZ size={14} />
                <span>Top</span>
              </button>

              <button
                className="flex items-center space-x-1 px-3 py-1.5 rounded-md bg-[#172334] text-gray-300 hover:bg-[#172334]/70 text-sm transition-colors"
              >
                <Filter size={14} />
                <span>More</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search questions..."
                className="w-full bg-[#172334] text-gray-300 border border-[#be9269]/30 rounded-l-md py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <button
              type="submit"
              className="bg-[#be9269] hover:bg-[#be9269]/90 text-[#101b2c] font-medium px-4 rounded-r-md transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Search results indicator */}
        {searchQuery && (
          <div className="mb-4 flex justify-between items-center">
            <div className="text-gray-300">
              Showing results for: <span className="text-[#be9269] font-medium">{searchQuery}</span>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                navigate('');
              }}
              className="text-sm text-gray-400 hover:text-[#be9269]"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-md mb-6">
            <p>{error}</p>
          </div>
        )}
        {/* Loading state */}
        {loading && questions.length === 0 && (
          <div className="py-20 flex justify-center">
            <Loader2 size={40} className="text-[#be9269] animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && questions.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-gray-400 mb-4">No questions found</p>
            <Link to="/ask" className="text-[#be9269] hover:underline">
              Be the first to ask a question
            </Link>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {questions.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </div>

        {/* Load More Button */}
        {questions.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={loadMoreQuestions}
              disabled={loading || !hasMore}
              className="bg-[#172334] hover:bg-[#172334]/80 text-[#be9269] border border-[#be9269]/30 font-medium py-2 px-6 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Loading...
                </>
              ) : hasMore ? (
                'Load More Questions'
              ) : (
                'No More Questions'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionsList;