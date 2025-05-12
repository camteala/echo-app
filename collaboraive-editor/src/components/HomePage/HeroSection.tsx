import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

const HeroSection: React.FC = () => {
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [solutionCount, setSolutionCount] = useState<number | null>(null);
  const [developerCount, setDeveloperCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCounts() {
      setLoading(true);
      try {
        const { count: questionsCount, error: questionsError } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true });
          
        if (questionsError) throw questionsError;
        setQuestionCount(questionsCount);

        const { count: answersCount, error: answersError } = await supabase
          .from('answers')
          .select('*', { count: 'exact', head: true });
          
        if (answersError) throw answersError;
        setSolutionCount(answersCount);

        const { count: usersCount, error: usersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
          
        if (usersError) throw usersError;
        setDeveloperCount(usersCount);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCounts();
  }, []);

  const renderCount = (count: number | null) => {
    if (loading) return <Loader2 size={20} className="mx-auto animate-spin text-[#be9269]" />;
    return count !== null ? count : '0';
  };

  return (
    <div className="relative bg-[#101b2c] overflow-hidden py-12 md:py-16">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#be9269]/5 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#be9269]/5 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/4 w-6 h-6 bg-[#be9269]/20 rounded-md transform rotate-45"></div>
      <div className="absolute top-1/4 right-1/3 w-4 h-4 bg-[#be9269]/20 rounded-md transform rotate-12"></div>
      
      <div className="max-w-5xl mx-auto px-4 relative z-10">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Collective knowledge, <span className="text-[#be9269]">real-time collaboration</span>
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto mb-8 text-lg">
            Join the community where developers collaborate, solve problems, and build better solutions together — all in real-time.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button className="bg-[#be9269] hover:bg-[#be9269]/90 text-[#101b2c] font-semibold py-2.5 px-6 rounded-md transition-all transform hover:scale-105 shadow-lg shadow-[#be9269]/20">
              <Link
                to="/ask"
                className="flex items-center justify-center px-4 py-2 bg-[#be9269] text-[#101b2c] rounded-md hover:bg-[#be9269]/90 font-semibold transition-colors"
              >
                Ask a Question
              </Link>
            </button>
          </div>
        </div>
        
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-[#172334]/60 backdrop-blur-sm border border-[#be9269]/10 rounded-lg p-4 text-center transform transition-transform hover:translate-y-[-5px]">
            <p className="text-2xl font-bold text-[#be9269]">{renderCount(questionCount)}</p>
            <p className="text-gray-300 text-sm">Questions</p>
          </div>
          <div className="bg-[#172334]/60 backdrop-blur-sm border border-[#be9269]/10 rounded-lg p-4 text-center transform transition-transform hover:translate-y-[-5px]">
            <p className="text-2xl font-bold text-[#be9269]">{renderCount(solutionCount)}</p>
            <p className="text-gray-300 text-sm">Solutions</p>
          </div>
          <div className="bg-[#172334]/60 backdrop-blur-sm border border-[#be9269]/10 rounded-lg p-4 text-center transform transition-transform hover:translate-y-[-5px]">
            <p className="text-2xl font-bold text-[#be9269]">{renderCount(developerCount)}</p>
            <p className="text-gray-300 text-sm">Developers</p>
          </div>
          <div className="bg-[#172334]/60 backdrop-blur-sm border border-[#be9269]/10 rounded-lg p-4 text-center transform transition-transform hover:translate-y-[-5px]">
            <p className="text-2xl font-bold text-[#be9269]">24/7</p>
            <p className="text-gray-300 text-sm">Collaboration</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;