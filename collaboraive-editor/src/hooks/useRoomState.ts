import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useRoomState = (roomId: string, currentUser: any, files: any[], setFiles: Function) => {
  // Save room state to Supabase
  const saveRoomState = useCallback(async (currentFiles = files) => {
    if (!roomId || !supabase || !currentUser.id) {
      console.error("Missing required data for saving room state:", {
        roomId: !!roomId,
        supabase: !!supabase,
        userId: !!currentUser.id
      });
      return;
    }

    try {
      console.log("Saving room state with files:", currentFiles.length);
      
      // Validate that files are valid objects before saving
      const validFiles = currentFiles.filter(file => 
        file && typeof file === 'object' && 'id' in file && 'name' in file);
      
      if (validFiles.length !== currentFiles.length) {
        console.warn(`Filtered out ${currentFiles.length - validFiles.length} invalid files`);
      }
      
      // Create a content object with current state
      const contentObj = {
        files: validFiles,
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: currentUser.id
      };
      
      const content = JSON.stringify(contentObj);

      // Get current version and increment
      const currentVersion = parseInt(localStorage.getItem(`room_${roomId}_version`) || '0');
      const newVersion = currentVersion + 1;

      console.log(`Saving room state to Supabase (room: ${roomId}, version: ${newVersion})`);

      // Update the room state with explicit error handling
      const { data, error } = await supabase
        .from('rooms')
        .upsert({
          id: roomId,
          content: content,
          version: newVersion,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'id' 
        })
        .select();

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      // Update local version
      localStorage.setItem(`room_${roomId}_version`, newVersion.toString());
      console.log("Room state saved successfully:", {
        version: newVersion,
        filesCount: validFiles.length,
        response: data
      });
    } catch (err) {
      console.error("Error saving room state:", err);
      
      // Store failure info for debugging
      localStorage.setItem(`room_${roomId}_lastSaveError`, JSON.stringify({
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
        filesCount: currentFiles.length
      }));
      
      // Try again later with a backoff
      const retryDelay = 2000 + Math.random() * 3000; // 2-5 seconds
      console.log(`Will retry saving room state in ${Math.round(retryDelay/1000)}s`);
      
      setTimeout(() => {
        saveRoomState(currentFiles);
      }, retryDelay);
    }
  }, [roomId, currentUser.id, files]);

  // Load room state from Supabase
  const loadRoomState = useCallback(async () => {
    if (!roomId || !supabase) return;
    
    try {
      console.log("Loading room state for:", roomId);
      
      // Get room data from Supabase with retry
      const fetchRoomData = async (attempts = 3): Promise<any> => {
        try {
          const { data, error } = await supabase
            .from('rooms')
            .select('content, version')
            .eq('id', roomId)
            .single();
            
          if (error) throw error;
          return { data, error: null };
        } catch (err) {
          if (attempts > 1) {
            console.log(`Retrying room data fetch, ${attempts-1} attempts left`);
            await new Promise(r => setTimeout(r, 1000));
            return fetchRoomData(attempts - 1);
          }
          return { data: null, error: err };
        }
      };
      
      const { data, error } = await fetchRoomData();
      
      if (error) {
        console.error("Error loading room state:", error);
        return null;
      }
      
      if (data && data.content) {
        try {
          // Parse stored content with explicit error handling
          const parsedContent = JSON.parse(data.content);
          
          console.log("Loaded content from Supabase:", parsedContent);
          
          if (parsedContent.files && Array.isArray(parsedContent.files)) {
            console.log("Loaded files from database:", parsedContent.files.length, parsedContent.files);
            
            // Verify files are valid before setting
            const validFiles = parsedContent.files.filter((file: { id: number; name: string; language: string; content: string }) => 
              file && typeof file === 'object' && 'id' in file && 'name' in file);
            
            // Store version in localStorage
            localStorage.setItem(`room_${roomId}_version`, data.version.toString());
            
            return validFiles;
          } else {
            console.warn("Loaded content is missing files array");
            return null;
          }
        } catch (parseErr) {
          console.error("Error parsing room content:", parseErr);
          return null;
        }
      } else {
        console.log("No content found for room");
        return null;
      }
    } catch (err) {
      console.error("Unexpected error loading room state:", err);
      return null;
    }
  }, [roomId]);

  // Set up periodic sync
  useEffect(() => {
    if (!roomId || !supabase || !currentUser.id || files.length === 0) return;
  
    // Save room state periodically
    const syncInterval = setInterval(() => {
      saveRoomState();
    }, 30000); // every 30 seconds
  
    return () => {
      clearInterval(syncInterval);
    };
  }, [roomId, supabase, currentUser.id, files, saveRoomState]);

  return { saveRoomState, loadRoomState };
};