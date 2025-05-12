export const codeTemplates: Record<string, string> = {
    javascript: `// JavaScript Example
  console.log("Hello, World!");
  
  // Function example
  function greet(name) {
    return \`Hello, \${name}!\`;
  }
  
  // Try calling the function
  const result = greet("Coder");
  console.log(result);`,
  
    typescript: `// TypeScript Example
  console.log("Hello, World!");
  
  // Function with type annotations
  function greet(name: string): string {
    return \`Hello, \${name}!\`;
  }
  
  // Try calling the function
  const result: string = greet("Coder");
  console.log(result);`,
  
    python: `# Python Example
  print("Hello, World!")
  
  # Function example
  def greet(name):
      return f"Hello, {name}!"
  
  # Try calling the function
  result = greet("Coder")
  print(result)`,
  
    java: `// Java Example
  public class Main {
      public static void main(String[] args) {
          System.out.println("Hello, World!");
          
          // Call the greeting method
          String result = greet("Coder");
          System.out.println(result);
      }
      
      public static String greet(String name) {
          return "Hello, " + name + "!";
      }
  }`,
  
    c: `// C Example
  #include <stdio.h>
  
  // Function prototype
  char* greet(char* name);
  
  int main() {
      printf("Hello, World!\\n");
      
      // Call the greeting function
      printf("%s\\n", greet("Coder"));
      
      return 0;
  }
  
  // Function implementation
  char* greet(char* name) {
      static char greeting[50];
      sprintf(greeting, "Hello, %s!", name);
      return greeting;
  }`,
  
    cpp: `// C++ Example
  #include <iostream>
  #include <string>
  
  std::string greet(const std::string& name) {
      return "Hello, " + name + "!";
  }
  
  int main() {
      std::cout << "Hello, World!" << std::endl;
      
      // Call the greeting function
      std::string result = greet("Coder");
      std::cout << result << std::endl;
      
      return 0;
  }`,
  
    go: `// Go Example
  package main
  
  import "fmt"
  
  func greet(name string) string {
      return fmt.Sprintf("Hello, %s!", name)
  }
  
  func main() {
      fmt.Println("Hello, World!")
      
      // Call the greeting function
      result := greet("Coder")
      fmt.Println(result)
  }`,
  
    rust: `// Rust Example
  fn greet(name: &str) -> String {
      format!("Hello, {}!", name)
  }
  
  fn main() {
      println!("Hello, World!");
      
      // Call the greeting function
      let result = greet("Coder");
      println!("{}", result);
  }`,
  
    ruby: `# Ruby Example
  puts "Hello, World!"
  
  # Function example
  def greet(name)
    "Hello, #{name}!"
  end
  
  # Try calling the function
  result = greet("Coder")
  puts result`,
  
    php: `<?php
  // PHP Example
  echo "Hello, World!\\n";
  
  // Function example
  function greet($name) {
      return "Hello, $name!";
  }
  
  // Try calling the function
  $result = greet("Coder");
  echo $result;
  ?>`,
  
    // Default template for unknown languages
    default: `// Start coding here...`
  };
  
  // Helper function to get template by language
  export const getTemplateForLanguage = (language: string): string => {
    return codeTemplates[language.toLowerCase()] || codeTemplates.default;
  };