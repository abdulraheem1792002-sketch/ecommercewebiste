const fs = require('fs');
const path = require('path');

// Data directory path
const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Read JSON data from file
 */
function readData(filename) {
    const filepath = path.join(DATA_DIR, filename);
    try {
        if (!fs.existsSync(filepath)) {
            return [];
        }
        const data = fs.readFileSync(filepath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return [];
    }
}

/**
 * Write JSON data to file
 */
function writeData(filename, data) {
    const filepath = path.join(DATA_DIR, filename);
    try {
        // Ensure data directory exists
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
        return false;
    }
}

/**
 * Generate unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Get current timestamp
 */
function getTimestamp() {
    return new Date().toISOString();
}

module.exports = {
    readData,
    writeData,
    generateId,
    formatCurrency,
    isValidEmail,
    getTimestamp
};
