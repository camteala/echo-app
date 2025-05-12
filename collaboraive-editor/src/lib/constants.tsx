import React, { JSX } from 'react';

// Language icons mapping
export const languageIcons: Record<string, JSX.Element> = {
  javascript: <div className="w-3 h-3 rounded-full bg-yellow-400"></div>,
  typescript: <div className="w-3 h-3 rounded-full bg-blue-400"></div>,
  python: <div className="w-3 h-3 rounded-full bg-green-400"></div>,
  java: <div className="w-3 h-3 rounded-full bg-orange-400"></div>,
  c: <div className="w-3 h-3 rounded-full bg-blue-300"></div>,
  cpp: <div className="w-3 h-3 rounded-full bg-blue-500"></div>,
  go: <div className="w-3 h-3 rounded-full bg-cyan-400"></div>,
  rust: <div className="w-3 h-3 rounded-full bg-orange-600"></div>,
  ruby: <div className="w-3 h-3 rounded-full bg-red-500"></div>,
  php: <div className="w-3 h-3 rounded-full bg-purple-400"></div>,
};

// Language file extensions
export const languageExtensions: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  go: 'go',
  rust: 'rs',
  ruby: 'rb',
  php: 'php',
};