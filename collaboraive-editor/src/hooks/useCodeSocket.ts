import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Define or import types
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseCodeExecutionSocketProps {
  onOutputReceived: React.Dispatch<React.SetStateAction<string>>;
}

export function useCodeExecutionSocket({ onOutputReceived }: UseCodeExecutionSocketProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isWaitingForInput, setIsWaitingForInput] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [executingUser, setExecutingUser] = useState<string | null>(null);
  
  // Refs
  const socketRef = useRef<Socket | null>(null);
  const outputRef = useRef<string>('');
  const outputCallbackRef = useRef<((output: string) => void) | null>(null);

  // Process incoming output to detect when user input is needed - defined as a callback to ensure stability
  const processOutput = useCallback((data: string) => {
    onOutputReceived((prevOutput: string) => {
      const combinedOutput = prevOutput + data;
      outputRef.current = combinedOutput;

      // Call the output callback if it exists
      if (outputCallbackRef.current) {
        outputCallbackRef.current(combinedOutput);
      }

      // Get the last line of output to check for prompts
      const outputLines = combinedOutput.trim().split('\n');
      const lastLine = outputLines[outputLines.length - 1] || '';
      const lowerCaseLastLine = lastLine.toLowerCase();
      const lowerCaseData = data.toLowerCase();

      // Check for input patterns
      if (
        lowerCaseData.includes('input') ||
        lowerCaseData.includes('enter') ||
        lowerCaseData.includes('type') ||
        lowerCaseData.includes('say') ||
        lowerCaseLastLine.endsWith('?') ||
        lastLine.endsWith(':') ||
        lowerCaseData.includes('prompt') ||
        lowerCaseData.includes('cin') ||
        lowerCaseData.includes('scanf') ||
        lowerCaseData.includes('readline') ||
        lowerCaseLastLine.includes('input') ||
        lowerCaseLastLine.includes('enter') ||
        lowerCaseLastLine.includes('type') ||
        lowerCaseLastLine.includes('say')
      ) {
        console.log("Input prompt detected:", lastLine);
        setIsWaitingForInput(true);
      }

      if (data.includes('Process exited with code') || data.includes('terminated')) {
        setIsRunning(false);
        setIsWaitingForInput(false);
        setExecutingUser(null);
        // Clear the output callback when execution completes
        outputCallbackRef.current = null;
      }

      return combinedOutput;
    });
  }, [onOutputReceived]);

  // Initialize Socket.IO connection
  useEffect(() => {
    try {
      setConnectionStatus('connecting');
      const socketInstance = io('http://localhost:5000', {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
        transports: ['polling', 'websocket']
      });

      console.log('Attempting to connect to Socket.IO server...');

      socketInstance.on('connect', () => {
        console.log('Socket.IO connection established with ID:', socketInstance.id);
        setSocket(socketInstance);
        socketRef.current = socketInstance;
        setIsRunning(false);
        setIsConnected(true);
        setConnectionStatus('connected');
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        onOutputReceived(prev => {
          const newOutput = prev + 'Connection error: Cannot connect to code execution server.\n';
          outputRef.current = newOutput;
          return newOutput;
        });
        setIsConnected(false);
        setConnectionStatus('error');
      });

      socketInstance.on('output', (data) => {
        console.log('Received output from server:', data);
        processOutput(data);
      });

      socketInstance.on('joined', ({ sessionId }) => {
        console.log('Joined session:', sessionId);
        setSessionId(sessionId);
      });

      socketInstance.on('error', (errorMessage) => {
        console.error('Server error:', errorMessage);
        onOutputReceived(prev => {
          const newOutput = prev + `Error: ${errorMessage}\n`;
          outputRef.current = newOutput;
          return newOutput;
        });
        setIsRunning(false);
        setIsWaitingForInput(false);
        setExecutingUser(null);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected:', reason);
        if (reason === 'io server disconnect') {
          console.log('Attempting to reconnect...');
          socketInstance.connect();
        }
        setIsRunning(false);
        setIsWaitingForInput(false);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setExecutingUser(null);
      });

      return () => {
        console.log('Cleaning up Socket.IO connection...');
        if (sessionId) {
          fetch(`http://localhost:5000/api/sessions/${sessionId}`, {
            method: 'DELETE'
          }).catch(err => console.error('Error cleaning up session:', err));
        }
        socketInstance.disconnect();
      };
    } catch (error) {
      console.error('Error setting up Socket.IO:', error);
      setConnectionStatus('error');
    }
  }, [onOutputReceived, processOutput]);

  // Send input to the running process
  const sendInput = (input: string) => {
    if (socket && sessionId) {
      // Add the input to the output display
      onOutputReceived(prev => {
        const newOutput = prev + `> ${input}\n`;
        outputRef.current = newOutput;
        
        // Call the output callback if it exists
        if (outputCallbackRef.current) {
          outputCallbackRef.current(newOutput);
        }
        
        return newOutput;
      });
      
      // Send input to the socket server
      socket.emit('input', { sessionId, input: input + '\n' });
      
      // Temporarily set waiting for input to false until server asks for more
      setIsWaitingForInput(false);
    }
  };

  // Stop the running process
  const stopProcess = () => {
    if (socket && sessionId) {
      socket.emit('stop', { sessionId });
      setIsRunning(false);
      setIsWaitingForInput(false);
      setExecutingUser(null);
      outputCallbackRef.current = null;
      
      onOutputReceived(prev => {
        const newOutput = prev + '\nProcess terminated by user.\n';
        outputRef.current = newOutput;
        return newOutput;
      });
    }
  };

 // Create a new session and run code
const runCode = async (
  code: string, 
  language: string, 
  userName?: string,
  onOutputUpdate?: (output: string) => void
) => {
  if (socket) {
    setIsRunning(true);
    setIsWaitingForInput(false);
    setExecutingUser(userName || null);
    
    // Store the output callback
    if (onOutputUpdate) {
      outputCallbackRef.current = onOutputUpdate;
    }
    
    try {
      // Clear output before starting
      onOutputReceived('');
      outputRef.current = '';
      
      // Create a new session
      const response = await fetch('http://localhost:5000/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ language })
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      const newSessionId = data.sessionId;
      setSessionId(newSessionId);

      // Join the session
      socket.emit('join', { sessionId: newSessionId });

      // Execute the code
      socket.emit('execute', {
        sessionId: newSessionId,
        code
      });
      
      // Return a promise that resolves when execution completes
      return new Promise<string>((resolve) => {
        const checkExecutionStatus = setInterval(() => {
          if (!isRunning) {
            clearInterval(checkExecutionStatus);
            resolve(outputRef.current);
          }
        }, 200);
        
        // Set a maximum wait time of 30 seconds
        setTimeout(() => {
          clearInterval(checkExecutionStatus);
          resolve(outputRef.current);
        }, 30000);
      });
    } catch (error) {
      console.error('Error running code:', error);
      const errorMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
      onOutputReceived(prev => {
        const newOutput = prev + errorMessage;
        outputRef.current = newOutput;
        return newOutput;
      });
      setIsRunning(false);
      setExecutingUser(null);
      outputCallbackRef.current = null;
      return errorMessage;
    }
  }
  return 'Socket not connected';
};

  // Set remote execution output received from another user
  const setRemoteOutput = (output: string) => {
    onOutputReceived(output);
    outputRef.current = output;
  };

  // Reconnect to the server
  const reconnect = () => {
    if (socketRef.current) {
      socketRef.current.connect();
      setConnectionStatus('connecting');
    }
  };

  return {
    socket,
    isRunning,
    isWaitingForInput,
    isConnected,
    connectionStatus,
    executingUser,
    sendInput,
    stopProcess,
    runCode,
    reconnect,
    setRemoteOutput
  };
}