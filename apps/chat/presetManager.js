(() => {
    let currentEditId = null;
    let backupMaskState = null;
    let isCustomImage = false;
    let customImageData = null;

    const presetOverlayEl = document.getElementById('preset-manager-overlay');
    const editPageEl = document.getElementById('editPage');
    const editAvatarCanvas = document.getElementById('editAvatarCanvas');
    const editCtx = editAvatarCanvas ? editAvatarCanvas.getContext('2d') : null;

    function ensureRoundRect() {
        if (!window.CanvasRenderingContext2D) return;
        if (CanvasRenderingContext2D.prototype.roundRect) return;
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            this.moveTo(x + r, y);
            this.lineTo(x + w - r, y);
            this.quadraticCurveTo(x + w, y, x + w, y + r);
            this.lineTo(x + w, y + h - r);
            this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            this.lineTo(x + r, y + h);
            this.quadraticCurveTo(x, y + h, x, y + h - r);
            this.lineTo(x, y + r);
            this.quadraticCurveTo(x, y, x + r, y);
            return this;
        };
    }
    ensureRoundRect();

    function hexToRgb(colorStr) {
        let hex = (colorStr || '#f3dde4').replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (!/^[0-9A-Fa-f]{6}$/.test(hex)) hex = 'f3dde4';
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16)
        };
    }

    function mixColor(hex1, hex2, weight) {
        const a = hexToRgb(hex1);
        const b = hexToRgb(hex2);
        const r = Math.round(a.r * (1 - weight) + b.r * weight);
        const g = Math.round(a.g * (1 - weight) + b.g * weight);
        const bl = Math.round(a.b * (1 - weight) + b.b * weight);
        return '#' + (1 << 24 | r << 16 | g << 8 | bl).toString(16).slice(1);
    }

    function generateThemePalette(baseHex) {
        const cleanHex = /^#[0-9A-Fa-f]{6}$/.test(baseHex || '') ? baseHex : '#f3dde4';
        const WHITE = '#FFFFFF';
        const INK = '#4A423F';
        return {
            gradStart: cleanHex,
            sealColor: mixColor(cleanHex, INK, 0.25),
            flapColor: mixColor(cleanHex, WHITE, 0.50),
            secretColor: mixColor(cleanHex, INK, 0.40),
            nameColor: mixColor(cleanHex, INK, 0.75),
            roleColor: mixColor(cleanHex, INK, 0.55),
            arrowColor: mixColor(cleanHex, INK, 0.30),
            avatarStart: cleanHex,
            avatarEnd: '#ffffff',
            labelColor: mixColor(cleanHex, INK, 0.45),
            textColor: mixColor(cleanHex, INK, 0.65),
            borderLeftColor: mixColor(cleanHex, INK, 0.20),
            dividerColor: mixColor(cleanHex, INK, 0.10),
            applyBg: mixColor(cleanHex, INK, 0.30),
            editHeaderBorder: mixColor(cleanHex, WHITE, 0.65),
            editSwatchActiveBorder: mixColor(cleanHex, INK, 0.20),
            editInputBottomBorder: mixColor(cleanHex, INK, 0.18)
        };
    }

    function applyPresetTheme(baseHex) {
        const palette = generateThemePalette(baseHex);
        const targets = [presetOverlayEl, editPageEl, document.getElementById('customModal')];
        targets.forEach(el => {
            if (!el) return;
            el.style.setProperty('--theme-main', baseHex);
            el.style.setProperty('--theme-border', palette.editInputBottomBorder);
            el.style.setProperty('--theme-header-bg', palette.editHeaderBorder);
            el.style.setProperty('--theme-text', palette.nameColor);
            el.style.setProperty('--theme-active', palette.editSwatchActiveBorder);
            el.style.setProperty('--theme-apply-bg', palette.applyBg);
            el.style.setProperty('--theme-secret', palette.labelColor);
        });
    }

    function escapeHtml(str) {
        return str ? str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])) : '';
    }

    function showCustomModal(title, msg, showCancel = false) {
        return new Promise((resolve) => {
            const overlay = document.getElementById('customModal');
            const titleEl = document.getElementById('modalTitle');
            const msgEl = document.getElementById('modalMessage');
            const btnCancel = document.getElementById('modalBtnCancel');
            const btnConfirm = document.getElementById('modalBtnConfirm');
            if (!overlay || !titleEl || !msgEl || !btnCancel || !btnConfirm) {
                resolve(false);
                return;
            }

            titleEl.textContent = title;
            msgEl.innerHTML = msg;
            btnCancel.style.display = showCancel ? 'block' : 'none';

            overlay.style.display = 'flex';
            setTimeout(() => overlay.classList.add('show'), 10);

            const closeBox = (result) => {
                overlay.classList.remove('show');
                setTimeout(() => {
                    overlay.style.display = 'none';
                    resolve(result);
                }, 220);
            };

            btnConfirm.onclick = () => closeBox(true);
            btnCancel.onclick = () => closeBox(false);
        });
    }

    function parseToDossier(rawText, labelColor, textColor, borderLeftColor) {
        if (!rawText) return '<div style="padding:8px 0; color:#aaa;">暂无笔墨记录</div>';
        const lines = String(rawText).split('\n');
        let html = '';
        for (let line of lines) {
            line = line.trim();
            if (!line || line === '---') continue;
            const match = line.match(/^(?:[·\-\*]\s*)?(?:【([^】]+)】|\[([^\]]+)\]|([^：:]+)[：:])\s*(.*)$/);
            if (match) {
                const label = match[1] || match[2] || match[3];
                const value = match[4];
                if (value) {
                    html += `<div class="archive-row"><span class="archive-label" style="color: ${labelColor};">${escapeHtml(label)}</span><span class="archive-value" style="color: ${textColor};">${escapeHtml(value)}</span></div>`;
                } else {
                    html += `<div class="archive-row" style="margin-top:8px;"><span class="archive-label" style="color: ${labelColor};">${escapeHtml(label)}</span></div>`;
                }
            } else {
                html += `<div class="archive-paragraph" style="border-left-color: ${borderLeftColor}; color: ${textColor};">${escapeHtml(line)}</div>`;
            }
        }
        return html;
    }

    function getPresetMasks() {
        return Object.values(DataHub.state.masks || {});
    }

    function getSearchValue() {
        const input = document.getElementById('searchInput');
        return input ? input.value.trim().toLowerCase() : '';
    }

    function renderAllEnvelopes(filterText = '') {
        const container = document.getElementById('envelopeList');
        if (!container) return;
        container.innerHTML = '';

        const keyword = (filterText || '').trim().toLowerCase();
        const masks = getPresetMasks().filter(m => {
            if (!keyword) return true;
            const pool = [m.name || '', m.role || '', m.world || '', m.rawText || m.letterText || ''].join(' ').toLowerCase();
            return pool.includes(keyword);
        });

        masks.forEach(p => {
            const palette = generateThemePalette(p.themeColor || '#f8f4e3');
            const isApplied = p.id === DataHub.state.activeMaskId;
            const env = document.createElement('div');
            env.className = 'envelope' + (isApplied ? ' is-applied' : '');

            const surfaceGradient = `linear-gradient(135deg, ${palette.gradStart}, #ffffff)`;
            const outerStyle = isApplied
                ? `transform: translateY(-16px) scale(1.02); z-index:10; transition: all .5s cubic-bezier(.34,1.56,.64,1); filter: drop-shadow(0 16px 32px rgba(0,0,0,.15)) drop-shadow(0 10px 20px ${palette.gradStart}80);`
                : `transform: translateY(0) scale(1); z-index:1; filter: drop-shadow(0 2px 6px rgba(0,0,0,.04)); transition: all .4s cubic-bezier(.34,1.56,.64,1);`;
            const bodyBoxShadow = isApplied
                ? `inset 0 2px 8px rgba(255,255,255,1), inset 0 0 0 1px rgba(255,255,255,.8)`
                : `inset 0 1px 2px rgba(255,255,255,.7), inset 0 0 0 1px rgba(255,255,255,.4)`;

            const avatarStyle = p.avatar
                ? `background-image: url(${p.avatar});`
                : `background: linear-gradient(135deg, ${palette.avatarStart}, ${palette.avatarEnd});`;
            const dossierHtml = parseToDossier(p.rawText || p.letterText || '', palette.labelColor, palette.textColor, palette.borderLeftColor);

            env.innerHTML = `
                <div class="envelope-outer" style="${outerStyle}">
                    <div class="envelope-body" style="background: ${surfaceGradient}; box-shadow: ${bodyBoxShadow}; transition: box-shadow .4s ease;">
                        <div class="envelope-flap" style="border-top-color: ${palette.flapColor};"></div>
                        <div class="wax-seal" style="background: ${palette.sealColor};">${escapeHtml((p.seal || p.name || '设').charAt(0))}</div>
                        <div class="secret-content" style="color: ${palette.secretColor};">绝密卷宗</div>
                        <div class="real-content">
                            <div class="envelope-avatar" style="${avatarStyle}"></div>
                            <div class="envelope-info">
                                <div class="envelope-name" style="color: ${palette.nameColor};">${escapeHtml(p.name || '未命名')}</div>
                                <div class="envelope-role" style="color: ${palette.roleColor};">${escapeHtml(p.role || '未知')}</div>
                            </div>
                            <div class="envelope-arrow" style="color: ${palette.arrowColor};">›</div>
                        </div>
                    </div>
                    <div class="letter-content">
                        <div class="letter-inner" style="background:#fff;">
                            <div class="letter-text">${dossierHtml}</div>
                            <div class="letter-actions" style="border-top-color: ${palette.dividerColor};">
                                <button class="action-btn apply-btn" style="background: ${palette.applyBg};">${isApplied ? '已启用' : '启用此卷'}</button>
                                <button class="action-btn edit-btn">修缮</button>
                                <button class="action-btn delete-btn">销毁</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            env.querySelector('.envelope-body').addEventListener('click', () => env.classList.toggle('open'));

            env.querySelector('.apply-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (isApplied) {
                    await showCustomModal('提醒', '该角色当前已启用。');
                    return;
                }
                
                DataHub.switchMask(p.id);
                
                const activeMask = DataHub.getActiveMask();
                DataHub.setActiveAvatar((activeMask && activeMask.avatar) || '');
                
                if (typeof window.renderUserProfile === 'function') window.renderUserProfile();
                if (typeof window.renderContactList === 'function') window.renderContactList();
                if (typeof window.refreshAllAvatars === 'function') window.refreshAllAvatars();
                
                renderAllEnvelopes(getSearchValue());
                if (typeof window.refreshWalletUI === 'function') window.refreshWalletUI();
                
                await showCustomModal('卷宗切换', `已启用【${escapeHtml(p.name || '未命名')}】。`);
            });

            env.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openEditPanel(p.id);
            });
            env.querySelector('.delete-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (p.id === 'jinyu' || p.id === 'songzhi') {
                    await showCustomModal('提醒', '系统预设不可删除。');
                    return;
                }
                if (p.id === DataHub.state.activeMaskId) {
                    await showCustomModal('提醒', '当前正在使用该角色，无法删除。');
                    return;
                }
                applyPresetTheme(p.themeColor || '#f3dde4');
                const confirmed = await showCustomModal('销毁确认', `是否将【${escapeHtml(p.name || '未命名')}】的档案付之一炬？`, true);
                if (!confirmed) return;
                delete DataHub.state.masks[p.id];
                DataHub.save();
                renderAllEnvelopes(getSearchValue());
            });

            container.appendChild(env);
        });
    }

    function drawSolidAvatar(palette) {
        if (!editCtx) return;
        editCtx.clearRect(0, 0, 76, 76);
        const grad = editCtx.createLinearGradient(0, 0, 76, 76);
        grad.addColorStop(0, palette.avatarStart);
        grad.addColorStop(1, palette.avatarEnd);
        editCtx.fillStyle = grad;
        editCtx.beginPath();
        editCtx.roundRect(0, 0, 76, 76, 22);
        editCtx.fill();
    }

    function drawImageAvatar(imgDataUrl) {
        if (!editCtx) return;
        const img = new Image();
        img.onload = function() {
            editCtx.clearRect(0, 0, 76, 76);
            editCtx.save();
            editCtx.beginPath();
            editCtx.roundRect(0, 0, 76, 76, 22);
            editCtx.clip();
            editCtx.drawImage(img, 0, 0, 76, 76);
            editCtx.restore();
        };
        img.src = imgDataUrl;
    }

    function syncEditState(hex) {
        const clean = /^#[0-9A-Fa-f]{6}$/.test(hex || '') ? hex : '#f8f4e3';
        applyPresetTheme(clean);
        if (!isCustomImage) drawSolidAvatar(generateThemePalette(clean));

        if (currentEditId && DataHub.state.masks[currentEditId]) {
            DataHub.state.masks[currentEditId].themeColor = clean;
            renderAllEnvelopes(getSearchValue());
        }
    }

    function openEditPanel(id) {
        currentEditId = id;
        const p = DataHub.state.masks[id];
        if (!p || !editPageEl) return;

        backupMaskState = JSON.parse(JSON.stringify(p));

        document.getElementById('editName').value = p.name || '';
        document.getElementById('editRole').value = p.role || '';
        document.getElementById('editColor').value = p.themeColor || '#f8f4e3';
        document.getElementById('editRawText').value = p.rawText || p.letterText || '';
        document.getElementById('editTitle').textContent = p.name || '撰写机密';

        isCustomImage = !!p.avatar;
        customImageData = p.avatar || null;
        if (isCustomImage) drawImageAvatar(customImageData);

        document.querySelectorAll('.color-swatch').forEach(sw => {
            if (sw.getAttribute('data-color').toUpperCase() === (p.themeColor || '').toUpperCase()) sw.classList.add('active');
            else sw.classList.remove('active');
        });

        syncEditState(p.themeColor || '#f8f4e3');
        editPageEl.classList.add('show');
    }

    function closeEditPanel(restoreBackup = false) {
        if (!editPageEl) return;
        editPageEl.classList.remove('show');
        if (restoreBackup && backupMaskState && currentEditId) {
            DataHub.state.masks[currentEditId] = backupMaskState;
            DataHub.save();
            renderAllEnvelopes(getSearchValue());
            if (currentEditId === DataHub.state.activeMaskId) {
                DataHub.setActiveAvatar(backupMaskState.avatar || '');
                if (typeof window.renderUserProfile === 'function') window.renderUserProfile();
                if (typeof window.renderContactList === 'function') window.renderContactList();
            }
        }
        currentEditId = null;
        backupMaskState = null;
    }

    const searchInputEl = document.getElementById('searchInput');
    if (searchInputEl) {
        searchInputEl.addEventListener('input', (e) => renderAllEnvelopes((e.target.value || '').trim().toLowerCase()));
    }

    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const newId = 'preset_' + Date.now();
            const newMask = DataHub.ensureMaskShape({
                id: newId,
                name: '无名氏',
                role: '初临此境',
                world: '现代',
                themeColor: '#f8f4e3',
                seal: '无',
                avatar: null,
                rawText: '【核心身份】待书\n【性格侧写】待书\n【过往经历】\n空白卷宗。',
                letterText: '【核心身份】待书\n【性格侧写】待书\n【过往经历】\n空白卷宗。'
            });
            DataHub.state.masks[newId] = newMask;
            DataHub.save();
            renderAllEnvelopes(getSearchValue());
            openEditPanel(newId);
        });
    }

    const closeEditBtn = document.getElementById('closeEditBtn');
    if (closeEditBtn) {
        closeEditBtn.addEventListener('click', async () => {
            const confirmed = await showCustomModal('暂存放弃', '所做修缮将不留痕迹，是否退离？', true);
            if (confirmed) closeEditPanel(true);
        });
    }

    const saveEditBtn = document.getElementById('saveEditBtn');
    if (saveEditBtn) {
       saveEditBtn.addEventListener('click', async () => {
            if (!currentEditId || !DataHub.state.masks[currentEditId]) return;
            const p = DataHub.state.masks[currentEditId];
            p.name = document.getElementById('editName').value.trim() || '无名';
            p.seal = p.name.charAt(0);
            p.role = document.getElementById('editRole').value.trim() || '未知';
            p.themeColor = document.getElementById('editColor').value.trim();
            p.rawText = document.getElementById('editRawText').value;
            p.letterText = p.rawText;
            p.avatar = (isCustomImage && customImageData) ? customImageData : null;
            DataHub.save();

            const wasActive = currentEditId === DataHub.state.activeMaskId;
            closeEditPanel(false);
            renderAllEnvelopes(getSearchValue());
            if (wasActive) {
                DataHub.setActiveAvatar(p.avatar || '');
            }
            if (typeof window.renderUserProfile === 'function') window.renderUserProfile();
            if (typeof window.renderContactList === 'function') window.renderContactList();
            if (typeof window.refreshWalletUI === 'function') window.refreshWalletUI();
            await showCustomModal('卷宗封存', '墨迹已干，档案已稳妥归位。');
        });
    }

    const editColorInput = document.getElementById('editColor');
    if (editColorInput) {
        document.querySelectorAll('.color-swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                const color = sw.getAttribute('data-color');
                editColorInput.value = color;
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                sw.classList.add('active');
                syncEditState(color);
            });
        });

        editColorInput.addEventListener('change', function() {
            const newColor = this.value.trim();
            if (/^#([A-Fa-f0-9]{6})$/.test(newColor)) {
                document.querySelectorAll('.color-swatch').forEach(sw => {
                    if (sw.getAttribute('data-color').toUpperCase() === newColor.toUpperCase()) sw.classList.add('active');
                    else sw.classList.remove('active');
                });
                syncEditState(newColor);
            } else {
                this.value = backupMaskState ? backupMaskState.themeColor : '#f8f4e3';
            }
        });
    }

    const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
    const resetAvatarBtn = document.getElementById('resetAvatarBtn');
    const avatarInput = document.getElementById('avatarInput');
    if (uploadAvatarBtn && avatarInput) {
        uploadAvatarBtn.addEventListener('click', () => avatarInput.click());
    }
    if (resetAvatarBtn) {
        resetAvatarBtn.addEventListener('click', () => {
            isCustomImage = false;
            customImageData = null;
            syncEditState(document.getElementById('editColor').value);
        });
    }
    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    customImageData = evt.target.result;
                    isCustomImage = true;
                    drawImageAvatar(customImageData);
                };
                reader.readAsDataURL(file);
            }
            e.target.value = '';
        });
    }

    const importTxtBtn = document.getElementById('importTxtBtn');
    const txtFileInput = document.getElementById('txtFileInput');
    if (importTxtBtn && txtFileInput) {
        importTxtBtn.addEventListener('click', () => txtFileInput.click());
        txtFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type === 'text/plain') {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    document.getElementById('editRawText').value = evt.target.result;
                };
                reader.readAsText(file, 'UTF-8');
            }
            e.target.value = '';
        });
    }

       const btnMaskManagement = document.getElementById('btn-mask-management');
    if (btnMaskManagement) {
        btnMaskManagement.addEventListener('click', () => {
            applyPresetTheme((DataHub.getActiveMask() || {}).themeColor || '#f3dde4');
            renderAllEnvelopes(getSearchValue());
        });
    }

    // ===== 暴露给外部调用 =====
    window.presetManager = {
        renderAllEnvelopes: function(filterText) {
            console.log('[presetManager] 外部调用 renderAllEnvelopes');
            var keyword = filterText !== undefined ? filterText : getSearchValue();
            renderAllEnvelopes(keyword);
        },
        getSearchValue: getSearchValue
    };

    // 监听头像更新事件
    window.addEventListener('preset-avatar-updated', function(e) {
        console.log('[presetManager] 收到头像更新事件，刷新列表');
        renderAllEnvelopes(getSearchValue());
    });

})();