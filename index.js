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
    css_enabled: true,
    native_enabled: true,
    persist_on_visibility: true,
    shortcut_enabled: true,
};

// ── Settings helpers ──────────────────────────────────────────
function getSettings() {
    if (!extension_settings.fullscreen) {
        extension_settings.fullscreen = { ...DEFAULT_SETTINGS };
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

    // CSS layout fullscreen
    if (settings.css_enabled) {
        document.body.classList.add('st-fullscreen');
    }

    // Native browser fullscreen
    if (settings.native_enabled) {
        await requestNativeFullscreen();
    }

    localStorage.setItem(STORAGE_KEY, 'true');
    updateMenuButtonState();
}

async function disableFullscreen() {
    isFullscreen = false;
    document.body.classList.remove('st-fullscreen');

    if (isNativeFullscreen()) {
        await exitNativeFullscreen();
    }

    localStorage.setItem(STORAGE_KEY, 'false');
    updateMenuButtonState();
}

async function toggleFullscreen() {
    if (isFullscreen) {
        await disableFullscreen();
    } else {
        await enableFullscreen();
    }
}

// ── Menu button ───────────────────────────────────────────────
function updateMenuButtonState() {
    const btn = document.getElementById('st-fullscreen-toggle');
    if (!btn) return;
    const icon = btn.querySelector('.extensionsMenuExtensionButton');
    if (icon) {
        icon.classList.toggle('fa-expand', !isFullscreen);
        icon.classList.toggle('fa-compress', isFullscreen);
    }
}

function injectMenuButton() {
    const menu = document.getElementById('extensionsMenu');
    if (!menu) {
        console.warn('[ST-Full-screen] #extensionsMenu not found, retrying...');
        setTimeout(injectMenuButton, 1000);
        return;
    }

    // Avoid duplicate
    if (document.getElementById('st-fullscreen-toggle')) return;

    const container = document.createElement('div');
    container.id = 'st-fullscreen-toggle';
    container.classList.add('list-group-item', 'flex-container', 'flexGap5');
    container.innerHTML = `
        <div class="fa-solid fa-expand extensionsMenuExtensionButton"></div>
        <span>🖥️ 全屏</span>
    `;
    container.addEventListener('click', () => toggleFullscreen());
    menu.appendChild(container);

    updateMenuButtonState();
}

// ── Event listeners ───────────────────────────────────────────

// Sync state when user exits native fullscreen via Esc or system back
function onFullscreenChange() {
    if (!isNativeFullscreen() && isFullscreen) {
        // User exited native fullscreen (Esc / back button / mobile back)
        // Fully exit: remove CSS fullscreen class + reset state
        isFullscreen = false;
        document.body.classList.remove('st-fullscreen');
        localStorage.setItem(STORAGE_KEY, 'false');
        updateMenuButtonState();
    }
}

// Re-enter native fullscreen when coming back from background/PiP
function onVisibilityChange() {
    if (document.hidden) return;
    const settings = getSettings();
    if (isFullscreen && settings.native_enabled && settings.persist_on_visibility && !isNativeFullscreen()) {
        requestNativeFullscreen();
    }
}

// Keyboard shortcuts
function onKeyDown(e) {
    // Escape → exit CSS fullscreen (when not in native fullscreen,
    // because native fullscreen handles Esc on its own via fullscreenchange)
    if (e.code === 'Escape' && isFullscreen && !isNativeFullscreen()) {
        e.preventDefault();
        disableFullscreen();
        return;
    }

    const settings = getSettings();
    if (!settings.shortcut_enabled) return;

    // Ctrl+Shift+F → toggle
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

    // Bind checkboxes
    const bindings = [
        { id: '#fullscreen_css_enabled', key: 'css_enabled' },
        { id: '#fullscreen_native_enabled', key: 'native_enabled' },
        { id: '#fullscreen_persist_on_visibility', key: 'persist_on_visibility' },
        { id: '#fullscreen_shortcut_enabled', key: 'shortcut_enabled' },
    ];

    for (const { id, key } of bindings) {
        $(id).prop('checked', settings[key]);
        $(id).on('input', function () {
            saveSetting(key, $(this).prop('checked'));
        });
    }
}

// ── Restore state on load ─────────────────────────────────────
async function restoreState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') {
        const settings = getSettings();
        isFullscreen = true;

        if (settings.css_enabled) {
            document.body.classList.add('st-fullscreen');
        }

        // Native fullscreen requires user gesture — try anyway, may work
        // on Chromium from visibilitychange but not guaranteed on cold load
        if (settings.native_enabled) {
            // Delay slightly to let the page settle
            setTimeout(() => {
                requestNativeFullscreen();
            }, 500);
        }

        updateMenuButtonState();
    }
}

// ── Bootstrap ─────────────────────────────────────────────────
jQuery(async () => {
    // Ensure default settings exist
    getSettings();

    // Load settings panel into extensions page
    await loadSettingsPanel();

    // Inject menu button
    injectMenuButton();

    // Attach event listeners
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('keydown', onKeyDown);

    // Restore saved state
    await restoreState();

    // Notify
    toastr.success('Full Screen Mode loaded', 'ST-Full-screen', { timeOut: 2000 });
    console.log('[ST-Full-screen] Extension initialized');
});
