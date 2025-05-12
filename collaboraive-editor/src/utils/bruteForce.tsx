
export const bruteForceFixTemplate = (content: string): string => {
    if (!content) return '';
    
    const lines = content.split('\n');
    
    if (lines.length < 5) return content;
    
    const halfLength = Math.floor(lines.length / 2);
    
    const firstHalf = lines.slice(0, halfLength).join('\n');
    const secondHalf = lines.slice(halfLength).join('\n');
    
    if (firstHalf.trim() === secondHalf.trim()) {
      console.log("Found exact duplicate halves - keeping only first half");
      return firstHalf;
    }
    
    const markerLines = [
      "# Python Example",
      "// JavaScript Example",
      "// TypeScript Example", 
      "// Java Example",
      "// C Example",
      "// C++ Example",
      "# Ruby Example"
    ];
    
    for (const marker of markerLines) {
      if (content.includes(marker)) {
        const occurrences = lines.filter(line => line.trim() === marker).length;
        
        if (occurrences > 1) {
          console.log(`Found ${occurrences} occurrences of marker: ${marker}`);
          const parts = content.split(marker);
          if (parts.length > 1) {
            return marker + parts[1].split(marker)[0];
          }
        }
      }
    }
    
    return content;
  }