import React, { useState, useEffect } from 'react';
import { Users, Plus, ArrowRight, Loader2, Lock, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface Room {
  id: string;
  room_id: string;
  title: string;
  description: string;
  created_at: string;
  member_count: number;
  created_by: string;
  is_public: boolean;
}

const CollabRoom: React.FC = () => {
  const [roomId, setRoomId] = useState('');
  const [activeRooms, setActiveRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomTitle, setRoomTitle] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  
  // Add these new state variables
const [showRequestPendingModal, setShowRequestPendingModal] = useState(false);
const [requestPending, setRequestPending] = useState<{ roomId: string, requestId: string } | null>(null);
const [joinRequests, setJoinRequests] = useState<any[]>([]);
const [showRequestsModal, setShowRequestsModal] = useState(false);
const [hasNewRequests, setHasNewRequests] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch active rooms
  // Near the top of your component, add this function
  const fetchActiveRooms = async () => {
    setLoading(true);

    try {
      // Get all rooms
      const { data, error } = await supabase
        .from('collab_rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log("All rooms from database:", data);

      // Improved filtering to ensure we only get public rooms
      const publicRooms = data?.filter(room => {
        // Only include rooms explicitly marked as public
        return room.is_public === true;
      }) || [];

      console.log("Public rooms after filtering:", publicRooms);
      setActiveRooms(publicRooms);
    } catch (err) {
      console.error("Error fetching active rooms:", err);
    } finally {
      setLoading(false);
    }
  };

  // Add this useEffect to listen for request updates
// Modify the useEffect that listens for request updates to add more debugging and ensure it works:
useEffect(() => {
  if (!requestPending || !user) return;
  
  console.log("[DEBUG] Setting up listener for request:", requestPending.requestId);
  
  // Use a more explicit channel name to avoid conflicts
  const requestChannel = supabase
    .channel(`request-update-${requestPending.requestId}-${Date.now()}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'room_join_requests',
      filter: `id=eq.${requestPending.requestId}`
    }, (payload) => {
      console.log("[DEBUG] Received request update:", payload);
      
      if (payload.new.status === 'approved') {
        // Request was approved, navigate to room
        console.log("[DEBUG] Request approved, navigating to room:", requestPending.roomId);
        setShowRequestPendingModal(false);
        navigate(`/room/${requestPending.roomId}`);
      } else if (payload.new.status === 'rejected') {
        // Request was rejected
        console.log("[DEBUG] Request rejected");
        setShowRequestPendingModal(false);
        alert("Your request to join the room was denied by the room creator.");
      }
    })
    .subscribe((status) => {
      console.log(`[DEBUG] Request listener subscription status: ${status}`);
    });
    
  return () => {
    console.log("[DEBUG] Cleaning up request listener");
    requestChannel.unsubscribe();
  };
}, [requestPending, user, navigate]);

  // Then modify your useEffect to use this function
 // In your main useEffect, update the subscription:
useEffect(() => {
  fetchActiveRooms();
  fetchPendingRequests(); 

  // Set up real-time subscription for room updates
  const subscription = supabase
    .channel('public:collab_rooms')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'collab_rooms'
      },
      () => {
        fetchActiveRooms();
      }
    )
    .subscribe();
  
  // Update this subscription to be more specific and add a notification sound
  const requestsSubscription = supabase
    .channel('room_join_requests_channel')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'room_join_requests'
    }, (payload) => {
      console.log("Join request change detected:", payload);
      
      // Check if this is a new request
      if (payload.eventType === 'INSERT') {
        // Play notification sound for new requests
        const audio = new Audio('/notification.mp3');  // Add a sound file to your public folder
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Couldn't play notification sound:", e));
        
        // Set the notification flag
        setHasNewRequests(true);
      }
      
      // Refresh all requests
      fetchPendingRequests();
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
    requestsSubscription.unsubscribe();
  };
}, [user?.id]);
  // Add this useEffect to check for pending requests on component mount
useEffect(() => {
  const checkForPendingRequests = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('room_join_requests')
        .select('id, room_id, status')
        .eq('requesting_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (!error && data) {
        setRequestPending({ roomId: data.room_id, requestId: data.id });
        setShowRequestPendingModal(true);
      }
    } catch (err) {
      console.error("Error checking for pending requests:", err);
    }
  };
  
  checkForPendingRequests();
}, [user]);
useEffect(() => {
  // Setup function to check and potentially delete the room when user leaves
  const handleRoomCleanup = async () => {
    if (!user || !roomId) return;
    
    try {
      // First check if this user is the room creator
      const { data: roomData, error: roomError } = await supabase
        .from('collab_rooms')
        .select('*')
        .eq('room_id', roomId)
        .single();
        
      if (roomError) {
        console.error("Error checking room:", roomError);
        return;
      }
      
      // If this user created the room, mark it for deletion when they leave
      if (roomData && roomData.created_by === user.id) {
        console.log("You created this room - it will be deleted when you leave");
        
        // Store this information for the cleanup function
        localStorage.setItem(`delete-room-${roomId}`, 'true');
      }
    } catch (err) {
      console.error("Error preparing room cleanup:", err);
    }
  };
  
  // Call the setup function when user joins
  handleRoomCleanup();
  
  // Return a cleanup function that runs when the component unmounts (user leaves)
  return () => {
    // Check if this user is the creator who should delete the room
    const shouldDelete = localStorage.getItem(`delete-room-${roomId}`);
    
    if (shouldDelete === 'true') {
      console.log("Creator is leaving - deleting room:", roomId);
      
      // Delete the room
      const deleteRoom = async () => {
        try {
          // Delete the room from collab_rooms
          await supabase
            .from('collab_rooms')
            .delete()
            .eq('room_id', roomId);
            
          console.log("Room deleted successfully");
          
          // Clean up localStorage
          localStorage.removeItem(`delete-room-${roomId}`);
        } catch (err) {
          console.error("Error deleting room:", err);
        }
      };
      
      // Execute deletion
      deleteRoom();
    } else {
      console.log("Non-creator leaving room");
    }
  };
}, [roomId, user]);

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/room/${roomId}`);
    }
  };
// Add this function to fetch pending requests for rooms created by current user
const fetchPendingRequests = async () => {
  if (!user) return;
  
  try {
    // Get rooms created by this user
    const { data: userRooms, error: roomsError } = await supabase
      .from('collab_rooms')
      .select('room_id')
      .eq('created_by', user.id);
      
    if (roomsError || !userRooms?.length) {
      console.log("No rooms found or error:", roomsError);
      return;
    }
    
    // Get pending requests for these rooms
    const roomIds = userRooms.map(room => room.room_id);
    
    // Check if table exists
    try {
      // Since we join collab_rooms manually instead of using foreign key
      const { data: requests, error: requestsError } = await supabase
        .from('room_join_requests')
        .select('*, room_id')
        .in('room_id', roomIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
      if (requestsError) {
        console.error("Error fetching requests:", requestsError);
        return;
      }
      
      // If we have requests, get room titles
      if (requests && requests.length > 0) {
        const { data: rooms } = await supabase
          .from('collab_rooms')
          .select('room_id, title')
          .in('room_id', requests.map(r => r.room_id));
          
        // Add room titles to requests
        const enrichedRequests = requests.map(request => {
          const room = rooms?.find(r => r.room_id === request.room_id);
          return {
            ...request,
            rooms: { title: room?.title || 'Untitled Room' }
          };
        });
        
        setJoinRequests(enrichedRequests || []);
        
        // Set notification state if we have pending requests
        if (enrichedRequests.length > 0) {
          setHasNewRequests(true);
        }
      } else {
        setJoinRequests([]);
      }
    } catch (tableErr) {
      console.error("Error with room_join_requests table:", tableErr);
      
      // Create the room_join_requests table if it doesn't exist
      alert("The join request system needs to be set up. Please contact the administrator.");
    }
  } catch (err) {
    console.error("Error in fetchPendingRequests:", err);
  }
};


  const openCreateRoomModal = () => {
    setRoomTitle(`Room ${Math.floor(Math.random() * 1000)}`);
    setRoomDescription('Collaborative coding session');
    setIsPublic(true);
    setShowRoomModal(true);
  };

  // Update handleCreateRoom with more logging
  const handleCreateRoom = async () => {
    if (!user) {
      alert("You must be signed in to create a room");
      return;
    }

    const newRoomId = uuidv4().slice(0, 8);

    // Add detailed logging to see what's being submitted
    console.log("Creating room with details:", {
      id: newRoomId,
      title: roomTitle,
      description: roomDescription,
      isPublic: isPublic,
      userId: user.id
    });

    // Create room in database
    try {
      const { data, error } = await supabase
        .from('collab_rooms')
        .insert({
          room_id: newRoomId,
          title: roomTitle || "New Collaboration Room",
          description: roomDescription || "Created on " + new Date().toLocaleDateString(),
          created_by: user.id,
          is_public: isPublic,
          member_count: 1
        })
        .select(); // Add this to get back the inserted data

      if (error) throw error;

      console.log("Room created successfully:", data);
      setShowRoomModal(false);

      // Manually refresh rooms before navigating
      await fetchActiveRooms();

      navigate(`/room/${newRoomId}`);
    } catch (err) {
      console.error("Failed to create room:", err);
      alert("Failed to create room. Please try again.");
    }
  };

  // Update the handleCreateRoom function


  const joinExistingRoom = async (roomId: string) => {
    if (!user) {
      alert("You must be signed in to join a room");
      return;
    }
  
    try {
      // First, check if user is the creator (auto-join)
      const { data: roomData } = await supabase
        .from('collab_rooms')
        .select('created_by')
        .eq('room_id', roomId)
        .single();
      
      if (roomData && roomData.created_by === user.id) {
        // Creator can join directly
        navigate(`/room/${roomId}`);
        return;
      }
      
      
      // For other users, create a join request
      const { data: existingRequest, error: checkError } = await supabase
        .from('room_join_requests')
        .select('id, status')
        .eq('room_id', roomId)
        .eq('requesting_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (!checkError && existingRequest) {
        if (existingRequest.status === 'approved') {
          navigate(`/room/${roomId}`);
          return;
        } else if (existingRequest.status === 'pending') {
          setRequestPending({ roomId, requestId: existingRequest.id });
          setShowRequestPendingModal(true);
          return;
        }
      }
      console.log("[DEBUG] Creating new join request for room:", roomId);

      // Create new request
      const { data: newRequest, error } = await supabase
        .from('room_join_requests')
        .insert({
          room_id: roomId,
          requesting_user_id: user.id,
          user_name: user.user_metadata?.full_name || user.email,
          user_avatar: user.user_metadata?.avatar_url,
          status: 'pending'
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Show pending request modal
      setRequestPending({ roomId, requestId: newRequest.id });
      setShowRequestPendingModal(true);
      
    } catch (err) {
      console.error("Error joining room:", err);
      alert("Failed to join room. Please try again.");
    }
  };
  // Calculate how long ago the room was created
  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMin = Math.round(diffMs / 60000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin} min ago`;

    const diffHour = Math.round(diffMin / 60);
    if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;

    const diffDay = Math.round(diffHour / 24);
    return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  };

// Update the handleJoinRequest function to add more notification mechanisms
const handleJoinRequest = async (requestId: string, status: 'approved' | 'rejected') => {
  try {
    console.log(`[DEBUG] Updating request ${requestId} to ${status}`);
    
    // First get the request details to know which room and user this is for
    const { data: requestData, error: fetchError } = await supabase
      .from('room_join_requests')
      .select('*')
      .eq('id', requestId)
      .single();
      
    if (fetchError) {
      console.error("[DEBUG] Error fetching request details:", fetchError);
      throw fetchError;
    }
    
    // Update the request status
    const { data, error } = await supabase
      .from('room_join_requests')
      .update({ 
        status,
        updated_at: new Date().toISOString() // Add timestamp to ensure change is detected
      })
      .eq('id', requestId)
      .select()
      .single();
      
    if (error) {
      console.error("[DEBUG] Error updating request:", error);
      throw error;
    }
    
    console.log("[DEBUG] Request updated successfully:", data);
    
    // Show success message
    alert(status === 'approved' ? 
      "User has been approved and can now join the room." : 
      "User's request has been denied."
    );
    
    // Update local state
    setJoinRequests(prev => prev.filter(r => r.id !== requestId));
    
    // If no more requests, close modal
    if (joinRequests.length === 1) {
      setShowRequestsModal(false);
      setHasNewRequests(false);
    }
  } catch (err) {
    console.error("[DEBUG] Error updating request:", err);
    alert("Failed to update request. Please try again.");
  }
};


  return (
    <div className="min-h-[80vh] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Live Collaboration Room
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Join an existing room or create a new one to start collaborating with other developers in real-time.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Join Room */}
          <div className="bg-[#172334] p-6 rounded-lg border border-[#be9269]/10">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Users size={20} className="mr-2 text-[#be9269]" />
              Join Existing Room
            </h2>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label htmlFor="roomId" className="block text-sm font-medium text-gray-300 mb-1">
                  Room ID
                </label>
                <input
                  type="text"
                  id="roomId"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                  placeholder="Enter room ID"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center px-4 py-2 bg-[#be9269]/10 text-[#be9269] rounded-md hover:bg-[#be9269]/20 font-semibold"
              >
                Join Room
                <ArrowRight size={16} className="ml-2" />
              </button>
            </form>
          </div>

          {/* Create Room */}
          <div className="bg-[#172334] p-6 rounded-lg border border-[#be9269]/10">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Plus size={20} className="mr-2 text-[#be9269]" />
              Create New Room
            </h2>
            <p className="text-gray-300 text-sm mb-6">
              Start a new collaboration room and invite others to join. You'll get a unique room ID to share.
            </p>
            <button
              onClick={openCreateRoomModal}
              className="w-full flex items-center justify-center px-4 py-2 bg-[#be9269] text-[#101b2c] rounded-md hover:bg-[#be9269]/90 font-semibold"
            >
              Create New Room
              <Plus size={16} className="ml-2" />
            </button>
          </div>
        </div>
{/* Request Pending Modal */}
{/* Request Pending Modal */}
{showRequestPendingModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-[#172334] rounded-lg border border-[#be9269]/10 p-6 w-full max-w-md">
      <h3 className="text-xl font-semibold text-white mb-4">Waiting for Approval</h3>
      
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-md mb-6">
        <p className="flex items-center">
          <Loader2 size={16} className="mr-2 animate-spin" />
          Your request to join this room is pending approval from the room creator.
        </p>
        <p className="text-xs mt-2 text-amber-500/80">
          Request ID: {requestPending?.requestId.substring(0,8)}...
        </p>
      </div>
      
      <p className="text-gray-300 mb-6">
        You'll be automatically redirected once your request is approved.
      </p>
      
      <div className="flex justify-between">
        <button
          onClick={() => {
            console.log("[DEBUG] Manual check for request status");
            // Manually check status
            if (requestPending) {
              supabase
                .from('room_join_requests')
                .select('status')
                .eq('id', requestPending.requestId)
                .single()
                .then(({ data }) => {
                  if (data && data.status === 'approved') {
                    setShowRequestPendingModal(false);
                    navigate(`/room/${requestPending.roomId}`);
                  } else {
                    alert("Your request is still pending approval.");
                  }
                });
            }
          }}
          className="px-4 py-2 bg-blue-600/70 text-white rounded-md hover:bg-blue-700/70"
        >
          Check Status
        </button>
        <button
          onClick={() => setShowRequestPendingModal(false)}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
        {/* Active Rooms */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center justify-between">
            <span>Active Public Rooms</span>
            <button
              onClick={fetchActiveRooms}
              className="text-sm flex items-center bg-[#be9269]/10 text-[#be9269] px-3 py-1 rounded-md hover:bg-[#be9269]/20"
            >
              {loading ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <ArrowRight size={14} className="mr-1" />
              )}
              Refresh
            </button>
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={32} className="animate-spin text-[#be9269]" />
            </div>
          ) : activeRooms.length === 0 ? (
            <div className="bg-[#172334]/50 rounded-lg border border-[#be9269]/10 p-6 text-center">
              <p className="text-gray-300">No active rooms right now. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {activeRooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-[#172334]/50 p-4 rounded-lg border border-[#be9269]/10 hover:border-[#be9269]/30 transition-colors cursor-pointer"
                  onClick={() => joinExistingRoom(room.room_id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-white font-medium">
                      {room.title || "Untitled Room"}
                    </h3>
                    <span className="text-xs bg-[#be9269]/10 text-[#be9269] px-2 py-1 rounded-full">
                      {room.member_count} member{room.member_count !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Make description more prominent */}
                  <p className="text-gray-300 text-sm mb-3">
                    {room.description || "Collaborative coding session"}
                  </p>

                  <div className="flex justify-between items-center">
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                      Public
                    </span>
                    <span className="text-xs text-gray-400">
                      Started {getTimeAgo(room.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add a more noticeable notification for pending join requests */}
{joinRequests.length > 0 && (
  <div className="mt-8 mb-4">
    <button 
      onClick={() => {
        setShowRequestsModal(true);
        setHasNewRequests(false);
      }}
      className="w-full flex items-center justify-center px-4 py-3 bg-amber-500/20 text-amber-400 border border-amber-400/30 rounded-md hover:bg-amber-500/30"
    >
      <div className="relative">
        <Users size={20} className="mr-2" />
        {hasNewRequests && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
        )}
      </div>
      <span className="font-medium">
        You have {joinRequests.length} pending join request{joinRequests.length !== 1 ? 's' : ''}
      </span>
    </button>
  </div>
)}


{/* Request Management Modal */}
{showRequestsModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-[#172334] rounded-lg border border-[#be9269]/10 p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
      <h3 className="text-xl font-semibold text-white mb-4">Pending Join Requests</h3>
      
      {joinRequests.length === 0 ? (
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
                    Requesting to join <span className="text-[#be9269]">{request.rooms.title || 'Untitled Room'}</span>
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

        {/* Create Room Modal */}
        {showRoomModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#172334] rounded-lg border border-[#be9269]/10 p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold text-white mb-4">Create New Room</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="roomTitle" className="block text-sm font-medium text-gray-300 mb-1">
                    Room Title
                  </label>
                  <input
                    type="text"
                    id="roomTitle"
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    className="w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                    placeholder="Room Title"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="roomDescription" className="block text-sm font-medium text-gray-300 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    id="roomDescription"
                    value={roomDescription}
                    onChange={(e) => setRoomDescription(e.target.value)}
                    className="w-full rounded-md bg-[#101b2c] border border-[#be9269]/30 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#be9269]/50"
                    placeholder="Describe the purpose of this room"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Room Visibility
                  </label>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setIsPublic(true)}
                      className={`flex-1 flex items-center justify-center px-4 py-3 rounded-md ${isPublic ? 'bg-[#be9269]/20 border-2 border-[#be9269]' : 'bg-[#101b2c] border border-[#be9269]/30'
                        } text-white`}
                    >
                      <Globe size={16} className={`mr-2 ${isPublic ? 'text-[#be9269]' : 'text-gray-400'}`} />
                      <span>Public</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={`flex-1 flex items-center justify-center px-4 py-3 rounded-md ${!isPublic ? 'bg-[#be9269]/20 border-2 border-[#be9269]' : 'bg-[#101b2c] border border-[#be9269]/30'
                        } text-white`}
                    >
                      <Lock size={16} className={`mr-2 ${!isPublic ? 'text-[#be9269]' : 'text-gray-400'}`} />
                      <span>Private</span>
                    </button>
                  </div>

                  <p className="text-gray-400 text-sm mt-2">
                    {isPublic
                      ? 'Public rooms are visible to everyone and can be joined by anyone.'
                      : 'Private rooms are hidden and can only be joined with the room ID.'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowRoomModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRoom}
                  className="px-4 py-2 bg-[#be9269] text-[#101b2c] rounded-md hover:bg-[#be9269]/90 font-medium"
                >
                  Create Room
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollabRoom;