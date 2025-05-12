/**
 * Ultimate template duplication fix that forcefully removes multiples
 */
export const fixTemplateContent = (content: string): string => {
  if (!content) return '';

  // List of template markers with their unique identifiers
  const templatePatterns = [
    { marker: "# Python Example", language: "python" },
    { marker: "// JavaScript Example", language: "javascript" },
    { marker: "// TypeScript Example", language: "typescript" },
    { marker: "// Java Example", language: "java" },
    { marker: "// C Example", language: "c" },
    { marker: "// C++ Example", language: "cpp" },
    { marker: "// Go Example", language: "go" },
    { marker: "// Rust Example", language: "rust" },
    { marker: "# Ruby Example", language: "ruby" },
    { marker: "<?php", language: "php" },
  ];
  
  // Check if content has any template markers
  for (const { marker } of templatePatterns) {
    if (content.includes(marker)) {
      // Count occurrences
      const count = (content.match(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      
      if (count > 1) {
        // If multiple markers found, take everything from the first marker occurrence
        // to the next occurrence of the marker or the end
        const parts = content.split(marker);
        return marker + parts[1].split(marker)[0];
      }
    }
  }
  
  return content;
}