/**
 * StorageManager - Wrapper for chrome.storage.local to manage extension configuration
 */

class StorageManager {
    /**
     * Save configuration (API key and prompts) to chrome.storage
     * @param {string} apiKey - OpenAI API key
     * @param {Array} promptsArray - Array of prompt objects
     * @returns {Promise<void>}
     */
    static async saveConfig(apiKey, promptsArray) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set(
                {
                    apiKey: apiKey,
                    prompts: promptsArray
                },
                () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * Get configuration from chrome.storage
     * @returns {Promise<{apiKey: string|null, prompts: Array|null}>}
     */
    static async getConfig() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(['apiKey', 'prompts'], (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve({
                        apiKey: result.apiKey || null,
                        prompts: result.prompts || null
                    });
                }
            });
        });
    }

    /**
     * Clear all configuration from chrome.storage
     * @returns {Promise<void>}
     */
    static async clearConfig() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.remove(['apiKey', 'prompts'], () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Load default prompts from bundled JSON file
     * @returns {Promise<Array>}
     */
    static async loadDefaultPrompts() {
        try {
            const response = await fetch(chrome.runtime.getURL('js-lib/default_prompts.json'));
            if (!response.ok) {
                throw new Error(`Failed to load default prompts: ${response.status}`);
            }
            const data = await response.json();
            return data.prompts || [];
        } catch (error) {
            console.error('Error loading default prompts:', error);
            return [];
        }
    }

    /**
     * Get configuration with fallback to defaults
     * If no prompts are found in storage, loads default prompts
     * @returns {Promise<{apiKey: string|null, prompts: Array}>}
     */
    static async getConfigWithDefaults() {
        const config = await this.getConfig();
        
        // If no prompts in storage, load defaults
        if (!config.prompts || config.prompts.length === 0) {
            const defaultPrompts = await this.loadDefaultPrompts();
            // Save defaults to storage for future use
            if (defaultPrompts.length > 0) {
                await this.saveConfig(config.apiKey, defaultPrompts);
                return {
                    apiKey: config.apiKey,
                    prompts: defaultPrompts
                };
            }
        }
        
        return config;
    }
}

// Export for module usage
export { StorageManager };
