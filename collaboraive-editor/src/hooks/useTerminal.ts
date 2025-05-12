import { useState, useRef } from 'react';

const useTerminal = () => {
  const [output, setOutput] = useState<string>('');
  const [currentInput, setCurrentInput] = useState<string>('');
  const [isWaitingForInput, setIsWaitingForInput] = useState<boolean>(false);
  const outputRef = useRef<HTMLPreElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentInput(e.target.value);
  };

  const sendInput = () => {
    if (currentInput.trim()) {
      setOutput((prev) => prev + `\n> ${currentInput}\n`);
      setCurrentInput('');
      setIsWaitingForInput(false);
    }
  };

  return {
    output,
    setOutput,
    currentInput,
    isWaitingForInput,
    outputRef,
    handleInputChange,
    sendInput,
  };
};

export default useTerminal;