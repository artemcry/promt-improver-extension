// --- 1. Стилі (Без змін) ---
const style = document.createElement('style');
style.textContent = `
    .ps-input-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(30, 30, 30, 0.75);
        backdrop-filter: blur(2px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: inherit;
        color: #e5e7eb;
        font-family: sans-serif;
        font-size: 14px;
        gap: 10px;
        pointer-events: all;
        cursor: wait;
    }
    .ps-spinner {
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        border-top-color: #fff;
        animation: ps-spin 0.8s linear infinite;
    }
    @keyframes ps-spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// --- 2. Змінні стану ---
let currentOverlay = null;
let isProcessing = false;

// --- 3. Адаптери для різних сайтів (НОВЕ) ---
function getInputTarget() {
    const host = window.location.hostname;

    // Специфіка Google Gemini
    if (host.includes('gemini.google.com')) {
        // Gemini використовує div з role="textbox" або rich-text editor
        return document.querySelector('div[role="textbox"]') || 
               document.querySelector('div[contenteditable="true"]');
    }

    // Специфіка Claude (на майбутнє)
    if (host.includes('claude.ai')) {
        return document.querySelector('div[contenteditable="true"]');
    }

    // Default (ChatGPT та інші)
    return document.querySelector('#prompt-textarea') || 
           document.querySelector('textarea') || 
           document.querySelector('div[contenteditable="true"]');
}

// --- 4. UI Функції ---
function showInputLoading(inputField) {
    // Шукаємо найближчий стабільний контейнер для оверлею
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
    overlay.innerHTML = `<div class="ps-spinner"></div><span>Optimizing prompt...</span>`;
    
    wrapper.appendChild(overlay);
    currentOverlay = overlay;
}

function hideInputLoading(inputField) {
    if (inputField.tagName === 'TEXTAREA') {
        inputField.readOnly = false;
    } else {
        inputField.contentEditable = "true";
    }

    if (currentOverlay) {
        currentOverlay.remove();
        currentOverlay = null;
    }
    inputField.focus();
}

function setNativeValue(element, value) {
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

// --- 5. Головний обробник ---
document.addEventListener('keydown', async function(e) {
    if (isProcessing) return;

    if (e.ctrlKey && e.code === 'Space') {
        
        // Використовуємо розумний пошук поля
        const inputField = getInputTarget();
        
        if (!inputField) return;

        // Перевірка фокусу: якщо курсор не в полі вводу - ігноруємо
        if (document.activeElement !== inputField) return;

        e.preventDefault();

        const originalText = inputField.value || inputField.innerText;
        if (!originalText || originalText.trim() === "") return;

        isProcessing = true;
        showInputLoading(inputField);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch('http://127.0.0.1:8000/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: originalText }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Server error: ${response.status}`);
            }

            const data = await response.json();

            if (data.optimized_text) {
                if (inputField.tagName === 'TEXTAREA') {
                    setNativeValue(inputField, data.optimized_text);
                } else {
                    // Gemini та інші rich-text редактори
                    inputField.innerText = data.optimized_text;
                    inputField.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }

        } catch (error) {
            console.error("PromptSwitcher Error:", error);
            let msg = "Помилка з'єднання.";
            if (error.name === 'AbortError') {
                msg = "Час очікування вичерпано.";
            } else if (error.message.includes("Failed to fetch")) {
                msg = "Сервер недоступний. Запусти server.py!";
            } else {
                msg = `Помилка: ${error.message}`;
            }
            alert(msg);
        } finally {
            hideInputLoading(inputField);
            isProcessing = false;
        }
    }
});