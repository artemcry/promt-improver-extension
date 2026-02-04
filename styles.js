/**
 * Styles module - Contains all CSS and style injection logic
 */

export function injectStyles() {
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
    
    /* Hover tunnel fix - prevents hover from breaking when moving mouse */
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

    /* --- CLAUDE FIX --- */
    .ps-agent-selector-btn.ps-claude-fix {
        right: 30px !important; 
        top: 0px !important;
    }
    
    .ps-agent-selector-btn.ps-claude-fix:hover,
    .ps-agent-selector-btn.ps-claude-fix.ps-active {
        top: 2px !important;
        height: 38px !important;
        padding-top: 8px;
    }

    /* --- DEEPSEEK FIX --- */
    .ps-agent-selector-btn.ps-deepseek-fix {
        right: 30px !important;
        top: 0px !important;
    }
    
    .ps-agent-selector-btn.ps-deepseek-fix:hover,
    .ps-agent-selector-btn.ps-deepseek-fix.ps-active {
        top: 2px !important;
        height: 38px !important;
        padding-top: 8px;
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
    
    .ps-agent-selector-btn:hover .ps-btn-arrow, .ps-agent-selector-btn.ps-active .ps-btn-arrow { 
        transform: rotate(180deg); 
    }
    
    .ps-agent-selector-btn .ps-btn-icon { 
        width: 16px; height: 16px; font-size: 12px; 
        display: flex; align-items: center; justify-content: center; 
    }
    
    .ps-agent-selector-btn .ps-btn-arrow { 
        font-size: 8px; opacity: 0.7; color: #e0e0e0; 
        width: 8px; height: 8px; 
        display: flex; align-items: center; justify-content: center; 
        transition: transform 0.15s ease; 
    }
    
    .ps-agent-selector-btn * { 
        box-sizing: border-box; margin: 0; 
    }
    
    /* Global Menu styles */
    .ps-global-menu { 
        position: fixed; background: #1e1e1e; border: 1px solid #444; 
        border-radius: 6px; width: 220px; max-height: 400px; 
        overflow-y: auto; overflow-x: hidden; 
        box-shadow: 0 10px 40px rgba(0,0,0,0.6); z-index: 2147483647; 
        font-family: sans-serif; opacity: 0; transform: translateY(-5px); 
        transition: opacity 0.1s, transform 0.1s; 
    }
    
    .ps-global-menu.active { 
        opacity: 1; transform: translateY(0); 
    }
    
    .ps-global-menu::-webkit-scrollbar { width: 6px; }
    .ps-global-menu::-webkit-scrollbar-track { background: #222; }
    .ps-global-menu::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }
    .ps-global-menu::-webkit-scrollbar-thumb:hover { background: #777; }
    
    .ps-menu-item { 
        padding: 10px 12px; font-size: 13px; color: #ddd; 
        border-bottom: 1px solid #333; cursor: pointer; 
        display: flex; justify-content: space-between; 
    }
    
    .ps-menu-item:last-child { 
        border-bottom: none; 
    }
    
    .ps-menu-item:hover { 
        background: #007bff; color: white; 
    }
    
    .ps-custom-tooltip { 
        position: fixed; width: 250px; background: #252525; 
        color: #ccc; border: 1px solid #555; padding: 10px 12px; 
        border-radius: 6px; font-size: 12px; z-index: 2147483647; 
        pointer-events: none; white-space: normal; word-wrap: break-word; 
    }
    `;
    document.head.appendChild(style);
}
