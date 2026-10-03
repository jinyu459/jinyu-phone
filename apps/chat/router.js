(() => {
    const mainAppContainer = document.getElementById('test-container');
    const chatWrapper = document.getElementById('chat-container-wrapper');
   // router.js 第 2 行
let currentActiveMainPageId = 'page-chuanshu';  // ← 改成传书

    function showMainAppView(pageIdToShow = currentActiveMainPageId) {
        if (!mainAppContainer) return;
        mainAppContainer.style.display = 'flex';

        document.querySelectorAll('.page-view').forEach(page => page.classList.remove('active'));
        const targetPage = document.getElementById(pageIdToShow);
        if (targetPage) {
            targetPage.classList.add('active');
            currentActiveMainPageId = pageIdToShow;
        }

        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        const activeNavItem = document.querySelector(`.nav-item[data-target="${pageIdToShow}"]`);
        if (activeNavItem) activeNavItem.classList.add('active');

        if (pageIdToShow === 'page-chuanshu' && typeof window.renderContactList === 'function') {
            window.renderContactList();
        }
        if (pageIdToShow === 'page-xiaoxiang' && typeof window.renderUserProfile === 'function') {
            window.renderUserProfile();
        }
    }

    window.showMainAppView = showMainAppView;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');
            if (targetId) {
                showMainAppView(targetId);
            }
        });
    });

    document.addEventListener('DOMContentLoaded', function() {
        const currentStyle = window.settingsStore ? window.settingsStore.getStyle() : DataHub.getStyle();
        if (currentStyle.avatar && currentStyle.avatar.includes('unsplash.com')) {
            if (window.settingsStore) {
                window.settingsStore.updateStyle({ avatar: '' });
            } else {
                DataHub.updateStyle({ avatar: '' });
            }
            ['jinyu', 'songzhi'].forEach(maskId => {
                const mask = window.maskStore ? window.maskStore.getMask(maskId) : DataHub.state.masks[maskId];
                if (!mask) return;
                if (mask.avatar && mask.avatar.includes('unsplash.com')) mask.avatar = '';
                if (!Array.isArray(mask.contacts)) return;
                mask.contacts.forEach(c => {
                    if (c.avatar && c.avatar.includes('unsplash.com')) c.avatar = '';
                });
            });
            DataHub.save();
        }

       showMainAppView('page-chuanshu');

        const moduleButtons = [
            { btnId: 'btn-theme-settings', overlayId: 'theme-settings-overlay' },
            { btnId: 'btn-mask-management', overlayId: 'preset-manager-overlay' },
            { btnId: 'btn-relation-map', overlayId: 'relation-map-overlay' },
            { btnId: 'btn-wallet', overlayId: 'wallet-overlay' },
            { btnId: 'btn-notes', overlayId: 'notes-overlay' },
            { btnId: 'btn-outfit', overlayId: 'outfit-overlay' }
        ];

        moduleButtons.forEach(item => {
            const btn = document.getElementById(item.btnId);
            const overlay = document.getElementById(item.overlayId);
            if (!btn || !overlay) return;
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                overlay.style.display = 'flex';
            });
        });

        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const targetId = this.getAttribute('data-target');
                const target = document.getElementById(targetId);
                if (target) target.style.display = 'none';
            });
        });
    });

    if (window.DataHub && window.EventBus) {
        var refreshTimer = null;
        EventBus.on('DATA_CHANGED', function() {
            if (refreshTimer) return;
            refreshTimer = setTimeout(function() {
                console.log('[Router] 数据变化，刷新联系人');
                if (typeof window.renderContactList === 'function') {
                    window.renderContactList();
                }
                refreshTimer = null;
            }, 300);
        });
    }
    
    window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'refreshContacts' && window.renderContactList) {
            window.renderContactList();
        }
    });
    
    window.refreshContactListIfNeeded = function() {
        if (typeof window.renderContactList === 'function') {
            window.renderContactList();
        }
    };

    console.log('[Router] 已加载，当前页面:', currentActiveMainPageId);
})();