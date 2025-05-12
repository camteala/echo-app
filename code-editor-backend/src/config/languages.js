const languageConfig = {
    python: { 
        extension: 'py',
        image: 'python:3.10',
        cmd: ['python', '/code/program.py']
    },
    javascript: { 
        extension: 'js',
        image: 'node:16-alpine',
        cmd: ['node', '/code/program.js']
    },
    java: { 
        extension: 'java',
        image: 'openjdk:11',
        cmd: ['/bin/bash', '-c', 'cd /code && javac *.java && java -cp /code $(grep -o "public class [a-zA-Z0-9_]*" *.java | head -1 | cut -d" " -f3)']
    },
    c: { 
        extension: 'c',
        image: 'gcc:latest',
        cmd: ['/bin/bash', '-c', 'cd /code && gcc -o program program.c && ./program']
    },
    cpp: { 
        extension: 'cpp',
        image: 'gcc:latest',
        cmd: ['/bin/bash', '-c', 'cd /code && g++ -o program program.cpp && ./program']
    },
    go: { 
        extension: 'go',
        image: 'golang:alpine',
        cmd: ['go', 'run', '/code/program.go']
    },
    rust: { 
        extension: 'rs',
        image: 'rust:slim',
        cmd: ['/bin/bash', '-c', 'cd /code && rustc program.rs && ./program']
    },
    ruby: { 
        extension: 'rb',
        image: 'ruby:alpine',
        cmd: ['ruby', '/code/program.rb']
    },
    php: { 
        extension: 'php',
        image: 'php:cli-alpine',
        cmd: ['php', '/code/program.php']
    }
};

module.exports = languageConfig;