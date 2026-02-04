/**
 * ChatGPT adapter - handles ChatGPT/OpenAI specific logic
 */
import { BaseAdapter } from './base.js';

export class ChatGPTAdapter extends BaseAdapter {
    getInputTarget() {
        return document.querySelector('#prompt-textarea') || document.querySelector('textarea');
    }

    getContainer(input) {
        if (!input) return null;
        return input.parentElement;
    }

    cleanup(container) {
        // Call parent cleanup
        super.cleanup(container);
        
        // ChatGPT-specific cleanup: remove buttons from nested forms/fieldsets
        const forms = container.querySelectorAll('form, fieldset');
        forms.forEach(form => {
            const buttons = form.querySelectorAll('.ps-agent-selector-btn');
            buttons.forEach(btn => {
                // Only remove if it's not in the main container
                if (!container.contains(btn) || btn.closest('form') !== form) {
                    return;
                }
                // Check if this form is nested inside our main container
                if (form !== container && container.contains(form)) {
                    btn.remove();
                }
            });
        });
    }

    getCssClass() {
        return 'ps-chatgpt-fix';
    }

    getPositionStyles() {
        return null; // Uses CSS class for positioning
    }

    matches(hostname) {
        return hostname.includes('chatgpt') || hostname.includes('openai');
    }
}
