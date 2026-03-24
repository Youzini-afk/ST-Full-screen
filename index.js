/**
 * ST-Full-screen — SillyTavern Fullscreen Extension
 *
 * Provides native browser fullscreen + CSS layout fullscreen
 * with configurable settings in the extensions panel.
 */

import { extension_settings, renderExtensionTemplateAsync } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';

const MODULE_NAME = 'ST-Full-screen';
const STORAGE_KEY = 'st-fullscreen-active';

// ── Default settings ──────────────────────────────────────────
const DEFAULT_SETTINGS = {
    css_enabled: false,
    native_enabled: true,
    persist_on_visibility: true,
    shortcut_enabled: true,
    show_in_wand: false,
    show_in_sendform: true,
    show_in_topbar: false,
    pwa_immersive: false,
};

// ── Settings helpers ──────────────────────────────────────────
function getSettings() {
    if (!extension_settings.fullscreen) {
        extension_settings.fullscreen = { ...DEFAULT_SETTINGS };
    }
    // Migrate: add new keys if missing
    for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
        if (extension_settings.fullscreen[key] === undefined) {
            extension_settings.fullscreen[key] = val;
        }
    }
    return extension_settings.fullscreen;
}

function saveSetting(key, value) {
    const settings = getSettings();
    settings[key] = value;
    saveSettingsDebounced();
}

// ── Fullscreen state ──────────────────────────────────────────
let isFullscreen = false;

function isNativeFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

async function requestNativeFullscreen() {
    const el = document.documentElement;
    try {
        if (el.requestFullscreen) {
            await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
            await el.webkitRequestFullscreen();
        }
    } catch (err) {
        console.debug('[ST-Full-screen] Native fullscreen request failed:', err.message);
    }
}

async function exitNativeFullscreen() {
    try {
        if (document.exitFullscreen) {
            await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            await document.webkitExitFullscreen();
        }
    } catch (err) {
        console.debug('[ST-Full-screen] Native fullscreen exit failed:', err.message);
    }
}

// ── Core toggle ───────────────────────────────────────────────
async function enableFullscreen() {
    const settings = getSettings();
    isFullscreen = true;

    // CSS layout fullscreen: always apply when css_enabled OR pwa_immersive
    if (settings.css_enabled || settings.pwa_immersive) {
        document.body.classList.add('st-fullscreen');
    }

    // Native fullscreen: skip if pwa_immersive is on
    if (settings.native_enabled && !settings.pwa_immersive) {
        await requestNativeFullscreen();
    }

    localStorage.setItem(STORAGE_KEY, 'true');
    updateAllButtonStates();
}

async function disableFullscreen() {
    isFullscreen = false;
    document.body.classList.remove('st-fullscreen');

    if (isNativeFullscreen()) {
        await exitNativeFullscreen();
    }

    localStorage.setItem(STORAGE_KEY, 'false');
    updateAllButtonStates();
}

async function toggleFullscreen() {
    if (isFullscreen) {
        await disableFullscreen();
    } else {
        await enableFullscreen();
    }
}

// ── Button state helpers ──────────────────────────────────────
function updateAllButtonStates() {
    // Wand menu button
    const wandBtn = document.getElementById('st-fullscreen-toggle');
    if (wandBtn) {
        const icon = wandBtn.querySelector('.extensionsMenuExtensionButton');
        if (icon) {
            icon.classList.toggle('fa-expand', !isFullscreen);
            icon.classList.toggle('fa-compress', isFullscreen);
        }
    }
    // Standalone sendform button
    const sendBtn = document.getElementById('st-fullscreen-sendform-btn');
    if (sendBtn) {
        sendBtn.classList.toggle('fa-expand', !isFullscreen);
        sendBtn.classList.toggle('fa-compress', isFullscreen);
        sendBtn.title = isFullscreen ? '退出全屏' : '全屏';
    }
    // Top bar button
    const topBtn = document.getElementById('st-fullscreen-topbar-btn');
    if (topBtn) {
        const topIcon = topBtn.querySelector('.drawer-icon');
        if (topIcon) {
            topIcon.classList.toggle('fa-expand', !isFullscreen);
            topIcon.classList.toggle('fa-compress', isFullscreen);
        }
        topBtn.title = isFullscreen ? '退出全屏' : '全屏';
    }
}

// ── Wand menu button ──────────────────────────────────────────
function injectWandButton() {
    const settings = getSettings();
    const existing = document.getElementById('st-fullscreen-toggle');

    if (!settings.show_in_wand) {
        if (existing) existing.remove();
        return;
    }

    if (existing) return; // already injected

    const menu = document.getElementById('extensionsMenu');
    if (!menu) {
        setTimeout(injectWandButton, 1000);
        return;
    }

    const container = document.createElement('div');
    container.id = 'st-fullscreen-toggle';
    container.classList.add('list-group-item', 'flex-container', 'flexGap5');
    container.innerHTML = `
        <div class="fa-solid fa-expand extensionsMenuExtensionButton"></div>
        <span>🖥️ 全屏</span>
    `;
    container.addEventListener('click', () => toggleFullscreen());
    menu.appendChild(container);
}

// ── Standalone sendform button ────────────────────────────────
function injectSendformButton() {
    const settings = getSettings();
    const existing = document.getElementById('st-fullscreen-sendform-btn');

    if (!settings.show_in_sendform) {
        if (existing) existing.remove();
        return;
    }

    if (existing) return; // already injected

    const leftSendForm = document.getElementById('leftSendForm');
    if (!leftSendForm) {
        setTimeout(injectSendformButton, 1000);
        return;
    }

    const btn = document.createElement('div');
    btn.id = 'st-fullscreen-sendform-btn';
    btn.classList.add('fa-solid', 'fa-expand', 'interactable');
    btn.title = '全屏';
    btn.tabIndex = 0;
    btn.addEventListener('click', () => toggleFullscreen());

    // Insert after the last child (after extensionsMenuButton if present)
    leftSendForm.appendChild(btn);
}

// ── Top bar button ────────────────────────────────────────────
function injectTopBarButton() {
    const settings = getSettings();
    const existing = document.getElementById('st-fullscreen-topbar-btn');

    if (!settings.show_in_topbar) {
        if (existing) existing.remove();
        return;
    }

    if (existing) return;

    const bgButton = document.getElementById('backgrounds-button');
    if (!bgButton) {
        setTimeout(injectTopBarButton, 1000);
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'st-fullscreen-topbar-btn';
    wrapper.classList.add('drawer');
    wrapper.title = '全屏';
    wrapper.innerHTML = `
        <div class="drawer-toggle drawer-header">
            <div class="drawer-icon fa-solid fa-expand fa-fw closedIcon"></div>
        </div>
    `;
    wrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFullscreen();
    });

    bgButton.parentElement.insertBefore(wrapper, bgButton);
    updateAllButtonStates();
}

// ── Event listeners ───────────────────────────────────────────
function onFullscreenChange() {
    if (!isNativeFullscreen() && isFullscreen) {
        const settings = getSettings();

        // If page is hidden (tab switch / minimize) and persist is enabled,
        // keep isFullscreen = true so onVisibilityChange can re-request later
        if (document.hidden && settings.persist_on_visibility) {
            return;
        }

        // User intentionally exited (Esc / back button while page visible)
        isFullscreen = false;
        document.body.classList.remove('st-fullscreen');
        localStorage.setItem(STORAGE_KEY, 'false');
        updateAllButtonStates();
    }
}

function onVisibilityChange() {
    if (document.hidden) return;
    const settings = getSettings();
    if (isFullscreen && settings.native_enabled && settings.persist_on_visibility && !isNativeFullscreen()) {
        requestNativeFullscreen();
    }
}

function onKeyDown(e) {
    if (e.code === 'Escape' && isFullscreen && !isNativeFullscreen()) {
        e.preventDefault();
        disableFullscreen();
        return;
    }

    const settings = getSettings();
    if (!settings.shortcut_enabled) return;

    if (e.ctrlKey && e.shiftKey && e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
    }
}

// ── Settings panel ────────────────────────────────────────────
async function loadSettingsPanel() {
    const html = await renderExtensionTemplateAsync(
        'third-party/ST-Full-screen',
        'settings',
    );
    $('#extensions_settings2').append(html);

    const settings = getSettings();

    const bindings = [
        { id: '#fullscreen_css_enabled', key: 'css_enabled' },
        { id: '#fullscreen_native_enabled', key: 'native_enabled' },
        { id: '#fullscreen_persist_on_visibility', key: 'persist_on_visibility' },
        { id: '#fullscreen_shortcut_enabled', key: 'shortcut_enabled' },
        { id: '#fullscreen_show_in_wand', key: 'show_in_wand', onChange: injectWandButton },
        { id: '#fullscreen_show_in_sendform', key: 'show_in_sendform', onChange: injectSendformButton },
        { id: '#fullscreen_show_in_topbar', key: 'show_in_topbar', onChange: injectTopBarButton },
        { id: '#fullscreen_pwa_immersive', key: 'pwa_immersive' },
    ];

    for (const { id, key, onChange } of bindings) {
        $(id).prop('checked', settings[key]);
        $(id).on('input', function () {
            saveSetting(key, $(this).prop('checked'));
            if (onChange) onChange();
        });
    }
}

// ── Restore state on load ─────────────────────────────────────
async function restoreState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') {
        const settings = getSettings();
        isFullscreen = true;

        if (settings.css_enabled || settings.pwa_immersive) {
            document.body.classList.add('st-fullscreen');
        }

        if (settings.native_enabled && !settings.pwa_immersive) {
            setTimeout(() => {
                requestNativeFullscreen();
            }, 500);
        }

        updateAllButtonStates();
    }
}

// ── Bootstrap ─────────────────────────────────────────────────
jQuery(async () => {
    getSettings();

    await loadSettingsPanel();

    // Inject buttons based on settings
    injectWandButton();
    injectSendformButton();
    injectTopBarButton();

    // Attach event listeners
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('keydown', onKeyDown);

    await restoreState();

    toastr.success('全屏模式已加载', 'ST-Full-screen', { timeOut: 2000 });
    console.log('[ST-Full-screen] Extension initialized');
});
