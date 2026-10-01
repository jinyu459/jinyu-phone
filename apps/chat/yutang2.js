if (window.self !== window.top) {
        document.body.classList.add('embed-mode');
    }
    // ===== 数据 =====
    const fishesData = [];



    let selectedFishData = null;
    let selectedFishEl = null;
    let animFrameId = null;
    let isPondReady = false;
    let currentEditId = null;
    let pickedColor = 'rgba(248,241,229,0.88)';
    let pickedType = 'fish-gold';
    const recycleBin = [];
    let isSyncing = false;

 
    const pond = document.getElementById('fish-pond');
    const sheetOverlay = document.getElementById('sheetOverlay');
    const newFishSheet = document.getElementById('newFishSheet');
    const detailSheet = document.getElementById('detail-sheet');
    const recycleSheet = document.getElementById('recycleSheet');
    const editPage = document.getElementById('editPage');
    const recycleBtn = document.getElementById('recycleBtn');
    const recycleListEl = document.getElementById('recycleList');
    const recycleClearBtn = document.getElementById('recycleClearBtn');
    const editColorPreview = document.getElementById('editColorPreview');
    const editColorDots = document.getElementById('editColorDots');
    const editColorHex = document.getElementById('editColorHex');
    const editColorApply = document.getElementById('editColorApply');
    const hostDataHub = (() => {
        try {
            if (window.parent && window.parent !== window && window.parent.DataHub) return window.parent.DataHub;
        } catch (e) {}
        return null;
    })();
    let lastHubSyncKey = '';

    function redrawFishPond() {
        if (!pond) return;
        const ripple = pond.querySelector('.water-ripple');
        pond.innerHTML = '';
        if (ripple) pond.appendChild(ripple);
        fishesData.forEach(d => createFishEl(d));
        applyFilter();
        if (!animFrameId) animate();
        isPondReady = true;
    }

    function makeHubSyncKey(relations = [], activeMaskId = '') {
        const core = relations
            .filter(node => node && node.isFish)
            .map(node => `${node.id}|${node.name || ''}|${node.role || ''}|${node.group || 'other'}|${node.contactId || ''}|${node.isFish ? 1 : 0}`)
            .sort()
            .join(';');
        return `${activeMaskId}::${core}`;
    }

    function mapFishType(rawType) {
        return rawType === 'fish-pink' || rawType === 'fish-blue' || rawType === 'fish-gold' ? rawType : 'fish-gold';
    }

    const editColorPresets = [
        { type: 'fish-gold', color: 'rgba(248,241,229,0.88)' },
        { type: 'fish-pink', color: 'rgba(252,235,236,0.88)' },
        { type: 'fish-blue', color: 'rgba(236,242,245,0.88)' },
        { type: 'fish-custom', color: 'rgba(220,232,220,0.88)' },
        { type: 'fish-custom', color: 'rgba(235,225,245,0.88)' }
    ];
    const editColorState = { type: 'fish-gold', customColor: '' };

    function getTypeBaseColor(type) {
        const colorMap = {
            'fish-gold': 'rgba(248,241,229,0.88)',
            'fish-pink': 'rgba(252,235,236,0.88)',
            'fish-blue': 'rgba(236,242,245,0.88)'
        };
        return colorMap[type] || 'rgba(248,241,229,0.88)';
    }

    function syncEditColorUI() {
        if (editColorPreview) {
            const previewColor = editColorState.customColor || getTypeBaseColor(editColorState.type);
            editColorPreview.style.background = previewColor;
        }
        if (editColorHex) {
            editColorHex.value = editColorState.customColor || '';
        }
        if (editColorDots) {
            editColorDots.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('selected'));
            if (!editColorState.customColor) {
                const active = editColorDots.querySelector(`.color-dot[data-type="${editColorState.type}"]`);
                if (active) active.classList.add('selected');
            }
        }
    }

    function setEditColorState(nextType, nextCustomColor) {
        editColorState.type = nextType || 'fish-gold';
        editColorState.customColor = nextCustomColor || '';
        syncEditColorUI();
    }

    function syncFromHub(force = false) {
        if (isSyncing) return;  // 防重入
        if (!hostDataHub) return;
        isSyncing = true;
        try {
            const activeMaskId = hostDataHub.state?.activeMaskId || '';
            const relations = hostDataHub.getRelations() || [];
            const syncKey = makeHubSyncKey(relations, activeMaskId);
            if (!force && syncKey === lastHubSyncKey) return;
            lastHubSyncKey = syncKey;

            const next = relations
                .filter(node => node && node.isFish)
                .map(node => {
                    const contact = node.contactId ? hostDataHub.getContactById(node.contactId) : null;
                    return {
                        id: String(node.id),
                        relationId: String(node.id),
                        contactId: String(node.contactId || contact?.id || ''),
                        name: String(node.name || contact?.remark || contact?.name || '新故交'),
                        role: String(node.role || contact?.role || '路人'),
                        group: String(node.group || 'other'),
                        type: mapFishType(contact?.fishType),
                        customColor: contact?.fishColor ? String(contact.fishColor) : null,
                        avatar: contact?.avatar || null,
                        desc: String(node.notes || contact?.desc || ''),
                        bg: String(contact?.bg || ''),
                        worldbook: String(contact?.worldbook || '')
                    };
                });

            fishesData.splice(0, fishesData.length, ...next);
            redrawFishPond();
        } finally {
            isSyncing = false;
        }
    }

    function addFishToHub(newData) {
        if (!hostDataHub) return false;
        const maskId = hostDataHub.state?.activeMaskId;
        const node = hostDataHub.upsertRelationNode(maskId, {
            id: `manual_fish_${Date.now()}`,
            name: newData.name,
            role: newData.role,
            group: 'other',
            level: 'L2',
            distanceLabel: '普通',
            notes: newData.desc || '',
            isFish: true,
            source: 'manual_create'
        }, 'manual_create');
        if (!node) return false;
        hostDataHub.promoteRelationToFish(maskId, node.id, {
            name: newData.name,
            remark: newData.name,
            role: newData.role,
            desc: newData.desc || '',
            group: newData.group || 'other',
            fishType: newData.customColor ? '' : mapFishType(newData.type),
            fishColor: newData.customColor || '',
            avatar: newData.avatar || null,
            timestamp: Date.now()
          
        });
        return true;
    }

    function saveFishToHub(data) {
        if (!hostDataHub) return false;
        const maskId = hostDataHub.state?.activeMaskId;
        const relationId = data.relationId || data.id;
        const relation = hostDataHub.upsertRelationNode(maskId, {
            id: relationId,
            name: data.name,
            role: data.role,
            group: data.group || 'other',
            notes: data.desc || '',
            isFish: true,
            source: 'manual_create'
        }, 'manual_create');
        if (!relation) return false;
        if (relation.contactId) {
            hostDataHub.updateContact(relation.contactId, {
                name: data.name,
                remark: data.name,
                role: data.role,
                desc: data.desc || '',
                group: data.group || relation.group || 'other',
                fishType: data.customColor ? '' : mapFishType(data.type),
                fishColor: data.customColor || '',
                avatar: data.avatar || null,
                bg: data.bg || '',
                worldbook: data.worldbook || '',
                timestamp: Date.now()
            });
        }
        return true;
    }

    function deleteFishFromHub(data) {
        if (!hostDataHub) return false;
        const maskId = hostDataHub.state?.activeMaskId;
        const relationId = data.relationId || data.id;
        if (!relationId) return false;
        return hostDataHub.deleteRelationNode(maskId, relationId);
    }

    function restoreFishToHub(item) {
        if (!hostDataHub) return false;
        const maskId = hostDataHub.state?.activeMaskId;
        const node = hostDataHub.upsertRelationNode(maskId, {
            id: item.relationId || item.id || `manual_fish_${Date.now()}`,
            name: item.name || '新故交',
            role: item.role || '路人',
            group: item.group || 'other',
            level: 'L2',
            distanceLabel: '普通',
            notes: item.desc || '',
            isFish: true,
            source: 'manual_create'
        }, 'manual_create');
        if (!node) return false;
        hostDataHub.promoteRelationToFish(maskId, node.id, {
            name: item.name || '新故交',
            remark: item.name || '新故交',
            role: item.role || '路人',
            desc: item.desc || '',
            group: item.group || node.group || 'other',
            fishType: item.customColor ? '' : mapFishType(item.type),
            fishColor: item.customColor || '',
            timestamp: Date.now()
        });
        return true;
    }

    // ===== 工具 =====
    function showToast(msg) {
        const c = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = 'jinyu-toast'; t.textContent = msg;
        c.appendChild(t); setTimeout(() => t.remove(), 2500);
    }

    function closeAllSheets() {
        newFishSheet.classList.remove('show');
        detailSheet.classList.remove('show');
        if (recycleSheet) recycleSheet.classList.remove('show');
        sheetOverlay.classList.remove('show');
        if (selectedFishEl) selectedFishEl.classList.remove('selected');
        selectedFishEl = null; selectedFishData = null;
    }

    function renderRecycleList() {
        if (!recycleListEl) return;
        const bin = hostDataHub ? hostDataHub.getRecycleBin() : recycleBin;
        if (!bin.length) {
            recycleListEl.innerHTML = '<div class="recycle-empty">回收站为空</div>';
            return;
        }

        recycleListEl.innerHTML = bin.map(item => `
            <div class="recycle-item">
                <div class="recycle-meta">
                    <div class="recycle-name">${item.name || 'Unnamed'}</div>
                    <div class="recycle-role">${item.role || 'Unknown'}</div>
                </div>
                <button class="recycle-restore" data-recycle-id="${item.__recycleId}">Restore</button>
            </div>
        `).join('');

        recycleListEl.querySelectorAll('[data-recycle-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = String(btn.getAttribute('data-recycle-id') || '');
                const idx = bin.findIndex(x => String(x.__recycleId) === id);
                if (idx < 0) return;
                const [item] = hostDataHub ? [bin[idx]] : recycleBin.splice(idx, 1);
                if (hostDataHub) {
                    restoreFishToHub(item);
                    syncFromHub(true);
                  
                } else {
                    const restored = { ...item };
                    delete restored.__recycleId;
                    fishesData.push(restored);
                    createFishEl(restored);
                    applyFilter();
                }
                renderRecycleList();
                showToast('已恢复 ' + (item.name || '小鱼'));
            });
        });
    }

    // ===== 鱼塘初始化 =====
    function initPond() {
        if (isPondReady) return;
        redrawFishPond();
    }

    function getFishBodyStyle(data) {
        if (data.customColor) {
            return `background:${data.customColor}; border:1px solid rgba(0,0,0,0.08);`;
        }
        return '';
    }

    function createFishEl(data) {
        const fish = document.createElement('div');
        fish.className = 'koi-fish ' + (data.customColor ? '' : data.type);
        fish.dataset.id = data.id;

        if (data.customColor) {
            const s = document.createElement('style');
            s.textContent = `.koi-fish[data-id="${data.id}"] .koi-body,.koi-fish[data-id="${data.id}"] .koi-tail,.koi-fish[data-id="${data.id}"] .koi-fin-left,.koi-fish[data-id="${data.id}"] .koi-fin-right,.koi-fish[data-id="${data.id}"] .koi-dorsal{background:${data.customColor};border:1px solid rgba(0,0,0,0.08);}`;
            document.head.appendChild(s);
        }

        const pw = pond.clientWidth || 290, ph = pond.clientHeight || 450;
        fish.dataset.x = Math.random() * (pw - 110);
        fish.dataset.y = Math.random() * (ph - 60);
        fish.dataset.vx = (Math.random() - 0.5) * 0.8;
        fish.dataset.vy = (Math.random() - 0.5) * 0.8;

        fish.innerHTML = `
            <div class="koi-body"><div class="koi-eye-left"></div><div class="koi-eye-right"></div><div class="koi-dorsal"></div></div>
            <div class="koi-fin-left"></div><div class="koi-fin-right"></div><div class="koi-tail"></div>
            <div class="fish-name">${data.name}</div>`;

        fish.addEventListener('click', (e) => {
            if (isLongPress) {
                isLongPress = false;
                return;
            }
            e.stopPropagation();
            openDetailSheet(fish, data);
        });


        // 添加长按删除功能
        addLongPressToFish(fish, data);


        pond.appendChild(fish);
    }

    function animate() {
        pond.querySelectorAll('.koi-fish').forEach(fish => {
            if (fish.classList.contains('selected')) return;
            let x = parseFloat(fish.dataset.x), y = parseFloat(fish.dataset.y);
            let vx = parseFloat(fish.dataset.vx), vy = parseFloat(fish.dataset.vy);
            const pw = pond.clientWidth - 110, ph = pond.clientHeight - 60;

            if (x <= 0 || x >= pw) vx *= -1;
            if (y <= 0 || y >= ph) vy *= -1;
            if (Math.random() < 0.015) { vx += (Math.random() - 0.5) * 0.3; vy += (Math.random() - 0.5) * 0.3; }
            const spd = Math.sqrt(vx*vx + vy*vy);
            if (spd > 0.9) { vx *= 0.92; vy *= 0.92; }

            x += vx; y += vy;
            x = Math.max(0, Math.min(pw, x));
            y = Math.max(0, Math.min(ph, y));
            fish.dataset.x = x; fish.dataset.y = y; fish.dataset.vx = vx; fish.dataset.vy = vy;

            const angle = Math.atan2(vy, vx) * 180 / Math.PI + 180;
            fish.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
            const nameTag = fish.querySelector('.fish-name');
            if (nameTag) nameTag.style.transform = `translateX(-50%) rotate(${-angle}deg)`;
        });
        animFrameId = requestAnimationFrame(animate);
    }

    function applyFishVisual(fishEl, data) {
        if (!fishEl || !data) return;
        fishEl.className = 'koi-fish ' + (data.customColor ? '' : data.type);
        const parts = ['.koi-body', '.koi-tail', '.koi-fin-left', '.koi-fin-right', '.koi-dorsal'];
        parts.forEach(selector => {
            const part = fishEl.querySelector(selector);
            if (!part) return;
            if (data.customColor) {
                part.style.background = data.customColor;
                part.style.border = '1px solid rgba(0,0,0,0.08)';
            } else {
                part.style.background = '';
                part.style.border = '';
            }
        });
    }

    function initEditColorPresets() {
        if (!editColorDots) return;
        if (editColorDots.childElementCount > 0) return;
        editColorPresets.forEach(preset => {
            const dot = document.createElement('div');
            dot.className = 'color-dot';
            dot.dataset.type = preset.type;
            dot.dataset.color = preset.color;
            dot.style.background = preset.color;
            dot.addEventListener('click', () => {
                if (preset.type === 'fish-custom') {
                    setEditColorState('fish-custom', preset.color);
                } else {
                    setEditColorState(preset.type, '');
                }
            });
            editColorDots.appendChild(dot);
        });
    }

    if (editColorHex) {
        editColorHex.addEventListener('input', (e) => {
            const val = String(e.target.value || '').trim();
            if (!val) return;
            setEditColorState('fish-custom', val);
        });
    }
    if (editColorApply) {
        editColorApply.addEventListener('click', () => {
            const val = String(editColorHex?.value || '').trim();
            if (!val) return;
            setEditColorState('fish-custom', val);
        });
    }

    initEditColorPresets();

    // 页面加载后立即初始化鱼塘
    window.addEventListener('load', () => {
        initPond();
        syncFromHub(true);
       
        // if (hostDataHub) {
        //     window.setInterval(() => syncFromHub(false), 2500);
        //     document.addEventListener('visibilitychange', () => {
        //         if (!document.hidden) syncFromHub(true);
        //     });
        //     window.addEventListener('focus', () => syncFromHub(true));
        // }
    });

    // 监听来自父页面的刷新指令
window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'refreshFishPond') {
        syncFromHub(true);
    }
});

    // ===== 详情底部卡片 =====
    function openDetailSheet(fishEl, data) {
        if (selectedFishEl) selectedFishEl.classList.remove('selected');
        selectedFishEl = fishEl;
        selectedFishData = data;
        fishEl.classList.add('selected');

        document.getElementById('detail-name').textContent = data.name;
        document.getElementById('detail-role').textContent = data.role;
        document.getElementById('detail-desc').textContent = data.desc || '尚无简介';


        // 鱼图标底色
        const icon = document.getElementById('detail-fish-icon');
        if (data.customColor) {
            icon.style.background = data.customColor;
        } else {
            const colorMap = { 'fish-gold': 'rgba(248,241,229,0.8)', 'fish-pink': 'rgba(252,235,236,0.8)', 'fish-blue': 'rgba(236,242,245,0.8)' };
            icon.style.background = colorMap[data.type] || 'rgba(245,242,235,0.8)';
        }
        icon.innerHTML = `<svg viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:32px;height:16px;opacity:0.5;">
            <ellipse cx="18" cy="10" rx="14" ry="8" fill="currentColor"/>
            <polygon points="32,10 40,2 40,18" fill="currentColor" opacity="0.6"/>
        </svg>`;

        newFishSheet.classList.remove('show');
        detailSheet.classList.add('show');
        sheetOverlay.classList.add('show');
    }

    document.getElementById('detail-edit-btn').addEventListener('click', () => {
        if (!selectedFishData) return;
        openEditPage(selectedFishData);
    });

    document.getElementById('detail-chat-btn').addEventListener('click', () => {
    if (!selectedFishData) return;
    showToast('查看与 ' + selectedFishData.name + ' 的聊天记录');
    closeAllSheets();
    // 这里后续可以添加实际的聊天记录显示逻辑
});


    // ===== 新增故交 =====
    document.getElementById('fabAdd').addEventListener('click', () => {
        detailSheet.classList.remove('show');
        if (recycleSheet) recycleSheet.classList.remove('show');
        newFishSheet.classList.add('show');
        sheetOverlay.classList.add('show');
    });

    if (recycleBtn) {
        recycleBtn.addEventListener('click', () => {
            closeAllSheets();
            renderRecycleList();
            if (recycleSheet) recycleSheet.classList.add('show');
            sheetOverlay.classList.add('show');
        });
    }

    if (recycleClearBtn) {
        recycleClearBtn.addEventListener('click', () => {
            if (hostDataHub) {
                hostDataHub.clearRecycleBin();
            } else {
                recycleBin.length = 0;
            }
            renderRecycleList();
            showToast('回收站已清空');
        });
    }

    // 遮罩点击关闭
    sheetOverlay.addEventListener('click', () => closeAllSheets());

    // 颜色点选择
    document.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
            dot.classList.add('selected');
            pickedColor = dot.dataset.color;
            pickedType = dot.dataset.type;
            document.getElementById('colorHexIn').value = '';
            document.getElementById('colorPreviewDot').style.background = dot.style.background;
        });
    });

    // 自定义颜色输入
    document.getElementById('colorHexIn').addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val) {
            pickedColor = val;
            pickedType = 'fish-custom';
            document.getElementById('colorPreviewDot').style.background = val;
            document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
        }
    });

    // 确认放入鱼塘
    document.getElementById('confirmAddFish').addEventListener('click', () => {
        const name = document.getElementById('new-fish-name').value.trim() || '新故交';
        const role = document.getElementById('new-fish-role').value.trim() || '路人';

        const newData = {
            id: Date.now(), name, role, group: 'other',
            type: pickedType === 'fish-custom' ? '' : pickedType,
            customColor: pickedType === 'fish-custom' ? pickedColor : null,
            avatar: null, desc: '', bg: '', worldbook: '', persona: ''
        };

        if (hostDataHub) {
            addFishToHub(newData);
            syncFromHub(true);
            
            document.getElementById('new-fish-name').value = '';
            document.getElementById('new-fish-role').value = '';
            closeAllSheets();
            showToast('已将 ' + name + ' 放入鱼塘');
            return;
        }


        fishesData.push(newData);
        createFishEl(newData);
        applyFilter();

        document.getElementById('new-fish-name').value = '';
        document.getElementById('new-fish-role').value = '';
        closeAllSheets();
        showToast('已将 ' + name + ' 放入鱼塘');
    });

    // 点击鱼塘空白关闭
    pond.addEventListener('click', (e) => {
        if (e.target === pond || e.target.classList.contains('water-ripple')) {
            closeAllSheets();
        }
    });

    // ===== 编辑页 =====
        function openEditPage(data) {
        currentEditId = data.id;
        document.getElementById('editPageTitle').textContent = data.name;
        document.getElementById('edit-name').value = data.name;
        document.getElementById('edit-role').value = data.role;
        document.getElementById('edit-desc').value = data.desc || '';
        document.getElementById('edit-bg').value = data.bg || '';
        // 显示世界书
        const worldbookPreview = document.getElementById('worldbookPreview');
        if (data.worldbook && worldbookData[data.worldbook]) {
            document.getElementById('editWorldbookSelect').value = data.worldbook;
            worldbookPreview.textContent = worldbookData[data.worldbook];
        } else {
            document.getElementById('editWorldbookSelect').value = '';
            worldbookPreview.textContent = '未选择世界书';
        }

        // 编辑页颜色预览
        if (data.customColor) {
            setEditColorState('fish-custom', data.customColor);
        } else {
            setEditColorState(mapFishType(data.type), '');
        }

        // 显示头像
        const avatarPreview = document.getElementById('avatarEditPreview');
        if (data.avatar) {
            avatarPreview.style.backgroundImage = `url(${data.avatar})`;
            avatarPreview.style.backgroundColor = '';
        } else {
            avatarPreview.style.backgroundImage = 'none';
            if (data.customColor) {
                avatarPreview.style.backgroundColor = data.customColor;
            } else {
                const colorMap = { 
                    'fish-gold': 'rgba(248,241,229,0.8)', 
                    'fish-pink': 'rgba(252,235,236,0.8)', 
                    'fish-blue': 'rgba(236,242,245,0.8)' 
                };
                avatarPreview.style.backgroundColor = colorMap[data.type] || 'rgba(245,242,235,0.8)';
            }
        }
        
        closeAllSheets();
        editPage.classList.add('show');
    }


    document.getElementById('editBack').addEventListener('click', () => editPage.classList.remove('show'));

    document.getElementById('editSave').addEventListener('click', () => {
        const data = fishesData.find(d => d.id === currentEditId);
        if (!data) return;
        data.name = document.getElementById('edit-name').value;
        data.role = document.getElementById('edit-role').value;
        data.desc = document.getElementById('edit-desc').value;
        data.bg = document.getElementById('edit-bg').value;
        data.type = editColorState.customColor ? '' : editColorState.type;
        data.customColor = editColorState.customColor || null;
        // 确保头像同步到 DataHub
        data.avatar = data.avatar || null;
        if (hostDataHub) {
            saveFishToHub(data);
            syncFromHub(true);
        }

              
    


        // 更新鱼塘里的名字标签
        const fishEl = pond.querySelector(`.koi-fish[data-id="${currentEditId}"]`);
        if (fishEl) {
            const nameTag = fishEl.querySelector('.fish-name');
            if (nameTag) nameTag.textContent = data.name;
            applyFishVisual(fishEl, data);
        }

        editPage.classList.remove('show');
        showToast('已保存 · ' + data.name);
    });

    // TXT 导入
    const fileInput = document.getElementById('fileInput');
    document.getElementById('importBox').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        const fileType = fileName.split('.').pop();

        if (fileType !== 'txt') {
            showToast('这里只支持 TXT 导入');
            fileInput.value = '';
            return;
        }

        handleTxtFile(file);
        fileInput.value = '';
    });

    function handleTxtFile(file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            parseTxtIntoEditFields(String(ev.target.result || ''));
            showToast('TXT 已导入');
        };
        reader.readAsText(file);
    }

    function parseTxtIntoEditFields(text) {
        const fieldMap = {
            '名字': 'edit-name',
            '姓名': 'edit-name',
            '关系': 'edit-role',
            '身份': 'edit-role',
            '简介': 'edit-desc',
            '背景': 'edit-bg',
            '人物背景': 'edit-bg',
            '性格': 'edit-bg'
        };

        text.split('\n').forEach(line => {
            const idx = line.search(/[:：]/);
            if (idx === -1) return;
            const key = line.slice(0, idx).trim();
            const val = line.slice(idx + 1).trim();
            if (!fieldMap[key] || !val) return;
            const el = document.getElementById(fieldMap[key]);
            if (!el) return;
            el.value = el.value ? el.value + '\n' + val : val;
        });
    }


        // ===== 底部导航 =====
    function switchTab(tabName, element) {
        // 移除所有 active 状态
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        // 给当前点击的元素添加 active
        element.classList.add('active');
        
        // 这里可以添加页面切换逻辑
        switch(tabName) {
            case 'profile':
                showToast('切换到小像页面');
                break;
            case 'contacts':
                showToast('当前就在故交页面');
                break;
            case 'chats':
                showToast('切换到传书页面');
                break;
        }
    }

        // ===== 筛选功能 =====
    let currentFilter = 'all';
    const filterBtn = document.getElementById('filterBtn');
    const filterTags = document.getElementById('filterTags');

    filterBtn.addEventListener('click', () => {
        filterTags.classList.toggle('show');
        filterBtn.classList.toggle('active');
    });

    // 筛选标签点击
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            currentFilter = tag.dataset.filter;
            applyFilter();
        });
    });

    function applyFilter() {
        pond.querySelectorAll('.koi-fish').forEach(fish => {
            const fishId = String(fish.dataset.id || '');
            const fishData = fishesData.find(d => String(d.id) === fishId);
            if (!fishData) return;
            
            if (currentFilter === 'all' || (fishData.group || 'other') === currentFilter) {
                fish.classList.remove('hidden');
            } else {
                fish.classList.add('hidden');
            }
        });
    }

        // ===== 双击标题显示提示 =====
    const pageTitle = document.querySelector('.page-title');
    const hintText = document.getElementById('hintText');
    let clickCount = 0;
    let clickTimer = null;

    pageTitle.addEventListener('click', () => {
        clickCount++;
        
        if (clickCount === 1) {
            clickTimer = setTimeout(() => {
                clickCount = 0;
            }, 300);
        } else if (clickCount === 2) {
            clearTimeout(clickTimer);
            clickCount = 0;
            
            // 显示提示文字
            hintText.classList.add('show');
            
            // 3秒后自动隐藏
            setTimeout(() => {
                hintText.classList.remove('show');
            }, 3000);
        }
    });



    // ===== 长按删除功能 =====
    let longPressTimer = null;
    let isLongPress = false;

    function addLongPressToFish(fish, data) {
        fish.addEventListener('mousedown', (e) => startLongPress(e, fish, data));
        fish.addEventListener('touchstart', (e) => startLongPress(e, fish, data));
        fish.addEventListener('mouseup', cancelLongPress);
        fish.addEventListener('mouseleave', cancelLongPress);
        fish.addEventListener('touchend', cancelLongPress);
        fish.addEventListener('touchcancel', cancelLongPress);
    }

    function startLongPress(e, fish, data) {
        isLongPress = false;
        longPressTimer = setTimeout(() => {
            isLongPress = true;
            
                       const deleteHandler = () => {
                const index = fishesData.findIndex(d => d.id === data.id);
                if (index !== -1) {
                    const [removed] = fishesData.splice(index, 1);
                    const recycleItem = {
                        ...removed,
                        __recycleId: `${Date.now()}_${Math.floor(Math.random() * 1000)}`
                    };
                    if (hostDataHub) {
                        deleteFishFromHub(data);
                        hostDataHub.addToRecycleBin(recycleItem);
                        syncFromHub(true);
                        
                    } else {
                        recycleBin.unshift(recycleItem);
                        fish.remove();
                        applyFilter();
                    }
                    showToast('已删除 ' + data.name);
                    renderRecycleList();
                    closeAllSheets();
                }
                fish.removeEventListener('mouseup', deleteHandler);
                fish.removeEventListener('touchend', deleteHandler);
            };

            fish.addEventListener('mouseup', deleteHandler, { once: true });
            fish.addEventListener('touchend', deleteHandler, { once: true });
        }, 600);
    }

    function cancelLongPress() {
        if (longPressTimer && !isLongPress) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }

    // ===== 头像编辑功能 =====
    const avatarFileInput = document.getElementById('avatarFileInput');
    
    document.getElementById('avatarUploadBtn').addEventListener('click', () => {
        avatarFileInput.click();
    });
    
    avatarFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const data = fishesData.find(d => d.id === currentEditId);
            if (data) {
                data.avatar = event.target.result;
                document.getElementById('avatarEditPreview').style.backgroundImage = `url(${event.target.result})`;
                document.getElementById('avatarEditPreview').style.backgroundColor = '';
                showToast('头像已更新');
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    });
    
    document.getElementById('avatarResetBtn').addEventListener('click', () => {
        const data = fishesData.find(d => d.id === currentEditId);
        if (!data) return;
        
        data.avatar = null;
        const avatarPreview = document.getElementById('avatarEditPreview');
        avatarPreview.style.backgroundImage = 'none';
        
        if (data.customColor) {
            avatarPreview.style.backgroundColor = data.customColor;
        } else {
            const colorMap = { 
                'fish-gold': 'rgba(248,241,229,0.8)', 
                'fish-pink': 'rgba(252,235,236,0.8)', 
                'fish-blue': 'rgba(236,242,245,0.8)' 
            };
            avatarPreview.style.backgroundColor = colorMap[data.type] || 'rgba(245,242,235,0.8)';
        }
        
        showToast('已恢复纯色头像');
    });

        // ===== 动态数据加载 =====
    let worldbookData = {}; // 从世界书 APP 动态加载
    // 从世界书 APP 加载数据
    function loadWorldbooks() {
        // TODO: 连接世界书APP，获取世界书列表
        // worldbookData = 从世界书 APP 获取的数据
        console.log('加载世界书数据...');
    }

    // 世界书应用功能
    document.getElementById('editWorldbookApply').addEventListener('click', () => {
        const selectedWorldbook = document.getElementById('editWorldbookSelect').value;
        if (selectedWorldbook && worldbookData[selectedWorldbook]) {
            const preview = document.getElementById('worldbookPreview');
            preview.textContent = worldbookData[selectedWorldbook];
            
            // 同时更新数据
            const data = fishesData.find(d => d.id === currentEditId);
            if (data) {
                data.worldbook = selectedWorldbook;
            }
            
            showToast('已应用世界书：' + selectedWorldbook);
        } else {
            showToast('请先选择一个世界书');
        }
    });