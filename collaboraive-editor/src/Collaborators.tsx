import React from 'react';
import { UserCircle } from 'lucide-react';

interface CollaboratorsProps {
  collaborators: any[];
}

const Collaborators: React.FC<CollaboratorsProps> = ({ collaborators }) => {
  if (!collaborators || collaborators.length === 0) {
    return (
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <p className="text-gray-400 text-sm">You're the only one here</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 border-b border-gray-700">
      <h3 className="text-white font-medium mb-2">Collaborators ({collaborators.length})</h3>
      <div className="space-y-2">
        {collaborators.map(collaborator => (
          <div key={collaborator.user_id} className="flex items-center">
            {collaborator.user_avatar ? (
              <img 
                src={collaborator.user_avatar} 
                alt={collaborator.user_name} 
                className="w-6 h-6 rounded-full mr-2"
              />
            ) : (
              <UserCircle className="w-6 h-6 text-blue-400 mr-2" />
            )}
            <span className="text-sm text-gray-300">
              {collaborator.user_name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Collaborators;