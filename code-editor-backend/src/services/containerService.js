/**
 * Container Service
 * Manages Docker containers for code execution
 */
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const languageConfig = require('../config/languages');

/**
 * Extract Java class name from code
 * @param {string} code - Java source code
 * @returns {string} - Class name or 'Main' as fallback
 */
const extractJavaClassName = (code) => {
    // Regular expression to find the class name
    const classMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
    if (classMatch && classMatch[1]) {
        return classMatch[1];
    }
    return 'Main'; // Default fallback
};

/**
 * Execute code in a Docker container
 * @param {string} sessionId - Session ID
 * @param {string} sessionPath - Path to session files
 * @param {string} language - Programming language
 * @param {string} code - Code to execute
 * @param {function} outputCallback - Callback for output
 * @returns {Object} - Container information
 * 
 */
const executeInContainer = (sessionId, sessionPath, language, code, outputCallback) => {
    const config = languageConfig[language];
    if (!config) {
        outputCallback('Language not supported.\r\n');
        return null;
    }

    // Create the file
    let filename;
    if (language === 'java') {
        // For Java, use the class name as the filename
        const className = extractJavaClassName(code);
        filename = `${className}.${config.extension}`;
    } else {
        // For other languages, use the generic filename
        filename = `program.${config.extension}`;
    } 
    
    const filePath = path.join(sessionPath, filename);

    try {
        fs.writeFileSync(filePath, code);
        console.log(`Created file: ${filePath}`);

        const containerId = `code-session-${sessionId}`;

        // Adjust command for Java to use the correct class name
        let dockerCmd = [...config.cmd];
        if (language === 'java') {
            const className = extractJavaClassName(code);
            // Replace 'Main' with the actual class name in the command
            dockerCmd = dockerCmd.map(cmd => cmd.replace('Main', className));
        }

        // Create and run Docker container
        const dockerRun = spawn('docker', [
            'run',
            '--name', containerId,
            '-i',  // Interactive mode
            '--rm', // Remove container when done
            '-v', `${sessionPath}:/code`,
            config.image,
            ...dockerCmd
        ]);

        // Handle container output
        dockerRun.stdout.on('data', (data) => {
            const output = data.toString();
            outputCallback(output);

            // Check if waiting for input
            if (output.includes('input') || output.endsWith(':') || output.endsWith('? ')) {
                outputCallback(null, true); // Signal waiting for input
            }
        });

        dockerRun.stderr.on('data', (data) => {
            outputCallback(data.toString());
        });

        // Handle process completion
        dockerRun.on('exit', (code) => {
            outputCallback(`\r\nProcess exited with code ${code}\r\n`, false, true);
            // No need to manually stop container with --rm flag
        });

        dockerRun.on('error', (error) => {
            console.error('Docker run error:', error);
            outputCallback(`Error: ${error.message}\r\n`, false, true);
        });

        outputCallback(`Running ${language} code...\r\n`);

        return {
            containerId,
            process: dockerRun
        };
    } catch (error) {
        console.error('Error executing code:', error);
        outputCallback(`Server error: ${error.message}\r\n`, false, true);
        return null;
    }
};

/**
 * Send input to a running container
 * @param {Object} containerProcess - Container process object
 * @param {string} input - Input to send
 * @returns {boolean} - Whether input was sent successfully
 */
const sendInput = (containerProcess, input) => {
    if (containerProcess && containerProcess.stdin) {
        try {
            // Make sure the input ends with a newline
            const formattedInput = input.endsWith('\n') ? input : input + '\n';

            // Set encoding to ensure proper character handling
            containerProcess.stdin.setEncoding('utf-8');

            // Write to stdin
            containerProcess.stdin.write(formattedInput);

            console.log('Input sent to container:', input);
            return true;
        } catch (error) {
            console.error('Error sending input to container:', error);
            return false;
        }
    } else {
        console.error('No valid container process or stdin stream');
        return false;
    }
};

/**
 * Stop and remove a container
 * @param {string} containerId - Container ID to stop
 */
const stopContainer = (containerId) => {
    // First check if container exists
    exec(`docker container inspect ${containerId} 2>/dev/null`, (error, stdout) => {
        if (error) {
            // Container doesn't exist, nothing to do
            console.log(`Container ${containerId} does not exist or is already removed`);
            return;
        }

        // Container exists, stop it
        exec(`docker stop ${containerId} && docker rm ${containerId}`, (error) => {
            if (error) {
                console.error(`Error cleaning up container: ${error}`);
            } else {
                console.log(`Container ${containerId} stopped and removed`);
            }

            // With --rm flag, container should be removed automatically
            // but we can check and remove it explicitly to be sure
            exec(`docker container inspect ${containerId} 2>/dev/null`, (inspectError) => {
                if (!inspectError) {
                    exec(`docker rm ${containerId}`, (rmError) => {
                        if (rmError) {
                            console.error(`Error removing container: ${rmError}`);
                        }
                    });
                }
            });
        });
    });
};

module.exports = {
    executeInContainer,
    sendInput,
    stopContainer
};