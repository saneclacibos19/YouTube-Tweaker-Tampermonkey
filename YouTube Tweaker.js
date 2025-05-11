// ==UserScript==
// @name         YouTube Tweaker
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Removes Shorts, cleans menu, and hides footer with configurable settings
// @icon         https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/25/0f/8e/250f8eab-3a6a-ea84-d8ce-a531a9a1165c/AppIcon-0-0-1x_U007ephone-0-1-0-85-220.png/230x0w.webp
// @author       Astra
// @match        *://*.youtube.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 1. Configuration with persistent storage
    const config = {
        removeShorts: GM_getValue('removeShorts', true),
        disableShortPage: GM_getValue('disableShortPage', true),
        disableShortScroll: GM_getValue('disableShortScroll', true),
        cleanSidebar: GM_getValue('cleanSidebar', true),
        removeSubscriptions: GM_getValue('removeSubscriptions', true),
        removeNavigator: GM_getValue('removeNavigator', true),
        removeExtraFeatures: GM_getValue('removeExtraFeatures', true),
        removeFooter: GM_getValue('removeFooter', true)
    };

    // Helper function to update config
    function updateConfig(key, value) {
        if (config.hasOwnProperty(key)) {
            config[key] = value;
            GM_setValue(key, value);
            applyConfigChanges();
        }
    }

    // 2. Pre-compiled regex patterns
    const patterns = {
        shortPage: /shorts(\/|$)/i,
        shortLink: /\/shorts\//i,
        configPage: /^https:\/\/www\.youtube\.com\/account_playback$/i
    };

    // 3. CSS selectors cache
    const selectors = {
        shorts: '[is-shorts], [is-reel-item-style-avatar-circle], ytd-reel-item-renderer, ytd-reel-shelf-renderer, ytd-rich-section-renderer[is-shorts]',
        sidebarShorts: '#guide [title="Shorts"], #guide [title="Коротки"], ytd-mini-guide-entry-renderer[aria-label="Shorts"]',
        sidebarSubs: '#guide [title="Подписки"]',
        videoLinks: 'a[href*="/shorts/"]',
        menuSections: 'ytd-guide-section-renderer.style-scope',
        sectionTitle: 'yt-formatted-string#guide-section-title',
        footer: 'ytd-app div#footer, ytd-app div#contentContainer ytd-page-manager div#footer',
        configContainer: 'div#contents.style-scope.ytd-section-list-renderer'
    };

    // 4. Dynamic CSS injection
    let styleElement = document.createElement('style');
    document.head.appendChild(styleElement);

    function updateStyles() {
        styleElement.textContent = `
            ${config.removeShorts ? `
            /* Hide Shorts elements */
            ${selectors.shorts} {
                display: none !important;
            }
            ` : ''}

            ${config.cleanSidebar ? `
            /* Hide Shorts in sidebar */
            ${selectors.sidebarShorts} {
                display: none !important;
            }
            ` : ''}

            ${config.removeSubscriptions ? `
            /* Hide Subscriptions */
            ${selectors.sidebarSubs} {
                display: none !important;
            }
            ` : ''}

            ${config.removeFooter ? `
            /* Hide Footer */
            ${selectors.footer} {
                display: none !important;
            }
            ` : ''}
        `;
    }

    // 5. Fast DOM removal functions
    const fastRemove = {
        shorts: () => {
            if (!config.removeShorts) return;
            const elements = document.querySelectorAll(selectors.shorts);
            for (let i = 0, len = elements.length; i < len; i++) {
                elements[i].remove();
            }
        },
        sidebar: () => {
            if (!config.cleanSidebar) return;
            const elements = document.querySelectorAll(selectors.sidebarShorts);
            for (let i = 0, len = elements.length; i < len; i++) {
                elements[i].closest('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer')?.remove();
            }
        },
        links: () => {
            if (!config.removeShorts) return;
            const links = document.querySelectorAll(selectors.videoLinks);
            for (let i = 0, len = links.length; i < len; i++) {
                links[i].closest('ytd-video-renderer, ytd-rich-item-renderer')?.remove();
            }
        },
        menuSections: () => {
            const sections = document.querySelectorAll(selectors.menuSections);
            for (let i = 0, len = sections.length; i < len; i++) {
                const title = sections[i].querySelector(selectors.sectionTitle);
                if (title) {
                    const text = title.textContent.trim();
                    if ((config.removeSubscriptions && text === 'Подписки') ||
                        (config.removeNavigator && text === 'Навигатор') ||
                        (config.removeExtraFeatures && text === 'Другие возможности')) {
                        sections[i].remove();
                    }
                }
            }
        },
        footer: () => {
            if (!config.removeFooter) return;
            const footers = document.querySelectorAll(selectors.footer);
            for (let i = 0, len = footers.length; i < len; i++) {
                footers[i].remove();
            }
        }
    };

    // 6. Instant URL check and redirect
    if (config.disableShortPage && patterns.shortPage.test(location.pathname)) {
        location.replace('https://www.youtube.com');
        return;
    }

    // 7. Scroll blocking
    if (config.disableShortScroll) {
        const blockScroll = (e) => {
            if (patterns.shortPage.test(location.pathname)) {
                e.preventDefault();
                e.stopImmediatePropagation();
                location.replace('https://www.youtube.com');
            }
        };
        window.addEventListener('wheel', blockScroll, {passive: false, capture: true});
        window.addEventListener('touchmove', blockScroll, {passive: false, capture: true});
        window.addEventListener('keydown', (e) => {
            if ([32, 33, 34, 35, 36, 38, 40].includes(e.keyCode)) blockScroll(e);
        }, {passive: false});
    }

    // 8. Configuration menu
    function createConfigMenu() {
        if (!patterns.configPage.test(location.href)) return;
        if (document.querySelector('#yt-cleaner-config-menu')) return;

        const menuContainer = document.createElement('div');
        menuContainer.id = 'yt-cleaner-config-menu';
        menuContainer.style.color = 'var(--yt-spec-text-secondary)';
        menuContainer.style.fontSize = '1.4rem';
        menuContainer.style.lineHeight = '2rem';
        menuContainer.style.fontWeight = '400';
        menuContainer.style.padding = '10px';
        menuContainer.style.width = '50%';
        menuContainer.style.marginTop = '20px';

        const hr = document.createElement('hr');
        const headline = document.createElement('h1');
        headline.style.lineHeight = '6rem';
        headline.style.color = 'var(--yt-spec-text-primary)';
        headline.innerText = 'Настройки YouTube Tweaker';
        menuContainer.appendChild(hr);
        menuContainer.appendChild(headline);

        // Master Shorts toggle
        const shortsMasterItem = document.createElement('div');
        shortsMasterItem.style.display = 'flex';
        shortsMasterItem.style.justifyContent = 'space-between';
        shortsMasterItem.style.alignItems = 'center';
        shortsMasterItem.style.marginBottom = '10px';

        const shortsMasterLabel = document.createElement('label');
        shortsMasterLabel.textContent = 'Полное выпиливание Shorts';
        shortsMasterLabel.style.flexGrow = '1';
        shortsMasterLabel.style.fontWeight = 'bold';

        const shortsMasterInput = document.createElement('input');
        shortsMasterInput.type = 'checkbox';
        shortsMasterInput.checked = config.removeShorts && config.disableShortPage &&
                                  config.disableShortScroll && config.cleanSidebar;
        shortsMasterInput.style.marginLeft = '10px';

        shortsMasterInput.addEventListener('change', function() {
            const isChecked = this.checked;
            updateConfig('removeShorts', isChecked);
            updateConfig('disableShortPage', isChecked);
            updateConfig('disableShortScroll', isChecked);
            updateConfig('cleanSidebar', isChecked);
        });

        shortsMasterItem.appendChild(shortsMasterLabel);
        shortsMasterItem.appendChild(shortsMasterInput);
        menuContainer.appendChild(shortsMasterItem);

        // Other menu items
        const menuItems = [
            { label: 'Удаление раздела Подписки', key: 'removeSubscriptions', type: 'checkbox' },
            { label: 'Удаление раздела Навигатор', key: 'removeNavigator', type: 'checkbox' },
            { label: 'Удаление раздела Дополнительные функции', key: 'removeExtraFeatures', type: 'checkbox' },
            { label: 'Удаление Подвал', key: 'removeFooter', type: 'checkbox' }
        ];

        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.style.display = 'flex';
            menuItem.style.justifyContent = 'space-between';
            menuItem.style.alignItems = 'center';
            menuItem.style.marginBottom = '10px';

            const label = document.createElement('label');
            label.textContent = item.label;
            label.style.flexGrow = '1';

            const input = document.createElement('input');
            input.type = item.type;
            input.checked = config[item.key];
            input.style.marginLeft = '10px';

            input.addEventListener('change', function() {
                updateConfig(item.key, this.checked);
            });

            menuItem.appendChild(label);
            menuItem.appendChild(input);
            menuContainer.appendChild(menuItem);
        });

        const configContainer = document.querySelector(selectors.configContainer);
        if (configContainer) {
            configContainer.appendChild(menuContainer);
        }
    }

    // 9. Apply configuration changes
    function applyConfigChanges() {
        updateStyles();
        fastRemove.shorts();
        fastRemove.sidebar();
        fastRemove.links();
        fastRemove.menuSections();
        fastRemove.footer();
    }

    // 10. MutationObserver with optimizations
    const observer = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            if (mutations[i].addedNodes.length) {
                applyConfigChanges();
                if (patterns.configPage.test(location.href)) {
                    createConfigMenu();
                }
                break;
            }
        }
    });

    // 11. Initial execution
    function execute() {
        updateStyles();
        applyConfigChanges();

        if (patterns.configPage.test(location.href)) {
            createConfigMenu();
        }

        observer.observe(document, {
            childList: true,
            subtree: true
        });
    }

    // 12. Early execution
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', execute);
    } else {
        execute();
    }
})();