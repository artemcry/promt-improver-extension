// --- 1. Global Styles ---
// --- 1. Global Styles ---
// --- 1. Global Styles ---
// --- 1. Global Styles ---
// --- 1. Global Styles ---
const style = document.createElement('style');
style.textContent = `
    /* Overlay (Loading) */
    .ps-input-overlay {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(30, 30, 30, 0.75); backdrop-filter: blur(2px);
        z-index: 10000; display: flex; align-items: center; justify-content: center;
        border-radius: inherit; color: #e5e7eb; font-family: sans-serif;
        font-size: 14px; gap: 10px; cursor: wait;
    }
    .ps-spinner {
        width: 18px; height: 18px; border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%; border-top-color: #fff; animation: ps-spin 0.8s linear infinite;
    }
    @keyframes ps-spin { to { transform: rotate(360deg); } }

    /* --- Button Main --- */
    .ps-agent-selector-btn {
        position: absolute; top: 0; right: 8px; z-index: 900; 
        cursor: pointer; font-family: sans-serif; user-select: none;
        display: flex; align-items: center; gap: 6px;
        overflow: visible; 
        
        /* Default State */
        width: 60px; height: 4px; min-width: 60px; max-width: 60px;
        background: rgba(99, 102, 241, 0.6);
        border-radius: 0 0 4px 4px;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        padding: 0; border: none;
        will-change: width, height, top, background-color;
        transition: all 0.2s ease-out;
    }
    
    .ps-agent-selector-btn:hover::after,
    .ps-agent-selector-btn.ps-active::after {
        content: ''; position: absolute; top: -20px; left: 0;
        width: 100%; height: 50px; background: transparent; z-index: -1;
    }

    /* Items defaults */
    .ps-agent-selector-btn .ps-btn-icon,
    .ps-agent-selector-btn .ps-btn-arrow {
        position: relative; opacity: 0; visibility: hidden; pointer-events: none;
        flex-shrink: 0; transition: opacity 0.15s ease 0.05s, visibility 0s ease 0.2s;
    }

    .ps-agent-selector-btn .ps-btn-text {
        font-size: 11px; white-space: nowrap; color: #e0e0e0; 
        overflow: hidden; text-overflow: ellipsis;
        max-width: 0; opacity: 0; margin: 0;
        transition: max-width 0.2s ease-out, opacity 0.15s ease 0.05s;
    }
    
    /* --- EXPANDED STATE --- */
    .ps-agent-selector-btn:hover,
    .ps-agent-selector-btn.ps-active {
        width: auto; min-width: 80px; max-width: 200px; height: 32px;
        background: rgba(40, 40, 40, 0.95); border: 1px solid #555;
        padding: 6px 10px; border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        top: 8px; right: 8px; z-index: 2147483647;
    }

    /* --- CHATGPT FIX --- */
    .ps-agent-selector-btn.ps-chatgpt-fix { top: 0px !important; right: 12px !important; }
    .ps-agent-selector-btn.ps-chatgpt-fix:hover, .ps-agent-selector-btn.ps-chatgpt-fix.ps-active {
        top: 2px !important; height: 38px !important; padding-top: 8px; 
    }

    /* --- CLAUDE FIX (ОНОВЛЕНО) --- */
    .ps-agent-selector-btn.ps-claude-fix {
        right: 12px !important; 
        top: 0px !important;
    }
    
    /* Додаємо height і padding, як у GPT, щоб кнопка була масивною */
    .ps-agent-selector-btn.ps-claude-fix:hover,
    .ps-agent-selector-btn.ps-claude-fix.ps-active {
        top: 2px !important; /* Трохи відступаємо від верху */
        height: 38px !important; /* Збільшена висота */
        padding-top: 8px; /* Центрування */
    }

    /* Expanded Content Logic */
    .ps-agent-selector-btn:hover .ps-btn-icon, .ps-agent-selector-btn.ps-active .ps-btn-icon,
    .ps-agent-selector-btn:hover .ps-btn-arrow, .ps-agent-selector-btn.ps-active .ps-btn-arrow {
        opacity: 1; visibility: visible; pointer-events: auto;
        transition: opacity 0.15s ease 0.05s, visibility 0s ease;
    }
    
    .ps-agent-selector-btn:hover .ps-btn-text, .ps-agent-selector-btn.ps-active .ps-btn-text {
        opacity: 1; max-width: 140px; margin-left: 2px;
        transition: max-width 0.2s ease-out, opacity 0.15s ease 0.1s;
    }
    
    .ps-agent-selector-btn:hover .ps-btn-arrow, .ps-agent-selector-btn.ps-active .ps-btn-arrow { transform: rotate(180deg); }
    .ps-agent-selector-btn .ps-btn-icon { width: 16px; height: 16px; font-size: 12px; display: flex; align-items: center; justify-content: center; }
    .ps-agent-selector-btn .ps-btn-arrow { font-size: 8px; opacity: 0.7; color: #e0e0e0; width: 8px; height: 8px; display: flex; align-items: center; justify-content: center; transition: transform 0.15s ease; }
    .ps-agent-selector-btn * { box-sizing: border-box; margin: 0; }
    
    /* Global Menu styles */
    .ps-global-menu { position: fixed; background: #1e1e1e; border: 1px solid #444; border-radius: 6px; width: 220px; max-height: 400px; overflow-y: auto; overflow-x: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6); z-index: 2147483647; font-family: sans-serif; opacity: 0; transform: translateY(-5px); transition: opacity 0.1s, transform 0.1s; }
    .ps-global-menu.active { opacity: 1; transform: translateY(0); }
    .ps-global-menu::-webkit-scrollbar { width: 6px; }
    .ps-global-menu::-webkit-scrollbar-track { background: #222; }
    .ps-global-menu::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }
    .ps-menu-item { padding: 10px 12px; font-size: 13px; color: #ddd; border-bottom: 1px solid #333; cursor: pointer; display: flex; justify-content: space-between; }
    .ps-menu-item:hover { background: #007bff; color: white; }
    .ps-custom-tooltip { position: fixed; width: 250px; background: #252525; color: #ccc; border: 1px solid #555; padding: 10px 12px; border-radius: 6px; font-size: 12px; z-index: 2147483647; pointer-events: none; }
`;
document.head.appendChild(style);

// --- 2. State ---
let agentsCache = [];
let selectedAgentId = null;
let activeMenu = null;
let activeMenuBtn = null; 
let tooltipElement = null;

// --- 3. Data Fetching ---
async function fetchAgents() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_AGENTS' });
        if (response && response.success) {
            agentsCache = response.data;
        }
    } catch (e) { console.warn("Error fetching agents:", e); }
}
fetchAgents();

// --- 4. Global Menu Logic ---
function handleGlobalScroll(e) {
    if (!activeMenu) return;
    if (activeMenu.contains(e.target)) return;
    closeGlobalMenu();
}

function closeGlobalMenu() {
    if (activeMenu) {
        activeMenu.remove();
        activeMenu = null;
    }
    if (activeMenuBtn) {
        activeMenuBtn.classList.remove('ps-active');
        activeMenuBtn = null;
    }
    if (tooltipElement) {
        tooltipElement.remove();
        tooltipElement = null;
    }
    window.removeEventListener('click', closeGlobalMenu);
    window.removeEventListener('scroll', handleGlobalScroll, true);
    window.removeEventListener('resize', closeGlobalMenu);
}

function openGlobalMenu(btnElement) {
    if (activeMenu && activeMenuBtn === btnElement) { closeGlobalMenu(); return; }
    if (activeMenu) closeGlobalMenu();

    btnElement.classList.add('ps-active');
    activeMenuBtn = btnElement;

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
                tooltipElement = document.createElement('div');
                tooltipElement.className = 'ps-custom-tooltip';
                tooltipElement.textContent = desc;
                document.body.appendChild(tooltipElement);
                let left = rect.right + 8;
                let top = rect.top;
                if (left + 250 > window.innerWidth) left = rect.left - 250 - 8;
                if (top + tooltipElement.offsetHeight > window.innerHeight) top = window.innerHeight - tooltipElement.offsetHeight - 10;
                tooltipElement.style.left = left + 'px';
                tooltipElement.style.top = top + 'px';
            });
            item.addEventListener('mouseleave', () => {
                if (tooltipElement) { tooltipElement.remove(); tooltipElement = null; }
            });
        }
        item.onclick = (e) => {
            selectedAgentId = id;
            const textElement = btnElement.querySelector('.ps-btn-text');
            if (textElement) textElement.innerText = id === null ? "Auto" : name.substring(0, 8) + (name.length > 8 ? ".." : "");
            const iconElement = btnElement.querySelector('.ps-btn-icon');
            if (iconElement) iconElement.innerText = id === null ? "✨" : "⚡";
            closeGlobalMenu(); 
        };
        return item;
    };

    menu.appendChild(createItem(null, "✨ Auto Detect", "AI автоматично обере найкращий промпт."));
    if (agentsCache.length) {
        agentsCache.forEach(a => menu.appendChild(createItem(a.id, a.name, a.description)));
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
    activeMenu = menu;

    setTimeout(() => {
        window.addEventListener('click', closeGlobalMenu);
        window.addEventListener('resize', closeGlobalMenu);
        window.addEventListener('scroll', handleGlobalScroll, true); 
    }, 50);
}

// --- 5. Injection Logic ---
// --- 5. Injection Logic ---
function injectButton(wrapper) {
    if (wrapper.querySelector('.ps-agent-selector-btn')) return;

    const btn = document.createElement('div');
    btn.className = 'ps-agent-selector-btn';
    
    const host = window.location.hostname;
    
    // Check for ChatGPT
    if (host.includes('chatgpt') || host.includes('openai')) {
        btn.classList.add('ps-chatgpt-fix');
    }
    // Check for Claude
    else if (host.includes('claude')) {
        btn.classList.add('ps-claude-fix');
    }

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
        if (!agentsCache.length) await fetchAgents();
        openGlobalMenu(btn);
    };

    // Важливо: перевіряємо, чи позиція контейнера підходить для absolute children
    const computedStyle = getComputedStyle(wrapper);
    if (computedStyle.position === 'static') {
        wrapper.style.position = 'relative';
    }
    
    // Gemini override
    if (host.includes('gemini.google.com')) {
        btn.style.top = '0';
        btn.style.right = '40px'; 
    }
    
    wrapper.appendChild(btn);
}

function getInputTarget() {
    const host = window.location.hostname;
    if (host.includes('gemini.google.com')) {
        // ... старий код для Gemini ...
         const inputArea = document.querySelector('input-area-v2') || 
                         document.querySelector('[data-ved]') ||
                         document.querySelector('div[contenteditable="true"]')?.closest('div[role="textbox"]')?.parentElement;
        if (inputArea) return inputArea;
        const editor = document.querySelector('div[contenteditable="true"]');
        return editor ? editor.parentElement : null; 
    } 
    else if (host.includes('claude.ai')) {
        return document.querySelector('div[contenteditable="true"]');
    } 
    else {
        return document.querySelector('#prompt-textarea') || document.querySelector('textarea');
    }
}

setInterval(() => {
    const input = getInputTarget();
    if (input) {
        let container = input.parentElement;
        const host = window.location.hostname;

        // --- Logic for Gemini ---
        if (host.includes('gemini')) {
            const inputArea = input.closest('input-area-v2') || 
                             input.closest('[data-ved]') ||
                             input.closest('div[role="textbox"]')?.parentElement;
            if (inputArea) {
                container = inputArea;
            } else {
                if (container.offsetHeight < 40) container = container.parentElement;
            }
        }
        
        // --- FIX FOR CLAUDE ---
        else if (host.includes('claude')) {
            // Нам потрібно знайти контейнер з класом bg-bg-000 або !box-content
            // Це зазвичай на 2-3 рівні вище від contenteditable
            
            const mainBox = input.closest('.bg-bg-000') || input.closest('div[class*="box-content"]');
            
            if (mainBox) {
                container = mainBox;
            } else {
                // Fallback: якщо класів нема, піднімаємось поки не знайдемо блок на всю ширину
                // Зазвичай структура: Content -> Wrapper(relative) -> InnerBox -> MainBox
                if (container.parentElement && container.parentElement.parentElement) {
                     container = container.parentElement.parentElement;
                }
            }
        }

        if (container && !container.querySelector('.ps-agent-selector-btn')) {
            injectButton(container);
        }
    }
}, 1000);



// --- 6. Prompt Handling ---
function showInputLoading(inputField) {
    const wrapper = inputField.parentElement;
    if (getComputedStyle(wrapper).position === 'static') wrapper.style.position = 'relative';
    
    if (inputField.tagName === 'TEXTAREA') inputField.readOnly = true;
    else inputField.contentEditable = "false";

    const overlay = document.createElement('div');
    overlay.className = 'ps-input-overlay';
    const modeText = selectedAgentId ? 'Manual' : 'Auto';
    overlay.innerHTML = `<div class="ps-spinner"></div><span>Optimizing (${modeText})...</span>`;
    wrapper.appendChild(overlay);
    currentOverlay = overlay;
}

function hideInputLoading(inputField) {
    if (inputField.tagName === 'TEXTAREA') inputField.readOnly = false;
    else inputField.contentEditable = "true";
    if (currentOverlay) { currentOverlay.remove(); currentOverlay = null; }
    inputField.focus();
}

function setNativeValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
    if (valueSetter && valueSetter !== prototypeValueSetter) prototypeValueSetter.call(element, value);
    else valueSetter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
}

let isProcessing = false;
let currentOverlay = null;

document.addEventListener('keydown', async function(e) {
    if (isProcessing) return;
    if (e.ctrlKey && e.code === 'Space') {
        let activeEl = document.activeElement;
        const isInput = activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true';
        if (!isInput) return;

        e.preventDefault();
        const originalText = activeEl.value || activeEl.innerText;
        if (!originalText || originalText.trim() === "") return;

        isProcessing = true;
        showInputLoading(activeEl);

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'OPTIMIZE',
                text: originalText,
                agent_id: selectedAgentId
            });
            
            if (!response || !response.success) throw new Error(response?.error || 'Failed to optimize prompt');
            
            if (response.data && response.data.optimized_text) {
                if (activeEl.tagName === 'TEXTAREA') setNativeValue(activeEl, response.data.optimized_text);
                else {
                    activeEl.innerText = response.data.optimized_text;
                    activeEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            hideInputLoading(activeEl);
            isProcessing = false;
        }
    }
});