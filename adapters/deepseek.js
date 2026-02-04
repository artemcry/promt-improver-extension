/**
 * DeepSeek adapter - handles DeepSeek chat platform specific logic with robust cleanup
 */
import { BaseAdapter } from './base.js';

export class DeepSeekAdapter extends BaseAdapter {
    getInputTarget() {
        // DeepSeek typically uses a textarea, but also check for contenteditable divs
        // Try multiple selectors for robustness
        return document.querySelector('#chat-input') ||
               document.querySelector('textarea[placeholder*="message"], textarea[placeholder*="Message"]') ||
               document.querySelector('textarea') ||
               document.querySelector('div[contenteditable="true"]');
    }

    getContainer(input) {
        if (!input) return null;
        
        let container = input.parentElement;
        
        // DeepSeek-specific: look for common container patterns
        // Try to find a form, footer, or main input wrapper
        const form = input.closest('form');
        const footer = input.closest('footer');
        const mainWrapper = input.closest('[class*="input"], [class*="chat"], [class*="message"]');
        
        // Prefer form > footer > mainWrapper > parent
        if (form) {
            container = form;
        } else if (footer) {
            container = footer;
        } else if (mainWrapper) {
            container = mainWrapper;
        }
        
        // Ensure we have a valid container with sufficient height
        if (container && container.offsetHeight < 40) {
            // Try going up one more level
            if (container.parentElement) {
                container = container.parentElement;
            }
        }
        
        return container;
    }

    cleanup(container) {
        // CRITICAL: DeepSeek-specific cleanup logic (similar to Claude)
        // DeepSeek may have nested structures with forms/fieldsets that can contain duplicate buttons
        
        // First, find the main form/fieldset if it exists
        const mainForm = container.closest('form') || container.closest('fieldset');
        const rootContainer = mainForm || container;
        
        // Remove all buttons from the entire subtree
        const allButtons = rootContainer.querySelectorAll('.ps-agent-selector-btn');
        
        // Keep only the button in the main container (if it exists)
        let keptButton = null;
        for (const btn of allButtons) {
            // Check if this button is directly in our target container
            if (btn.parentElement === container) {
                if (!keptButton) {
                    keptButton = btn;
                } else {
                    // Multiple buttons in main container - remove duplicates
                    btn.remove();
                }
            } else {
                // Button is in a nested container - remove it
                btn.remove();
            }
        }
        
        // Additional cleanup: search for buttons in inner containers
        // DeepSeek may have nested divs that can contain buttons
        const innerContainers = container.querySelectorAll('div[class*="input"], div[class*="chat"], div[class*="message"], form, fieldset');
        innerContainers.forEach(innerContainer => {
            // Skip if this is the container itself
            if (innerContainer === container) return;
            
            // Skip if this is the root form we already processed
            if (innerContainer === mainForm) return;
            
            // Remove buttons from nested containers
            const buttons = innerContainer.querySelectorAll('.ps-agent-selector-btn');
            buttons.forEach(btn => {
                // Only remove if it's not the one we're keeping
                if (btn !== keptButton) {
                    btn.remove();
                }
            });
        });
        
        // Also check for buttons in forms/fieldsets within the container
        const forms = container.querySelectorAll('form, fieldset');
        forms.forEach(form => {
            // Skip if this is the root form we already processed
            if (form === mainForm) return;
            
            const buttons = form.querySelectorAll('.ps-agent-selector-btn');
            buttons.forEach(btn => {
                if (btn !== keptButton) {
                    btn.remove();
                }
            });
        });
    }

    getCssClass() {
        return 'ps-deepseek-fix';
    }

    getPositionStyles() {
        return null; // Uses CSS class for positioning
    }

    matches(hostname) {
        return hostname.includes('deepseek');
    }
}
