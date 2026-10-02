// ================= 烟雾浮标接管系统 =================
function showSmokeMsg(msg, isConfirm = false, onConfirm = null, autoClose = true) {
    // 如果已经有弹窗，先干掉
    let oldToast = document.getElementById('sys-smoke-toast');
    let oldMask = document.getElementById('sys-smoke-mask');
    if (oldToast) oldToast.remove();
    if (oldMask) oldMask.remove();

    // 创建遮罩
    const mask = document.createElement('div');
    mask.id = 'sys-smoke-mask';
    mask.className = 'smoke-toast-mask';
    
    // 创建弹窗
    const toast = document.createElement('div');
    toast.id = 'sys-smoke-toast';
    toast.className = 'smoke-toast';
    
    let html = `<div class="smoke-msg">${msg}</div>`;
    
    if (isConfirm) {
        html += `
            <div class="smoke-btns">
                <button class="smoke-btn smoke-btn-cancel" id="smoke-cancel">取消</button>
                <button class="smoke-btn smoke-btn-confirm" id="smoke-confirm">确定</button>
            </div>
        `;
    } else if (!autoClose) {
        html += `
            <div class="smoke-btns">
                <button class="smoke-btn smoke-btn-confirm" id="smoke-confirm">知道了</button>
            </div>
        `;
    }
    
    toast.innerHTML = html;
    document.body.appendChild(mask);
    document.body.appendChild(toast);

    // 触发动画
    requestAnimationFrame(() => {
        mask.classList.add('active');
        toast.classList.add('active');
    });

    const closeToast = () => {
        toast.classList.remove('active');
        toast.classList.add('fade-out');
        mask.classList.remove('active');
        setTimeout(() => {
            toast.remove();
            mask.remove();
        }, 300);
    };

    if (isConfirm) {
        document.getElementById('smoke-cancel').onclick = closeToast;
        document.getElementById('smoke-confirm').onclick = () => {
            closeToast();
            if (onConfirm) onConfirm();
        };
    } else if (!autoClose) {
        // 常驻提示：需手动点“知道了”关闭（导出结果等重要提示用）
        document.getElementById('smoke-confirm').onclick = closeToast;
    } else {
        // 普通提示，2秒后如烟雾般消散
        setTimeout(closeToast, 2000);
    }
}

// 暴力接管全局 alert 和 confirm
window.alert = function(msg) {
    showSmokeMsg(msg, false);
};

window.confirm = function(msg) {
    // 注意：原生 confirm 是同步阻塞的，自定义弹窗是异步的。
    // 为了不改动你原有的业务代码逻辑，我们暂时保留原生 confirm 的结构，但强烈建议后续业务逻辑改成回调。
    // 这里我们先用一个折中方案：暂时拦截，后续具体业务具体改。
    console.warn("发现原生 confirm 调用，请逐步替换为 showSmokeMsg(msg, true, callback)");
    return window.originalConfirm ? window.originalConfirm(msg) : true; 
};
// 保存原生 confirm 以备不时之需
window.originalConfirm = window.confirm;


// ================= 数据管理工具 =================
const DataHubUtil = {
    // ... 保持原有代码不变 ...
    get: function(key, defaultValue) {
        try {
            if (window.parent && window.parent.dataHub) {
                if (typeof window.parent.dataHub.getData === 'function') {
                    return window.parent.dataHub.getData(key) || defaultValue;
                } else if (window.parent.dataHub[key] !== undefined) {
                    return window.parent.dataHub[key];
                }
            }
            let res = localStorage.getItem(key);
            return res ? JSON.parse(res) : defaultValue;
        } catch(e) {
            console.warn("DataHub 读取失败", e);
            return defaultValue;
        }
    },
    set: function(key, value) {
        // 始终先写 localStorage，保证刷新/重开后预设保留
        localStorage.setItem(key, JSON.stringify(value));
        try {
            if (window.parent && window.parent.dataHub) {
                if (typeof window.parent.dataHub.setData === 'function') {
                    window.parent.dataHub.setData(key, value);
                    return;
                } else {
                    window.parent.dataHub[key] = value;
                    return;
                }
            }
            localStorage.setItem(key, JSON.stringify(value));
        } catch(e) {
            console.error("DataHub 保存失败", e);
        }
    },
    getAll: function() {
        try {
            if (window.parent && window.parent.dataHub) {
                let data = {};
                for (let key in window.parent.dataHub) {
                    if (typeof window.parent.dataHub[key] !== 'function') {
                        data[key] = window.parent.dataHub[key];
                    }
                }
                return data;
            }
            let data = {};
            for (let i = 0; i < localStorage.length; i++) {
                let key = localStorage.key(i);
                try {
                    data[key] = JSON.parse(localStorage.getItem(key));
                } catch(e) {
                    data[key] = localStorage.getItem(key);
                }
            }
            return data;
        } catch(e) {
            console.warn("DataHub 读取全部失败", e);
            return {};
        }
    },
    remove: function(key) {
        try {
            if (window.parent && window.parent.dataHub) {
                if (typeof window.parent.dataHub.removeData === 'function') {
                    window.parent.dataHub.removeData(key);
                } else {
                    delete window.parent.dataHub[key];
                }
            }
            localStorage.removeItem(key);
        } catch(e) {
            console.error("DataHub 删除失败", e);
        }
    },
    clear: function() {
        try {
            if (window.parent && window.parent.dataHub) {
                if (typeof window.parent.dataHub.clearData === 'function') {
                    window.parent.dataHub.clearData();
                } else {
                    for (let key in window.parent.dataHub) {
                        if (typeof window.parent.dataHub[key] !== 'function') {
                            delete window.parent.dataHub[key];
                        }
                    }
                }
            }
            localStorage.clear();
        } catch(e) {
            console.error("DataHub 清空失败", e);
        }
    }
};

// ================= API 预设管理核心逻辑 =================
let currentPresets = [];
let activePresetId = null;
let editingId = null;

// 默认诗句常量
const DEFAULT_POEM = "海内存知己，天涯若比邻";

document.addEventListener('DOMContentLoaded', () => {
    // 初始化 API 预设
    currentPresets = DataHubUtil.get('apiPresets', []);
    activePresetId = DataHubUtil.get('activeApiPresetId', null);
    renderPresetsList();
    renderDebugToggle();

    // 初始化一言设置 (使用 dock_poem 键名)
 let savedPoem = DEFAULT_POEM;
if (window.parent && window.parent.dataHub) {
    savedPoem = window.parent.dataHub.get('dock_poem', DEFAULT_POEM);
}
document.getElementById('dock-poem-input').value = savedPoem === DEFAULT_POEM ? '' : savedPoem;
document.getElementById('dock-poem-preview').textContent = savedPoem;

    // 备份导入监听
  document.getElementById('backup-import-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    showSmokeMsg('导入备份会覆盖当前数据；导入前会自动快照（最多保留 3 份，可"恢复到导入前"）。确定继续？', true, function() {
        doBackupImport(file);
    });
    e.target.value = '';
});

async function doBackupImport(file) {
    showSmokeMsg('正在恢复备份...');
    try {
        const text = await file.text();
        let backup;
        try { backup = JSON.parse(text); }
        catch (pe) { showSmokeMsg('❌ 导入失败：不是有效的 JSON 文件'); return; }
        if (!backup || typeof backup !== 'object' || !backup.config || typeof backup.config !== 'object' || !backup.version) {
            showSmokeMsg('❌ 导入失败：不是本应用的备份文件（缺少 version/config）');
            return;
        }
        const config = backup.config || {};
        const files = backup.files || {};
        const fileDB = window.parent?.FileDB || window.FileDB;

        // 导入前快照：写失败则中止导入，绝不覆盖
        const snapOk = await savePreImportSnapshot();
        if (!snapOk) {
            showSmokeMsg('❌ 快照保存失败，已中止导入（未覆盖任何数据）');
            return;
        }

        // API Key 保留：备份中缺 Key 时，按 id（其次 name）匹配设备现有预设补回
        try {
            const existing = DataHubUtil.get('apiPresets', []) || [];
            if (Array.isArray(config['apiPresets'])) {
                let missing = 0;
                config['apiPresets'] = config['apiPresets'].map(function(p) {
                    if (!p || typeof p !== 'object') return p;
                    if (p.key) return p;
                    let match = existing.find(function(x) { return x && x.id && x.id === p.id; });
                    if (!match && p.name) match = existing.find(function(x) { return x && x.name === p.name; });
                    if (match && match.key) { const c = Object.assign({}, p); c.key = match.key; return c; }
                    missing++;
                    return p;
                });
                if (missing > 0) {
                    setTimeout(function() {
                        showSmokeMsg('提示：备份中 ' + missing + ' 个预设无 API Key，且设备上未找到可匹配项，已保留为空。');
                    }, 900);
                }
            }

            // activeApiPreset 是"完整预设对象"（含 key），聊天实际优先读它；同样按 id、其次 name 补回 Key
            if (config['activeApiPreset'] && typeof config['activeApiPreset'] === 'object' && !config['activeApiPreset'].key) {
                const ap = config['activeApiPreset'];
                let m = existing.find(function(x) { return x && x.id && x.id === ap.id; });
                if (!m && ap.name) m = existing.find(function(x) { return x && x.name === ap.name; });
                if (!m && config['activeApiPresetId']) {
                    m = existing.find(function(x) { return x && x.id === config['activeApiPresetId']; });
                }
                if (m && m.key) {
                    const c = Object.assign({}, ap);
                    c.key = m.key;
                    config['activeApiPreset'] = c;
                }
            }
        } catch (ke) { console.warn('API Key 保留失败:', ke); }

        // 1. 恢复配置到 dataHub
        if (window.parent && window.parent.dataHub) {
            for (let key in config) {
                const value = config[key];
                if (typeof window.parent.dataHub.set === 'function') {
                    window.parent.dataHub.set(key, value);
                } else {
                    window.parent.dataHub[key] = value;
                }
            }
        }

        // 2. 恢复到 localStorage
        for (let key in config) {
            const value = config[key];
            if (typeof value === 'object') {
                localStorage.setItem(key, JSON.stringify(value));
            } else {
                localStorage.setItem(key, value);
            }
        }

        // 3. 恢复文件到 FileDB
        if (fileDB) {
            for (let key in files) {
                try {
                    const base64 = files[key];
                    const response = await fetch(base64);
                    const blob = await response.blob();
                    await fileDB.save(key, blob);
                } catch (e) {
                    console.warn('恢复文件失败 ' + key + ':', e);
                }
            }
        }

        showSmokeMsg('✅ 恢复成功！');

        // 4. 刷新 UI
        currentPresets = DataHubUtil.get('apiPresets', []);
        activePresetId = DataHubUtil.get('activeApiPresetId', null);
        renderPresetsList();

        const importedPoem = DataHubUtil.get('dock_poem', DEFAULT_POEM);
        document.getElementById('dock-poem-input').value = importedPoem === DEFAULT_POEM ? '' : importedPoem;
        document.getElementById('dock-poem-preview').textContent = importedPoem;

        // 5. 通知主屏幕刷新
        if (window.parent) {
            window.parent.postMessage({ type: 'backupRestored' }, '*');
            setTimeout(function() {
                window.parent.postMessage({ type: 'applyIconImages' }, '*');
                window.parent.postMessage({ type: 'applyIconNames' }, '*');
                window.parent.postMessage({ type: 'changeFont' }, '*');
                window.parent.postMessage({
                    type: 'changeWallpaper',
                    wallpaper: config['jinyu_wallpaper'] || 'default',
                    customImg: config['jinyu_custom_wallpaper'] || null
                }, '*');
            }, 200);
        }

        // 6. 导入后整页刷新，以重新读取最新数据为准
        setTimeout(function() { (window.top || window).location.reload(); }, 900);

    } catch (error) {
        console.error('导入失败:', error);
        showSmokeMsg('❌ 导入失败：文件格式不正确或已损坏（可点『恢复到导入前』撤销本次导入）');
    }
}
});


function renderPresetsList() {
    const listEl = document.getElementById('api-presets-list');
    listEl.innerHTML = '';
    
    if (currentPresets.length === 0) {
        listEl.innerHTML = '<li style="color: var(--text-light); margin: 10px 0; font-size: 12px; border: none; background: transparent;">暂无预设，请在下方新建。</li>';
        return;
    }

    currentPresets.forEach(preset => {
        const li = document.createElement('li');
        li.className = 'preset-item';
        if (preset.id === activePresetId) {
            li.classList.add('active-preset');
        }
        
        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `
            <span class="preset-name">${preset.name}</span> 
            <span style="color:var(--text-light); font-size:11px; margin-left:8px;">${preset.model}</span>
            ${preset.id === activePresetId ? '<span class="active-badge">当前使用</span>' : ''}
        `;
        
        const btnGroup = document.createElement('div');
        
        const activateBtn = document.createElement('button');
        if (preset.id === activePresetId) {
            activateBtn.className = 'jinyu-btn btn-text';
            activateBtn.textContent = '已激活';
            activateBtn.disabled = true;
        } else {
            activateBtn.className = 'jinyu-btn btn-outline';
            activateBtn.textContent = '激活';
            activateBtn.onclick = () => activatePreset(preset.id);
        }
        
        const editBtn = document.createElement('button');
        editBtn.className = 'jinyu-btn btn-outline';
        editBtn.textContent = '编辑';
        editBtn.onclick = () => editPreset(preset.id);
        
        const delBtn = document.createElement('button');
        delBtn.className = 'jinyu-btn btn-danger';
        delBtn.textContent = '删除';
        delBtn.onclick = () => deletePreset(preset.id);
        
        btnGroup.appendChild(activateBtn);
        btnGroup.appendChild(editBtn);
        btnGroup.appendChild(delBtn);
        
        li.appendChild(infoDiv);
        li.appendChild(btnGroup);
        listEl.appendChild(li);
    });
}


function activatePreset(id) {
    activePresetId = id;
    DataHubUtil.set('activeApiPresetId', id);
    
    const preset = currentPresets.find(p => p.id === id);
    DataHubUtil.set('activeApiPreset', preset);
    
    renderPresetsList();
}

function createNewApiPreset() {
    editingId = null;
    document.getElementById('api-form-title').textContent = '新建 API 预设';
    document.getElementById('api-name').value = '';
    document.getElementById('api-url').value = '';
    document.getElementById('api-key').value = '';
    document.getElementById('api-model').value = '';
    document.getElementById('api-temperature').value = '0.7';
}

function editPreset(id) {
    const preset = currentPresets.find(p => p.id === id);
    if (!preset) return;
    
    editingId = id;
    document.getElementById('api-form-title').textContent = '编辑 API 预设: ' + preset.name;
    document.getElementById('api-name').value = preset.name || '';
    document.getElementById('api-url').value = preset.url || '';
    document.getElementById('api-key').value = preset.key || '';
    document.getElementById('api-model').value = preset.model || '';
    document.getElementById('api-temperature').value = preset.temperature || '0.7';
}

function saveApiPreset() {
    const name = document.getElementById('api-name').value.trim();
    const url = document.getElementById('api-url').value.trim();
    const key = document.getElementById('api-key').value.trim();
    const model = document.getElementById('api-model').value.trim();
    const temperature = parseFloat(document.getElementById('api-temperature').value) || 0.7;

    if (!name) {
        alert('预设名称不能为空！');
        return;
    }

    const presetData = {
        id: editingId || Date.now().toString(), 
        name, url, key, model, temperature
    };

    let isUpdateActive = false;

    if (editingId) {
        const index = currentPresets.findIndex(p => p.id === editingId);
        if (index !== -1) currentPresets[index] = presetData;
        if (editingId === activePresetId) isUpdateActive = true;
    } else {
        currentPresets.push(presetData);
    }

    DataHubUtil.set('apiPresets', currentPresets);
    
    if (isUpdateActive) {
        DataHubUtil.set('activeApiPreset', presetData);
    }
    
    if (currentPresets.length === 1 && !activePresetId) {
        activatePreset(presetData.id);
    } else {
        renderPresetsList();
    }
    
   showSmokeMsg('保存成功！');
    
    editingId = presetData.id;
    document.getElementById('api-form-title').textContent = '编辑 API 预设: ' + name;
}

   function deletePreset(id) {
       showSmokeMsg('确定要删除这个预设吗？', true, () => {
           currentPresets = currentPresets.filter(p => p.id !== id);
           DataHubUtil.set('apiPresets', currentPresets);
           
           if (id === activePresetId) {
               activePresetId = null;
               DataHubUtil.set('activeApiPresetId', null);
               DataHubUtil.set('activeApiPreset', null);
           }
           
           renderPresetsList();
           if (editingId === id) createNewApiPreset();
       });
   }

function cancelApiEdit() {
    createNewApiPreset();
}

async function testApiPreset() {
    const url = document.getElementById('api-url').value.trim();
    const key = document.getElementById('api-key').value.trim();
    const model = document.getElementById('api-model').value.trim();

    if (!url || !key || !model) {
        alert('请先填写完整的 URL、Key 和模型名称，再进行测试。');
        return;
    }

    const testBtn = document.querySelector('button[onclick="testApiPreset()"]');
    const originalText = testBtn.textContent;
    testBtn.textContent = '测试中...';
    testBtn.disabled = true;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + key
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: '你好，这是一条测试消息。请回复“连接成功”。' }],
                max_tokens: 20
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP 错误: ${response.status}`);
        }

        const data = await response.json();
        
        // 稳妥的写法：如果找不到标准回复，就把原始数据全打出来
        let reply = '未获取到回复内容';
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            reply = data.choices[0].message.content;
        } else {
            reply = JSON.stringify(data);
        }
        
        showSmokeMsg('测试成功<br>大模型回复: ' + reply);
    } catch (error) {
        showSmokeMsg(` 测试失败!<br>原因: ${error.message}`);
    } finally {
        testBtn.textContent = originalText;
        testBtn.disabled = false;
    }
}

async function fetchApiModels() {
    const urlInput = document.getElementById('api-url').value.trim();
    const key = document.getElementById('api-key').value.trim();

    if (!urlInput || !key) {
        alert('请先填写 API URL 和 API Key！');
        return;
    }

    const baseUrl = urlInput.split('/chat/completions')[0];
    const modelsUrl = baseUrl + '/models';

    const fetchBtn = document.querySelector('button[onclick="fetchApiModels()"]');
    const originalText = fetchBtn.textContent;
    fetchBtn.textContent = '拉取中...';
    fetchBtn.disabled = true;

    try {
        const response = await fetch(modelsUrl, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + key
            }
        });

        if (!response.ok) throw new Error(`HTTP 错误: ${response.status}`);
        
        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('接口返回的数据格式不支持自动拉取');
        }

        const models = data.data.map(m => m.id);
        
        if (models.length === 0) {
            alert('接口没有返回任何可用模型。');
            return;
        }

        const modelInput = document.getElementById('api-model');
        const parent = modelInput.parentNode;
        
        const select = document.createElement('select');
        select.id = 'api-model';
        select.className = 'jinyu-input';
        select.style.margin = '0';
        select.style.flex = '1';
        
        models.forEach(modelId => {
            const opt = document.createElement('option');
            opt.value = modelId;
            opt.textContent = modelId;
            if (modelId === modelInput.value) opt.selected = true;
            select.appendChild(opt);
        });

        parent.replaceChild(select, modelInput);
        showSmokeMsg('成功拉取 ' + models.length + ' 个模型');

    } catch (error) {
        showSmokeMsg(`拉取失败: ${error.message}`);
    } finally {
        fetchBtn.textContent = originalText;
        fetchBtn.disabled = false;
    }
}



// ===== 调试模式开关（默认关闭）=====
function isDebugModeOn() {
    // 任一来源为 true / 'true' 即算开启（避免旧值盖新值）
    var flag = false;
    function hit(v) { return (v === true || v === 'true'); }
    try { if (window.parent && window.parent.dataHub && typeof window.parent.dataHub.get === 'function') { if (hit(window.parent.dataHub.get('debug_mode', null))) flag = true; } } catch (e1) {}
    try { if (window.dataHub && typeof window.dataHub.get === 'function') { if (hit(window.dataHub.get('debug_mode', null))) flag = true; } } catch (e2) {}
    try { var s1 = localStorage.getItem('debug_mode'); if (s1 !== null) { var p1 = JSON.parse(s1); if (hit(p1) || hit(s1)) flag = true; } } catch (e3) {}
    try { var s2 = localStorage.getItem('jinyu_debug_mode'); if (s2 !== null) { var p2 = JSON.parse(s2); if (hit(p2) || hit(s2)) flag = true; } } catch (e4) {}
    return flag;
}
function setDebugModeStore(on) {
    var val = (on === true);
    try { DataHubUtil.set('debug_mode', val); } catch (e1) {}
    try { localStorage.setItem('debug_mode', JSON.stringify(val)); } catch (e2) {}
    try { localStorage.setItem('jinyu_debug_mode', JSON.stringify(val)); } catch (e3) {}
}
function renderDebugToggle() {
    var btn = document.getElementById('debug-mode-toggle');
    if (!btn) return;
    btn.textContent = isDebugModeOn() ? '已开启' : '已关闭';
}
function toggleDebugMode() {
    var next = !isDebugModeOn();
    setDebugModeStore(next);
    renderDebugToggle();
    try { if (typeof showSmokeMsg === 'function') showSmokeMsg('调试模式：' + (next ? '已开启' : '已关闭')); } catch (e) {}
}

function switchSettingsTab(tabId, element) {
    document.querySelectorAll('.settings-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    element.classList.add('active');
}

function goBack() {
    if (window.parent !== window) {
        window.parent.postMessage('closeApp', '*');
    } else if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = 'index.html';
    }
}

// ================= 外观设置逻辑 (一言) =================
function saveDockPoem() { 
    const inputVal = document.getElementById('dock-poem-input').value.trim();
    const poemToSave = inputVal || DEFAULT_POEM;
    
    if (window.parent && window.parent.dataHub) {
        window.parent.dataHub.set('dock_poem', poemToSave);
    }
    document.getElementById('dock-poem-preview').textContent = poemToSave;
    showSmokeMsg('dock区喜欢这句');
}

function resetDockPoem() { 
    if (window.parent && window.parent.dataHub) {
        window.parent.dataHub.set('dock_poem', DEFAULT_POEM);
    }
    document.getElementById('dock-poem-input').value = '';
    document.getElementById('dock-poem-preview').textContent = DEFAULT_POEM;
    alert('已恢复默认一言！');
}

// ================= 导入导出逻辑 =================
function triggerBackupImport() { 
    document.getElementById('backup-import-input').click(); 
}

function getNextBackupName() {
    let index = 1;
    const lastIndex = parseInt(localStorage.getItem('jinyu_backup_index') || '0');
    index = lastIndex + 1;
    localStorage.setItem('jinyu_backup_index', index);
    return `jinyu${index}.json`;  // 保持 .json 后缀
}
async function exportBackup() {
    showSmokeMsg('正在打包备份...');
    
    try {
        const fileDB = window.parent?.FileDB || window.FileDB;
        
        // 1. 收集所有配置数据（复用统一收集逻辑，与导入前快照完全一致）
        const config = collectBackupConfig();
        
        // 2. 找出所有需要从 FileDB 导出的文件
        const filesToExport = {};
        const fileKeys = new Set();
        
        const wallpaperList = config['custom_wallpapers_list'] || [];
        wallpaperList.forEach(key => fileKeys.add(key));
        
        const fontsList = config['custom_fonts_list'] || [];
        fontsList.forEach(font => {
            if (font.type === 'filedb') {
                fileKeys.add(font.id);
            }
        });
        
        // 3. 从 FileDB 读取文件并转成 Base64
        if (fileDB) {
            for (let key of fileKeys) {
                try {
                    const blob = await fileDB.get(key);
                    if (blob) {
                        filesToExport[key] = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (e) => resolve(e.target.result);
                            reader.readAsDataURL(blob);
                        });
                    }
                } catch (e) {
                    console.warn(`无法导出文件 ${key}:`, e);
                }
            }
        }
        
        // 3.5 按勾选剔除 API Key（默认不含）。覆盖所有 *apiPreset* 键（含 jinyu_ 前缀变体）。
        try {
            const includeKey = document.getElementById('backup-include-key') && document.getElementById('backup-include-key').checked;
            if (!includeKey) {
                // 说明：jinyu_app_data（DataHub 主存档）本身不含 API Key；Key 只存在于独立的
                // apiPresets / activeApiPreset（及 jinyu_ 前缀变体）这些 localStorage 键中。
                Object.keys(config).forEach(function(k) {
                    if (k.toLowerCase().indexOf('apipreset') === -1) return;
                    // export 收集 config 时已对 localStorage 值 JSON.parse，故此处通常是对象/数组；
                    // 为稳妥，若遇到字符串则先解析、剔除后再按原样序列化回字符串。
                    let v = config[k];
                    let wasString = false;
                    if (typeof v === 'string') {
                        try { v = JSON.parse(v); wasString = true; } catch (e2) { return; }
                    }
                    let stripped;
                    if (Array.isArray(v)) {
                        stripped = v.map(function(p) {
                            if (p && typeof p === 'object') { const c = Object.assign({}, p); delete c.key; return c; }
                            return p;
                        });
                    } else if (v && typeof v === 'object') {
                        const c = Object.assign({}, v); delete c.key; stripped = c;
                    } else {
                        return;
                    }
                    config[k] = wasString ? JSON.stringify(stripped) : stripped;
                });
            }
        } catch (e) { console.warn('剔除 API Key 失败:', e); }

        // 4. 构建备份对象
        const backup = {
            version: '3.0',
            exportTime: new Date().toISOString(),
            config: config,
            files: filesToExport
        };
        
        // 5. 导出为 JSON 文件
        const jsonStr = JSON.stringify(backup);
        const fileName = getNextBackupName();
        // 导出通道统一走 nativeSaveFile（assets/js/nativeSave.js）：
        // 本页跑在外壳 iframe 内，插件需逐层安全探测 window→parent→top；
        // 原生走 Filesystem 写 Cache + 系统分享；纯浏览器兜底 a.download。
        if (typeof nativeSaveFile !== 'function') {
            showSmokeMsg('导出组件 nativeSave.js 未加载，请检查页面引入', false, null, false);
            return;
        }
        let __saveChan = '';
        try {
            const __res = await nativeSaveFile({ fileName: fileName, data: jsonStr, mime: 'application/json', dialogTitle: '导出备份' });
            __saveChan = (__res && __res.channel) || '';
        } catch (e2) {
            console.error('导出失败:', e2);
            if (e2 && e2.stage === 'cancelled') {
                showSmokeMsg('已取消导出', false, null, false);
            } else {
                showSmokeMsg('导出失败：' + ((e2 && e2.message) || e2), false, null, false);
            }
            return;
        }
        if (false) { // __LEGACY_EXPORT_BLOCK__ 旧实现已停用（nativeSaveFile 已接管），保留仅为对照
        // Capacitor 在无打包工具的页面里，通过原生注入的全局对象访问插件：
        //   window.Capacitor.Plugins.Filesystem / window.Capacitor.Plugins.Share
        // 若 window.Capacitor 不存在（纯浏览器）走下载兜底；
        // 若处于原生环境却拿不到插件（未安装/未 sync），弹出明确错误，绝不静默失败。
        const _Cap = window.Capacitor;
        const _isNative = !!(_Cap && typeof _Cap.isNativePlatform === 'function' && _Cap.isNativePlatform());
        const _FS = (_Cap && _Cap.Plugins && _Cap.Plugins.Filesystem) ? _Cap.Plugins.Filesystem : null;
        const _Share = (_Cap && _Cap.Plugins && _Cap.Plugins.Share) ? _Cap.Plugins.Share : null;

        if (false) {
            if (!_FS) {
                showSmokeMsg('❌ 导出失败：未检测到 Filesystem 插件。请先安装并同步：npm i @capacitor/filesystem@^8 @capacitor/share@^8，然后 npx cap sync android');
                return;
            }
            // 原生：先写入 Cache 目录，再调用系统分享
            const cachePath = 'backups/' + fileName;
            await _FS.writeFile({ path: cachePath, data: jsonStr, directory: 'CACHE', encoding: 'utf8', recursive: true });
            const uriRes = await _FS.getUri({ path: cachePath, directory: 'CACHE' });
            if (_Share && typeof _Share.share === 'function') {
                await _Share.share({ title: fileName, url: uriRes.uri, dialogTitle: '导出备份' });
            } else {
                showSmokeMsg('⚠️ 未检测到 Share 插件，无法调起分享。备份已写入缓存：' + uriRes.uri + '（安装：npm i @capacitor/share@^8 并 npx cap sync android）');
            }
        } else if (false) {
            // 纯浏览器兜底：保留原下载方式
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        } // __LEGACY_EXPORT_BLOCK__ 结束
        
        const fileCount = Object.keys(filesToExport).length;
        showSmokeMsg(`✅ 备份成功！\n配置项: ${Object.keys(config).length}\n文件: ${fileCount}` + (__saveChan === 'browser' ? '\n（当前为浏览器环境，已走下载）' : ''), false, null, false);
        
    } catch (e) {
        console.error('导出失败:', e);
        showSmokeMsg('❌ 导出失败');
    }
}
// ================= 备份快照 / 恢复 =================
const BACKUP_SNAP_DIR = 'backup_snapshots';
const BACKUP_SNAP_MAX = 3;
const BACKUP_SNAP_LS_KEY = 'jinyu_preimport_snapshots';

// 统一的配置收集逻辑（与导出、导入前快照共用，保证两边一致）
function collectBackupConfig() {
    const config = {};
    const EXCLUDED = function(k) {
        return k === 'jinyu_app_data_corrupt_backup'
            || k.indexOf('jinyu_preimport_snapshot') === 0
            || k === 'backup_snapshots';
    };
    if (window.parent && window.parent.dataHub) {
        for (let key in window.parent.dataHub) {
            if (typeof window.parent.dataHub[key] === 'function') continue;
            if (EXCLUDED(key)) continue;
            config[key] = window.parent.dataHub[key];
        }
    }
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('JinyuPhone_')) continue;
        if (EXCLUDED(key)) continue;
        try {
            config[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
            config[key] = localStorage.getItem(key);
        }
    }
    return config;
}

function _backupFS() {
    const Cap = window.Capacitor;
    return (Cap && Cap.Plugins && Cap.Plugins.Filesystem) ? Cap.Plugins.Filesystem : null;
}

async function savePreImportSnapshot() {
    const FS = _backupFS();
    if (!FS) {
        // 无原生文件系统：退化为 localStorage 快照（最多 3 份，仅配置不含大文件）
        try {
            const all = collectBackupConfig();
            const list = JSON.parse(localStorage.getItem(BACKUP_SNAP_LS_KEY) || '[]');
            list.unshift({ time: new Date().toISOString(), config: all });
            while (list.length > BACKUP_SNAP_MAX) list.pop();
            localStorage.setItem(BACKUP_SNAP_LS_KEY, JSON.stringify(list));
            return true;
        } catch (e) {
            console.error('快照失败(localStorage):', e);
            return false;
        }
    }
    try {
        const all = collectBackupConfig();
        const payload = JSON.stringify({ time: new Date().toISOString(), config: all });
        await FS.mkdir({ path: BACKUP_SNAP_DIR, directory: 'DATA', recursive: true }).catch(function(){});
        const name = BACKUP_SNAP_DIR + '/snapshot_' + Date.now() + '.json';
        await FS.writeFile({ path: name, data: payload, directory: 'DATA', encoding: 'utf8', recursive: true });
        const rd = await FS.readdir({ path: BACKUP_SNAP_DIR, directory: 'DATA' });
        const snaps = (rd.files || []).map(function(f) { return f.name || f; })
            .filter(function(n) { return n.indexOf('snapshot_') === 0; }).sort();
        while (snaps.length > BACKUP_SNAP_MAX) {
            const old = snaps.shift();
            await FS.deleteFile({ path: BACKUP_SNAP_DIR + '/' + old, directory: 'DATA' }).catch(function(){});
        }
        return true;
    } catch (e) {
        console.error('快照失败(native):', e);
        return false;
    }
}

function applyBackupConfig(config) {
    if (!config || typeof config !== 'object') return;
    if (window.parent && window.parent.dataHub) {
        for (let key in config) {
            const value = config[key];
            if (typeof window.parent.dataHub.set === 'function') {
                window.parent.dataHub.set(key, value);
            } else {
                window.parent.dataHub[key] = value;
            }
        }
    }
    for (let key in config) {
        const value = config[key];
        if (typeof value === 'object') {
            localStorage.setItem(key, JSON.stringify(value));
        } else {
            localStorage.setItem(key, value);
        }
    }
}

async function restorePreImportSnapshot() {
    showSmokeMsg('确定要恢复到导入前的数据吗？当前数据将被覆盖。\n注意：快照只含配置数据，不含 FileDB 里的墙纸等文件，恢复后这些文件不会回来。', true, async function() {
        const FS = _backupFS();
        if (!FS) {
            try {
                const list = JSON.parse(localStorage.getItem(BACKUP_SNAP_LS_KEY) || '[]');
                if (!list.length) { showSmokeMsg('没有可用的导入前快照'); return; }
                applyBackupConfig(list[0].config || {});
                showSmokeMsg('✅ 已恢复到导入前');
                setTimeout(function() { (window.top || window).location.reload(); }, 900);
            } catch (e) {
                showSmokeMsg('❌ 恢复失败：' + (e.message || '未知错误'));
            }
            return;
        }
        try {
            const rd = await FS.readdir({ path: BACKUP_SNAP_DIR, directory: 'DATA' });
            const snaps = (rd.files || []).map(function(f) { return f.name || f; })
                .filter(function(n) { return n.indexOf('snapshot_') === 0; }).sort();
            if (!snaps.length) { showSmokeMsg('没有可用的导入前快照'); return; }
            const latest = snaps[snaps.length - 1];
            const res = await FS.readFile({ path: BACKUP_SNAP_DIR + '/' + latest, directory: 'DATA', encoding: 'utf8' });
            const data = JSON.parse(res.data);
            applyBackupConfig(data.config || {});
            showSmokeMsg('✅ 已恢复到导入前');
            setTimeout(function() { (window.top || window).location.reload(); }, 900);
        } catch (e) {
            console.error('恢复失败:', e);
            showSmokeMsg('❌ 恢复失败：' + (e.message || '未知错误'));
        }
    });
}

// ================= 危险操作逻辑 =================
function clearCache() { 
    if (confirm('确定要清除缓存吗？这会清理临时数据，但不会删除您的 API 预设和核心设置。')) {
        // 保留 dock_poem
        const keepKeys = ['apiPresets', 'activeApiPresetId', 'activeApiPreset', 'dock_poem'];
        const allData = DataHubUtil.getAll();
        
        for (let key in allData) {
            if (!keepKeys.includes(key)) {
                DataHubUtil.remove(key);
            }
        }
        alert('缓存已清除！');
    }
}

function resetApp() { 
    if (confirm('⚠️ 警告：此操作将清空所有数据（包括所有的 API 预设和您的个性化设置），并恢复到初始状态。\n\n确定要继续吗？')) {
        DataHubUtil.clear();
        
        currentPresets = [];
        activePresetId = null;
        editingId = null;
        
        renderPresetsList();
        createNewApiPreset();
        
        // 重置诗句 UI
        document.getElementById('dock-poem-input').value = '';
        document.getElementById('dock-poem-preview').textContent = DEFAULT_POEM;

        alert('应用已重置为初始状态！');
    }
}
// ================= 屏幕适配 (全屏) 逻辑 =================
let isFullScreen = false;

// 页面加载时读取状态
document.addEventListener('DOMContentLoaded', () => {
    if (window.parent && window.parent.dataHub) {
        isFullScreen = window.parent.dataHub.get('is_fullscreen', false);
    } else {
        isFullScreen = localStorage.getItem('is_fullscreen') === 'true';
    }
    updateFullScreenBtn();
});

function toggleFullScreenMode() {
    isFullScreen = !isFullScreen;
    
    // 1. 保存数据
    if (window.parent && window.parent.dataHub) {
        window.parent.dataHub.set('is_fullscreen', isFullScreen);
    } else {
        localStorage.setItem('is_fullscreen', isFullScreen);
    }
    
    // 2. 更新按钮文字
    updateFullScreenBtn();
    
    // 3. 通知主屏幕执行变形
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'toggleFullScreen', value: isFullScreen }, '*');
    }
}

function updateFullScreenBtn() {
    const btn = document.getElementById('fullscreen-btn');
    if(btn) {
        btn.textContent = isFullScreen ? '关闭全屏 (恢复手机壳)' : '开启全屏沉浸';
        btn.style.color = isFullScreen ? 'red' : 'var(--text-color)';
        btn.style.borderColor = isFullScreen ? 'red' : 'var(--border-color)';
    }
}
