/**
 * Background Service Worker for Prompt Switcher Extension
 * Handles message passing between content scripts and manages PromptSwitcher instances
 */

import { PromptSwitcher } from './js-lib/prompt-switcher.js';
import { StorageManager } from './js-lib/storage-manager.js';

// Cache for PromptSwitcher instance
let switcherInstance = null;
let lastConfigHash = null;

/**
 * Get or create PromptSwitcher instance
 * @returns {Promise<PromptSwitcher>}
 */
async function getSwitcherInstance() {
    try {
        const config = await StorageManager.getConfigWithDefaults();
        
        // Check if we need to recreate the instance
        const currentHash = JSON.stringify({ apiKey: config.apiKey, promptsCount: config.prompts?.length });
        if (switcherInstance && lastConfigHash === currentHash) {
            return switcherInstance;
        }
        
        // Validate configuration
        if (!config.apiKey) {
            throw new Error('API key not configured. Please set your OpenAI API key in extension settings.');
        }
        
        if (!config.prompts || config.prompts.length === 0) {
            throw new Error('No prompts available. Please configure prompts in extension settings.');
        }
        
        // Create new instance
        switcherInstance = new PromptSwitcher(config.apiKey, config.prompts);
        lastConfigHash = currentHash;
        
        return switcherInstance;
    } catch (error) {
        console.error('Error creating PromptSwitcher instance:', error);
        throw error;
    }
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle async operations
    (async () => {
        try {
            switch (request.action) {
                case 'GET_AGENTS':
                    // Get list of available agents
                    const switcher = await getSwitcherInstance();
                    const agents = switcher.getAgents();
                    // Return only metadata (id, name, description) for UI
                    sendResponse({
                        success: true,
                        data: agents.map(a => ({
                            id: a.id,
                            name: a.name,
                            description: a.description
                        }))
                    });
                    break;

                case 'OPTIMIZE':
                    // Optimize/transform user text using selected or auto agent
                    const { text, agent_id } = request;
                    
                    if (!text || !text.trim()) {
                        sendResponse({
                            success: false,
                            error: 'Empty text provided'
                        });
                        return;
                    }
                    
                    const switcherForOptimize = await getSwitcherInstance();
                    
                    if (agent_id !== null && agent_id !== undefined) {
                        // Manual selection: use specific agent
                        const agents = switcherForOptimize.getAgents();
                        const targetAgent = agents.find(a => a.id === agent_id);
                        
                        if (!targetAgent) {
                            sendResponse({
                                success: false,
                                error: `Agent with ID ${agent_id} not found`
                            });
                            return;
                        }
                        
                        // Replace [RAW_REQUEST] in template
                        const finalPrompt = targetAgent.promptTemplate.replace('[RAW_REQUEST]', text);
                        sendResponse({
                            success: true,
                            data: { optimized_text: finalPrompt }
                        });
                    } else {
                        // Auto mode: use AI routing
                        const agent = await switcherForOptimize.getAgent(text);
                        sendResponse({
                            success: true,
                            data: { optimized_text: agent.finalPrompt }
                        });
                    }
                    break;

                case 'GET_CONFIG':
                    // Get current configuration
                    const config = await StorageManager.getConfigWithDefaults();
                    sendResponse({
                        success: true,
                        data: config
                    });
                    break;

                case 'SAVE_CONFIG':
                    // Save configuration
                    const { apiKey, prompts } = request;
                    await StorageManager.saveConfig(apiKey, prompts);
                    // Invalidate cached instance
                    switcherInstance = null;
                    lastConfigHash = null;
                    sendResponse({
                        success: true
                    });
                    break;

                default:
                    sendResponse({
                        success: false,
                        error: `Unknown action: ${request.action}`
                    });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({
                success: false,
                error: error.message || 'Unknown error occurred'
            });
        }
    })();
    
    // Return true to indicate we will send a response asynchronously
    return true;
});

// Listen for storage changes to invalidate cache
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && (changes.apiKey || changes.prompts)) {
        switcherInstance = null;
        lastConfigHash = null;
    }
});
