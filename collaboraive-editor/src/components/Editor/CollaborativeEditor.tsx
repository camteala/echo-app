import React, { useRef, useEffect, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { editor as monacoEditor } from 'monaco-editor';
import { useUser } from '../../context/UserContext';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { debounce } from 'lodash';


interface CollaborativeEditorProps {
    language: string;
    value: string;
    theme: string;
    height: string;
    onChange: (value: string | undefined) => void;
    onMount?: OnMount;
    activeFileId: number | null;
    options?: monacoEditor.IStandaloneEditorConstructionOptions;
}

const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
    language,
    value,
    theme,
    height,
    onChange,
    onMount,
    activeFileId,
    options
}) => {
    const {
        currentUser,
        activeUsers,
        typingUsers,
        setUserTyping
    } = useUser();

    const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
    const decorationsRef = useRef<string[]>([]);
    const lastTypingTimestampRef = useRef<number>(0);
    const monacoBindingRef = useRef<MonacoBinding | null>(null);
    const docRef = useRef<Y.Doc | null>(null);
    const providerRef = useRef<WebsocketProvider | null>(null);
    const isInitialSetRef = useRef<boolean>(true);
    const [isConnected, setIsConnected] = useState(false);
    const initialValueRef = useRef<string>(value || '');

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // Set up the Yjs document and provider
        if (activeFileId) {
            setupYjs(editor, monaco);
        }

        // Track typing events for typing indicator
        editor.onKeyDown(e => {
            if (activeFileId === null) return;

            const now = Date.now();

            if (now - lastTypingTimestampRef.current > 1000) {
                setUserTyping(true);

                if (providerRef.current && isConnected) {
                    const awareness = providerRef.current.awareness;
                    const currentState = awareness.getLocalState() || {};

                    awareness.setLocalState({
                        ...currentState,
                        typing: true
                    });

                    setTimeout(() => {
                        const updatedState = awareness.getLocalState() || {};
                        awareness.setLocalState({
                            ...updatedState,
                            typing: false
                        });
                        setUserTyping(false);
                    }, 2000);
                }
            }
            lastTypingTimestampRef.current = now;
        });

        if (onMount) {
            onMount(editor, monaco);
        }
    };

    //Yjs document and provider
    const setupYjs = (editor: monacoEditor.IStandaloneCodeEditor, monaco: any) => {
        if (!activeFileId) return;

        cleanupYjs();

        const doc = new Y.Doc();
        docRef.current = doc;

        const yText = doc.getText('monaco');

        const SERVER_PORT = 5000; 
        const wsProvider = new WebsocketProvider(
            `ws://${window.location.hostname}:${SERVER_PORT}`, 
            `file-${activeFileId}`,
            doc,
            { connect: true }
        );
        providerRef.current = wsProvider;

        wsProvider.awareness.setLocalState({
            user: {
                id: currentUser.id,
                name: currentUser.name,
                color: currentUser.color || '#' + Math.floor(Math.random() * 16777215).toString(16)
            },
            cursor: null,
            selection: null,
            typing: false
        });

        wsProvider.on('status', (event: { status: string }) => {
            setIsConnected(event.status === 'connected');
        });

        // Create Monaco binding
        const binding = new MonacoBinding(
            yText,
            editor.getModel()!,
            new Set([editor]),
            wsProvider.awareness
        );
        monacoBindingRef.current = binding;

 let syncCompleted = false;
 wsProvider.on('sync', (isSynced: boolean) => {
     if (isSynced && !syncCompleted) {
         syncCompleted = true;
         
         // Check if content already exists in the document from other users
         const currentContent = yText.toString();

         if (currentContent === '' && initialValueRef.current && 
             initialValueRef.current !== "// Start typing" && 
             initialValueRef.current !== "// Start coding here...") {
             
             doc.transact(() => {
                 yText.insert(0, initialValueRef.current);
             });
         }
         
         // Mark initial set as complete
         isInitialSetRef.current = false;
     }
 });

        let hasInitialContent = false;
        wsProvider.on('sync', (isSynced: boolean) => {
            if (isSynced) {
                // Check if content already exists in the document
                const currentContent = yText.toString();
                hasInitialContent = currentContent.length > 0;
                
                // Only set initial value if document is really empty and we have content to set
                if (!hasInitialContent && isInitialSetRef.current && initialValueRef.current && 
                    initialValueRef.current !== "// Start typing") {
                    // Apply transaction to avoid broadcasting initial value as an edit
                    doc.transact(() => {
                        yText.insert(0, initialValueRef.current);
                    });
                }
                
                // Mark initial set as complete
                isInitialSetRef.current = false;
            }
        });

        // Listen for changes to update parent component
        yText.observe(debounce(() => {
            const newContent = yText.toString();
            // Only call onChange if the content is not the default placeholder
            if (onChange && 
                newContent !== "// Start typing" && 
                newContent !== "// Start coding here..." && 
                newContent !== '') {
                onChange(newContent);
            }
        }, 50));
        
        setupAwarenessHandling(wsProvider, editor, monaco);
    };

    const setupAwarenessHandling = (
        provider: WebsocketProvider,
        editor: monacoEditor.IStandaloneCodeEditor,
        monaco: any
    ) => {
        const awareness = provider.awareness;
    
        const updateDecorations = debounce(() => {
            if (!editor || !monaco) return;
    
            const states = awareness.getStates();
            const newDecorations: monacoEditor.IModelDeltaDecoration[] = [];
    
            states.forEach((state, clientId) => {
                if (clientId === awareness.clientID) return;
                if (!state.user) return;
    
                const { user, cursor, selection, typing } = state;
    
                ensureUserStyles(user);

                if (selection) {
                    try {
                        newDecorations.push({
                            range: new monaco.Range(
                                selection.startLineNumber,
                                selection.startColumn,
                                selection.endLineNumber,
                                selection.endColumn
                            ),
                            options: {
                                className: 'remote-selection',
                                inlineClassName: `remote-selection-${user.id}`,
                                hoverMessage: { value: `Selection by ${user.name.split('@')[0]}` }
                            }
                        });
                    } catch (e) {
                        console.error("Failed to create selection decoration", e);
                    }
                }

                if (cursor) {
                    try {
                        const name = user.name.split('@')[0];
    
                        newDecorations.push({
                            range: new monaco.Range(
                                cursor.lineNumber,
                                cursor.column,
                                cursor.lineNumber,
                                cursor.column
                            ),
                            options: {
                                className: `cursor-${user.id}`,
                                isWholeLine: false,
                                beforeContentClassName: `cursor-${user.id}`,
                                hoverMessage: { value: `${name}'s cursor` },
                                after: {
                                    content: `${name}${typing === true ? ' (typing...)' : ''}`,
                                    inlineClassName: `cursor-flag-${user.id}`
                                }
                            }
                        });
                    } catch (e) {
                        console.error("Failed to create cursor decoration", e);
                    }
                }
            });
    
            if (editor && editor.getModel()) {
                try {
                    decorationsRef.current = editor.deltaDecorations(
                        decorationsRef.current,
                        newDecorations
                    );
                } catch (e) {
                    console.error("Failed to apply decorations", e);
                }
            }
        }, 50);

        awareness.on('change', updateDecorations);

        editor.onDidChangeCursorPosition(debounce(e => {
            if (e.source === 'api') return;

            const currentState = awareness.getLocalState() || {};
            const position = e.position;

            awareness.setLocalState({
                ...currentState,
                cursor: {
                    lineNumber: position.lineNumber,
                    column: position.column
                }
            });
        }, 50));

        editor.onDidChangeCursorSelection(debounce(e => {
            if (e.source === 'api') return;

            const currentState = awareness.getLocalState() || {};
            const selection = e.selection;

            if (selection) {
                awareness.setLocalState({
                    ...currentState,
                    selection: {
                        startLineNumber: selection.startLineNumber,
                        startColumn: selection.startColumn,
                        endLineNumber: selection.endLineNumber,
                        endColumn: selection.endColumn
                    }
                });
            }
        }, 50));

        updateDecorations();
    };

    const ensureUserStyles = (user: { id: string, name: string, color: string }) => {
        const styleId = `selection-style-${user.id}`;
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                .remote-selection-${user.id} {
                  background-color: ${user.color}40 !important;
                  border: 1px solid ${user.color} !important;
                }
                .cursor-${user.id} {
                  background-color: ${user.color} !important;
                  width: 2px !important;
                }
                .cursor-flag-${user.id} {
                  background-color: ${user.color} !important;
                  color: white !important;
                  padding: 2px 4px !important;
                  border-radius: 2px !important;
                  font-size: 12px !important;
                }
            `;
            document.head.appendChild(style);
        }
    };

    // Clean up Yjs connections
    const cleanupYjs = () => {
        if (monacoBindingRef.current) {
            monacoBindingRef.current.destroy();
            monacoBindingRef.current = null;
        }

        if (providerRef.current) {
            providerRef.current.disconnect();
            providerRef.current = null;
        }

        if (docRef.current) {
            docRef.current.destroy();
            docRef.current = null;
        }
    };

    // Set up Yjs when the file ID changes
    useEffect(() => {
        if (editorRef.current && activeFileId) {
            const monaco = (window as any).monaco;
            if (monaco) {
                setupYjs(editorRef.current, monaco);
            }
        }

        return () => {
            cleanupYjs();
        };
    }, [activeFileId]);

    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
          .monaco-editor,
          .monaco-editor-background,
          .monaco-editor .margin,
          .monaco-editor .minimap,
          .monaco-editor .minimap-slider,
          .monaco-editor-background,
          .monaco-editor .scrollbar {
            background-color: #111827 !important;
          }
          
          /* Target minimap specifically */
          .monaco-editor .minimap-shadow {
            display: none;
          }
          
          
          
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    useEffect(() => {
        return () => {
            cleanupYjs();
        };
    }, []);

    useEffect(() => {
        initialValueRef.current = value || '';

        // If Yjs is not set up yet, we'll use this value when initializing
        if (!docRef.current && editorRef.current && value !== undefined) {
            editorRef.current.setValue(value);
        }
    }, [value]);

    return (
        <div className="collaborative-editor">
            {!isConnected && (
                <div className="connection-status bg-yellow-100 p-2 text-yellow-800 rounded">
                    Reconnecting to collaboration server...
                </div>
            )}
            <Editor
                height="380px"
                language={language}
                value={isInitialSetRef.current && initialValueRef.current && 
                    initialValueRef.current !== "// Start typing" && 
                    initialValueRef.current !== "// Start coding here..." ? 
                    initialValueRef.current : undefined}                theme={theme}
                onMount={handleEditorDidMount}
                options={{
                    minimap: { enabled: true },
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    readOnly: false,
                    wordWrap: 'on',
                    automaticLayout: true,
                    renderWhitespace: 'selection',
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    ...options
                }}
            />
        </div>
    );
};

export default CollaborativeEditor;