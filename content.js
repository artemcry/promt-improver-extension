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

    /* --- Button (Inside Input) --- */
    .ps-agent-selector-btn {
        position: absolute;
        top: 8px; right: 8px;
        z-index: 900; 
        background: rgba(40, 40, 40, 0.95);
        color: #e0e0e0;
        border: 1px solid #555;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 11px;
        cursor: pointer;
        font-family: sans-serif;
        display: flex; align-items: center; gap: 5px;
        transition: all 0.2s;
        user-select: none;
    }
    .ps-agent-selector-btn:hover { background: #555; border-color: #888; }

    /* --- Global Dropdown (Floating) --- */
    .ps-global-menu {
        position: fixed; 
        background: #1e1e1e;
        border: 1px solid #444;
        border-radius: 6px;
        width: 220px;
        max-height: 400px;
        overflow-y: auto; /* Скрол тут */
        overflow-x: hidden; /* Забороняємо горизонтальний скрол */
        box-shadow: 0 10px 40px rgba(0,0,0,0.6);
        z-index: 2147483647; 
        font-family: sans-serif;
        opacity: 0; transform: translateY(-5px);
        transition: opacity 0.1s, transform 0.1s;
    }
    .ps-global-menu.active {
        opacity: 1; transform: translateY(0);
    }
    
    /* Скролбар для меню (щоб виглядав гарно) */
    .ps-global-menu::-webkit-scrollbar { width: 6px; }
    .ps-global-menu::-webkit-scrollbar-track { background: #222; }
    .ps-global-menu::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }
    .ps-global-menu::-webkit-scrollbar-thumb:hover { background: #777; }

    .ps-menu-item {
        padding: 10px 12px;
        font-size: 13px;
        color: #ddd;
        border-bottom: 1px solid #333;
        cursor: pointer;
        position: relative;
        display: flex; justify-content: space-between;
    }
    .ps-menu-item:last-child { border-bottom: none; }
    .ps-menu-item:hover { background: #007bff; color: white; }

    /* Кастомний tooltip через JavaScript */
    .ps-custom-tooltip {
        position: fixed;
        width: 250px;
        max-width: calc(100vw - 20px);
        background: #252525;
        color: #ccc;
        border: 1px solid #555;
        padding: 10px 12px;
        border-radius: 6px;
        font-size: 12px;
        line-height: 1.5;
        box-shadow: 0 4px 20px rgba(0,0,0,0.7);
        pointer-events: none;
        white-space: normal;
        word-wrap: break-word;
        z-index: 2147483647;
        opacity: 1; /* Моментальне відображення без анімації */
    }
`;
document.head.appendChild(style);

// --- 2. State ---
let agentsCache = [];
let selectedAgentId = null;
let activeMenu = null;
let tooltipElement = null;

// --- 3. Data Fetching ---
async function fetchAgents() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_AGENTS' });
        if (response && response.success) {
            agentsCache = response.data;
        } else {
            console.warn("Failed to fetch agents:", response?.error);
        }
    } catch (e) { 
        console.warn("Error fetching agents:", e);
    }
}
fetchAgents();

// --- 4. Global Menu Logic ---

// Спеціальний обробник скролу
function handleGlobalScroll(e) {
    // Якщо меню не активне - ігноруємо
    if (!activeMenu) return;

    // КЛЮЧОВИЙ МОМЕНТ:
    // Перевіряємо, чи подія скролу сталася ВСЕРЕДИНІ нашого меню.
    // Якщо так (activeMenu містить ціль події) - нічого не робимо, даємо скролити.
    if (activeMenu.contains(e.target)) {
        return;
    }

    // Якщо скролится сторінка (документ) - закриваємо меню
    closeGlobalMenu();
}

function closeGlobalMenu() {
    if (activeMenu) {
        activeMenu.remove();
        activeMenu = null;
    }
    // Видаляємо tooltip, якщо він є
    if (tooltipElement) {
        tooltipElement.remove();
        tooltipElement = null;
    }
    window.removeEventListener('click', closeGlobalMenu);
    // Видаляємо наш розумний обробник скролу
    window.removeEventListener('scroll', handleGlobalScroll, true);
    window.removeEventListener('resize', closeGlobalMenu);
}

function openGlobalMenu(btnElement) {
    if (activeMenu) { closeGlobalMenu(); return; }

    const menu = document.createElement('div');
    menu.className = 'ps-global-menu';
    
    // Блокуємо спливання кліків з меню, щоб воно не закривало саме себе
    menu.onclick = (e) => e.stopPropagation();

    // --- Items ---
    const createItem = (id, name, desc) => {
        const item = document.createElement('div');
        item.className = 'ps-menu-item';
        item.innerText = name;
        if (desc) {
            item.setAttribute('data-desc', desc);
            // Не використовуємо title, щоб не було подвійного tooltip
            
            // Обробники для кастомного tooltip
            item.addEventListener('mouseenter', (e) => {
                if (!desc) return;
                
                const rect = item.getBoundingClientRect();
                tooltipElement = document.createElement('div');
                tooltipElement.className = 'ps-custom-tooltip';
                tooltipElement.textContent = desc;
                document.body.appendChild(tooltipElement);
                
                // Позиціонуємо tooltip справа від елемента
                let left = rect.right + 8;
                let top = rect.top;
                
                // Якщо tooltip виходить за праву межу екрану - показуємо зліва
                if (left + 250 > window.innerWidth) {
                    left = rect.left - 250 - 8;
                }
                
                // Якщо tooltip виходить за низ екрану - зміщуємо вгору
                if (top + tooltipElement.offsetHeight > window.innerHeight) {
                    top = window.innerHeight - tooltipElement.offsetHeight - 10;
                }
                
                tooltipElement.style.left = left + 'px';
                tooltipElement.style.top = top + 'px';
            });
            
            item.addEventListener('mouseleave', () => {
                if (tooltipElement) {
                    tooltipElement.remove();
                    tooltipElement = null;
                }
            });
        } else {
            item.setAttribute('data-desc', ""); // Щоб CSS знав що пусто
        }
        
        item.onclick = (e) => {
            // Тут stopPropagation вже не треба, бо ми хочемо щоб window click спрацював? 
            // Ні, ми закриваємо вручну.
            selectedAgentId = id;
            btnElement.querySelector('span').innerText = id === null ? "✨ Auto" : `⚡ ${name.substring(0,8)}..`;
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
        empty.setAttribute('data-desc', "");
        menu.appendChild(empty);
    }

    document.body.appendChild(menu);

    // --- Positioning ---
    const rect = btnElement.getBoundingClientRect();
    menu.style.top = (rect.bottom + 5) + 'px';
    // Вирівнюємо по правому краю кнопки
    menu.style.left = (rect.right - 220) + 'px'; // 220 - ширина меню

    // Якщо меню вилазить за низ екрану - піднімаємо його вгору
    if (window.innerHeight - rect.bottom < 300) {
        menu.style.top = 'auto';
        menu.style.bottom = (window.innerHeight - rect.top + 5) + 'px';
    }

    requestAnimationFrame(() => menu.classList.add('active'));
    activeMenu = menu;

    // --- Listeners ---
    // Даємо мікро-затримку, щоб поточний клік кнопки не закрив меню
    setTimeout(() => {
        window.addEventListener('click', closeGlobalMenu);
        window.addEventListener('resize', closeGlobalMenu);
        // Вмикаємо розумний скрол-слухач
        window.addEventListener('scroll', handleGlobalScroll, true); 
    }, 50);
}

// --- 5. Injection Logic ---
function injectButton(wrapper) {
    if (wrapper.querySelector('.ps-agent-selector-btn')) return;

    const btn = document.createElement('div');
    btn.className = 'ps-agent-selector-btn';
    btn.innerHTML = `<span>✨ Auto</span> <span style="font-size:8px">▼</span>`;
    
    btn.onclick = async (e) => {
        e.stopPropagation(); // Не передавати клік в поле вводу
        e.preventDefault(); 
        if (!agentsCache.length) await fetchAgents();
        openGlobalMenu(btn);
    };

    if (getComputedStyle(wrapper).position === 'static') wrapper.style.position = 'relative';
    wrapper.appendChild(btn);
}

function getInputTarget() {
    const host = window.location.hostname;
    if (host.includes('gemini.google.com')) {
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

// Постійне спостереження за DOM
setInterval(() => {
    const input = getInputTarget();
    if (input) {
        let container = input.parentElement;
        // Fix for Gemini layout
        if (window.location.hostname.includes('gemini')) {
             if (container.offsetHeight < 40) container = container.parentElement;
        }
        if (container && !container.querySelector('.ps-agent-selector-btn')) {
            injectButton(container);
        }
    }
}, 1000);


// --- 6. Prompt Handling (Ctrl+Space) ---
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
        // Find input dynamically based on focus
        let activeEl = document.activeElement;
        
        // Basic check if we are in an editable field
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
            
            if (!response || !response.success) {
                throw new Error(response?.error || 'Failed to optimize prompt');
            }
            
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