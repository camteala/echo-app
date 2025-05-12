import { useState, useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseSharedExecutionProps {
  channelRef: React.MutableRefObject<RealtimeChannel | null>;
  currentUser: { id: string; name: string };
  roomId: string;
  onOutputReceived: (output: string) => void;
  runCodeFunction: (code: string, language: string, username?: string, outputCallback?: (output: string) => void) => Promise<string>;
}

export function useSharedExecution({
    channelRef,
    currentUser,
    roomId,
    onOutputReceived,
    runCodeFunction
  }: UseSharedExecutionProps) {
    const [isRunning, setIsRunning] = useState(false);
    const [isWaitingForInput, setIsWaitingForInput] = useState(false);
    const [executingUser, setExecutingUser] = useState<string | null>(null);
    
    // Set up listeners for remote execution events
    useEffect(() => {
      if (!channelRef.current || !roomId) return;
      
      // Listen for execution start events
      channelRef.current.on('broadcast', { event: 'shared_execution_started' }, ({ payload }) => {
        const { userId, userName } = payload;
        
        // Ignore if we're the one who started execution
        if (userId === currentUser.id) return;
        
        console.log(`[SharedExecution] ${userName} started execution`);
        setIsRunning(true);
        setExecutingUser(userName);
        onOutputReceived(`[System] ${userName} is running the code...\n`);
      });
      
      // Listen for execution output updates - THIS IS THE KEY FIX
     // In your useSharedExecution.ts, update this part:
channelRef.current.on('broadcast', { event: 'shared_execution_output' }, ({ payload }) => {
    const { userId, output } = payload;
    
    // Ignore our own output (we already have it)
    if (userId === currentUser.id) return;
    
    console.log(`[SharedExecution] Received output update with length: ${output.length}`);
    
    // Use a direct setter function instead of a callback to ensure correct updates
    onOutputReceived(output);
    
    // Directly update the DOM if necessary
    setTimeout(() => {
      const terminalElement = document.querySelector('.terminal-output');
      if (terminalElement) {
        terminalElement.scrollTop = terminalElement.scrollHeight;
      }
    }, 50);
  });
      
      // Listen for input request events
      channelRef.current.on('broadcast', { event: 'shared_execution_input_needed' }, ({ payload }) => {
        const { userId } = payload;
        if (userId === currentUser.id) return;
        
        console.log(`[SharedExecution] Input needed from ${userId}`);
        setIsWaitingForInput(true);
      });
      
      // Listen for input provided events
      channelRef.current.on('broadcast', { event: 'shared_execution_input_sent' }, ({ payload }) => {
        const { input, userName } = payload;
        console.log(`[SharedExecution] Input sent by ${userName}: ${input}`);
        setIsWaitingForInput(false);
      });
      
      // Listen for execution completed events
      channelRef.current.on('broadcast', { event: 'shared_execution_completed' }, ({ payload }) => {
        const { userId } = payload;
        if (userId === currentUser.id) return;
        
        console.log(`[SharedExecution] Execution completed by ${userId}`);
        setIsRunning(false);
        setIsWaitingForInput(false);
        setExecutingUser(null);
      });
      
      return () => {
        // Clean up event listeners
        if (channelRef.current) {
          channelRef.current.unsubscribe();
        }
      };
    }, [channelRef, roomId, currentUser.id, onOutputReceived]);
  
    // Run code with real-time updates
    const runSharedCode = async (code: string, language: string) => {
      if (!channelRef.current) return;
      
      console.log("[SharedExecution] Starting shared code execution");
      
      // Tell everyone we're starting execution
      channelRef.current.send({
        type: 'broadcast',
        event: 'shared_execution_started',
        payload: {
          userId: currentUser.id,
          userName: currentUser.name,
          language,
          code
        }
      });
      
      setIsRunning(true);
      setExecutingUser(currentUser.name);
      
      // THIS IS THE CRUCIAL FIX - Create a special callback to broadcast output updates
      const outputUpdateCallback = (output: string) => {
        console.log("[SharedExecution] Broadcasting output update:", output.substring(0, 50) + "...");
        
        // Broadcast the output update to all clients
        channelRef.current?.send({
          type: 'broadcast',
          event: 'shared_execution_output',
          payload: {
            userId: currentUser.id,
            output: output
          }
        });
        
        // Check if waiting for input
        const isInputNeeded = output.endsWith('?') || 
                              output.includes('input') ||
                              output.endsWith(':');
        
        if (isInputNeeded && !isWaitingForInput) {
          setIsWaitingForInput(true);
          channelRef.current?.send({
            type: 'broadcast',
            event: 'shared_execution_input_needed',
            payload: { userId: currentUser.id }
          });
        }
      };
      
      try {
        // Run the code with our custom output callback
        const result = await runCodeFunction(code, language, currentUser.name, outputUpdateCallback);
        
        // Final broadcast of completion
        channelRef.current.send({
          type: 'broadcast',
          event: 'shared_execution_completed',
          payload: {
            userId: currentUser.id
          }
        });
        
        return result;
      } catch (error) {
        const errorMsg = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        onOutputReceived(errorMsg);
        
        // Broadcast the error
        channelRef.current.send({
          type: 'broadcast',
          event: 'shared_execution_output',
          payload: {
            userId: currentUser.id,
            output: errorMsg
          }
        });
        
        return errorMsg;
      } finally {
        setIsRunning(false);
        setIsWaitingForInput(false);
        setExecutingUser(null);
      }
    };
  
    // Send input to a running execution
    const sendSharedInput = (input: string) => {
      if (!channelRef.current || !isWaitingForInput) return;
      
      console.log(`[SharedExecution] Sending input: ${input}`);
      
      // Tell everyone about this input
      channelRef.current.send({
        type: 'broadcast',
        event: 'shared_execution_input_sent',
        payload: {
          userId: currentUser.id,
          userName: currentUser.name,
          input
        }
      });
      
      // Also send it to the local execution
      setIsWaitingForInput(false);
    };
  
    return {
      isRunning,
      isWaitingForInput,
      executingUser,
      runSharedCode,
      sendSharedInput
    };
  }