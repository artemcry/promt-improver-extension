/**
 * Main entry point - detects platform and initializes the appropriate adapter
 */
import { injectStyles } from './styles.js';
import { state, fetchAgents, createButton, showInputLoading, hideInputLoading, setNativeValue } from './ui.js';
import { ChatGPTAdapter } from './adapters/chatgpt.js';
import { GeminiAdapter } from './adapters/gemini.js';
import { ClaudeAdapter } from './adapters/claude.js';
import { DeepSeekAdapter } from './adapters/deepseek.js';

// Initialize styles
injectStyles();

// Fetch agents on startup
fetchAgents();

// Available adapters
const adapters = [
    new ChatGPTAdapter(),
    new GeminiAdapter(),
    new ClaudeAdapter(),
    new DeepSeekAdapter()
];

/**
 * Get the appropriate adapter for the current hostname
 */
function getAdapter() {
    const hostname = window.location.hostname;
    for (const adapter of adapters) {
        if (adapter.matches(hostname)) {
            return adapter;
        }
    }
    // Default to ChatGPT adapter if no match
    return new ChatGPTAdapter();
}

// Get the adapter for this platform
const adapter = getAdapter();

/**
 * Observation loop - checks for input fields and injects buttons
 */
function observeAndInject() {
    const input = adapter.getInputTarget();
    
    if (input) {
        const container = adapter.getContainer(input);
        
        if (container) {
            // Cleanup duplicate buttons first (especially important for Claude)
            adapter.cleanup(container);
            
            // Inject button if it doesn't exist
            if (!container.querySelector('.ps-agent-selector-btn')) {
                createButton(container, adapter);
            }
        }
    }
}

// Run observation loop every second
setInterval(observeAndInject, 1000);

// Also run immediately
observeAndInject();

/**
 * Keyboard handler for Ctrl+Space prompt optimization
 */
document.addEventListener('keydown', async function(e) {
    if (state.isProcessing) return;
    
    if (e.ctrlKey && e.code === 'Space') {
        let activeEl = document.activeElement;
        const isInput = activeEl.tagName === 'TEXTAREA' || 
                       activeEl.getAttribute('contenteditable') === 'true';
        
        if (!isInput) return;

        e.preventDefault();
        const originalText = (activeEl.value || activeEl.innerText || '').trim();

        state.isProcessing = true;
        showInputLoading(activeEl);

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'OPTIMIZE',
                text: originalText,
                agent_id: state.selectedAgentId
            });
            
            if (!response || !response.success) {
                throw new Error(response?.error || 'Failed to optimize prompt');
            }
            
            if (response.data && response.data.optimized_text) {
                if (activeEl.tagName === 'TEXTAREA') {
                    setNativeValue(activeEl, response.data.optimized_text);
                } else {
                    activeEl.innerText = response.data.optimized_text;
                    activeEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            hideInputLoading(activeEl);
            state.isProcessing = false;
        }
    }
});
