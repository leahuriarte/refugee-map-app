// crypto-polyfill.js
import crypto from 'crypto';

// This adds the getRandomValues function to the global crypto object if it doesn't exist
if (!crypto.getRandomValues) {
  crypto.getRandomValues = function(arr) {
    return crypto.randomFillSync(arr);
  };
}

// Check if window is defined (browser environment) 
if (typeof window === 'undefined') {
  // For Node.js environment
  global.crypto = crypto;
}

export default crypto;
