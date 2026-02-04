/**
 * Options Page Script for Prompt Switcher Extension
 * Modern SaaS-style UI with Verify & Save workflow
 */

// DOM Elements
const apiKeyInput = document.getElementById('apiKey');
const modelInput = document.getElementById('model');
const verifyAndSaveBtn = document.getElementById('verifyAndSaveBtn');
const addPromptBtn = document.getElementById('addPromptBtn');
const loadDefaultsBtn = document.getElementById('loadDefaultsBtn');
const savePromptsBtn = document.getElementById('savePromptsBtn');
const clearBtn = document.getElementById('clearBtn');

const promptsTableBody = document.getElementById('promptsTableBody');
const statusIndicator = document.getElementById('statusIndicator');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const configStatus = document.getElementById('configStatus');
const promptsStatus = document.getElementById('promptsStatus');
const saveStatus = document.getElementById('saveStatus');

// State
let nextPromptId = 0;
let prompts = [];
let isConfigured = false;

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
 * Update status indicator
 */
function updateStatusIndicator() {
    if (isConfigured) {
        statusDot.className = 'dot ready';
        statusText.textContent = 'Configuration ready';
    } else {
        statusDot.className = 'dot error';
        statusText.textContent = 'Configuration incomplete';
    }
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
            
            if (config.model) {
                modelInput.value = config.model;
            }
            
            // Check if configuration is complete
            isConfigured = !!(config.apiKey && config.model && config.prompts && config.prompts.length > 0);
            updateStatusIndicator();
            
            if (config.prompts && config.prompts.length > 0) {
                prompts = config.prompts;
                // Find max ID to set nextPromptId
                nextPromptId = Math.max(...prompts.map(p => p.id || 0), -1) + 1;
                renderPromptsTable();
            } else {
                // Load defaults if no prompts
                await loadDefaultPrompts();
            }
        }
    } catch (error) {
        console.error('Error loading config:', error);
        showStatus(configStatus, 'Error loading configuration', 'error');
        isConfigured = false;
        updateStatusIndicator();
    }
}

/**
 * Render prompts table
 */
function renderPromptsTable() {
    promptsTableBody.innerHTML = '';
    
    if (prompts.length === 0) {
        promptsTableBody.innerHTML = `
            <tr class="empty-state-row">
                <td colspan="5" class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-text">No prompts yet. Click "Add Prompt" to get started.</div>
                </td>
            </tr>
        `;
        return;
    }
    
    prompts.forEach((prompt, index) => {
        const row = createPromptRow(prompt, index);
        promptsTableBody.appendChild(row);
    });
}

/**
 * Create a prompt row element
 */
function createPromptRow(prompt, index) {
    const row = document.createElement('tr');
    row.dataset.index = index;
    
    const hasRawRequest = prompt.prompt && prompt.prompt.includes('[RAW_REQUEST]');
    const validationBadge = hasRawRequest 
        ? '<span class="validation-badge valid">✓ Valid</span>'
        : '<span class="validation-badge invalid">✗ Missing [RAW_REQUEST]</span>';
    
    row.innerHTML = `
        <td class="id-cell">${prompt.id}</td>
        <td class="name-cell">
            <input type="text" 
                   class="prompt-name" 
                   value="${escapeHtml(prompt.name || '')}" 
                   placeholder="Prompt name">
        </td>
        <td class="description-cell">
            <input type="text" 
                   class="prompt-description" 
                   value="${escapeHtml(prompt.description || '')}" 
                   placeholder="Brief description">
        </td>
        <td class="instruction-cell">
            <textarea class="prompt-instruction" 
                      placeholder="Instruction with [RAW_REQUEST] placeholder">${escapeHtml(prompt.prompt || '')}</textarea>
            ${validationBadge}
        </td>
        <td class="actions-cell">
            <button class="delete-prompt-btn danger icon-only" data-index="${index}" title="Delete prompt">🗑️</button>
        </td>
    `;
    
    // Add event listeners
    const nameInput = row.querySelector('.prompt-name');
    const descInput = row.querySelector('.prompt-description');
    const instructionTextarea = row.querySelector('.prompt-instruction');
    const deleteBtn = row.querySelector('.delete-prompt-btn');
    
    nameInput.addEventListener('input', (e) => {
        prompts[index].name = e.target.value;
        updateValidationBadge(row);
    });
    
    descInput.addEventListener('input', (e) => {
        prompts[index].description = e.target.value;
    });
    
    instructionTextarea.addEventListener('input', (e) => {
        prompts[index].prompt = e.target.value;
        updateValidationBadge(row);
    });
    
    deleteBtn.addEventListener('click', () => {
        deletePrompt(index);
    });
    
    return row;
}

/**
 * Update validation badge for a row
 */
function updateValidationBadge(row) {
    const index = parseInt(row.dataset.index);
    const prompt = prompts[index];
    const hasRawRequest = prompt.prompt && prompt.prompt.includes('[RAW_REQUEST]');
    
    const badge = row.querySelector('.validation-badge');
    if (badge) {
        badge.className = `validation-badge ${hasRawRequest ? 'valid' : 'invalid'}`;
        badge.textContent = hasRawRequest ? '✓ Valid' : '✗ Missing [RAW_REQUEST]';
    }
}

/**
 * Add a new prompt
 */
function addPrompt() {
    const newPrompt = {
        id: nextPromptId++,
        name: '',
        description: '',
        prompt: ''
    };
    
    prompts.push(newPrompt);
    renderPromptsTable();
    
    // Focus on the name input of the new row
    const rows = promptsTableBody.querySelectorAll('tr:not(.empty-state-row)');
    if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const nameInput = lastRow.querySelector('.prompt-name');
        if (nameInput) {
            nameInput.focus();
        }
    }
}

/**
 * Delete a prompt
 */
function deletePrompt(index) {
    if (confirm('Are you sure you want to delete this prompt?')) {
        prompts.splice(index, 1);
        renderPromptsTable();
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
        prompts = data.prompts || [];
        // Find max ID
        nextPromptId = Math.max(...prompts.map(p => p.id || 0), -1) + 1;
        renderPromptsTable();
        showStatus(promptsStatus, `Loaded ${prompts.length} default prompt(s)`, 'success');
    } catch (error) {
        console.error('Error loading defaults:', error);
        showStatus(promptsStatus, 'Error loading default prompts', 'error');
    }
}

/**
 * Validate prompts before saving
 */
function validatePrompts() {
    if (prompts.length === 0) {
        return { valid: false, error: 'At least one prompt is required' };
    }
    
    const seenIds = new Set();
    
    for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        const index = i + 1;
        
        if (!prompt.name || !prompt.name.trim()) {
            return { valid: false, error: `Prompt #${index} is missing a name` };
        }
        
        if (!prompt.description || !prompt.description.trim()) {
            return { valid: false, error: `Prompt "${prompt.name}" is missing a description` };
        }
        
        if (!prompt.prompt || !prompt.prompt.trim()) {
            return { valid: false, error: `Prompt "${prompt.name}" is missing an instruction` };
        }
        
        if (!prompt.prompt.includes('[RAW_REQUEST]')) {
            return { valid: false, error: `Prompt "${prompt.name}" is missing [RAW_REQUEST] placeholder` };
        }
        
        if (seenIds.has(prompt.id)) {
            return { valid: false, error: `Duplicate prompt ID: ${prompt.id}` };
        }
        seenIds.add(prompt.id);
    }
    
    return { valid: true };
}

/**
 * Verify & Save Configuration (Atomic Operation)
 * This is the main workflow: validate API Key + Model, then save both together
 */
async function verifyAndSave() {
    const apiKey = apiKeyInput.value.trim();
    const model = modelInput.value.trim() || "gpt-4o";
    
    // Basic validation
    if (!apiKey) {
        showStatus(configStatus, 'Please enter an API key', 'error');
        return;
    }
    
    if (!apiKey.startsWith('sk-')) {
        showStatus(configStatus, 'API key should start with "sk-"', 'error');
        return;
    }
    
    if (!model) {
        showStatus(configStatus, 'Please enter a model name', 'error');
        return;
    }
    
    // Set loading state
    verifyAndSaveBtn.disabled = true;
    verifyAndSaveBtn.innerHTML = '<span class="spinner"></span> Verifying connection...';
    showStatus(configStatus, 'Verifying connection to OpenAI API...', 'info');
    
    try {
        // Step 1: Validate by making a test API call
        const validateResponse = await chrome.runtime.sendMessage({
            action: 'VALIDATE_MODEL',
            testApiKey: apiKey,
            testModel: model
        });
        
        if (!validateResponse || !validateResponse.success) {
            // Validation failed - DO NOT SAVE
            verifyAndSaveBtn.disabled = false;
            verifyAndSaveBtn.innerHTML = '✓ Verify & Save Configuration';
            showStatus(configStatus, validateResponse?.error || 'Model validation failed', 'error');
            return;
        }
        
        // Step 2: Validation succeeded - Get current prompts to preserve them
        const currentConfigResponse = await chrome.runtime.sendMessage({ action: 'GET_CONFIG' });
        const currentPrompts = currentConfigResponse?.data?.prompts || prompts;
        
        // Save configuration (preserve existing prompts if we don't have any in UI)
        const promptsToSave = prompts.length > 0 ? prompts : currentPrompts;
        
        const saveResponse = await chrome.runtime.sendMessage({
            action: 'SAVE_CONFIG',
            apiKey: apiKey,
            prompts: promptsToSave || [],
            model: model
        });
        
        if (saveResponse && saveResponse.success) {
            // Success - update UI
            // Reload config to get updated state
            const updatedConfig = await chrome.runtime.sendMessage({ action: 'GET_CONFIG' });
            if (updatedConfig?.success) {
                prompts = updatedConfig.data.prompts || prompts;
                if (prompts.length > 0) {
                    renderPromptsTable();
                }
                isConfigured = !!(updatedConfig.data.apiKey && updatedConfig.data.model && updatedConfig.data.prompts?.length > 0);
            } else {
                isConfigured = true; // At least API key and model are saved
            }
            updateStatusIndicator();
            showStatus(configStatus, `✓ Configuration saved successfully! Model '${model}' is verified and ready.`, 'success');
        } else {
            showStatus(configStatus, saveResponse?.error || 'Failed to save configuration', 'error');
        }
    } catch (error) {
        console.error('Error in verify & save:', error);
        showStatus(configStatus, 'Error: ' + error.message, 'error');
    } finally {
        verifyAndSaveBtn.disabled = false;
        verifyAndSaveBtn.innerHTML = '✓ Verify & Save Configuration';
    }
}

/**
 * Save prompts only
 */
async function savePrompts() {
    // Sync prompts from table inputs
    syncPromptsFromTable();
    
    const validation = validatePrompts();
    if (!validation.valid) {
        showStatus(promptsStatus, validation.error, 'error');
        return;
    }
    
    try {
        // Get current config to preserve API key and model
        const configResponse = await chrome.runtime.sendMessage({ action: 'GET_CONFIG' });
        const currentConfig = configResponse?.data || {};
        
        const response = await chrome.runtime.sendMessage({
            action: 'SAVE_CONFIG',
            apiKey: currentConfig.apiKey || apiKeyInput.value.trim(),
            prompts: prompts,
            model: currentConfig.model || modelInput.value.trim() || "gpt-4o"
        });
        
        if (response && response.success) {
            showStatus(promptsStatus, `Saved ${prompts.length} prompt(s) successfully!`, 'success');
            isConfigured = !!(currentConfig.apiKey && currentConfig.model && prompts.length > 0);
            updateStatusIndicator();
        } else {
            showStatus(promptsStatus, response?.error || 'Failed to save prompts', 'error');
        }
    } catch (error) {
        console.error('Error saving prompts:', error);
        showStatus(promptsStatus, 'Error saving prompts: ' + error.message, 'error');
    }
}

/**
 * Sync prompts data from table inputs
 */
function syncPromptsFromTable() {
    const rows = promptsTableBody.querySelectorAll('tr:not(.empty-state-row)');
    rows.forEach((row, index) => {
        if (prompts[index]) {
            const nameInput = row.querySelector('.prompt-name');
            const descInput = row.querySelector('.prompt-description');
            const instructionTextarea = row.querySelector('.prompt-instruction');
            
            if (nameInput) prompts[index].name = nameInput.value.trim();
            if (descInput) prompts[index].description = descInput.value.trim();
            if (instructionTextarea) prompts[index].prompt = instructionTextarea.value.trim();
        }
    });
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
        modelInput.value = 'gpt-4o';
        prompts = [];
        nextPromptId = 0;
        renderPromptsTable();
        
        await chrome.runtime.sendMessage({ 
            action: 'SAVE_CONFIG', 
            apiKey: '', 
            prompts: [],
            model: 'gpt-4o'
        });
        
        isConfigured = false;
        updateStatusIndicator();
        showStatus(saveStatus, 'Configuration cleared', 'info');
    } catch (error) {
        console.error('Error clearing config:', error);
        showStatus(saveStatus, 'Error clearing configuration', 'error');
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event Listeners
verifyAndSaveBtn.addEventListener('click', verifyAndSave);
addPromptBtn.addEventListener('click', addPrompt);
loadDefaultsBtn.addEventListener('click', loadDefaultPrompts);
savePromptsBtn.addEventListener('click', savePrompts);
clearBtn.addEventListener('click', clearConfig);

// Load configuration on page load
loadConfig();
