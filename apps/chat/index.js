// 页面加载后，把页面内容切换到传书，不动底部导航
document.addEventListener('DOMContentLoaded', function() {
    // 隐藏所有页面
    document.querySelectorAll('.page-view').forEach(function(el) {
        el.classList.remove('active');
    });
    // 只显示传书页面
    var chuanshu = document.getElementById('page-chuanshu');
    if (chuanshu) chuanshu.classList.add('active');
});
// 临时清理存储（仅用于第一阶段测试）
if (window.location.search.includes('clear=1')) {
  localStorage.clear();
  console.log('[临时] 已清空 localStorage');
}


// ======================== 全局自定义弹窗 ========================
const cmOverlay = document.getElementById('custom-modal-overlay');
const cmMsg = document.getElementById('custom-modal-msg');
const cmInput = document.getElementById('custom-modal-input');
const cmCancel = document.getElementById('custom-modal-cancel');
const cmConfirm = document.getElementById('custom-modal-confirm');

let cmCallback = null;

function hideCm() { 
    cmOverlay.style.display = 'none'; 
    cmInput.value = ''; 
    cmCallback = null; 
}

if (cmCancel) {
    cmCancel.onclick = () => { 
        if (cmCallback) cmCallback(null); 
        hideCm(); 
    };
}

if (cmConfirm) {
    cmConfirm.onclick = () => {
        if (cmCallback) cmCallback(cmInput.style.display === 'block' ? cmInput.value : true);
        hideCm();
    };
}

// 全局拦截 alert
window.alert = function(msg) {
    cmMsg.textContent = msg; 
    cmInput.style.display = 'none'; 
    cmCancel.style.display = 'none';
    cmOverlay.style.display = 'flex'; 
    cmCallback = () => {}; 
};

// 自定义 Confirm
function customConfirm(msg, callback) {
    cmMsg.textContent = msg; 
    cmInput.style.display = 'none'; 
    cmCancel.style.display = 'block';
    cmOverlay.style.display = 'flex'; 
    cmCallback = (res) => { 
        if (res) callback(); 
    };
}

// 自定义 Prompt
function customPrompt(msg, defaultVal, callback) {
    cmMsg.textContent = msg; 
    cmInput.style.display = 'block'; 
    cmInput.value = defaultVal || '';
    cmCancel.style.display = 'block'; 
    cmOverlay.style.display = 'flex';
    setTimeout(() => cmInput.focus(), 100);
    cmCallback = (res) => { 
        if (res !== null) callback(res); 
    };
}

// ======================== 联系人列表与鱼塘同步 ========================

// [FIX] 父页面联系人列表同步与脏数据清理
window.refreshContactListIfNeeded = function() {
    if (!window.DataHub) return;
    const mask = window.maskStore ? window.maskStore.getActiveMask() : DataHub.getActiveMask();
    if (!mask) return;

    const fishNodes = (mask.relations?.nodes || []).filter(node => node.isFish === true);
    const fishContactIds = new Set();
    const fishNodeIds = new Set();
    fishNodes.forEach(node => {
        if (node.contactId) fishContactIds.add(node.contactId);
        if (node.id) fishNodeIds.add(node.id);
    });

    let contacts = mask.contacts || [];
    let needSave = false;
    const toDeleteContactIds = [];

    contacts.forEach(contact => {
        const contactId = contact.id;
        const hasRelation = fishContactIds.has(contactId) || 
                            (contact.relationMeta?.nodeId && fishNodeIds.has(contact.relationMeta.nodeId));
        if (!hasRelation) {
            toDeleteContactIds.push(contactId);
        }
    });

    if (toDeleteContactIds.length > 0) {
        mask.contacts = contacts.filter(c => !toDeleteContactIds.includes(c.id));
        toDeleteContactIds.forEach(cid => {
            if (mask.chatHistory[cid]) {
                delete mask.chatHistory[cid];
            }
        });
        needSave = true;
    }

    if (needSave) {
        DataHub.state.masks[DataHub.state.activeMaskId] = mask;
        DataHub.save();
    }

    if (typeof window.renderContactList === 'function') {
        window.renderContactList();
    } else if (typeof window.loadContacts === 'function') {
        window.loadContacts();
    } else {
        window.dispatchEvent(new Event('refresh-contacts'));
    }
};

// 监听刷新事件
window.addEventListener('refresh-contacts', () => {
    if (typeof window.renderContactList === 'function') window.renderContactList();
    else if (typeof window.loadContacts === 'function') window.loadContacts();
});

// 页面加载时清理脏数据
if (window.refreshContactListIfNeeded) {
    setTimeout(() => window.refreshContactListIfNeeded(), 100);
}

// 监听来自 iframe 的刷新消息
window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'refreshContacts') {
        if (typeof window.renderContactList === 'function') window.renderContactList();
    }
});



console.log('[chat.js] 精简版已加载（仅保留传书页面功能）');


// 监听 C 发来的切换消息
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'switchToChuanshu') {
        // 切换到传书页面，不动底部导航
        document.querySelectorAll('.page-view').forEach(function(el) {
            el.classList.remove('active');
        });
        var page = document.getElementById('page-chuanshu');
        if (page) page.classList.add('active');
    }
});