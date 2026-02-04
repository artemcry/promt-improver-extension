/**
 * Content script entry point
 * 
 * IMPORTANT: For ES modules to work in Chrome Extensions content scripts,
 * you may need to either:
 * 1. Use a bundler (webpack, rollup, etc.) to bundle all modules into one file
 * 2. Update manifest.json to load all files in order (but this won't work with import/export)
 * 3. Use this dynamic import approach (may require additional configuration)
 * 
 * For now, this uses dynamic import which should work in modern Chrome.
 */
(async () => {
    try {
        // Use chrome.runtime.getURL for proper extension path resolution
        const scriptUrl = chrome.runtime.getURL('main.js');
        await import(scriptUrl);
    } catch (error) {
        console.error('Failed to load agent-switcher modules:', error);
        console.error('You may need to use a bundler or update your build process.');
    }
})();
