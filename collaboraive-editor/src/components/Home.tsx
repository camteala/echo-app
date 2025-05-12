import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Code2, ArrowRight, AlertTriangle, LogOut, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';

function Home() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const createRoom = () => {
    const newRoomId = uuidv4().slice(0, 8);
    navigate(`/room/${newRoomId}`);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/room/${roomId}`);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center relative">
          <button
            onClick={handleSignOut}
            className="absolute right-0 top-0 text-gray-500 hover:text-gray-700"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <div className="flex justify-center">

            {/* Uncomment the above line if you want to use Code2 icon instead of logo */}
            <Code2 className="w-12 h-12 text-indigo-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            CodeCollab
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Real-time collaborative coding made simple
          </p>
        </div>

        {!supabase && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Please connect to Supabase using the button in the top right corner to enable real-time collaboration.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-6">
          <button
            onClick={createRoom}
            disabled={!supabase}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create New Room
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Or</span>
            </div>
          </div>

          <form onSubmit={joinRoom} className="space-y-4">
            <div>
              <label htmlFor="room" className="sr-only">
                Room ID
              </label>
              <input
                id="room"
                name="room"
                type="text"
                required
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter Room ID"
                disabled={!supabase}
              />
            </div>
            <button
              type="submit"
              disabled={!supabase}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="absolute right-3 inset-y-0 flex items-center">
                <ArrowRight className="h-5 w-5" />
              </span>
              Join Room
            </button>
          </form>

          <button
            onClick={() => navigate('/forum')}
            className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Visit Community Forum
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;