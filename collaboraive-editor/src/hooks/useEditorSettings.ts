import { useState } from 'react';

const useEditorSettings = () => {
  const [fontSize, setFontSize] = useState<number>(14);
  const [tabSize, setTabSize] = useState<number>(2);

  return {
    fontSize,
    setFontSize,
    tabSize,
    setTabSize,
  };
};

export default useEditorSettings;