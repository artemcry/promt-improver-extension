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
const unsavedChangesBanner = document.getElementById('unsavedChangesBanner');
const validationErrors = document.getElementById('validationErrors');
const validationErrorsList = document.getElementById('validationErrorsList');
const themeToggle = document.getElementById('themeToggle');

// State
let nextPromptId = 0;
let prompts = [];
let isConfigured = false;
let hasUnsavedChanges = false;
let savedApiKey = '';
let savedModel = '';
let savedPrompts = [];

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
 * Check if there are unsaved changes
 */
function checkForUnsavedChanges() {
    const currentApiKey = apiKeyInput.value.trim();
    const currentModel = modelInput.value.trim();
    
    // Sync prompts from table before comparing
    syncPromptsFromTable();
    
    // Compare API key
    if (currentApiKey !== savedApiKey) {
        hasUnsavedChanges = true;
        updateUnsavedChangesBanner();
        return;
    }
    
    // Compare model
    if (currentModel !== savedModel) {
        hasUnsavedChanges = true;
        updateUnsavedChangesBanner();
        return;
    }
    
    // Compare prompts (deep comparison)
    if (JSON.stringify(prompts) !== JSON.stringify(savedPrompts)) {
        hasUnsavedChanges = true;
        updateUnsavedChangesBanner();
        return;
    }
    
    // No changes
    hasUnsavedChanges = false;
    updateUnsavedChangesBanner();
}

/**
 * Update unsaved changes banner visibility
 */
function updateUnsavedChangesBanner() {
    if (hasUnsavedChanges) {
        unsavedChangesBanner.style.display = 'flex';
    } else {
        unsavedChangesBanner.style.display = 'none';
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
                savedApiKey = config.apiKey;
            }
            
            if (config.model) {
                modelInput.value = config.model;
                savedModel = config.model;
            }
            
            // Check if configuration is complete
            isConfigured = !!(config.apiKey && config.model && config.prompts && config.prompts.length > 0);
            updateStatusIndicator();
            
            if (config.prompts && config.prompts.length > 0) {
                prompts = config.prompts;
                savedPrompts = JSON.parse(JSON.stringify(prompts)); // Deep copy
                // Find max ID to set nextPromptId
                nextPromptId = Math.max(...prompts.map(p => p.id || 0), -1) + 1;
                renderPromptsTable();
            } else {
                // Load defaults if no prompts
                await loadDefaultPrompts();
                savedPrompts = JSON.parse(JSON.stringify(prompts)); // Deep copy
            }
            
            // Reset unsaved changes flag after loading
            hasUnsavedChanges = false;
            updateUnsavedChangesBanner();
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
        checkForUnsavedChanges();
    });
    
    descInput.addEventListener('input', (e) => {
        prompts[index].description = e.target.value;
        checkForUnsavedChanges();
    });
    
    instructionTextarea.addEventListener('input', (e) => {
        prompts[index].prompt = e.target.value;
        updateValidationBadge(row);
        checkForUnsavedChanges();
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
    checkForUnsavedChanges();
    
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
        checkForUnsavedChanges();
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
        checkForUnsavedChanges();
    } catch (error) {
        console.error('Error loading defaults:', error);
        showStatus(promptsStatus, 'Error loading default prompts', 'error');
    }
}

/**
 * Validate prompts before saving
 */
function validatePrompts() {
    const errors = [];
    
    if (prompts.length === 0) {
        errors.push('At least one prompt is required');
        return { valid: false, errors: errors };
    }
    
    const seenIds = new Set();
    
    for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        const index = i + 1;
        
        if (!prompt.name || !prompt.name.trim()) {
            errors.push(`Prompt #${index} is missing a name`);
        }
        
        if (!prompt.description || !prompt.description.trim()) {
            errors.push(`Prompt "${prompt.name || '#' + index}" is missing a description`);
        }
        
        if (!prompt.prompt || !prompt.prompt.trim()) {
            errors.push(`Prompt "${prompt.name || '#' + index}" is missing an instruction`);
        }
        
        if (prompt.prompt && !prompt.prompt.includes('[RAW_REQUEST]')) {
            errors.push(`Prompt "${prompt.name || '#' + index}" is missing [RAW_REQUEST] placeholder`);
        }
        
        if (seenIds.has(prompt.id)) {
            errors.push(`Duplicate prompt ID: ${prompt.id}`);
        }
        seenIds.add(prompt.id);
    }
    
    return { valid: errors.length === 0, errors: errors };
}

/**
 * Validate all configuration (API key optional; model, prompts)
 */
function validateAllConfig() {
    const errors = [];
    const apiKey = apiKeyInput.value.trim();
    const model = modelInput.value.trim();
    
    if (apiKey && !apiKey.startsWith('sk-')) {
        errors.push('API key should start with "sk-"');
    }
    
    // Validate model
    if (!model) {
        errors.push('Model name is required');
    }
    
    // Validate prompts
    syncPromptsFromTable();
    const promptsValidation = validatePrompts();
    if (!promptsValidation.valid) {
        errors.push(...promptsValidation.errors);
    }
    
    return { valid: errors.length === 0, errors: errors };
}

/**
 * Show validation errors in the error banner
 */
function showValidationErrors(errors) {
    if (errors && errors.length > 0) {
        validationErrorsList.innerHTML = '';
        errors.forEach(error => {
            const li = document.createElement('li');
            li.textContent = error;
            validationErrorsList.appendChild(li);
        });
        validationErrors.style.display = 'block';
    } else {
        validationErrors.style.display = 'none';
    }
}

/**
 * Clear validation errors
 */
function clearValidationErrors() {
    validationErrors.style.display = 'none';
    validationErrorsList.innerHTML = '';
}

/**
 * Save All Configuration - saves API key, model, and prompts with validation
 */
async function verifyAndSave() {
    // Clear previous validation errors
    clearValidationErrors();
    
    // Sync prompts from table before saving
    syncPromptsFromTable();
    
    const apiKey = apiKeyInput.value.trim();
    const model = modelInput.value.trim() || "gpt-4o";
    
    const validation = validateAllConfig();
    if (!validation.valid) {
        showValidationErrors(validation.errors);
        return;
    }

    verifyAndSaveBtn.disabled = true;
    verifyAndSaveBtn.innerHTML = '<span class="spinner"></span> Verifying & Saving...';

    try {
        if (apiKey) {
            showStatus(configStatus, 'Verifying connection to OpenAI API...', 'info');
            const validateResponse = await chrome.runtime.sendMessage({
                action: 'VALIDATE_MODEL',
                testApiKey: apiKey,
                testModel: model
            });
            if (!validateResponse || !validateResponse.success) {
                verifyAndSaveBtn.disabled = false;
                verifyAndSaveBtn.innerHTML = '💾 Save All Configuration';
                showStatus(configStatus, validateResponse?.error || 'Model validation failed', 'error');
                return;
            }
        } else {
            showStatus(configStatus, 'Saving configuration (manual mode only until API key is set)...', 'info');
        }

        const saveResponse = await chrome.runtime.sendMessage({
            action: 'SAVE_CONFIG',
            apiKey: apiKey,
            prompts: prompts,
            model: model
        });

        if (saveResponse && saveResponse.success) {
            savedApiKey = apiKey;
            savedModel = model;
            savedPrompts = JSON.parse(JSON.stringify(prompts));
            hasUnsavedChanges = false;
            updateUnsavedChangesBanner();
            clearValidationErrors();
            isConfigured = !!(model && prompts.length > 0);
            updateStatusIndicator();
            if (apiKey) {
                showStatus(configStatus, `✓ Configuration saved. Model '${model}' is verified and ready.`, 'success');
            } else {
                showStatus(configStatus, '✓ Configuration saved. Manual mode is available. Set an API key to use auto mode.', 'success');
            }
        } else {
            const errorMsg = saveResponse?.error || 'Failed to save configuration';
            showValidationErrors([errorMsg]);
            showStatus(configStatus, errorMsg, 'error');
        }
    } catch (error) {
        console.error('Error in verify & save:', error);
        showValidationErrors(['Error: ' + error.message]);
        showStatus(configStatus, 'Error: ' + error.message, 'error');
    } finally {
        verifyAndSaveBtn.disabled = false;
        verifyAndSaveBtn.innerHTML = '💾 Save All Configuration';
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
            // Update saved state
            savedPrompts = JSON.parse(JSON.stringify(prompts)); // Deep copy
            checkForUnsavedChanges(); // This will update the banner
            
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
        
        // Update saved state
        savedApiKey = '';
        savedModel = 'gpt-4o';
        savedPrompts = [];
        hasUnsavedChanges = false;
        updateUnsavedChangesBanner();
        
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

/**
 * Initialize theme
 */
function initTheme() {
    // Load theme from localStorage, default to dark
    const savedTheme = localStorage.getItem('optionsTheme') || 'dark';
    const isDark = savedTheme === 'dark';
    
    themeToggle.checked = isDark;
    if (isDark) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

/**
 * Toggle theme
 */
function toggleTheme() {
    const isDark = themeToggle.checked;
    
    if (isDark) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('optionsTheme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('optionsTheme', 'light');
    }
}

// Event Listeners
verifyAndSaveBtn.addEventListener('click', verifyAndSave);
addPromptBtn.addEventListener('click', addPrompt);
loadDefaultsBtn.addEventListener('click', () => {
    loadDefaultPrompts();
    checkForUnsavedChanges();
});
savePromptsBtn.addEventListener('click', () => {
    savePrompts();
    checkForUnsavedChanges();
});
clearBtn.addEventListener('click', clearConfig);
themeToggle.addEventListener('change', toggleTheme);

// Track changes in API key and model inputs
apiKeyInput.addEventListener('input', checkForUnsavedChanges);
modelInput.addEventListener('input', checkForUnsavedChanges);

// Initialize theme on page load
initTheme();

// Load configuration on page load
loadConfig();
