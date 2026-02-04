/**
 * Options Page Script for Prompt Switcher Extension
 */

// DOM Elements
const apiKeyInput = document.getElementById('apiKey');
const promptsJsonTextarea = document.getElementById('promptsJson');
const fileInput = document.getElementById('fileInput');
const loadDefaultsBtn = document.getElementById('loadDefaults');
const validateJsonBtn = document.getElementById('validateJson');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');

const apiKeyStatus = document.getElementById('apiKeyStatus');
const promptsStatus = document.getElementById('promptsStatus');
const saveStatus = document.getElementById('saveStatus');
const promptsInfo = document.getElementById('promptsInfo');

/**
 * Show status message
 */
function showStatus(element, message, type = 'info') {
    element.textContent = message;
    element.className = `status ${type}`;
    setTimeout(() => {
        element.className = 'status';
    }, 5000);
}

/**
 * Load configuration from storage
 */
async function loadConfig() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_CONFIG' });
        if (response && response.success) {
            const config = response.data;
            
            if (config.apiKey) {
                apiKeyInput.value = config.apiKey;
            }
            
            if (config.prompts && config.prompts.length > 0) {
                promptsJsonTextarea.value = JSON.stringify({ prompts: config.prompts }, null, 2);
                updatePromptsInfo(config.prompts.length);
            }
        }
    } catch (error) {
        console.error('Error loading config:', error);
        showStatus(apiKeyStatus, 'Error loading configuration', 'error');
    }
}

/**
 * Update prompts info display
 */
function updatePromptsInfo(count) {
    promptsInfo.textContent = `Loaded ${count} prompt${count !== 1 ? 's' : ''}`;
}

/**
 * Validate JSON structure
 */
function validatePromptsJson(jsonText) {
    try {
        const data = JSON.parse(jsonText);
        
        if (!data.prompts || !Array.isArray(data.prompts)) {
            return { valid: false, error: 'JSON must have a "prompts" array' };
        }
        
        if (data.prompts.length === 0) {
            return { valid: false, error: 'Prompts array cannot be empty' };
        }
        
        const seenIds = new Set();
        
        for (let i = 0; i < data.prompts.length; i++) {
            const prompt = data.prompts[i];
            const index = i + 1;
            
            if (!prompt || typeof prompt !== 'object') {
                return { valid: false, error: `Prompt at index ${index} must be an object` };
            }
            
            if (!('id' in prompt) || prompt.id === null || prompt.id === undefined) {
                return { valid: false, error: `Prompt at index ${index} is missing or has invalid 'id'` };
            }
            
            if (seenIds.has(prompt.id)) {
                return { valid: false, error: `Duplicate prompt ID: ${prompt.id}` };
            }
            seenIds.add(prompt.id);
            
            if (!prompt.name || typeof prompt.name !== 'string' || !prompt.name.trim()) {
                return { valid: false, error: `Prompt at index ${index} is missing or has invalid 'name'` };
            }
            
            if (!prompt.description || typeof prompt.description !== 'string' || !prompt.description.trim()) {
                return { valid: false, error: `Prompt at index ${index} is missing or has invalid 'description'` };
            }
            
            if (!prompt.prompt || typeof prompt.prompt !== 'string' || !prompt.prompt.trim()) {
                return { valid: false, error: `Prompt at index ${index} is missing or has invalid 'prompt'` };
            }
            
            if (!prompt.prompt.includes('[RAW_REQUEST]')) {
                return { valid: false, error: `Prompt "${prompt.name}" is missing [RAW_REQUEST] placeholder` };
            }
        }
        
        return { valid: true, prompts: data.prompts };
    } catch (error) {
        return { valid: false, error: `Invalid JSON: ${error.message}` };
    }
}

/**
 * Load default prompts
 */
async function loadDefaultPrompts() {
    try {
        const response = await fetch(chrome.runtime.getURL('js-lib/default_prompts.json'));
        if (!response.ok) {
            throw new Error(`Failed to load: ${response.status}`);
        }
        const data = await response.json();
        promptsJsonTextarea.value = JSON.stringify(data, null, 2);
        updatePromptsInfo(data.prompts.length);
        showStatus(promptsStatus, 'Default prompts loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading defaults:', error);
        showStatus(promptsStatus, 'Error loading default prompts', 'error');
    }
}

/**
 * Save configuration
 */
async function saveConfig() {
    const apiKey = apiKeyInput.value.trim();
    const jsonText = promptsJsonTextarea.value.trim();
    
    // Validate API key
    if (!apiKey) {
        showStatus(apiKeyStatus, 'Please enter an API key', 'error');
        return;
    }
    
    if (!apiKey.startsWith('sk-')) {
        showStatus(apiKeyStatus, 'API key should start with "sk-"', 'error');
        return;
    }
    
    // Validate prompts JSON
    const validation = validatePromptsJson(jsonText);
    if (!validation.valid) {
        showStatus(promptsStatus, validation.error, 'error');
        return;
    }
    
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'SAVE_CONFIG',
            apiKey: apiKey,
            prompts: validation.prompts
        });
        
        if (response && response.success) {
            showStatus(saveStatus, 'Configuration saved successfully!', 'success');
            updatePromptsInfo(validation.prompts.length);
        } else {
            showStatus(saveStatus, response?.error || 'Failed to save configuration', 'error');
        }
    } catch (error) {
        console.error('Error saving config:', error);
        showStatus(saveStatus, 'Error saving configuration: ' + error.message, 'error');
    }
}

/**
 * Clear all configuration
 */
async function clearConfig() {
    if (!confirm('Are you sure you want to clear all configuration? This cannot be undone.')) {
        return;
    }
    
    try {
        apiKeyInput.value = '';
        promptsJsonTextarea.value = '';
        promptsInfo.textContent = '';
        
        // Clear storage via background script
        await chrome.runtime.sendMessage({ action: 'SAVE_CONFIG', apiKey: '', prompts: [] });
        
        showStatus(saveStatus, 'Configuration cleared', 'info');
    } catch (error) {
        console.error('Error clearing config:', error);
        showStatus(saveStatus, 'Error clearing configuration', 'error');
    }
}

// Event Listeners
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const text = event.target.result;
            const validation = validatePromptsJson(text);
            
            if (validation.valid) {
                promptsJsonTextarea.value = JSON.stringify({ prompts: validation.prompts }, null, 2);
                updatePromptsInfo(validation.prompts.length);
                showStatus(promptsStatus, 'File loaded successfully', 'success');
            } else {
                showStatus(promptsStatus, validation.error, 'error');
            }
        } catch (error) {
            showStatus(promptsStatus, 'Error reading file: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
});

loadDefaultsBtn.addEventListener('click', loadDefaultPrompts);

validateJsonBtn.addEventListener('click', () => {
    const jsonText = promptsJsonTextarea.value.trim();
    if (!jsonText) {
        showStatus(promptsStatus, 'Please enter JSON to validate', 'error');
        return;
    }
    
    const validation = validatePromptsJson(jsonText);
    if (validation.valid) {
        showStatus(promptsStatus, `✓ Valid JSON with ${validation.prompts.length} prompt(s)`, 'success');
        updatePromptsInfo(validation.prompts.length);
    } else {
        showStatus(promptsStatus, validation.error, 'error');
    }
});

saveBtn.addEventListener('click', saveConfig);

clearBtn.addEventListener('click', clearConfig);

// Load configuration on page load
loadConfig();
