/**
 * UI module - Shared UI logic for button, menu, overlay, and tooltips
 */

// Global state
export const state = {
    agentsCache: [],
    selectedAgentId: null,
    activeMenu: null,
    activeMenuBtn: null,
    tooltipElement: null,
    currentOverlay: null,
    isProcessing: false
};

/**
 * Fetch agents from background script
 */
export async function fetchAgents() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_AGENTS' });
        if (response && response.success) {
            state.agentsCache = response.data;
        }
    } catch (e) {
        console.warn("Error fetching agents:", e);
    }
}

/**
 * Handle global scroll events
 */
function handleGlobalScroll(e) {
    if (!state.activeMenu) return;
    if (state.activeMenu.contains(e.target)) return;
    closeGlobalMenu();
}

/**
 * Close the global menu
 */
export function closeGlobalMenu() {
    if (state.activeMenu) {
        state.activeMenu.remove();
        state.activeMenu = null;
    }
    if (state.activeMenuBtn) {
        state.activeMenuBtn.classList.remove('ps-active');
        state.activeMenuBtn = null;
    }
    if (state.tooltipElement) {
        state.tooltipElement.remove();
        state.tooltipElement = null;
    }
    window.removeEventListener('click', closeGlobalMenu);
    window.removeEventListener('scroll', handleGlobalScroll, true);
    window.removeEventListener('resize', closeGlobalMenu);
}

/**
 * Open the global menu
 */
export function openGlobalMenu(btnElement) {
    if (state.activeMenu && state.activeMenuBtn === btnElement) {
        closeGlobalMenu();
        return;
    }
    if (state.activeMenu) closeGlobalMenu();

    btnElement.classList.add('ps-active');
    state.activeMenuBtn = btnElement;

    const menu = document.createElement('div');
    menu.className = 'ps-global-menu';
    menu.onclick = (e) => e.stopPropagation();

    const createItem = (id, name, desc) => {
        const item = document.createElement('div');
        item.className = 'ps-menu-item';
        item.innerText = name;
        
        if (desc) {
            item.setAttribute('data-desc', desc);
            item.addEventListener('mouseenter', (e) => {
                const rect = item.getBoundingClientRect();
                state.tooltipElement = document.createElement('div');
                state.tooltipElement.className = 'ps-custom-tooltip';
                state.tooltipElement.textContent = desc;
                document.body.appendChild(state.tooltipElement);
                
                let left = rect.right + 8;
                let top = rect.top;
                
                if (left + 250 > window.innerWidth) {
                    left = rect.left - 250 - 8;
                }
                if (top + state.tooltipElement.offsetHeight > window.innerHeight) {
                    top = window.innerHeight - state.tooltipElement.offsetHeight - 10;
                }
                
                state.tooltipElement.style.left = left + 'px';
                state.tooltipElement.style.top = top + 'px';
            });
            
            item.addEventListener('mouseleave', () => {
                if (state.tooltipElement) {
                    state.tooltipElement.remove();
                    state.tooltipElement = null;
                }
            });
        }
        
        item.onclick = (e) => {
            state.selectedAgentId = id;
            const textElement = btnElement.querySelector('.ps-btn-text');
            if (textElement) {
                textElement.innerText = id === null 
                    ? "Auto" 
                    : name.substring(0, 8) + (name.length > 8 ? ".." : "");
            }
            const iconElement = btnElement.querySelector('.ps-btn-icon');
            if (iconElement) {
                iconElement.innerText = id === null ? "✨" : "⚡";
            }
            closeGlobalMenu();
        };
        
        return item;
    };

    menu.appendChild(createItem(null, "✨ Auto Detect", "AI автоматично обере найкращий промпт."));
    
    if (state.agentsCache.length) {
        state.agentsCache.forEach(a => {
            menu.appendChild(createItem(a.id, a.name, a.description));
        });
    } else {
        const empty = document.createElement('div');
        empty.className = 'ps-menu-item';
        empty.style.fontStyle = 'italic';
        empty.innerText = "No agents loaded";
        menu.appendChild(empty);
    }

    document.body.appendChild(menu);

    const rect = btnElement.getBoundingClientRect();
    menu.style.top = (rect.bottom + 5) + 'px';
    menu.style.left = (rect.right - 220) + 'px';
    
    if (window.innerHeight - rect.bottom < 300) {
        menu.style.top = 'auto';
        menu.style.bottom = (window.innerHeight - rect.top + 5) + 'px';
    }

    requestAnimationFrame(() => menu.classList.add('active'));
    state.activeMenu = menu;

    setTimeout(() => {
        window.addEventListener('click', closeGlobalMenu);
        window.addEventListener('resize', closeGlobalMenu);
        window.addEventListener('scroll', handleGlobalScroll, true);
    }, 50);
}

/**
 * Create and inject the button into a container
 */
export function createButton(container, adapter) {
    if (container.querySelector('.ps-agent-selector-btn')) return null;

    const btn = document.createElement('div');
    btn.className = 'ps-agent-selector-btn';
    
    // Add platform-specific CSS class
    const cssClass = adapter.getCssClass();
    if (cssClass) {
        btn.classList.add(cssClass);
    }

    // Create button structure
    const icon = document.createElement('span');
    icon.className = 'ps-btn-icon';
    icon.textContent = '⚡';
    
    const text = document.createElement('span');
    text.className = 'ps-btn-text';
    text.textContent = 'Auto';
    
    const arrow = document.createElement('span');
    arrow.className = 'ps-btn-arrow';
    arrow.textContent = '▼';
    
    btn.appendChild(icon);
    btn.appendChild(text);
    btn.appendChild(arrow);
    
    btn.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!state.agentsCache.length) await fetchAgents();
        openGlobalMenu(btn);
    };

    // Ensure container has relative positioning
    const computedStyle = getComputedStyle(container);
    if (computedStyle.position === 'static') {
        container.style.position = 'relative';
    }
    
    // Apply platform-specific position styles
    const positionStyles = adapter.getPositionStyles();
    if (positionStyles) {
        Object.assign(btn.style, positionStyles);
    }
    
    container.appendChild(btn);
    return btn;
}

/**
 * Show loading overlay on input field
 */
export function showInputLoading(inputField) {
    const wrapper = inputField.parentElement;
    if (getComputedStyle(wrapper).position === 'static') {
        wrapper.style.position = 'relative';
    }
    
    if (inputField.tagName === 'TEXTAREA') {
        inputField.readOnly = true;
    } else {
        inputField.contentEditable = "false";
    }

    const overlay = document.createElement('div');
    overlay.className = 'ps-input-overlay';
    const modeText = state.selectedAgentId ? 'Manual' : 'Auto';
    overlay.innerHTML = `<div class="ps-spinner"></div><span>Optimizing (${modeText})...</span>`;
    wrapper.appendChild(overlay);
    state.currentOverlay = overlay;
}

/**
 * Hide loading overlay
 */
export function hideInputLoading(inputField) {
    if (inputField.tagName === 'TEXTAREA') {
        inputField.readOnly = false;
    } else {
        inputField.contentEditable = "true";
    }
    if (state.currentOverlay) {
        state.currentOverlay.remove();
        state.currentOverlay = null;
    }
    inputField.focus();
}

/**
 * Set native value for textarea (triggers React/Vue updates)
 */
export function setNativeValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
    if (valueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(element, value);
    } else {
        valueSetter.call(element, value);
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
}
