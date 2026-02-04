/**
 * Gemini adapter - handles Google Gemini specific logic
 */
import { BaseAdapter } from './base.js';

export class GeminiAdapter extends BaseAdapter {
    getInputTarget() {
        // For Gemini, try multiple selectors
        const inputArea = document.querySelector('input-area-v2') || 
                         document.querySelector('[data-ved]') ||
                         document.querySelector('div[contenteditable="true"]')?.closest('div[role="textbox"]')?.parentElement;
        
        if (inputArea) return inputArea;
        
        const editor = document.querySelector('div[contenteditable="true"]');
        return editor ? editor.parentElement : null;
    }

    getContainer(input) {
        if (!input) return null;
        
        let container = input.parentElement;
        
        // Try to find input-area-v2 or related container
        const inputArea = input.closest('input-area-v2') || 
                         input.closest('[data-ved]') ||
                         input.closest('div[role="textbox"]')?.parentElement;
        
        if (inputArea) {
            container = inputArea;
        } else {
            // Fallback: find a container with sufficient height
            if (container.offsetHeight < 40) {
                container = container.parentElement;
            }
        }
        
        return container;
    }

    cleanup(container) {
        // Call parent cleanup
        super.cleanup(container);
        
        // Gemini-specific: remove buttons from nested input areas
        const nestedInputAreas = container.querySelectorAll('input-area-v2, [data-ved]');
        nestedInputAreas.forEach(area => {
            if (area !== container) {
                const buttons = area.querySelectorAll('.ps-agent-selector-btn');
                buttons.forEach(btn => btn.remove());
            }
        });
    }

    getCssClass() {
        return null; // No special CSS class for Gemini
    }

    getPositionStyles() {
        return {
            top: '0',
            right: '40px'
        };
    }

    matches(hostname) {
        return hostname.includes('gemini.google.com');
    }
}
