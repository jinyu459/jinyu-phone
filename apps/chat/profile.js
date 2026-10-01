(() => {
    const userNameElement = document.getElementById('user-name');
    const userSignatureElement = document.getElementById('user-signature');
    const userAvatarElement = document.getElementById('user-avatar');

    function renderUserProfile() {
        const style = DataHub.getStyle() || {};
        const mask = DataHub.getActiveMask();
        if (!mask || !userNameElement || !userSignatureElement || !userAvatarElement) return;

        userNameElement.textContent = mask.name || '';
        userNameElement.style.color = mask.themeColor || 'var(--text-color)';

        const avatar = style.avatar;
        const isIllegalLink = (url) => !url || String(url).includes('unsplash.com');
        if (!isIllegalLink(avatar)) {
            userAvatarElement.innerHTML = `<img src="${avatar}" alt="user avatar">`;
            userAvatarElement.style.background = 'none';
        } else {
            userAvatarElement.innerHTML = '';
            userAvatarElement.style.backgroundColor = mask.themeColor || '#eaddc5';
        }

        userSignatureElement.textContent = style.signature || '';
        const badge = document.getElementById('user-badge');
        if (badge) badge.textContent = style.badge || '(badge)';

        const infoCard = document.getElementById('my-info-card');
        if (infoCard && style.cardBg) infoCard.style.backgroundImage = `url(${style.cardBg})`;
    }

    window.renderUserProfile = renderUserProfile;


// 监听头像更新消息
window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'refreshMyAvatar') {
        console.log('[小像] 收到头像更新消息');
        // 重新渲染小像页面
        if (typeof window.renderUserProfile === 'function') {
            window.renderUserProfile();
        }
        // 如果有其他需要刷新的 UI，也刷新
        if (typeof window.updateProfileUI === 'function') {
            window.updateProfileUI();
        }
    }
});

    // ========== 可编辑字段（签名/徽章） ==========
    const editableFields = {
        'user-signature': 'signature',
        'user-badge': 'badge'
    };

    Object.keys(editableFields).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('blur', () => {
            const field = editableFields[id];
            DataHub.updateStyle({ [field]: el.textContent.trim() });

            const originalTransition = el.style.transition;
            const originalBg = el.style.backgroundColor;
            el.style.transition = 'background-color 0.3s ease';
            el.style.backgroundColor = 'rgba(192, 160, 98, 0.2)';
            setTimeout(() => {
                el.style.backgroundColor = originalBg;
                setTimeout(() => { el.style.transition = originalTransition; }, 300);
            }, 300);
        });
    });

    // ========== 卡片背景上传 ==========
    const infoCardEl = document.getElementById('my-info-card');
    const cardBgInput = document.getElementById('card-bg-upload');
    if (infoCardEl && cardBgInput) {
        infoCardEl.addEventListener('click', (e) => {
            if (e.target.closest('#user-signature') || e.target.closest('#user-badge') || e.target.closest('#user-avatar')) return;
            cardBgInput.click();
        });
        cardBgInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                DataHub.updateStyle({ cardBg: evt.target.result });
                renderUserProfile();
            };
            reader.readAsDataURL(file);
        });
    }

    // ========== 主题设置模块 ==========
    function initThemeSettingsModule() {
        const overlay = document.getElementById('theme-settings-overlay');
        const container = document.getElementById('test-container');
        const presetList = document.getElementById('theme-preset-list');

        const mixerPreview = document.getElementById('mixer-preview');
        const mixerHexInput = document.getElementById('mixer-hex-input');
        const mixerRgb = document.getElementById('mixer-rgb');
        const sliderR = document.getElementById('slider-r');
        const sliderG = document.getElementById('slider-g');
        const sliderB = document.getElementById('slider-b');
        const rVal = document.getElementById('r-val');
        const gVal = document.getElementById('g-val');
        const bVal = document.getElementById('b-val');
        const applyColorBtn = document.getElementById('apply-color-btn');
        const savePresetBtn = document.getElementById('save-preset-btn');
        const savePresetRow = document.getElementById('save-preset-row');
        const savePresetInput = document.getElementById('save-preset-input');
        const savePresetConfirm = document.getElementById('save-preset-confirm');

        const presetEditOverlay = document.getElementById('preset-edit-overlay');
        const presetEditName = document.getElementById('preset-edit-name');
        const presetEditDot = document.getElementById('preset-edit-dot');
        const presetEditHex = document.getElementById('preset-edit-hex');
        const presetCopyBtn = document.getElementById('preset-copy-btn');
        const presetEditSave = document.getElementById('preset-edit-save');
        const presetEditCancel = document.getElementById('preset-edit-cancel');

        if (
            !overlay || !container || !presetList ||
            !mixerPreview || !mixerHexInput || !mixerRgb || !sliderR || !sliderG || !sliderB || !rVal || !gVal || !bVal ||
            !applyColorBtn || !savePresetBtn || !savePresetRow || !savePresetInput || !savePresetConfirm ||
            !presetEditOverlay || !presetEditName || !presetEditDot || !presetEditHex || !presetCopyBtn || !presetEditSave || !presetEditCancel
        ) return;

        const themeData = {
            spring: { name: '春', bg: 'linear-gradient(to bottom,#f1f8e9 0%,#ffffff 100%)', tint: 'rgba(241,248,233,0.18)', hover: 'rgba(241,248,233,0.3)', border: 'rgba(124,179,66,0.15)', accent: '#7cb342' },
            summer: { name: '夏', bg: 'linear-gradient(to bottom,#fdf0f4 0%,#ffffff 100%)', tint: 'rgba(243,221,228,0.22)', hover: 'rgba(243,221,228,0.34)', border: 'rgba(232,165,183,0.20)', accent: '#e8a5b7' },
            autumn: { name: '秋', bg: 'linear-gradient(to bottom,#f6e8cc 0%,#ffffff 100%)', tint: 'rgba(246,232,204,0.24)', hover: 'rgba(246,232,204,0.36)', border: 'rgba(192,160,98,0.22)', accent: '#c0a062' },
            winter: { name: '冬', bg: 'linear-gradient(to bottom,#f4f8fb 0%,#ffffff 100%)', tint: 'rgba(244,248,251,0.18)', hover: 'rgba(244,248,251,0.3)', border: 'rgba(138,171,204,0.15)', accent: '#8aabcc' }
        };

        const style = DataHub.getStyle() || {};
        let userPresets = Array.isArray(style.themePresets) ? style.themePresets.slice() : [];
        let editingPresetIndex = -1;

        function showToast(message) {
            const containerEl = document.getElementById('toast-container');
            if (!containerEl) return;
            const toast = document.createElement('div');
            toast.className = 'jinyu-toast';
            toast.textContent = message;
            containerEl.appendChild(toast);
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 2600);
        }

        function syncThemeVars(tint, hover, border, accent) {
            document.documentElement.style.setProperty('--theme-tint', tint);
            document.documentElement.style.setProperty('--theme-hover', hover);
            document.documentElement.style.setProperty('--theme-border', border);
            document.documentElement.style.setProperty('--theme-accent', accent);
        }

        function saveThemeState(nextStylePatch = {}) {
            DataHub.updateStyle({ themePresets: userPresets, ...nextStylePatch });
        }

        function setActiveSeasonByAccent(accent) {
            overlay.querySelectorAll('.season-chip').forEach(chip => chip.classList.remove('active'));
            Object.keys(themeData).forEach(key => {
                if (themeData[key].accent.toUpperCase() === String(accent || '').toUpperCase()) {
                    const target = overlay.querySelector(`.season-chip[data-theme="${key}"]`);
                    if (target) target.classList.add('active');
                }
            });
        }

        function applyTheme(bg, tint, hover, border, accent, message) {
            container.style.background = bg;
            syncThemeVars(tint, hover, border, accent);
            saveThemeState({ background: bg, themeTint: tint, themeHover: hover, themeBorder: border, themeAccent: accent });
            updateSlidersFromHex(accent);
            if (message) showToast(message);
        }

        function rgbToHex(r, g, b) {
            return `#${[r, g, b].map(v => Number(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
        }

        function hexToRgb(hex) {
            let s = String(hex || '').trim().replace('#', '');
            if (s.length === 3) s = s.split('').map(c => c + c).join('');
            if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
            return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
        }

        function updateMixerFromSliders() {
            const r = Number(sliderR.value);
            const g = Number(sliderG.value);
            const b = Number(sliderB.value);
            rVal.textContent = String(r);
            gVal.textContent = String(g);
            bVal.textContent = String(b);
            mixerPreview.style.background = `rgb(${r},${g},${b})`;
            mixerHexInput.value = rgbToHex(r, g, b);
            mixerRgb.textContent = `RGB(${r}, ${g}, ${b})`;
        }

        function updateSlidersFromHex(hex) {
            const rgb = hexToRgb(hex);
            if (!rgb) return;
            sliderR.value = String(rgb.r);
            sliderG.value = String(rgb.g);
            sliderB.value = String(rgb.b);
            updateMixerFromSliders();
        }

        function renderPresets() {
            if (userPresets.length === 0) {
                presetList.innerHTML = '<div class="preset-empty">还没有预设，去下方调色吧</div>';
                return;
            }

            presetList.innerHTML = '';
            userPresets.forEach((preset, index) => {
                const chip = document.createElement('div');
                chip.className = 'preset-chip';
                chip.innerHTML = `<div class="preset-dot" style="background:${preset.hex};"></div><span>${preset.name}</span><div class="preset-delete">x</div>`;

                chip.addEventListener('click', (e) => {
                    if (e.target.classList.contains('preset-delete')) return;
                    applyTheme(
                        `linear-gradient(to bottom,${preset.hex} 0%,#ffffff 100%)`,
                        preset.tint, preset.hover, preset.border, preset.hex,
                        `主题已切换为「${preset.name}」`
                    );
                    setActiveSeasonByAccent('');
                });

                const dot = chip.querySelector('.preset-dot');
                if (dot) {
                    dot.addEventListener('dblclick', (e) => {
                        e.stopPropagation();
                        editingPresetIndex = index;
                        presetEditName.value = preset.name;
                        presetEditDot.style.background = preset.hex;
                        presetEditHex.textContent = preset.hex;
                        presetEditOverlay.classList.add('show');
                    });
                }

                const del = chip.querySelector('.preset-delete');
                if (del) {
                    del.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const removed = userPresets.splice(index, 1)[0];
                        saveThemeState();
                        renderPresets();
                        if (removed) showToast(`预设「${removed.name}」已删除`);
                    });
                }

                presetList.appendChild(chip);
            });
        }

        overlay.querySelectorAll('.season-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const key = chip.getAttribute('data-theme');
                const data = themeData[key];
                if (!data) return;
                overlay.querySelectorAll('.season-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                applyTheme(data.bg, data.tint, data.hover, data.border, data.accent, `主题已切换为「${data.name}」`);
            });
        });

        [sliderR, sliderG, sliderB].forEach(el => el.addEventListener('input', updateMixerFromSliders));
        mixerHexInput.addEventListener('input', () => {
            const v = mixerHexInput.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(v)) updateSlidersFromHex(v);
        });
        mixerHexInput.addEventListener('blur', () => {
            let v = mixerHexInput.value.trim();
            if (!v.startsWith('#')) v = `#${v}`;
            updateSlidersFromHex(v);
        });

        applyColorBtn.addEventListener('click', () => {
            const hex = mixerHexInput.value.trim();
            if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
                showToast('请输入合法色值');
                return;
            }
            const r = Number(sliderR.value);
            const g = Number(sliderG.value);
            const b = Number(sliderB.value);
            applyTheme(
                `linear-gradient(to bottom,${hex} 0%,#ffffff 100%)`,
                `rgba(${r},${g},${b},0.18)`,
                `rgba(${r},${g},${b},0.3)`,
                `rgba(${r},${g},${b},0.15)`,
                hex,
                '自定义主题已应用'
            );
            overlay.querySelectorAll('.season-chip').forEach(c => c.classList.remove('active'));
        });

        savePresetBtn.addEventListener('click', () => {
            savePresetRow.classList.toggle('show');
            if (savePresetRow.classList.contains('show')) savePresetInput.focus();
        });

        savePresetConfirm.addEventListener('click', () => {
            const name = savePresetInput.value.trim();
            const hex = mixerHexInput.value.trim();
            if (!name) return;
            if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
                showToast('请输入合法色值');
                return;
            }
            const r = Number(sliderR.value);
            const g = Number(sliderG.value);
            const b = Number(sliderB.value);
            userPresets.push({
                name, hex,
                tint: `rgba(${r},${g},${b},0.18)`,
                hover: `rgba(${r},${g},${b},0.3)`,
                border: `rgba(${r},${g},${b},0.15)`
            });
            saveThemeState();
            renderPresets();
            savePresetInput.value = '';
            savePresetRow.classList.remove('show');
            showToast(`预设「${name}」已保存`);
        });

        savePresetInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') savePresetConfirm.click();
        });

        presetEditOverlay.addEventListener('click', (e) => {
            if (e.target === presetEditOverlay) presetEditOverlay.classList.remove('show');
        });
        presetEditCancel.addEventListener('click', () => presetEditOverlay.classList.remove('show'));
        presetCopyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(presetEditHex.textContent || '');
                showToast('色值已复制');
            } catch (err) {
                showToast('复制失败');
            }
        });
        presetEditSave.addEventListener('click', () => {
            if (editingPresetIndex < 0 || !userPresets[editingPresetIndex]) return;
            const name = presetEditName.value.trim();
            if (!name) return;
            userPresets[editingPresetIndex].name = name;
            saveThemeState();
            renderPresets();
            presetEditOverlay.classList.remove('show');
            showToast(`预设已更名为「${name}」`);
        });

        const saved = DataHub.getStyle() || {};
        if (saved.background) container.style.background = saved.background;
        syncThemeVars(
            saved.themeTint || 'rgba(253,250,240,0.18)',
            saved.themeHover || 'rgba(253,250,240,0.3)',
            saved.themeBorder || 'rgba(192,160,98,0.15)',
            saved.themeAccent || (DataHub.getActiveMask() || {}).themeColor || '#c0a062'
        );
        const activeMask = DataHub.getActiveMask() || {};
        setActiveSeasonByAccent(activeMask.themeColor || saved.themeAccent || '');
        updateSlidersFromHex(activeMask.themeColor || saved.themeAccent || '#FDFCF5');
        renderPresets();
    }

    // ========== 人物关系模块 ==========
    function initRelationModule() {
        const overlay = document.getElementById('relation-map-overlay');
        const btnRelation = document.getElementById('btn-relation-map');
        const canvas = document.getElementById('bubble-canvas');
        const fabAdd = document.getElementById('fab-add');
        const sheet = document.getElementById('bottom-sheet');
        const mask = document.getElementById('sheet-mask');
        const inputName = document.getElementById('input-name');
        const inputRole = document.getElementById('input-role');
        const inputNotes = document.getElementById('input-notes');
        const btnSave = document.getElementById('btn-save');
        const btnDelete = document.getElementById('btn-delete');
        const backBtn = overlay.querySelector('.back-btn');

        if (!overlay || !btnRelation || !canvas || !fabAdd || !sheet || !mask ||
            !inputName || !inputRole || !inputNotes || !btnSave || !btnDelete || !backBtn) {
            console.warn('relation bubble: missing elements');
            return;
        }

        function showToast(message) {
            const container = document.getElementById('toast-container');
            if (!container) return;
            const toast = document.createElement('div');
            toast.className = 'jinyu-toast';
            toast.textContent = message;
            container.appendChild(toast);
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 2200);
        }

        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            });
        }

        function isOverlap(el1, el2, margin = 18) {
            const rect1 = el1.getBoundingClientRect();
            const rect2 = el2.getBoundingClientRect();
            return !(rect1.right + margin < rect2.left ||
                     rect1.left > rect2.right + margin ||
                     rect1.bottom + margin < rect2.top ||
                     rect1.top > rect2.bottom + margin);
        }

        function findNonOverlapPosition(newWidth, newHeight, excludeElement = null, maxAttempts = 60) {
            const canvasRect = canvas.getBoundingClientRect();
            const maxLeft = Math.max(0, canvasRect.width - newWidth - 80);
            const maxTop = Math.max(0, canvasRect.height - newHeight - 20);
            const minLeft = 12;
            const minTop = 55;

            for (let i = 0; i < maxAttempts; i++) {
                const left = minLeft + Math.random() * (maxLeft - minLeft);
                const top = minTop + Math.random() * (maxTop - minTop);
                const testDiv = document.createElement('div');
                testDiv.style.position = 'absolute';
                testDiv.style.width = newWidth + 'px';
                testDiv.style.height = newHeight + 'px';
                testDiv.style.left = left + 'px';
                testDiv.style.top = top + 'px';
                testDiv.style.visibility = 'hidden';
                canvas.appendChild(testDiv);
                let overlapping = false;
                for (let bubble of canvas.querySelectorAll('.bubble')) {
                    if (bubble === excludeElement) continue;
                    if (isOverlap(testDiv, bubble, 22)) {
                        overlapping = true;
                        break;
                    }
                }
                testDiv.remove();
                if (!overlapping) return { left, top };
            }
            return { left: 50, top: 150 };
        }

        function updateBubbleStyle(bubble, isFish) {
            if (isFish) {
                bubble.style.backgroundColor = 'var(--bubble-fish)';
                bubble.setAttribute('data-type', 'fish');
            } else {
                bubble.style.backgroundColor = 'var(--bubble-npc)';
                bubble.setAttribute('data-type', 'npc');
            }
        }

        function getRandomAnimation() {
            const num = Math.floor(Math.random() * 3) + 1;
            return `float${num} ${9 + Math.random() * 5}s ease-in-out infinite`;
        }

        let currentEditNodeId = null;

        function closeSheet() {
            mask.classList.remove('show');
            sheet.classList.remove('show');
            currentEditNodeId = null;
        }

        function openEditSheet(nodeId) {
            const nodes = DataHub.getRelations() || [];
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;

            currentEditNodeId = node.id;
            inputName.value = node.name || '';
            inputRole.value = node.role || '';
            inputNotes.value = node.notes || '';

            const isFish = !!node.isFish;
            document.querySelectorAll('#type-chip-group .chip').forEach(chip => {
                chip.classList.remove('selected');
                const type = chip.getAttribute('data-type');
                if ((isFish && type === 'fish') || (!isFish && type === 'npc')) {
                    chip.classList.add('selected');
                }
            });

            const group = node.group || 'other';
            document.querySelectorAll('#group-chip-group .chip').forEach(chip => {
                chip.classList.remove('selected');
                if (chip.getAttribute('data-group') === group) {
                    chip.classList.add('selected');
                }
            });

            mask.classList.add('show');
            sheet.classList.add('show');
        }

        function openAddSheet() {
            currentEditNodeId = null;
            inputName.value = '';
            inputRole.value = '';
            inputNotes.value = '';

            document.querySelectorAll('#type-chip-group .chip, #group-chip-group .chip').forEach(chip => {
                chip.classList.remove('selected');
            });
            const defaultTypeChip = document.querySelector('#type-chip-group .chip[data-type="npc"]');
            if (defaultTypeChip) defaultTypeChip.classList.add('selected');
            const defaultGroupChip = document.querySelector('#group-chip-group .chip[data-group="other"]');
            if (defaultGroupChip) defaultGroupChip.classList.add('selected');

            mask.classList.add('show');
            sheet.classList.add('show');
        }

        function saveNode() {
            const newName = inputName.value.trim();
            if (!newName) {
                closeSheet();
                return;
            }
            let newRole = inputRole.value.trim();
            const notes = inputNotes.value.trim();

            let isFish = false;
            const selectedTypeChip = document.querySelector('#type-chip-group .chip.selected');
            if (selectedTypeChip && selectedTypeChip.getAttribute('data-type') === 'fish') {
                isFish = true;
            }
            let group = 'other';
            const selectedGroupChip = document.querySelector('#group-chip-group .chip.selected');
            if (selectedGroupChip) {
                group = selectedGroupChip.getAttribute('data-group') || 'other';
            }
            if (!newRole) {
                newRole = isFish ? '故交' : 'NPC';
            }

            const maskId = DataHub.state.activeMaskId;
            let nodeId = currentEditNodeId;

            if (nodeId) {
                const existing = (DataHub.getRelations() || []).find(n => n.id === nodeId);
                if (existing) {
                    DataHub.upsertRelationNode(maskId, {
                        id: nodeId,
                        name: newName,
                        role: newRole,
                        group: group,
                        level: existing.level || 'L2',
                        distanceLabel: existing.distanceLabel || '普通',
                        notes: notes,
                        isFish: isFish,
                        source: existing.source || 'manual_create'
                    }, 'manual_create');
                    if (isFish) {
                        DataHub.promoteRelationToFish(maskId, nodeId);
                    } else {
                        DataHub.demoteRelationToNpc(maskId, nodeId);
                    }
                }
            } else {
                const newId = `rel_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
                const newNode = DataHub.upsertRelationNode(maskId, {
                    id: newId,
                    name: newName,
                    role: newRole,
                    group: group,
                    level: 'L2',
                    distanceLabel: '普通',
                    notes: notes,
                    isFish: isFish,
                    source: 'manual_create'
                }, 'manual_create');
                if (newNode && isFish) {
                    DataHub.promoteRelationToFish(maskId, newId);
                }
            }

            renderBubbles();
            closeSheet();
            showToast(currentEditNodeId ? '已保存' : '已新增');
        }

        function deleteNode() {
            if (!currentEditNodeId) return;
            const maskId = DataHub.state.activeMaskId;
            DataHub.deleteRelationNode(maskId, currentEditNodeId);
            renderBubbles();
            closeSheet();
            showToast('已抹除');
        }

        function renderBubbles() {
            const meBubble = canvas.querySelector('#bubble-me');
            const fab = canvas.querySelector('.fab-add');
            const allBubbles = canvas.querySelectorAll('.bubble');
            allBubbles.forEach(bubble => {
                if (bubble.id !== 'bubble-me' && bubble !== fab) {
                    bubble.remove();
                }
            });

            const nodes = DataHub.getRelations() || [];
            const baseSize = 88;
            const existingBubbles = Array.from(canvas.querySelectorAll('.bubble:not(#bubble-me)'));
            existingBubbles.forEach(bubble => bubble.remove());

            nodes.forEach(node => {
                if (node.id === '__self__') return;
                const isFish = !!node.isFish;
                const name = node.name || '未命名';
                const role = node.role || (isFish ? '故交' : 'NPC');

                const { left, top } = findNonOverlapPosition(baseSize, baseSize, meBubble, 30);
                const bubble = document.createElement('div');
                bubble.className = 'bubble';
                bubble.style.width = baseSize + 'px';
                bubble.style.height = baseSize + 'px';
                bubble.style.left = left + 'px';
                bubble.style.top = top + 'px';
                bubble.style.animation = getRandomAnimation();

                bubble.setAttribute('data-node-id', node.id);
                bubble.innerHTML = `
                    <div class="bubble-name">${escapeHtml(name)}</div>
                    <div class="bubble-role">${escapeHtml(role)}</div>
                `;
                updateBubbleStyle(bubble, isFish);
                bubble.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEditSheet(node.id);
                });
                canvas.appendChild(bubble);
            });
        }

        function bindChipEvents() {
            document.querySelectorAll('#group-chip-group .chip, #type-chip-group .chip').forEach(chip => {
                chip.removeEventListener('click', chip._chipHandler);
                chip._chipHandler = (e) => {
                    e.stopPropagation();
                    const parent = chip.parentElement;
                    parent.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
                    chip.classList.add('selected');
                };
                chip.addEventListener('click', chip._chipHandler);
            });
        }

        function bindCanvasBlank() {
            canvas.addEventListener('click', (e) => {
                if (e.target === canvas || e.target.classList.contains('bubble-canvas')) {
                    closeSheet();
                }
            });
        }

        btnRelation.addEventListener('click', () => {
            renderBubbles();
            bindChipEvents();
        });

        backBtn.addEventListener('click', () => {
            overlay.style.display = 'none';
        });

        fabAdd.addEventListener('click', (e) => {
            e.stopPropagation();
            openAddSheet();
        });

        mask.addEventListener('click', closeSheet);
        btnSave.addEventListener('click', saveNode);
        btnDelete.addEventListener('click', deleteNode);
        bindCanvasBlank();

        window.renderRelationOverlay = renderBubbles;
    }

    // ========== 钱包模块 ==========
    function initWalletModule() {
        const overlay = document.getElementById('wallet-overlay');
        const btnWallet = document.getElementById('btn-wallet');
        const balanceSpan = document.getElementById('wallet-balance-num');
        const deltaSpan = document.getElementById('wallet-delta-text');
        const ledgerContainer = document.getElementById('wallet-ledger-list');
        const searchInput = document.getElementById('wallet-search-input');
        const spinBtn = document.getElementById('wallet-spin-btn');
        const wheel = document.getElementById('wallet-wheel');
        const resultMask = document.getElementById('wallet-result-mask');
        const resultTop = document.getElementById('wallet-result-top');
        const resultAmountSpan = document.getElementById('wallet-result-amount');
        const resultBottom = document.getElementById('wallet-result-bottom');
        const resultOk = document.getElementById('wallet-result-ok');
        const colorPresetsContainer = document.getElementById('walletColorPresets');
        const resetDefaultBtn = document.getElementById('walletResetDefaultBtn');

        if (!overlay || !btnWallet) return;

        const themes = {
            default: { name: '默认米黄', bgLight: '#FEFCF7', textPrimary: '#4F4538', accent: '#B9A87F', accentLight: '#D9CDB5', accentDark: '#BCAC85' },
            spring: { name: '春·青绿', bgLight: '#F0F4F1', textPrimary: '#3A5C4B', accent: '#8AAF82', accentLight: '#B8CFB0', accentDark: '#7D9A70' },
            summer: { name: '夏·粉黛', bgLight: '#FDF2F0', textPrimary: '#8B5E5E', accent: '#D4A0A0', accentLight: '#E6C0C0', accentDark: '#B88787' },
            autumn: { name: '秋·湛蓝', bgLight: '#EDF2F8', textPrimary: '#4F6F8F', accent: '#9CB4CC', accentLight: '#B8CFE0', accentDark: '#8AAAC8' },
            winter: { name: '冬·紫韵', bgLight: '#F0EEF5', textPrimary: '#6B5B8F', accent: '#B8A8D0', accentLight: '#D0C4E5', accentDark: '#A898C0' }
        };

        let currentTheme = themes.default;

        function refreshWalletTheme(theme) {
            const { bgLight, textPrimary, accent, accentLight, accentDark } = theme;

            const card = overlay.querySelector('.balance-card');
            if (card) {
                card.style.background = `linear-gradient(145deg, ${bgLight}30 0%, #FFFFFF 100%)`;
                card.style.boxShadow = `0 12px 28px rgba(0,0,0,0.04), 0 0 0 1px ${accentLight}40 inset, 0 0 0 2px rgba(255,250,240,0.5) inset`;
            }

            const label = overlay.querySelector('.balance-label');
            if (label) label.style.color = accent;

            const balanceNum = overlay.querySelector('#wallet-balance-num');
            if (balanceNum) balanceNum.style.color = textPrimary;
            const balanceSmall = overlay.querySelector('.balance-number small');
            if (balanceSmall) balanceSmall.style.color = accent;

            const delta = overlay.querySelector('#wallet-delta-text');
            if (delta) {
                delta.style.background = `${accentLight}30`;
                delta.style.color = accentDark;
            }

            overlay.querySelectorAll('.corner-tl, .corner-tr, .corner-bl, .corner-br').forEach(c => {
                c.style.borderColor = accentLight;
            });

            const pointer = overlay.querySelector('.wheel-pointer');
            if (pointer) pointer.style.borderTopColor = accentLight;

            const wheelShape = overlay.querySelector('.wheel-shape');
            if (wheelShape) {
                wheelShape.style.background = `radial-gradient(circle at center, ${bgLight}80, #FFFFFF)`;
                wheelShape.style.boxShadow = `0 6px 16px rgba(0,0,0,0.04), 0 0 0 1px ${accentLight} inset`;
            }

            const fanHandle = overlay.querySelector('.fan-handle');
            if (fanHandle) fanHandle.style.background = `linear-gradient(90deg, ${accentLight}, ${accentDark}80, ${accentLight})`;

            let dotStyle = document.getElementById('dynamicFanHandleDot');
            if (dotStyle) dotStyle.remove();
            dotStyle = document.createElement('style');
            dotStyle.id = 'dynamicFanHandleDot';
            dotStyle.textContent = `.fan-handle::after { background: ${accentDark} !important; }`;
            document.head.appendChild(dotStyle);

            if (spinBtn) {
                spinBtn.style.borderColor = accentLight;
                spinBtn.style.color = accentDark;
            }

            if (searchInput) {
                searchInput.style.background = `${accentLight}25`;
                searchInput.style.borderColor = accentLight;
                searchInput.style.color = textPrimary;
            }

            overlay.querySelectorAll('.filter-capsule').forEach(cap => {
                cap.style.borderColor = accentLight;
                if (cap.classList.contains('active')) {
                    cap.style.background = `${accentLight}cc`;
                    cap.style.color = textPrimary;
                } else {
                    cap.style.background = `${accentLight}30`;
                    cap.style.color = accentDark;
                }
            });

            const lines = overlay.querySelectorAll('.lines-svg line');
            if (lines.length >= 2) {
                lines[0].setAttribute('stroke', accentLight);
                lines[1].setAttribute('stroke', accentLight);
            }

            const nail = overlay.querySelector('.nail');
            if (nail) {
                nail.style.background = `radial-gradient(circle at 30% 30%, ${accentLight}, ${accentDark})`;
                nail.style.border = `0.5px solid ${accentDark}70`;
            }

            let globalStyle = document.getElementById('walletFullThemeStyle');
            if (globalStyle) globalStyle.remove();
            globalStyle = document.createElement('style');
            globalStyle.id = 'walletFullThemeStyle';
            globalStyle.textContent = `
                #wallet-ledger-list .ledger-card {
                    background: linear-gradient(135deg, ${bgLight}50, #FFFFFF) !important;
                    border-color: ${accentLight}80 !important;
                    box-shadow: 2px 2px 8px rgba(0,0,0,0.03), -1px -1px 0 ${accentLight}30 !important;
                }
                #wallet-ledger-list .ledger-card .card-type { color: ${accentDark} !important; }
                #wallet-ledger-list .ledger-card .card-amount { color: ${accentDark} !important; }
                #wallet-ledger-list .ledger-card .card-remark { color: ${accent} !important; }
                #wallet-ledger-list .ledger-card .card-time { color: ${accentLight} !important; }
                .empty-ledger { color: ${accent} !important; background: ${bgLight}80 !important; }
                .filter-bar { border-bottom-color: ${accentLight}60 !important; }
                .lottery-card { border-color: ${accentLight} !important; background: rgba(255,255,255,0.98) !important; }
                .lottery-blessing { color: ${accentLight} !important; }
                .lottery-amount { color: ${accentDark} !important; }
                .lottery-meaning { color: ${accent} !important; }
                .lottery-btn { background: ${accentLight}30 !important; color: ${accentDark} !important; }
                .lottery-btn:active { background: ${accentLight} !important; color: white !important; }
            `;
            document.head.appendChild(globalStyle);
        }

        function buildColorPresets() {
            if (!colorPresetsContainer) return;
            colorPresetsContainer.innerHTML = '';
            const list = [themes.spring, themes.summer, themes.autumn, themes.winter];
            list.forEach(th => {
                const dot = document.createElement('div');
                dot.className = 'color-dot';
                dot.style.backgroundColor = th.bgLight;
                dot.style.width = '22px';
                dot.style.height = '22px';
                dot.style.borderRadius = '50%';
                dot.style.cursor = 'pointer';
                dot.style.border = '1px solid rgba(0,0,0,0.1)';
                dot.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                dot.addEventListener('click', () => {
                    document.querySelectorAll('#walletColorPresets .color-dot').forEach(d => {
                        d.classList.remove('selected');
                        d.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                        d.style.border = '1px solid rgba(0,0,0,0.1)';
                    });
                    dot.classList.add('selected');
                    dot.style.boxShadow = `0 0 0 2px ${th.accentLight}`;
                    dot.style.border = `1px solid ${th.accentDark}`;

                    currentTheme = th;
                    refreshWalletTheme(th);
                    renderLedger();
                });
                colorPresetsContainer.appendChild(dot);
            });
        }

        if (resetDefaultBtn) {
            resetDefaultBtn.addEventListener('click', () => {
                currentTheme = themes.default;
                refreshWalletTheme(themes.default);
                renderLedger();
            });
        }

        buildColorPresets();
        refreshWalletTheme(themes.default);

        const prizeList = [
            [101, '遥遥爱意'], [520, '吾爱恋你'], [666, '六六大顺'], [888, '发发发'],
            [1314, '一生一世'], [1111, '一心一意'], [901, '就你一人'], [909, '久久长长']
        ];
        const blessings = [
            '好运BUFF已叠满', '这泼天富贵终于轮到我了', '有钱啦!', '幸福~!',
            '今日份好运已送达', '酱酱酱奖', '总有一些小惊喜和小开心'
        ];

        let currentRotation = 0;
        let isSpinning = false;
        let activeFilter = 'all';
        let searchKeyword = '';

        function formatTime(ts) {
            const d = new Date(ts);
            return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
        }

        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]);
        }

        function renderLedger() {
            const wallet = DataHub.getWallet() || { balance: 0, ledger: [] };
            let filtered = [...(wallet.ledger || [])];
            filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            filtered = filtered.filter(item => {
                if (activeFilter === 'all') return true;
                if (activeFilter === 'income') return item.type === 'spin_income' || item.type === 'incoming_transfer';
                if (activeFilter === 'expense') return item.type === 'outgoing_transfer';
                if (item.type !== activeFilter) return false;
                if (!searchKeyword) return true;
                const kw = searchKeyword.toLowerCase();
                return (item.remark || '').toLowerCase().includes(kw) ||
                       (item.meaning || '').toLowerCase().includes(kw) ||
                       (item.contactName || '').toLowerCase().includes(kw);
            });
            if (filtered.length === 0) {
                ledgerContainer.innerHTML = '<div class="empty-ledger" style="text-align:center;padding:40px 12px;font-size:11px;">流水缄默，暂无记录</div>';
            } else {
                let html = '';
                filtered.forEach(item => {
                    let typeText = '', prefix = '';
                    const amountVal = Number(item.amount) || 0;
                    if (item.type === 'outgoing_transfer') {
                        typeText = `转给 ${item.contactName || '友人'}`;
                        prefix = '-';
                    } else if (item.type === 'incoming_transfer') {
                        typeText = `来自 ${item.contactName || '知己'}`;
                        prefix = '+';
                    } else {
                        typeText = '团扇祥瑞';
                        prefix = '+';
                    }
                    const remarkText = item.remark || item.meaning || '';
                    html += `
                        <div class="ledger-card" style="background:linear-gradient(135deg,#FDF9F0,#FFFFFF);padding:12px 14px;border:1px solid #E8E0D0;">
                            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                                <div class="card-type" style="font-size:12px;">${escapeHtml(typeText)}</div>
                                <div class="card-amount" style="font-size:16px;">${prefix} ${Math.abs(amountVal)}</div>
                            </div>
                            ${remarkText ? `<div class="card-remark" style="font-size:10px;margin-bottom:4px;">${escapeHtml(remarkText)}</div>` : ''}
                        <div class="card-time" style="font-size:9px;text-align:right;">${formatTime(item.timestamp)}</div>
                        </div>
                    `;
                });
                ledgerContainer.innerHTML = html;
            }
            refreshWalletTheme(currentTheme);
        }

        function updateBalanceUI() {
            const wallet = DataHub.getWallet() || { balance: 0, ledger: [] };
            balanceSpan.innerText = Math.round(wallet.balance || 0);
            const todayStart = new Date();
            todayStart.setHours(0,0,0,0);
            let todayDelta = 0;
            (wallet.ledger || []).forEach(item => {
                if (item.timestamp >= todayStart.getTime()) {
                    let amt = Number(item.amount);
                    if (item.type === 'outgoing_transfer') amt = -amt;
                    todayDelta += amt;
                }
            });
            deltaSpan.innerText = todayDelta >= 0 ? `今日 +${Math.abs(Math.round(todayDelta))} 元` : `今日 -${Math.abs(Math.round(todayDelta))} 元`;
        }

        function addLedgerItem(type, amount, extra = {}) {
            const wallet = DataHub.getWallet() || { balance: 0, ledger: [] };
            const newItem = { id: Date.now() + '_' + Math.random(), type, amount, timestamp: Date.now(), ...extra };
            DataHub.updateWallet(DataHub.state.activeMaskId, {
                balance: (wallet.balance || 0) + amount,
                ledger: [newItem, ...(wallet.ledger || [])]
            });
            renderLedger();
            updateBalanceUI();
        }

        function showLottery(amount, meaning, blessing) {
            resultTop.innerText = blessing;
            resultAmountSpan.innerText = amount;
            resultBottom.innerText = meaning;
            resultMask.style.visibility = 'visible';
            resultMask.style.opacity = '1';
        }

        function closeLottery() {
            resultMask.style.visibility = 'hidden';
            resultMask.style.opacity = '0';
        }

        function doSpin() {
            if (isSpinning) return;
            isSpinning = true;
            spinBtn.disabled = true;
            const prize = prizeList[Math.floor(Math.random() * prizeList.length)];
            const amount = prize[0];
            const meaning = prize[1];
            const blessing = blessings[Math.floor(Math.random() * blessings.length)];
            const extraSpins = 4 + Math.floor(Math.random() * 3);
            const stopAngle = Math.floor(Math.random() * 360);
            currentRotation += extraSpins * 360 + stopAngle;
            wheel.style.transform = `rotate(${currentRotation}deg)`;
            setTimeout(() => {
                addLedgerItem('spin_income', amount, { remark: blessing, meaning: meaning });
                showLottery(amount, meaning, blessing);
                isSpinning = false;
                spinBtn.disabled = false;
            }, 1500);
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchKeyword = e.target.value.toLowerCase();
                renderLedger();
            });
        }

        const filterBar = document.querySelector('#wallet-overlay .filter-group');
        if (filterBar) {
            filterBar.onclick = (e) => {
                const btn = e.target.closest('.filter-capsule');
                if (!btn) return;

                filterBar.querySelectorAll('.filter-capsule').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                activeFilter = btn.getAttribute('data-wallet-filter') || 'all';
                renderLedger();
            };
        }

        const btnClearLedger = document.getElementById('btn-clear-ledger');
        if (btnClearLedger) {
            btnClearLedger.addEventListener('click', () => {
                const wallet = DataHub.getWallet() || { balance: 0, ledger: [] };
                DataHub.updateWallet(DataHub.state.activeMaskId, {
                    balance: wallet.balance,
                    ledger: []
                });
                renderLedger();
            });
        }

        spinBtn.addEventListener('click', doSpin);
        resultOk.addEventListener('click', closeLottery);
        if (resultMask) {
            resultMask.addEventListener('click', (e) => { if (e.target === resultMask) closeLottery(); });
        }

        btnWallet.addEventListener('click', () => {
            renderLedger();
            updateBalanceUI();
            refreshWalletTheme(currentTheme);
        });

        window.refreshWalletUI = function () {
            renderLedger();
            updateBalanceUI();
        };

        renderLedger();
        updateBalanceUI();
        refreshWalletTheme(currentTheme);
    }

    // ========== 初始化 ==========
    initThemeSettingsModule();
    initRelationModule();
    initWalletModule();


    // ======================== 联系人列表渲染 ========================
window.renderContactList = function() {
    const container = document.getElementById('contact-list-container');
    if (!container) {
        console.warn('[renderContactList] 容器不存在');
        return;
    }

    const contacts = window.contactStore ? window.contactStore.getContacts() : [];
    console.log('[renderContactList] 渲染', contacts.length, '个联系人');

    if (contacts.length === 0) {
        container.innerHTML = `
            <div style="width:100%;text-align:center;padding:60px 20px;color:#ccc;font-size:14px;letter-spacing:2px;">
                <div style="margin-bottom:12px;"></div>
                暂无故交<br>
                <span style="font-size:12px;color:#ddd;">去鱼塘添加几位吧</span>
            </div>
        `;
        return;
    }

    let html = '';
    contacts.forEach(contact => {
        const name = contact.name || '未命名';
        const role = contact.role || '故交';
        const lastMsg = contact.lastMessage || '暂无消息';
        const avatar = contact.avatar || '';
        const time = contact.timestamp ? new Date(contact.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

        const avatarHtml = avatar
            ? `<img src="${avatar}" alt="${name}">`
            : `<span style="font-size:18px;opacity:0.5;">${name.charAt(0)}</span>`;

        html += `
            <div class="contact-item" data-contact-id="${contact.id}">
                <div class="contact-item-avatar">${avatarHtml}</div>
                <div class="contact-item-info">
                    <div class="contact-item-name">${escapeHtml(name)}</div>
                    <div class="contact-item-last-message">${escapeHtml(lastMsg)}</div>
                </div>
                ${time ? `<div class="contact-item-time">${time}</div>` : ''}
            </div>
        `;
    });

    container.innerHTML = html;

    // 点击联系人跳转到聊天
container.querySelectorAll('.contact-item').forEach(item => {
    item.addEventListener('click', function() {
        const contactId = this.getAttribute('data-contact-id');
        if (contactId) {
            // B → C：跳转到聊天详情页
       window.location.href = 'detail/detail.html?contactId=' + encodeURIComponent(contactId);
        }
    });
});
};

// 辅助函数
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// 页面加载时自动渲染
document.addEventListener('DOMContentLoaded', function() {
    // 延迟执行，确保数据已加载
    setTimeout(function() {
        if (typeof window.renderContactList === 'function') {
            window.renderContactList();
        }
    }, 300);
});

// 监听数据变化
if (window.EventBus) {
    window.EventBus.on('DATA_CHANGED', function() {
        setTimeout(function() {
            if (typeof window.renderContactList === 'function') {
                window.renderContactList();
            }
        }, 200);
    });
}
})();