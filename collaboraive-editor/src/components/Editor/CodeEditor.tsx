import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useCodeEditor } from '../../hooks/useCodeEditor';
import { supabase } from '../../lib/supabase';
import { getTheme } from '../../themes';
import InteractiveTerminal from '../Terminal/Terminal';
import { languageIcons } from '../../lib/constants';
import { CodeEditorProps, User } from '../../types';
import { useCodeExecutionSocket } from '../../hooks/useCodeSocket';
import { formatCode } from '../../utils/codeFormatter';
import Toolbar from '../ToolBar/ToolBar';
import FileList from '../Files/FileList';
import { downloadFile as downloadFileUtil } from '../../utils/fileUtils';
import { useFile } from '../../hooks/useFile';
import { useUser } from '../../context/UserContext';
import CollaborativeEditor from './CollaborativeEditor';

const useUIState = () => {
  const [currentInput, setCurrentInput] = useState<string>('');
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  
  const [terminalHeight, setTerminalHeight] = useState<number>(250); 
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(14);
  const [tabSize, setTabSize] = useState<number>(2);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);
  const theme = getTheme(darkMode);

  return {
    currentInput,
    setCurrentInput,
    darkMode,
    setDarkMode,
    sidebarCollapsed,
    setSidebarCollapsed,
    terminalHeight,
    setTerminalHeight,
    showSettings,
    setShowSettings,
    fontSize,
    setFontSize,
    tabSize,
    setTabSize,
    isResizing,
    setIsResizing,
    toggleSidebar,
    theme
  };
};

const CodeEditor: React.FC<{ roomId: string }> = ({ roomId }) => {
  const localFileInputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLPreElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const ignoreNextChangeRef = useRef<boolean>(false);
  const lastCursorPositionRef = useRef<any>(null);
  const { currentUser, activeUsers } = useUser();
  const [executingUser, setExecutingUser] = useState<string | null>(null);
  const lastBroadcastTimeRef = useRef<number | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  const {
    language,
    output,
    setLanguage,
    handleFileSelect,
    setOutput,
  } = useCodeEditor();

  const ui = useUIState();

  const fileManager = useFile({
    onLanguageChange: setLanguage
  });

  const {
    files,
    setFiles,
    activeFileId,
    setActiveFileId,
    newFileName,
    setNewFileName,
    newFileLanguage,
    setNewFileLanguage,
    editingFileId,
    setEditingFileId,
    isCreatingFile,
    setIsCreatingFile,
    createFile,
    renameFile,
    deleteFile,
    getActiveFile
  } = fileManager;

  const {
    isRunning,
    isWaitingForInput,
    isConnected,
    connectionStatus,
    sendInput,
    stopProcess,
    runCode,
    reconnect
  } = useCodeExecutionSocket({
    onOutputReceived: setOutput
  });

  const activeFile = getActiveFile();

  const handleSendInput = (input: string) => {
    sendInput(input);
    ui.setCurrentInput('');

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e: any) => {
      lastCursorPositionRef.current = {
        lineNumber: e.position.lineNumber,
        column: e.position.column
      };
    });
  };

const handleStatusChange = (status: string) => {
  console.log("Channel status changed:", status);
  
  if (status === 'CLOSED') {
    console.log("Channel closed - attempting to reconnect");
    
    setTimeout(() => {
      try {
        const newChannel = supabase.channel(`room:${roomId}`);
        
        setupChannelEvents(newChannel);
        
        newChannel.subscribe((status) => {
          console.log("Reconnection status:", status);
          if (status === 'SUBSCRIBED') {
            console.log("Successfully reconnected to channel!");
          }
        });
        
        channelRef.current = newChannel;
      } catch (error) {
        console.error("Error reconnecting to channel:", error);
      }
    }, 1000); 
  }
};
const forceTerminalUpdate = (content: string | ((prev: string) => string)) => {
  console.log("Forcing terminal update");
  
  if (typeof content === 'function') {
    setOutput(prevOutput => {
      const newOutput = content(prevOutput);
      console.log(`Terminal updated with functional update, new length: ${newOutput.length}`);
      return newOutput;
    });
  } else {
    setOutput(content);
    console.log(`Terminal updated with direct value, length: ${content.length}`);
  }
  
  setTimeout(() => {
    const terminalElement = document.querySelector('.terminal-output');
    if (terminalElement) {
      terminalElement.scrollTop = terminalElement.scrollHeight;
      console.log("Terminal manually scrolled to bottom");
    }
  }, 50);
};
const setupChannelEvents = (channel: any) => {
  console.log("Setting up all channel event listeners");
  
  channel.on('broadcast', { event: 'code_change' }, ({ payload }: any) => {
    const { fileId, code, timestamp, userId } = payload;

    console.log("Received code change:", { fileId, codeLength: code.length, from: userId });

    if (userId === currentUser.id) {
      console.log("Ignoring own change");
      return;
    }

    const lastChangeTime = parseInt(sessionStorage.getItem('lastChangeTimestamp') || '0');
    if (timestamp < lastChangeTime) {
      console.log("Ignoring stale update");
      return;
    }

    setFiles(prevFiles => {
      return prevFiles.map(file =>
        file.id === fileId ? { ...file, content: code } : file
      );
    });

    ignoreNextChangeRef.current = true;

    console.log("Applied remote change to file:", fileId);
  });
  
  channel.on('broadcast', { event: 'cursor_move' }, ({ payload }: any) => {
    const { userId, position } = payload;
    if (userId === currentUser.id) return;
    
    console.log("Cursor moved by user:", userId, position);
  });
  
  channel.on('broadcast', { event: 'shared_execution_started' }, ({ payload }: any) => {
    const { userId, userName } = payload;
    
    if (userId === currentUser.id) return;
    
    console.log(`[Channel] ${userName} started execution`);
    forceTerminalUpdate(`[System] ${userName} is running the code...\n`);
  });
  
  channel.on('broadcast', { event: 'shared_execution_output' }, ({ payload }: any) => {
    const { userId, output } = payload;
    
    if (userId === currentUser.id) return;
    
    console.log(`[Channel] Received output update with length: ${output.length}`);
    
    forceTerminalUpdate(output);
    
    setTimeout(() => {
      const terminalElement = document.querySelector('.terminal-output');
      if (terminalElement) {
        terminalElement.scrollTop = terminalElement.scrollHeight;
      }
    }, 50);
  });
  
  channel.on('broadcast', { event: 'shared_execution_input_needed' }, ({ payload }: any) => {
    const { userId } = payload;
    
    if (userId === currentUser.id) return;
    
    console.log(`[Channel] Input needed from user: ${userId}`);
  
  });
  
  channel.on('broadcast', { event: 'shared_execution_input_sent' }, ({ payload }: any) => {
    const { userId, userName, input } = payload;
    
    console.log(`[Channel] Input sent by ${userName}: ${input}`);
    
    forceTerminalUpdate(prev => `${prev}\n> ${input}\n`);
    
  });
  
  channel.on('broadcast', { event: 'shared_execution_completed' }, ({ payload }: any) => {
    const { userId } = payload;
    
    if (userId === currentUser.id) return;
    
    console.log(`[Channel] Execution completed by user: ${userId}`);
    
  });

  channel.on('system', { event: 'subscription_status' }, (payload: any) => {
    const status = payload.status;
    console.log("Channel status changed:", status);
    
    if (status === 'CLOSED') {
      handleStatusChange('CLOSED');
    }
  });
  
  return channel;
};
  const clearTerminal = () => {
    setOutput('');
  };


  const handleRunCode = async () => {
    if (activeFile) {
      setOutput('');
      ui.setCurrentInput('');
      setExecutingUser(currentUser.name || 'You');


      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'shared_execution_started',
          payload: {
            userId: currentUser.id,
            userName: currentUser.name || 'Anonymous',
            fileId: activeFileId,
            language: activeFile.language
          },
        });
      }
  
      
      try {
        let lastOutput = '';
        
        const results = await runCode(
          activeFile.content, 
          activeFile.language, 
          currentUser.name,
          (currentOutput) => {
            lastOutput = currentOutput;
            if (channelRef.current) {
              const now = Date.now();
              if (!lastBroadcastTimeRef.current || now - lastBroadcastTimeRef.current > 300) {
                lastBroadcastTimeRef.current = now;
                
                channelRef.current.send({
                  type: 'broadcast',
                  event: 'shared_execution_output',
                  payload: {
                    userId: currentUser.id,
                    output: currentOutput
                  },
                }).catch((err: Error) => {
                  console.error("Error broadcasting output:", err);
                });
              }
            }
          }
        );
  
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'shared_execution_completed',
            payload: {
              userId: currentUser.id
            },
          });
        }
      } catch (error) {
        console.error("Error during code execution:", error);
      } finally {
        setExecutingUser(null);
        lastBroadcastTimeRef.current = null;
      }
    }
  };
useEffect(() => {
  const channel = supabase.channel(`room-${roomId}`);
  
  channel
    .on('presence', { event: 'sync' }, () => {
    })
    .on('broadcast', { event: 'cursor_move' }, (payload) => {
    })
    .on('broadcast', { event: 'file_created' }, ({ payload }) => {
      if (payload.userId === currentUser.id) return;
      
      console.log("Received file_created event:", payload.file);
      
      setFiles(prevFiles => {
        if (prevFiles.some(f => f.id === payload.file.id)) return prevFiles;
        return [...prevFiles, payload.file];
      });
    })
    .on('broadcast', { event: 'file_renamed' }, ({ payload }) => {
      if (payload.userId === currentUser.id) return;
      
      console.log("Received file_renamed event:", payload);
      
      setFiles(prevFiles => 
        prevFiles.map(file => 
          file.id === payload.fileId ? { ...file, name: payload.newName } : file
        )
      );
    })
    .on('broadcast', { event: 'file_deleted' }, ({ payload }) => {
      if (payload.userId === currentUser.id) return;
      
      console.log("Received file_deleted event:", payload);
      
      setFiles(prevFiles => prevFiles.filter(file => file.id !== payload.fileId));
      
      if (activeFileId === payload.fileId) {
        const remainingFiles = files.filter(f => f.id !== payload.fileId);
        if (remainingFiles.length > 0) {
          setActiveFileId(remainingFiles[0].id);
          setLanguage(remainingFiles[0].language);
        }
      }
    })
    .subscribe();
  
  channelRef.current = channel;
  
  
  return () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
  };
}, [roomId, supabase, currentUser.id]);
  const handleEditorChange = (value: string | undefined) => {
    if (!value || !supabase || !activeFileId || !channelRef.current) return;

    if (ignoreNextChangeRef.current) {
      ignoreNextChangeRef.current = false;
      return;
    }

    const lastChangeTimestamp = Date.now();
    sessionStorage.setItem('lastChangeTimestamp', lastChangeTimestamp.toString());

    setFiles(files.map(file =>
      file.id === activeFileId ? { ...file, content: value } : file
    ));

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      channelRef.current.send({
        type: 'broadcast',
        event: 'code_change',
        payload: {
          fileId: activeFileId,
          code: value,
          timestamp: lastChangeTimestamp,
          userId: currentUser.id
        },
      });

      debounceTimeout.current = null;
    }, 300);
  };

  const handleFormatCode = async () => {
    if (!editorRef.current || !activeFile) return;

    const showNotification = (message: string, isError: boolean = false) => {
      setOutput(prev => prev + `\n[Format] ${message}\n`);
    };

    const updateFileContent = (newContent: string) => {
      setFiles(files.map(file =>
        file.id === activeFileId ? { ...file, content: newContent } : file
      ));
    };

    await formatCode({
      editor: editorRef.current,
      content: activeFile.content,
      tabSize: ui.tabSize,
      onNotification: showNotification,
      onUpdateContent: updateFileContent
    });
  };

  useEffect(() => {
    if (!channelRef.current || !roomId || !isOnline) return;
    
    // Send a heartbeat every 5 seconds to keep the connection alive
    const heartbeatInterval = setInterval(() => {
      if (channelRef.current && isOnline) {
        console.log("Sending heartbeat to keep connection alive");
        
        channelRef.current.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { timestamp: Date.now() }
        }).catch((err: Error) => {
          console.error("Error sending heartbeat:", err);
          
          // Only force reconnection if we're supposedly online
          if (isOnline) {
            console.log("Heartbeat failed despite being online - forcing reconnection");
            handleStatusChange('CLOSED');
          }
        });
      }
    }, 5000);
    
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [roomId, isOnline]);

  const syncRoomState = async (retries = 3) => {
    if (!isOnline) {
      console.log("Skipping room sync - offline");
      return;
    }
  
    try {
      const content = JSON.stringify({
        files: files,
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: currentUser.id
      });
  
      const currentVersion = parseInt(localStorage.getItem(`room_${roomId}_version`) || '0');
      const newVersion = currentVersion + 1;


      const { error } = await supabase
        .from('rooms')
        .upsert({
          id: roomId,
          content: content,
          version: newVersion,
          updated_at: new Date().toISOString()
        });
  
      if (error) {
        throw error;
      }
  
      localStorage.setItem(`room_${roomId}_version`, newVersion.toString());
      console.log("Room state synced, new version:", newVersion);
    } catch (err) {
      console.error("Error syncing room state:", err);
      
      if (retries > 0 && isOnline) {
        const delay = Math.pow(2, (4-retries)) * 1000; // Exponential backoff
        console.log(`Retrying room sync in ${delay/1000}s... (${retries} retries left)`);
        
        setTimeout(() => syncRoomState(retries - 1), delay);
      } else {
        console.log("Saving failed sync for later retry when back online");
        localStorage.setItem(`room_${roomId}_needsSync`, 'true');
      }
    }
  };
  
  useEffect(() => {
    if (!roomId || !supabase || !currentUser.id || files.length === 0) return;
  
    if (isOnline && localStorage.getItem(`room_${roomId}_needsSync`) === 'true') {
      console.log("Found pending sync - attempting now");
      syncRoomState();
      localStorage.removeItem(`room_${roomId}_needsSync`);
    }
  
    const syncInterval = setInterval(() => {
      syncRoomState();
    }, 30000); 
  
    return () => {
      clearInterval(syncInterval);
    };
  }, [roomId, supabase, currentUser.id, files, isOnline]);

  useEffect(() => {
    if (!roomId || !supabase || !currentUser.id || files.length === 0) return;

   
    const syncInterval = setInterval(async () => {
      try {
        
        
        const content = JSON.stringify({
          files: files,
          lastUpdated: new Date().toISOString(),
          lastUpdatedBy: currentUser.id
        });

        const currentVersion = parseInt(localStorage.getItem(`room_${roomId}_version`) || '0');
        const newVersion = currentVersion + 1;

        const { error } = await supabase
          .from('rooms')
          .upsert({
            id: roomId,
            content: content,
            version: newVersion,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error("Error syncing room state:", error);
          return;
        }

        localStorage.setItem(`room_${roomId}_version`, newVersion.toString());
        console.log("Room state synced, new version:", newVersion);

      } catch (err) {
        console.error("Error in room sync:", err);
      }
    }, 30000); 

    return () => {
      clearInterval(syncInterval);
    };
  }, [roomId, supabase, currentUser.id, files]);


useEffect(() => {
  if (!roomId || !supabase || !currentUser.id) return;

  console.log("Setting up real-time channel for room:", roomId);

  
  const channel = supabase.channel(`room:${roomId}`, {
    config: {
      broadcast: { self: false }, 
      presence: { key: currentUser.id }
    }
  });
  
 
  channel.on('broadcast', { event: '*' }, (payload) => {
    console.log("Received broadcast event:", payload.event, payload);
  });
  
  
  channel.on('broadcast', { event: 'file_created' }, ({ payload }) => {
 
    if (payload.userId === currentUser.id) return;
    
    console.log("Received file_created event:", payload.file);

    setFiles(prevFiles => {
   
      if (prevFiles.some(f => f.id === payload.file.id)) return prevFiles;
      
      const updatedFiles = [...prevFiles, payload.file];
      console.log("Updated files after creation:", updatedFiles.length);
      return updatedFiles;
    });
  });
  
  
  
  channel.subscribe((status) => {
    console.log("Channel subscription status:", status);
  });
  
  channelRef.current = channel;
  
  return () => {
    channel.unsubscribe();
  };
}, [roomId, supabase, currentUser.id]);


  
  useEffect(() => {
    if (editorRef.current && activeFile) {
      const currentValue = editorRef.current.getValue();

      
      if (activeFile.content !== currentValue) {
        console.log("Updating editor content from active file");

     
        const position = lastCursorPositionRef.current;

      
        ignoreNextChangeRef.current = true;

       
        editorRef.current.setValue(activeFile.content);

        if (position) {
          editorRef.current.setPosition(position);
          editorRef.current.revealPositionInCenter(position);
        }
      }
    }
  }, [activeFile?.content]);


const loadRoomState = async () => {
  if (!roomId || !supabase) return;
  
  try {
    console.log("Loading room state for:", roomId);
    
   
    const fetchRoomData = async (attempts = 3): Promise<any> => {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('content, version')
          .eq('id', roomId)
          .maybeSingle();
          
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
      createDefaultFile();
      return;
    }
    if (!data) {
      console.log("Room doesn't exist yet - creating default file");
      createDefaultFile();
      return;
    }
    if (data && data.content) {
      try {
      
        const parsedContent = JSON.parse(data.content);
        
        console.log("Loaded content from Supabase:", parsedContent);
        
        if (parsedContent.files && Array.isArray(parsedContent.files)) {
          console.log("Loaded files from database:", parsedContent.files.length, parsedContent.files);
          
         
          const validFiles = parsedContent.files.filter((file: { id: number; name: string; language: string; content: string }) => 
            file && typeof file === 'object' && 'id' in file && 'name' in file);
          
          setFiles(validFiles);
          
       
          if (validFiles.length > 0) {
            setActiveFileId(validFiles[0].id);
            setLanguage(validFiles[0].language);
          }
          
       
          localStorage.setItem(`room_${roomId}_version`, data.version.toString());
        } else {
          console.warn("Loaded content is missing files array");
          createDefaultFile();
        }
      } catch (parseErr) {
        console.error("Error parsing room content:", parseErr);
        createDefaultFile();
      }
    } else {
      console.log("No content found for room, creating default file");
      createDefaultFile();
    }
  } catch (err) {
    console.error("Unexpected error loading room state:", err);
    createDefaultFile();
  }
};

  const createDefaultFile = () => {
    const defaultFile = {
      id: Date.now(),
      name: 'Main.py',
      language: 'python',
      content: '// Start coding here...'
    };
    setFiles([defaultFile]);
    setActiveFileId(defaultFile.id);
    setLanguage('python');
    
    
    saveRoomState([defaultFile]);
  };

useEffect(() => {
  if (!roomId || !supabase) return;



  
  loadRoomState();
}, [roomId, supabase]); 

  useEffect(() => {
 
    const handleOnline = () => {
      console.log("Network connection restored!");
      setIsOnline(true);
      

      if (channelRef.current) {
        handleStatusChange('CLOSED'); 
      }
    };
    
    const handleOffline = () => {
      console.log("Network connection lost!");
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

 
  const handleFileOpen = () => {
    if (localFileInputRef.current) {
      localFileInputRef.current.click();
    }
  };

 
const handleFileOpenAndSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const fileData = await handleFileSelect(event);
  if (fileData) {
    const { content, language } = fileData;
    const fileName = event.target.files?.[0]?.name || 'Untitled';

  
    const newFile = {
      id: Date.now(),
      name: fileName,
      content,
      language,
    };

  
    const updatedFiles = [...files, newFile];
    setFiles(updatedFiles);
    setActiveFileId(newFile.id);
    setLanguage(language);

   
    if (channelRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast',
          event: 'file_created',
          payload: {
            file: newFile,
            userId: currentUser.id
          }
        });
        console.log("Broadcast sent for opened file:", fileName);
      } catch (err) {
        console.error("Error broadcasting opened file:", err);
      }
    }

   
    saveRoomState(updatedFiles);
  }
};
 
  const handleDownloadFile = () => {
    if (activeFile) {
      downloadFileUtil(activeFile.name, activeFile.content);
    }
  };

 
const handleCreateFile = () => {
  if (!newFileName) {
    console.warn("Cannot create file: No filename provided");
    return;
  }
  
  if (!channelRef.current) {
    console.error("Cannot create file: Channel reference is not valid!");
    return;
  }
  
  console.log("Creating new file:", newFileName);
  
 
  const newFile = {
    id: Date.now(),
    name: newFileName.includes('.') ? newFileName : 
      `${newFileName}.${getExtensionForLanguage(newFileLanguage)}`,
    language: newFileLanguage,
    content: '// Start coding here...'
  };
  
  console.log("New file created:", newFile);
  

  const updatedFiles = [...files, newFile];
  setFiles(updatedFiles);
  setActiveFileId(newFile.id);
  setLanguage(newFileLanguage);
  setNewFileName('');
  setIsCreatingFile(false);
  
  try {
    channelRef.current.send({
      type: 'broadcast',
      event: 'file_created',
      payload: {
        file: newFile,
        userId: currentUser.id
      }
    });
    console.log("Broadcast sent for new file creation");
  } catch (err) {
    console.error("Error broadcasting file creation:", err);
  }

  // IMPORTANT: Save room state to Supabase immediately to persist the new file
  console.log("Saving room state with new file");
  saveRoomState(updatedFiles);
};


const saveRoomState = async (currentFiles = files) => {
 
  console.log("Attempting to save room state:", {
    roomId: roomId,
    hasSupabase: !!supabase,
    hasCurrentUser: !!currentUser,
    currentUserId: currentUser?.id || 'undefined',
    filesCount: currentFiles?.length || 0
  });
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
    
    
    const validFiles = currentFiles.filter(file => 
      file && typeof file === 'object' && 'id' in file && 'name' in file);
    
    if (validFiles.length !== currentFiles.length) {
      console.warn(`Filtered out ${currentFiles.length - validFiles.length} invalid files`);
    }
    
  
    const contentObj = {
      files: validFiles,
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: currentUser.id
    };
    
    const content = JSON.stringify(contentObj);

   
    const currentVersion = parseInt(localStorage.getItem(`room_${roomId}_version`) || '0');
    const newVersion = currentVersion + 1;

    console.log(`Saving room state to Supabase (room: ${roomId}, version: ${newVersion})`);

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

   
    localStorage.setItem(`room_${roomId}_version`, newVersion.toString());
    console.log("Room state saved successfully:", {
      version: newVersion,
      filesCount: validFiles.length,
      response: data
    });
  } catch (err) {
    console.error("Error saving room state:", err);
   
    localStorage.setItem(`room_${roomId}_lastSaveError`, JSON.stringify({
      timestamp: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
      filesCount: currentFiles.length
    }));
    
   
    const retryDelay = 2000 + Math.random() * 3000; 
    console.log(`Will retry saving room state in ${Math.round(retryDelay/1000)}s`);
    
    setTimeout(() => {
      saveRoomState(currentFiles);
    }, retryDelay);
  }
};

const handleRenameFile = (id: number, name: string) => {
  if (!channelRef.current) return;
  
  const updatedFiles = files.map(file => 
    file.id === id ? { ...file, name } : file
  );
  setFiles(updatedFiles);
  setEditingFileId(null);
  
  channelRef.current.send({
    type: 'broadcast',
    event: 'file_renamed',
    payload: {
      fileId: id,
      newName: name,
      userId: currentUser.id
    }
  });
  
  saveRoomState(updatedFiles);
};

const handleDeleteFile = (id: number) => {
  if (!channelRef.current) return;
  
  const updatedFiles = files.filter(file => file.id !== id);
  setFiles(updatedFiles);
  
  if (activeFileId === id) {
    if (updatedFiles.length > 0) {
      setActiveFileId(updatedFiles[0].id);
      setLanguage(updatedFiles[0].language);
    }
  }
  
  channelRef.current.send({
    type: 'broadcast',
    event: 'file_deleted',
    payload: {
      fileId: id,
      userId: currentUser.id
    }
  });
  
  saveRoomState(updatedFiles);
};
  const getExtensionForLanguage = (lang: string): string => {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      go: 'go',
      rust: 'rs',
      ruby: 'rb',
      php: 'php'
    };
    return extensions[lang] || 'txt';
  };
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    ui.setIsResizing(true);
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };
  
  const handleResizeMove = (e: MouseEvent) => {
    if (!ui.isResizing) return;
    
    const editorContainer = document.querySelector('.flex-1.flex.flex-col.overflow-hidden.relative');
    if (!editorContainer) return;
    
    const containerRect = editorContainer.getBoundingClientRect();
    
    const distanceFromBottom = containerRect.bottom - e.clientY;
    
    const minTerminalHeight = 100; 
    const maxTerminalHeight = containerRect.height - 150; 
    
    const clampedHeight = Math.min(
      Math.max(distanceFromBottom, minTerminalHeight),
      maxTerminalHeight
    );
    
    console.log("Resize: ", {
      mouseY: e.clientY,
      containerBottom: containerRect.bottom,
      distanceFromBottom,
      clampedHeight
    });
    
    ui.setTerminalHeight(clampedHeight);
  };
  
  const handleResizeEnd = () => {
    console.log("Resize ended");
    ui.setIsResizing(false);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };
  
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);
  return (
    <div className={`flex-1 flex flex-col ${ui.theme.background} transition-colors duration-200`}>
      {/* Hidden file input for opening files */}
      <input
        type="file"
        ref={localFileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileOpenAndSelect}
      />

      {/* Top Bar */}
      <Toolbar
        activeFile={activeFile}
        language={language}
        setLanguage={setLanguage}
        files={files}
        setFiles={setFiles}
        activeFileId={activeFileId}
        connectionStatus={connectionStatus}
        reconnectToServer={reconnect}
        showSettings={ui.showSettings}
        setShowSettings={ui.setShowSettings}
        fontSize={ui.fontSize}
        setFontSize={ui.setFontSize}
        tabSize={ui.tabSize}
        setTabSize={ui.setTabSize}
        handleFormatCode={handleFormatCode}
        handleFileOpen={handleFileOpen}
        downloadFile={handleDownloadFile}
        isRunning={isRunning}
        isWaitingForInput={isWaitingForInput}
        isConnected={isConnected}
        handleStopProcess={stopProcess}
        handleRunCode={handleRunCode}
        darkMode={ui.darkMode}
        setDarkMode={ui.setDarkMode}
        theme={ui.theme}
        sidebarCollapsed={ui.sidebarCollapsed}
        toggleSidebar={ui.toggleSidebar}
        activeUsers={activeUsers}
        currentUserId={currentUser?.id || ''}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File List Sidebar */}
        <div
          className={`${ui.theme.sidebar} ${ui.theme.border} border-r transition-all duration-200 ${ui.sidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-48 opacity-100'
            }`}
        >
          <FileList
  files={files}
  activeFileId={activeFileId}
  editingFileId={editingFileId}
  isCreatingFile={isCreatingFile}
  newFileName={newFileName}
  newFileLanguage={newFileLanguage}
  theme={ui.theme}
  darkMode={ui.darkMode}
  languageIcons={languageIcons}
  setActiveFileId={setActiveFileId}
  setLanguage={setLanguage}
  setEditingFileId={setEditingFileId}
  setIsCreatingFile={setIsCreatingFile}
  setNewFileName={setNewFileName}
  setNewFileLanguage={setNewFileLanguage}
  handleCreateFile={handleCreateFile}
  handleRenameFile={handleRenameFile}
  handleDeleteFile={handleDeleteFile}
  loadRoomState={loadRoomState} 
/>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden relative">
  {/* Code Editor*/}
  <div className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden bg-[#1f2937]">
    <CollaborativeEditor
      height="100%"
      language={activeFile?.language || language}
      value={activeFile?.content || ''}
      theme={ui.darkMode ? 'vs-dark' : 'vs-light'}
      onChange={handleEditorChange}
      onMount={handleEditorDidMount}
      activeFileId={activeFileId}
      options={{
        minimap: { enabled: true },
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: false,
        fontSize: ui.fontSize,
        tabSize: ui.tabSize,
        wordWrap: 'on',
        automaticLayout: true,
      }}
    />
  </div>

  {/* Terminal Component - Position from bottom */}
  <div 
    className="absolute bottom-0 left-0 right-0 z-10"
    style={{ height: `${ui.terminalHeight}px` }}
  >
    {/* Resize Handle - Move to top of terminal */}
    <div 
      className="bg-gray-800 hover:bg-[#be9269] active:bg-[#be9269] h-3 flex items-center justify-center cursor-row-resize"
      onMouseDown={(e) => {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = ui.terminalHeight;
        
        function onMouseMove(moveEvent: MouseEvent) {
          moveEvent.preventDefault();
          const deltaY = startY - moveEvent.clientY;
          const newHeight = Math.max(100, Math.min(600, startHeight + deltaY));
          ui.setTerminalHeight(newHeight);
        }
        
        function onMouseUp() {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        }
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      }}
    >
      <div className="flex space-x-1">
        <div className="w-1 h-1 rounded-full bg-gray-400"></div>
        <div className="w-1 h-1 rounded-full bg-gray-400"></div>
        <div className="w-1 h-1 rounded-full bg-gray-400"></div>
      </div>
    </div>
    
    {/* Terminal itself */}
    <InteractiveTerminal
      output={output}
      isRunning={isRunning}
      isWaitingForInput={isWaitingForInput}
      onSendInput={handleSendInput}
      onStopProcess={stopProcess}
      onClearTerminal={clearTerminal}
      onReconnect={() => handleStatusChange('CLOSED')}
      theme={ui.theme}
      height={ui.terminalHeight - 3} 
      executingUser={executingUser}
    />
  </div>
</div>
      </div>
    </div>
  );
};

export default CodeEditor;