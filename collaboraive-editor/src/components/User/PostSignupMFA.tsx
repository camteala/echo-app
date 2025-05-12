import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, ArrowRight } from 'lucide-react';

const PostSignupMFA: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="max-w-md mx-auto bg-[#172334] border border-[#be9269]/10 rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-[#be9269]/10 rounded-full mb-4">
        <CheckCircle className="h-6 w-6 text-[#be9269]" />
      </div>
      
      <h2 className="text-xl font-bold text-white text-center mb-2">
        Account Created Successfully!
      </h2>
      
      <p className="text-gray-300 text-center mb-6">
        Your account has been created. Would you like to set up additional security?
      </p>
      
      <div className="bg-[#101b2c] p-4 rounded-md border border-[#be9269]/20 mb-6">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-[#be9269] mt-0.5" />
          <div>
            <h3 className="font-medium text-white mb-1">Enhance Your Security</h3>
            <p className="text-sm text-gray-400">
              Multi-factor authentication adds an extra layer of security to your account
              by requiring a verification code when you sign in.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col space-y-3">
        <button 
          onClick={() => navigate('/authentication/mfa')}
          className="w-full py-2 px-4 bg-[#be9269] text-[#101b2c] rounded-md hover:bg-[#be9269]/90 font-medium flex items-center justify-center"
        >
          <Shield className="h-4 w-4 mr-2" />
          Setup MFA Now
        </button>
        
        <button 
          onClick={() => navigate('/')}
          className="w-full py-2 px-4 bg-transparent border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 font-medium flex items-center justify-center"
        >
          Skip for Now <ArrowRight className="h-4 w-4 ml-2" />
        </button>
      </div>
    </div>
  );
};

export default PostSignupMFA;