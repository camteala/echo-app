import React from 'react';
import HeroSection from '../components/HomePage/HeroSection';
import CollabPreview from '../components/HomePage/CollabPreview';
import QuestionsList from '../components/HomePage/QuestionList';

const HomePage: React.FC = () => {
  return (
    <>
      <HeroSection />
      <CollabPreview />
      <div className="py-10">
        <div className="max-w-4xl mx-auto px-4">
          {/* QuestionsList now centered with max-w-4xl and mx-auto */}
          <QuestionsList />
        </div>
      </div>
    </>
  );
};

export default HomePage;