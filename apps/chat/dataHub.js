// dataHub.js - central data store for masks, chat, and UI state
const DataHub = {
    state: {
        activeMaskId: 'jinyu',
        currentStyle: {
            avatar: '',
            badge: 'O_o',
            signature: '一蓑烟雨任平生',
            background: 'linear-gradient(180deg, #f1f8e9 0%, #ffffff 100%)'
        },
        masks: {
            jinyu: {
                id: 'jinyu',
                name: '锦玉',
                role: '语言学学生',
                world: '现代',
                themeColor: '#7cb342',
                seal: '锦',
                avatar: null,
                letterText: '',
                rawText: '',
                relations: { nodes: [], edges: [] },
                wallet: { baseAmount: 250.5, dynamicDelta: 0, balance: 250.5, ledger: [], pending: [] },
                outfitPrefs: { style: '休闲/校园', favoriteColors: ['#7cb342'], scenes: ['校园'] },
                contacts: [
                    {
                        id: 'ai_friend_1',
                        name: '小鱼',
                        avatar: '',
                        lastMessage: '作业写完了吗？',
                        timestamp: Date.now()
                    }
                ],
                chatHistory: {
                    ai_friend_1: [
                        { id: 'msg_1', sender: '对方', type: 'text', content: '作业写完了吗？', time: '10:00' }
                    ]
                }
            },
            songzhi: {
                id: 'songzhi',
                name: '宋芝',
                role: '高级项目经理',
                world: '现代',
                themeColor: '#7fa8c9',
                seal: '芝',
                avatar: null,
                letterText: '',
                rawText: '',
                relations: { nodes: [], edges: [] },
                wallet: { baseAmount: 88888, dynamicDelta: 0, balance: 88888, ledger: [], pending: [] },
                outfitPrefs: { style: '职场/干练', favoriteColors: ['#7fa8c9'], scenes: ['通勤'] },
                contacts: [
                    {
                        id: 'business_1',
                        name: 'Mr. Smith',
                        avatar: '',
                        lastMessage: 'Meeting at 10 AM.',
                        timestamp: Date.now()
                    }
                ],
                chatHistory: {
                    business_1: [
                        { id: 'msg_1', sender: '对方', type: 'text', content: 'Meeting at 10 AM.', time: '09:00' }
                    ]
                }
            }
        },
        avatarLibrary: { contacts: [] },
        backgroundLibrary: [],
        emojiLibrary: [
            {
                id: 's_default',
                name: '默认',
                emojis: []
            }
        ],
        bubbleLibrary: [],
        settings: {
            chatBackground: '',
            bubbleStyle: { meBg: '#95ec69', themBg: '#ffffff', rad: 8, fz: 15, pad: 10, isCss: false }
        },
        recycleBin: []
    },

    walletProvider: {
        // Placeholder for future backend sync.
        sync() {}
    },

    setWalletProvider(provider) {
        if (provider && typeof provider.sync === 'function') {
            this.walletProvider = provider;
        }
    },

    relationSourcePriority: {
        manual_create: 30,
        relation_upgrade: 20,
        text_parse_suggestion: 10,
        legacy_contact_sync: 5
    },

    _getRelationPriority(source) {
        return this.relationSourcePriority[source] || 0;
    },

    _normalizeRelationNode(node = {}) {
        const now = Date.now();
        const normalized = {
            id: node.id || ('rel_' + now + '_' + Math.floor(Math.random() * 1000)),
            name: String(node.name || '未命名').trim() || '未命名',
            role: String(node.role || '').trim(),
            group: String(node.group || 'other').trim() || 'other',
            level: String(node.level || 'L2').trim() || 'L2',
            distanceLabel: String(node.distanceLabel || '普通').trim() || '普通',
            notes: String(node.notes || '').trim(),
            isFish: Boolean(node.isFish),
            contactId: String(node.contactId || '').trim(),
            source: String(node.source || 'manual_create'),
            createdAt: Number(node.createdAt) || now,
            updatedAt: now
        };
        normalized.sourcePriority = this._getRelationPriority(normalized.source);
        return normalized;
    },

    _findRelationIndex(nodes, target = {}) {
        if (!Array.isArray(nodes) || nodes.length === 0) return -1;
        if (target.id) {
            const byId = nodes.findIndex(n => n.id === target.id);
            if (byId >= 0) return byId;
        }
        if (target.contactId) {
            const byContact = nodes.findIndex(n => n.contactId && n.contactId === target.contactId);
            if (byContact >= 0) return byContact;
        }
        const tName = String(target.name || '').trim().toLowerCase();
        const tRole = String(target.role || '').trim().toLowerCase();
        if (tName) {
            const byNameRole = nodes.findIndex(n => {
                const nName = String(n.name || '').trim().toLowerCase();
                const nRole = String(n.role || '').trim().toLowerCase();
                return nName === tName && (tRole ? nRole === tRole : true);
            });
            if (byNameRole >= 0) return byNameRole;
        }
        return -1;
    },

    _syncContactsIntoRelationNodes(mask) {
        if (!mask || !Array.isArray(mask.contacts)) return false;
        if (!mask.relations || !Array.isArray(mask.relations.nodes)) {
            mask.relations = { nodes: [], edges: [] };
        }

        let changed = false;
        mask.contacts.forEach(contact => {
            if (!contact) return;
            const candidate = this._normalizeRelationNode({
                id: 'rel_from_' + String(contact.id || '').trim(),
                name: contact.remark || contact.name || '未命名',
                role: contact.role || '',
                group: 'other',
                level: 'L2',
                distanceLabel: '普通',
                notes: '',
                isFish: true,
                contactId: String(contact.id || '').trim(),
                source: 'legacy_contact_sync'
            });

            const idx = this._findRelationIndex(mask.relations.nodes, candidate);
            if (idx < 0) {
                mask.relations.nodes.push(candidate);
                changed = true;
                return;
            }

            const existing = this._normalizeRelationNode(mask.relations.nodes[idx]);
            const merged = {
                ...existing,
                contactId: existing.contactId || candidate.contactId,
                isFish: true,
                name: existing.name || candidate.name,
                role: existing.role || candidate.role,
                updatedAt: Date.now()
            };
            mask.relations.nodes[idx] = merged;
            changed = true;
        });
        return changed;
    },

    _deepMerge(target, source) {
        for (const key in source) {
            if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
            const sourceValue = source[key];
            if (
                sourceValue &&
                typeof sourceValue === 'object' &&
                !Array.isArray(sourceValue)
            ) {
                if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
                    target[key] = {};
                }
                this._deepMerge(target[key], sourceValue);
            } else {
                target[key] = sourceValue;
            }
        }
        return target;
    },

    _defaultMaskTemplate(maskId = 'mask_' + Date.now()) {
        return {
            id: maskId,
            name: '未命名',
            role: '',
            world: '现代',
            themeColor: '#f0c040',
            seal: '设',
            avatar: null,
            letterText: '',
            rawText: '',
            relations: { nodes: [], edges: [] },
            wallet: { baseAmount: 0, dynamicDelta: 0, balance: 0, ledger: [], pending: [] },
            outfitPrefs: { style: '未设定', favoriteColors: ['#f0c040'], scenes: [] },
            contacts: [],
            chatHistory: {}
        };
    },

    ensureMaskShape(mask) {
        const base = this._defaultMaskTemplate(mask && mask.id ? mask.id : undefined);
        const merged = this._deepMerge(base, mask || {});

        if (!Array.isArray(merged.relations?.nodes)) merged.relations.nodes = [];
        if (!Array.isArray(merged.relations?.edges)) merged.relations.edges = [];
        merged.relations.nodes = merged.relations.nodes.map(node => this._normalizeRelationNode(node));
        if (!Array.isArray(merged.wallet?.ledger)) merged.wallet.ledger = [];
        if (!Array.isArray(merged.wallet?.pending)) merged.wallet.pending = [];
        if (typeof merged.wallet?.baseAmount !== 'number') {
            const legacyBalance = Number(merged.wallet?.balance);
            merged.wallet.baseAmount = Number.isFinite(legacyBalance) ? legacyBalance : 0;
        }
        if (typeof merged.wallet?.dynamicDelta !== 'number') {
            merged.wallet.dynamicDelta = 0;
        }
        merged.wallet.balance = Number((Number(merged.wallet.baseAmount) + Number(merged.wallet.dynamicDelta)).toFixed(2));
        if (!Array.isArray(merged.outfitPrefs?.favoriteColors)) {
            const legacyFavorite = merged.outfitPrefs?.favoriteColor;
            merged.outfitPrefs.favoriteColors = legacyFavorite ? [legacyFavorite] : ['#f0c040'];
        }
        if (!Array.isArray(merged.outfitPrefs?.scenes)) merged.outfitPrefs.scenes = [];
        if (!Array.isArray(merged.contacts)) merged.contacts = [];
        if (!merged.chatHistory || typeof merged.chatHistory !== 'object' || Array.isArray(merged.chatHistory)) {
            merged.chatHistory = {};
        }
        return merged;
    },

    ensureStateShape() {
        if (!this.state.masks || typeof this.state.masks !== 'object') {
            this.state.masks = {};
        }

        Object.keys(this.state.masks).forEach(maskId => {
            const nextMask = this.ensureMaskShape({
                ...this.state.masks[maskId],
                id: this.state.masks[maskId]?.id || maskId
            });
            this._syncContactsIntoRelationNodes(nextMask);
            this.state.masks[maskId] = nextMask;
        });

        if (!this.state.activeMaskId || !this.state.masks[this.state.activeMaskId]) {
            const firstMaskId = Object.keys(this.state.masks)[0];
            this.state.activeMaskId = firstMaskId || 'jinyu';
            if (!firstMaskId) {
                this.state.masks.jinyu = this._defaultMaskTemplate('jinyu');
            }
        }

        if (!this.state.currentStyle) this.state.currentStyle = {};
        if (!this.state.avatarLibrary) this.state.avatarLibrary = { contacts: [] };
        if (!this.state.avatarLibrary.contacts) this.state.avatarLibrary.contacts = [];
        if (!Array.isArray(this.state.backgroundLibrary)) this.state.backgroundLibrary = [];
        if (!Array.isArray(this.state.emojiLibrary) || this.state.emojiLibrary.length === 0) {
            this.state.emojiLibrary = [{ id: 's_default', name: '默认', emojis: [] }];
        }
        if (!Array.isArray(this.state.bubbleLibrary)) this.state.bubbleLibrary = [];
        if (!this.state.settings) this.state.settings = {};
        if (!this.state.settings.bubbleStyle) {
            this.state.settings.bubbleStyle = { meBg: '#95ec69', themBg: '#ffffff', rad: 8, fz: 15, pad: 10, isCss: false };
        }
        if (typeof this.state.settings.chatBackground !== 'string') this.state.settings.chatBackground = '';
    },

    load() {
        const savedData = localStorage.getItem('jinyu_app_data');
        if (savedData) {
            try {
                const loadedState = JSON.parse(savedData);
                this.state = this._deepMerge(this.state, loadedState);
            } catch (e) {
                console.error('数据加载失败:', e);
            }
        }
        this.ensureStateShape();
        this.save();
    },

    save() {
        try {
            localStorage.setItem('jinyu_app_data', JSON.stringify(this.state));
        } catch (e) {
            console.error('数据保存失败:', e);
        }
    },

    updateStyle(newData) {
        Object.assign(this.state.currentStyle, newData);
        this.save();
    },

    getStyle() {
        return this.state.currentStyle;
    },

    switchMask(maskId) {
        if (!this.state.masks[maskId]) return false;
        this.state.activeMaskId = maskId;
        this.save();
        return true;
    },

    getActiveMask() {
        const mask = this.state.masks[this.state.activeMaskId];
        return this.ensureMaskShape(mask);
    },

    getMask(maskId) {
        return this.state.masks[maskId] ? this.ensureMaskShape(this.state.masks[maskId]) : null;
    },

    updateMask(maskId, patch) {
        if (!this.state.masks[maskId]) return false;
        const merged = this._deepMerge(this.ensureMaskShape(this.state.masks[maskId]), patch || {});
        this.state.masks[maskId] = this.ensureMaskShape(merged);
        this.save();
        return true;
    },

    getContacts() {
        const mask = this.getActiveMask();
        return mask.contacts;
    },

    getRelations(maskId = this.state.activeMaskId) {
        const mask = this.getMask(maskId);
        if (!mask) return [];
        const changed = this._syncContactsIntoRelationNodes(mask);
        if (changed) {
            this.state.masks[maskId] = mask;
            this.save();
        }
        return mask.relations.nodes || [];
    },

    upsertRelationNode(maskId = this.state.activeMaskId, nodePatch = {}, origin = 'manual_create') {
        const mask = this.getMask(maskId);
        if (!mask) return null;
        if (!mask.relations) mask.relations = { nodes: [], edges: [] };
        if (!Array.isArray(mask.relations.nodes)) mask.relations.nodes = [];

        const incoming = this._normalizeRelationNode({
            ...nodePatch,
            source: nodePatch.source || origin
        });
        const idx = this._findRelationIndex(mask.relations.nodes, incoming);

        if (idx < 0) {
            mask.relations.nodes.push(incoming);
            this.state.masks[maskId] = mask;
            this.save();
            return incoming;
        }

        const existing = this._normalizeRelationNode(mask.relations.nodes[idx]);
        const keepExistingSource = existing.sourcePriority > incoming.sourcePriority;
        const merged = {
            ...existing,
            ...incoming,
            source: keepExistingSource ? existing.source : incoming.source,
            sourcePriority: keepExistingSource ? existing.sourcePriority : incoming.sourcePriority,
            createdAt: existing.createdAt || incoming.createdAt,
            updatedAt: Date.now()
        };
        if (existing.isFish) merged.isFish = true;
        if (!merged.contactId) merged.contactId = existing.contactId || incoming.contactId || '';

        mask.relations.nodes[idx] = merged;
        this.state.masks[maskId] = mask;
        this.save();
        return merged;
    },

    deleteRelationNode(maskId = this.state.activeMaskId, nodeId) {
        const mask = this.getMask(maskId);
        if (!mask || !mask.relations || !Array.isArray(mask.relations.nodes)) return false;
        const idx = mask.relations.nodes.findIndex(n => n.id === nodeId);
        if (idx < 0) return false;
        const removed = mask.relations.nodes[idx];
        mask.relations.nodes.splice(idx, 1);
        if (Array.isArray(mask.contacts)) {
            const cIdx = mask.contacts.findIndex(c =>
                (removed.contactId && c.id === removed.contactId) ||
                (c.relationMeta && c.relationMeta.nodeId === nodeId)
            );
            if (cIdx >= 0) {
                const removedContact = mask.contacts[cIdx];
                mask.contacts.splice(cIdx, 1);
                if (removedContact?.id && mask.chatHistory && mask.chatHistory[removedContact.id]) {
                    delete mask.chatHistory[removedContact.id];
                }
            }
        }
        this.state.masks[maskId] = mask;
        this.save();
        return true;
    },

    upsertContactFromRelation(maskId = this.state.activeMaskId, relationNodeOrId, origin = 'relation_upgrade', contactPatch = {}) {
        const mask = this.getMask(maskId);
        if (!mask) return null;
        if (!Array.isArray(mask.contacts)) mask.contacts = [];
        if (!mask.chatHistory || typeof mask.chatHistory !== 'object' || Array.isArray(mask.chatHistory)) {
            mask.chatHistory = {};
        }

        const node = typeof relationNodeOrId === 'string'
            ? (mask.relations?.nodes || []).find(n => n.id === relationNodeOrId)
            : relationNodeOrId;
        if (!node) return null;

        const n = this._normalizeRelationNode(node);
        const incomingPriority = this._getRelationPriority(origin);

        let contactId = String(n.contactId || '').trim();
        let idx = -1;
        if (contactId) {
            idx = mask.contacts.findIndex(c => c.id === contactId);
        }
        if (idx < 0) {
            idx = mask.contacts.findIndex(c => String(c.name || '').trim() === n.name);
            if (idx >= 0) contactId = mask.contacts[idx].id;
        }
        if (!contactId) {
            contactId = 'rel_contact_' + n.id.replace(/[^a-zA-Z0-9_]/g, '_');
        }

        const existing = idx >= 0 ? mask.contacts[idx] : null;
        const existingPriority = Number(existing?.relationMeta?.priority) || 0;
        const shouldOverride = !existing || incomingPriority >= existingPriority;

        const nextContact = {
            ...(existing || {}),
            ...(shouldOverride ? {
                name: n.name,
                role: n.role || existing?.role || '',
                remark: existing?.remark || n.name,
                timestamp: Date.now()
            } : {}),
            ...contactPatch,
            id: contactId,
            relationMeta: {
                nodeId: n.id,
                source: origin,
                priority: Math.max(existingPriority, incomingPriority)
            }
        };

        if (idx >= 0) mask.contacts[idx] = nextContact;
        else mask.contacts.push(nextContact);
        if (!Array.isArray(mask.chatHistory[contactId])) mask.chatHistory[contactId] = [];

        const relationIdx = this._findRelationIndex(mask.relations.nodes, { id: n.id, contactId });
        if (relationIdx >= 0) {
            const merged = this._normalizeRelationNode({
                ...mask.relations.nodes[relationIdx],
                contactId,
                isFish: true,
                source: mask.relations.nodes[relationIdx].source || origin
            });
            mask.relations.nodes[relationIdx] = merged;
        }

        this.state.masks[maskId] = this.ensureMaskShape(mask);
        this.save();
        return nextContact;
    },

    upsertRelationFromContact(maskId = this.state.activeMaskId, contact, origin = 'manual_create') {
        if (!contact) return null;
        const node = this.upsertRelationNode(maskId, {
            id: contact.relationMeta?.nodeId || ('rel_from_' + String(contact.id || '').trim()),
            name: contact.remark || contact.name || '未命名',
            role: contact.role || '',
            group: 'other',
            level: 'L2',
            distanceLabel: '普通',
            notes: '',
            isFish: true,
            contactId: String(contact.id || '').trim(),
            source: origin
        }, origin);
        return node;
    },

    promoteRelationToFish(maskId = this.state.activeMaskId, relationNodeId, contactPatch = {}) {
        const mask = this.getMask(maskId);
        if (!mask) return null;
        const idx = (mask.relations?.nodes || []).findIndex(n => n.id === relationNodeId);
        if (idx < 0) return null;
        const relation = this._normalizeRelationNode({
            ...mask.relations.nodes[idx],
            isFish: true,
            source: mask.relations.nodes[idx].source || 'relation_upgrade'
        });
        mask.relations.nodes[idx] = relation;
        this.state.masks[maskId] = mask;
        this.save();
        return this.upsertContactFromRelation(maskId, relation, 'relation_upgrade', contactPatch);
    },

    demoteRelationToNpc(maskId = this.state.activeMaskId, relationNodeId) {
        const mask = this.getMask(maskId);
        if (!mask) return false;
        const idx = (mask.relations?.nodes || []).findIndex(n => n.id === relationNodeId);
        if (idx < 0) return false;
        const relation = this._normalizeRelationNode({
            ...mask.relations.nodes[idx],
            isFish: false
        });
        mask.relations.nodes[idx] = relation;
        this.state.masks[maskId] = mask;
        this.save();
        return true;
    },

    getContactById(contactId) {
        const mask = this.getActiveMask();
        return mask.contacts.find(c => c.id === contactId);
    },

    updateContact(contactId, updates) {
        const maskId = this.state.activeMaskId;
        const mask = this.getActiveMask();
        const contact = mask.contacts.find(c => c.id === contactId);
        if (contact) {
            Object.assign(contact, updates);
            this.state.masks[maskId] = mask;
            this.upsertRelationFromContact(maskId, contact, 'manual_create');
            this.save();
        }
    },

    getUserProfile() {
        return this.state.currentStyle;
    },

    updateUserProfile(updates) {
        Object.assign(this.state.currentStyle, updates);
        this.save();
    },

    clearChatHistory(contactId) {
        const maskId = this.state.activeMaskId;
        const mask = this.getActiveMask();
        if (mask.chatHistory[contactId]) {
            mask.chatHistory[contactId] = [];
            this.state.masks[maskId] = mask;
            this.save();
        }
    },

    getChatHistory(contactId) {
        const mask = this.getActiveMask();
        return mask.chatHistory[contactId] || [];
    },

    addChatMessage(contactId, message) {
        const maskId = this.state.activeMaskId;
        const mask = this.getActiveMask();
        if (!mask.chatHistory[contactId]) {
            mask.chatHistory[contactId] = [];
        }
        mask.chatHistory[contactId].push(message);

        const contact = mask.contacts.find(c => c.id === contactId);
        if (contact) {
            contact.lastMessage = message.content || '[消息]';
            contact.timestamp = Date.now();
            this.upsertRelationFromContact(maskId, contact, 'manual_create');
        }
        this.state.masks[maskId] = mask;
        this.save();
    },

    getWallet(maskId = this.state.activeMaskId) {
        const mask = this.getMask(maskId);
        if (!mask) return { baseAmount: 0, dynamicDelta: 0, balance: 0, ledger: [], pending: [] };
        const wallet = mask.wallet || {};
        const baseAmount = Number(wallet.baseAmount) || 0;
        const dynamicDelta = Number(wallet.dynamicDelta) || 0;
        return {
            ...wallet,
            baseAmount,
            dynamicDelta,
            balance: Number((baseAmount + dynamicDelta).toFixed(2)),
            ledger: Array.isArray(wallet.ledger) ? wallet.ledger : [],
            pending: Array.isArray(wallet.pending) ? wallet.pending : []
        };
    },

    updateWallet(maskId = this.state.activeMaskId, patch = {}) {
        const wallet = this.getWallet(maskId);
        const nextWallet = this._deepMerge({ ...wallet }, patch || {});
        const hasBase = Object.prototype.hasOwnProperty.call(patch || {}, 'baseAmount');
        const hasDelta = Object.prototype.hasOwnProperty.call(patch || {}, 'dynamicDelta');
        const hasBalance = Object.prototype.hasOwnProperty.call(patch || {}, 'balance');

        const baseAmount = hasBase ? (Number(nextWallet.baseAmount) || 0) : (Number(wallet.baseAmount) || 0);
        let dynamicDelta = hasDelta ? (Number(nextWallet.dynamicDelta) || 0) : (Number(wallet.dynamicDelta) || 0);

        // Backward-compatible path: old callers still pass `balance`.
        if (hasBalance && !hasDelta) {
            const targetBalance = Number(nextWallet.balance) || 0;
            dynamicDelta = Number((targetBalance - baseAmount).toFixed(2));
        }

        nextWallet.baseAmount = baseAmount;
        nextWallet.dynamicDelta = dynamicDelta;
        nextWallet.balance = Number((baseAmount + dynamicDelta).toFixed(2));
        if (!Array.isArray(nextWallet.ledger)) nextWallet.ledger = [];
        if (!Array.isArray(nextWallet.pending)) nextWallet.pending = [];

        const ok = this.updateMask(maskId, { wallet: nextWallet });
        if (!ok) return false;
        try {
            this.walletProvider.sync(maskId, nextWallet);
        } catch (e) {
            console.warn('walletProvider.sync failed:', e);
        }
        return true;
    },

    addToRecycleBin(item) {
        if (!Array.isArray(this.state.recycleBin)) this.state.recycleBin = [];
        this.state.recycleBin.unshift(item);
        this.save();
    },

    getRecycleBin() {
        return this.state.recycleBin || [];
    },

    clearRecycleBin() {
        this.state.recycleBin = [];
        this.save();
    },

    removeFromRecycleBin(index) {
        if (!Array.isArray(this.state.recycleBin)) return;
        if (index >= 0 && index < this.state.recycleBin.length) {
            this.state.recycleBin.splice(index, 1);
            this.save();
        }
    }
};

DataHub.load();
window.DataHub = DataHub;

// ==========================================
// 聊天模块独立大仓库 (IndexedDB)
// 数据库名: JinyuPhone_ChatStorage
// 用途: 头像库、背景库、表情包图片本体
// ==========================================
const ChatDB = {
    dbName: 'JinyuPhone_ChatStorage',
    storeName: 'chat_assets',
    db: null,

    init: function() {
        return new Promise((resolve, reject) => {
            if (this.db) return resolve(this.db);
            
            const request = indexedDB.open(this.dbName, 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ 聊天大仓库 (IndexedDB) 连接成功');
                resolve(this.db);
            };
            
            request.onerror = (event) => {
                console.error('❌ 聊天大仓库连接失败:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    save: async function(key, data) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(data, key);
            request.onsuccess = () => resolve(true);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    get: async function(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    remove: async function(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve(true);
            request.onerror = (e) => reject(e.target.error);
        });
    }
};

window.ChatDB = ChatDB;
(function() {
  var _save = DataHub.save;
  DataHub.save = function() {
    var before = JSON.stringify(this.state);
    _save.call(this);
    var after = JSON.stringify(this.state);
    if (before !== after && window.EventBus) {
      window.EventBus.emit('DATA_CHANGED', { time: Date.now() });
    }
  };
})();
console.log('[DataHub] 事件扩展已就绪');