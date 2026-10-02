// ================= 烟雾浮标接管系统 =================
function showSmokeMsg(msg, isConfirm = false, onConfirm = null) {
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
  document.getElementById('backup-import-input').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    showSmokeMsg('正在恢复备份...');
    
    try {
        const text = await file.text();
        const backup = JSON.parse(text);
        
        const config = backup.config || {};
        const files = backup.files || {};
        
        const fileDB = window.parent?.FileDB || window.FileDB;
        
        // 1. 恢复配置到 dataHub
        if (window.parent?.dataHub) {
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
                    console.warn(`恢复文件失败 ${key}:`, e);
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
            setTimeout(() => {
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
        
    } catch (error) {
        console.error('导入失败:', error);
        showSmokeMsg('❌ 导入失败：文件格式不正确或已损坏');
    }
    
    e.target.value = '';
});
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
        
        // 1. 收集所有配置数据
        const config = {};
        
        if (window.parent?.dataHub) {
            for (let key in window.parent.dataHub) {
                if (typeof window.parent.dataHub[key] !== 'function') {
                    config[key] = window.parent.dataHub[key];
                }
            }
        }
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('JinyuPhone_')) continue;
            try {
                config[key] = JSON.parse(localStorage.getItem(key));
            } catch {
                config[key] = localStorage.getItem(key);
            }
        }
        
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
        
        // 4. 构建备份对象
        const backup = {
            version: '3.0',
            exportTime: new Date().toISOString(),
            config: config,
            files: filesToExport
        };
        
        // 5. 导出为 JSON 文件
        const jsonStr = JSON.stringify(backup);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = getNextBackupName();  // 直接用 .json
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        const fileCount = Object.keys(filesToExport).length;
        showSmokeMsg(`✅ 备份成功！\n配置项: ${Object.keys(config).length}\n文件: ${fileCount}`);
        
    } catch (e) {
        console.error('导出失败:', e);
        showSmokeMsg('❌ 导出失败');
    }
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
