const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, '../temp');

// Ensure the temporary directory exists
const ensureTempDirExists = () => {
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
};

// Write data to a file
const writeFile = (filePath, data) => {
    fs.writeFileSync(filePath, data, { encoding: 'utf8', flag: 'w' });
};

// Read data from a file
const readFile = (filePath) => {
    return fs.readFileSync(filePath, { encoding: 'utf8' });
};

// Delete a file
const deleteFile = (filePath) => {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

// List files in a directory
const listFilesInDirectory = (directoryPath) => {
    return fs.readdirSync(directoryPath);
};

// Export utility functions
module.exports = {
    ensureTempDirExists,
    writeFile,
    readFile,
    deleteFile,
    listFilesInDirectory
};