/**
 * Background Service Worker for Prompt Switcher Extension
 * Handles message passing between content scripts and manages PromptSwitcher instances
 */

import { PromptSwitcher } from './js-lib/prompt-switcher.js';
import { StorageManager } from './js-lib/storage-manager.js';

// Cache for PromptSwitcher instance
let switcherInstance = null;
let lastConfigHash = null;

const NO_API_KEY_MESSAGE = 'Для авто-режиму потрібен API ключ. Вкажіть його в налаштуваннях розширення.';

/**
 * Get or create PromptSwitcher instance. Returns null when API key is not set (extension works without key in manual mode).
 * @returns {Promise<PromptSwitcher|null>}
 */
async function getSwitcherInstance() {
    const config = await StorageManager.getConfigWithDefaults();

    if (!config.apiKey || !config.apiKey.trim()) {
        return null;
    }

    try {
        const currentHash = JSON.stringify({ apiKey: config.apiKey, promptsCount: config.prompts?.length, model: config.model });
        if (switcherInstance && lastConfigHash === currentHash) {
            return switcherInstance;
        }

        if (!config.prompts || config.prompts.length === 0) {
            throw new Error('No prompts available. Please configure prompts in extension settings.');
        }

        switcherInstance = new PromptSwitcher(config.apiKey, config.prompts, config.model || "gpt-4o");
        lastConfigHash = currentHash;
        return switcherInstance;
    } catch (error) {
        console.error('Error creating PromptSwitcher instance:', error);
        throw error;
    }
}

/**
 * Get agents list from config (used when API key is not set)
 * @returns {Promise<Array<{id, name, description}>>}
 */
async function getAgentsFromConfig() {
    const config = await StorageManager.getConfigWithDefaults();
    if (!config.prompts || config.prompts.length === 0) {
        throw new Error('No prompts available. Please configure prompts in extension settings.');
    }
    return config.prompts.map(p => ({ id: p.id, name: p.name, description: p.description }));
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle async operations
    (async () => {
        try {
            switch (request.action) {
                case 'GET_AGENTS': {
                    const switcher = await getSwitcherInstance();
                    const agents = switcher
                        ? switcher.getAgents().map(a => ({ id: a.id, name: a.name, description: a.description }))
                        : await getAgentsFromConfig();
                    sendResponse({ success: true, data: agents });
                    break;
                }

                case 'OPTIMIZE': {
                    const { text, agent_id } = request;
                    const normalizedText = (text != null ? String(text) : '').trim();
                    const switcherForOptimize = await getSwitcherInstance();

                    if (agent_id !== null && agent_id !== undefined) {
                        // Manual selection: works without API key
                        const config = await StorageManager.getConfigWithDefaults();
                        if (!config.prompts?.length) {
                            sendResponse({ success: false, error: 'No prompts available. Please configure prompts in extension settings.' });
                            return;
                        }
                        const prompt = config.prompts.find(p => p.id === agent_id);
                        if (!prompt) {
                            sendResponse({ success: false, error: `Agent with ID ${agent_id} not found` });
                            return;
                        }
                        const finalPrompt = (prompt.prompt || '').replace('[RAW_REQUEST]', normalizedText);
                        sendResponse({ success: true, data: { optimized_text: finalPrompt } });
                    } else {
                        // Auto mode: requires API key
                        if (!switcherForOptimize) {
                            sendResponse({ success: false, error: NO_API_KEY_MESSAGE });
                            return;
                        }
                        if (normalizedText === '') {
                            sendResponse({ success: true, data: {} });
                            return;
                        }
                        const agent = await switcherForOptimize.getAgent(normalizedText);
                        sendResponse({ success: true, data: { optimized_text: agent.finalPrompt } });
                    }
                    break;
                }

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
                    const { apiKey, prompts, model } = request;
                    await StorageManager.saveConfig(apiKey, prompts, model || "gpt-4o");
                    // Invalidate cached instance
                    switcherInstance = null;
                    lastConfigHash = null;
                    sendResponse({
                        success: true
                    });
                    break;

                case 'VALIDATE_MODEL':
                    // Validate model by making a test API call
                    const { testApiKey, testModel } = request;
                    if (!testApiKey || !testModel) {
                        sendResponse({
                            success: false,
                            error: 'API key and model are required'
                        });
                        return;
                    }
                    
                    try {
                        // Make a minimal test call to OpenAI
                        const testResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${testApiKey}`
                            },
                            body: JSON.stringify({
                                model: testModel,
                                messages: [
                                    { role: "user", content: "test" }
                                ],
                                max_completion_tokens: 5
                            })
                        });
                        
                        if (!testResponse.ok) {
                            const errorData = await testResponse.json().catch(() => ({}));
                            let errorMessage = `API Error: ${testResponse.status}`;
                            
                            if (testResponse.status === 404) {
                                errorMessage = `Model '${testModel}' does not exist or is not available`;
                            } else if (testResponse.status === 401) {
                                errorMessage = 'Invalid API key';
                            } else if (errorData.error?.message) {
                                errorMessage = errorData.error.message;
                            }
                            
                            sendResponse({
                                success: false,
                                error: errorMessage
                            });
                            return;
                        }
                        
                        sendResponse({
                            success: true,
                            message: `Model '${testModel}' is valid and accessible`
                        });
                    } catch (error) {
                        sendResponse({
                            success: false,
                            error: `Network error: ${error.message}`
                        });
                    }
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
    if (areaName === 'local' && (changes.apiKey || changes.prompts || changes.model)) {
        switcherInstance = null;
        lastConfigHash = null;
    }
});
