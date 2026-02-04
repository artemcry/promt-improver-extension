/**
 * Claude adapter - handles Claude.ai specific logic with robust cleanup
 */
import { BaseAdapter } from './base.js';

export class ClaudeAdapter extends BaseAdapter {
    getInputTarget() {
        return document.querySelector('div[contenteditable="true"]');
    }

    getContainer(input) {
        if (!input) return null;
        
        let container = input.parentElement;
        
        // Claude-specific: find the main container with bg-bg-000 or box-content class
        const mainBox = input.closest('.bg-bg-000') || 
                       input.closest('div[class*="box-content"]');
        
        if (mainBox) {
            container = mainBox;
        } else {
            // Fallback: go up 2-3 levels to find the main container
            // Structure: Content -> Wrapper(relative) -> InnerBox -> MainBox
            if (container.parentElement && container.parentElement.parentElement) {
                container = container.parentElement.parentElement;
            }
        }
        
        return container;
    }

    cleanup(container) {
        // CRITICAL: Claude-specific cleanup logic
        // Claude has nested structures with forms/fieldsets that can contain duplicate buttons
        
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
        // Claude often has nested divs that can contain buttons
        const innerContainers = container.querySelectorAll('div[class*="box"], div[class*="bg-"]');
        innerContainers.forEach(innerContainer => {
            // Skip if this is the container itself
            if (innerContainer === container) return;
            
            // Skip if this inner container is not a direct child or close descendant
            // We want to remove buttons from deeply nested containers
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
        return 'ps-claude-fix';
    }

    getPositionStyles() {
        return null; // Uses CSS class for positioning
    }

    matches(hostname) {
        return hostname.includes('claude.ai');
    }
}
