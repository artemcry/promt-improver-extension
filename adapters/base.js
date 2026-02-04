/**
 * Base adapter class - defines the interface all platform adapters must implement
 */
export class BaseAdapter {
    /**
     * Get the input field DOM element for this platform
     * @returns {HTMLElement|null} The input element or null if not found
     */
    getInputTarget() {
        throw new Error('getInputTarget() must be implemented by adapter');
    }

    /**
     * Get the container element where the button should be injected
     * @param {HTMLElement} input - The input element
     * @returns {HTMLElement|null} The container element or null if not found
     */
    getContainer(input) {
        throw new Error('getContainer() must be implemented by adapter');
    }

    /**
     * Cleanup duplicate buttons - removes buttons from inner containers
     * This is especially important for platforms like Claude that have nested structures
     * @param {HTMLElement} container - The main container
     */
    cleanup(container) {
        // Default implementation: remove all buttons except the one in the main container
        const buttons = container.querySelectorAll('.ps-agent-selector-btn');
        if (buttons.length > 1) {
            // Keep only the first one (should be in the main container)
            for (let i = 1; i < buttons.length; i++) {
                buttons[i].remove();
            }
        }
    }

    /**
     * Get the CSS class name for platform-specific styling
     * @returns {string|null} CSS class name or null if no special styling needed
     */
    getCssClass() {
        return null;
    }

    /**
     * Get platform-specific inline position styles
     * @returns {Object|null} Object with CSS properties or null
     */
    getPositionStyles() {
        return null;
    }

    /**
     * Check if this adapter matches the current hostname
     * @param {string} hostname - The current hostname
     * @returns {boolean} True if this adapter should be used
     */
    matches(hostname) {
        throw new Error('matches() must be implemented by adapter');
    }
}
