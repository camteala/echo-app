import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/header';
import VideoChat from './components/VideoCall/VideoChat';
import CodeEditor from './components/Editor/CodeEditor';
import { UserProvider } from './context/UserContext';
import { AlertTriangle, Loader2, Users } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useAuth } from './hooks/useAuth';


interface JoinRequest {
  id: string;
  room_id: string;
  requesting_user_id: string;
  user_name: string;
  user_avatar?: string;
  status: string;
  created_at: string;
}

function Room() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const { roomId } = useParams();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [showVideoChat, setShowVideoChat] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [preserveRoom, setPreserveRoom] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [hasNewRequests, setHasNewRequests] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);


  useEffect(() => {
    if (isCreator && roomId) {
      fetchPendingRequests();
    }
  }, [isCreator, roomId]);

  useEffect(() => {
    if (!isCreator || !roomId) return;

    console.log(`[DEBUG] Setting up real-time subscription for join requests in room ${roomId}`);
    console.log(`[DEBUG] Creator status: ${isCreator}, User ID: ${user?.id}`);

    const subscription = supabase
      .channel(`room-requests-${roomId}-${Date.now()}`) 
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_join_requests',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        console.log("[DEBUG] Received room_join_requests event:", payload);

        // If this is a new request, show notification and play sound
        if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
          console.log("[DEBUG] New join request received:", payload.new);

          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play();
          } catch (e) {
            console.log("Couldn't play notification sound:", e);
          }

          setHasNewRequests(true);

          fetchPendingRequests();
        } else {
          fetchPendingRequests();
        }
      })
      .subscribe((status) => {
        console.log(`[DEBUG] Subscription status: ${status}`);
      });

    return () => {
      console.log("[DEBUG] Cleaning up subscription");
      subscription.unsubscribe();
    };
  }, [isCreator, roomId, user?.id]); 


  const fetchPendingRequests = async () => {
    if (!roomId || !user || !isCreator) {
      console.log("[DEBUG] Skipping fetchPendingRequests:", { roomId, userId: user?.id, isCreator });
      return;
    }

    setLoadingRequests(true);
    try {
      console.log(`[DEBUG] Fetching pending requests for room: ${roomId}`);
      const { count, error: countError } = await supabase
        .from('room_join_requests')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error("[DEBUG] Table error check:", countError);
        return;
      }

      console.log(`[DEBUG] Table exists with approximately ${count} records`);

      const { data, error } = await supabase
        .from('room_join_requests')
        .select('*')
        .eq('room_id', roomId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("[DEBUG] Error fetching join requests:", error);
        return;
      }

      console.log(`[DEBUG] Found ${data?.length} pending requests:`, data);
      setJoinRequests(data || []);

      if (data && data.length > 0) {
        console.log("[DEBUG] Setting hasNewRequests to true");
        setHasNewRequests(true);
      }
    } catch (err) {
      console.error("[DEBUG] Error in fetchPendingRequests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };
  const handleJoinRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      console.log(`Updating request ${requestId} to ${status}`);

      const { error } = await supabase
        .from('room_join_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) {
        console.error("Error updating request:", error);
        throw error;
      }

      alert(status === 'approved' ?
        "User has been approved and can now join the room." :
        "User's request has been denied."
      );

      setJoinRequests(prev => prev.filter(r => r.id !== requestId));

      if (joinRequests.length === 1) {
        setShowRequestsModal(false);
        setHasNewRequests(false);
      }
    } catch (err) {
      console.error("Error updating request:", err);
      alert("Failed to update request. Please try again.");
    }
  };
  useEffect(() => {
    const markForDeletion = async () => {
      if (isCreator) {
        console.log("You are the creator - marking room for potential deletion");
        localStorage.setItem(`delete-room-${roomId}`, 'true');
      }
    };

    if (isCreator) {
      markForDeletion();
    }

    return () => {
      if (isCreator && !preserveRoom) {
        console.log("Creator leaving and not preserving - deleting room:", roomId);


        const deleteRoom = async () => {
          try {
            const { error } = await supabase.rpc('delete_room_by_id', {
              room_id_param: roomId
            });

            if (error) throw error;
            console.log("Room deleted via function");
            localStorage.removeItem(`delete-room-${roomId}`);
          } catch (err) {
            console.error("Function call error:", err);
          }
        };
        deleteRoom();
      } else if (isCreator && preserveRoom) {
        console.log("Creator chose to preserve room - not deleting");
        localStorage.removeItem(`delete-room-${roomId}`);
      }
    };
  }, [roomId, isCreator, preserveRoom]);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    const checkIfCreator = async () => {
      if (!user || !roomId) return;

      try {
        const { data, error } = await supabase
          .from('collab_rooms')
          .select('created_by')
          .eq('room_id', roomId)
          .single();

        if (!error && data && data.created_by === user.id) {
          setIsCreator(true);
        }
      } catch (err) {
        console.error("Error checking creator status:", err);
      }
    };

    checkIfCreator();
  }, [roomId, user]);

  useEffect(() => {
    console.log("Join requests updated:", {
      count: joinRequests.length,
      hasNew: hasNewRequests,
      isCreator
    });
  }, [joinRequests, hasNewRequests, isCreator]);

  const toggleVideoChat = () => {
    setShowVideoChat(prev => !prev);
    console.log("Toggle video chat:", !showVideoChat); 
  };

  return (
    
    <UserProvider roomId={roomId || ''}>
   
      {isCreator && (
        <div className="bg-amber-500/20 text-amber-400 px-4 py-2 rounded-md mt-2">
          <div className="flex items-center justify-between">
            <p className="flex items-center text-sm">
              <AlertTriangle size={16} className="mr-2" />
              You created this room. It will be deleted when you leave.
            </p>

            <div className="flex items-center">
              <span className="mr-2 text-xs">Preserve room</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preserveRoom}
                  onChange={() => setPreserveRoom(!preserveRoom)}
                />
                <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:bg-[#be9269]/50"></div>
                <span className="absolute left-1 top-1 w-3 h-3 bg-gray-400 rounded-full transition peer-checked:translate-x-4 peer-checked:bg-[#be9269]"></span>
              </label>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
        
        {/* Top Navbar */}
        <Header
  showVideoChat={showVideoChat}
  toggleVideoChat={toggleVideoChat}
  pendingRequests={isCreator && joinRequests?.length ? joinRequests.length : 0}
  hasNewRequests={hasNewRequests}
  showRequestsModal={() => {
    setShowRequestsModal(true);
    setHasNewRequests(false);
  }}
  isCreator={isCreator}
  refreshRequests={fetchPendingRequests}  
/>
        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="flex-1 bg-gray-900 flex flex-col overflow-hidden">
            {roomId && <CodeEditor roomId={roomId} />}
          </div>

        {/* Video Chat */}
<div 
  className={`w-96 bg-gray-800 flex flex-col border-l border-gray-700 absolute right-0 top-0 bottom-0 z-10 transition-transform duration-300 ${
    showVideoChat ? 'translate-x-0' : 'translate-x-full'
  }`}
>
  <VideoChat
   onCollapse={toggleVideoChat}
   isVisible={showVideoChat} 
 />
</div>

{/* Show Video Chat Button when collapsed */}
{!showVideoChat && (
  <button
    className="fixed top-1/2 right-0 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-l-md shadow-lg z-50"
    onClick={toggleVideoChat}
    title="Show Video Chat"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
    </svg>
  </button>
)}
        </div>

        {/* Join Request Notification Badge - Only show for room creator when there are pending requests */}
        {isCreator && joinRequests.length > 0 && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
            <button
              onClick={() => {
                setShowRequestsModal(true);
                setHasNewRequests(false);
              }}
              className="flex items-center bg-amber-500/90 text-white px-4 py-2 rounded-full shadow-lg hover:bg-amber-600/90 transition-all"
            >
              <div className="relative">
                <Users size={18} className="mr-2" />
                {hasNewRequests && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </div>
              <span className="font-medium">
                {joinRequests.length} pending request{joinRequests.length !== 1 ? 's' : ''}
              </span>
            </button>
          </div>
        )}

        {/* Join Request Management Modal */}
        {showRequestsModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#172334] rounded-lg border border-[#be9269]/10 p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-semibold text-white mb-4">Pending Join Requests</h3>

              {loadingRequests ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-[#be9269]" />
                </div>
              ) : joinRequests.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No pending requests</p>
              ) : (
                <div className="space-y-4">
                  {joinRequests.map(request => (
                    <div key={request.id} className="bg-[#101b2c] p-4 rounded-md border border-gray-700 flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3">
                          {request.user_avatar ? (
                            <img src={request.user_avatar} alt="User" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <Users size={14} className="text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">{request.user_name}</p>
                          <p className="text-sm text-gray-400">
                            Wants to join this room
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleJoinRequest(request.id, 'approved')}
                          className="px-3 py-1.5 bg-green-600/20 text-green-400 border border-green-600/30 rounded hover:bg-green-600/30"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleJoinRequest(request.id, 'rejected')}
                          className="px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-600/30 rounded hover:bg-red-600/30"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowRequestsModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserProvider>
  );
}

export default Room;