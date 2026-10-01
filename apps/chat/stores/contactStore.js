// stores/contactStore.js
// 联系人相关数据操作

(function() {
  'use strict';

  const store = {
    /**
     * 获取当前预设的所有联系人
     * @returns {Array} 联系人列表
     */
    getContacts() {
      const activeId = window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      const contacts = (mask && mask.contacts) ? mask.contacts.slice() : [];
      console.log('[contactStore] getContacts ->', contacts.length, '个联系人');
      return contacts;
    },

    /**
     * 获取单个联系人
     * @param {string} contactId
     * @returns {Object|null} 联系人数据
     */
    get(contactId) {
      const activeId = window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      const contact = (mask && mask.contacts) ? mask.contacts.find(c => c.id === contactId) : null;
      console.log('[contactStore] get(', contactId, ') ->', contact ? '找到' : '未找到');
      return contact;
    },

    /**
     * 更新联系人
     * @param {string} contactId
     * @param {Object} patch 要更新的字段
     * @returns {boolean} 是否成功
     */
    update(contactId, patch) {
      const activeId = window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      if (!mask) return false;
      const contact = mask.contacts.find(c => c.id === contactId);
      if (!contact) {
        console.warn('[contactStore] update -> 联系人不存在:', contactId);
        return false;
      }
      Object.assign(contact, patch);
      // 同步更新 relation 节点（如果有）
      if (contact.relationMeta?.nodeId && mask.relations) {
        const node = mask.relations.nodes.find(n => n.id === contact.relationMeta.nodeId);
        if (node) {
          if (patch.name) node.name = patch.name;
          if (patch.role) node.role = patch.role;
          if (patch.desc) node.notes = patch.desc;
          if (patch.group) node.group = patch.group;
        }
      }
      window.DataHub.save();
      console.log('[contactStore] update(', contactId, ') -> 已更新字段:', Object.keys(patch));
      return true;
    },

    /**
     * 删除联系人
     * @param {string} contactId
     * @returns {boolean} 是否成功
     */
    delete(contactId) {
      const activeId = window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      if (!mask) return false;
      const idx = mask.contacts.findIndex(c => c.id === contactId);
      if (idx === -1) {
        console.warn('[contactStore] delete -> 联系人不存在:', contactId);
        return false;
      }
      // 同时删除聊天记录
      if (mask.chatHistory && mask.chatHistory[contactId]) {
        delete mask.chatHistory[contactId];
      }
      // 删除 relation 节点
      const contact = mask.contacts[idx];
      if (contact.relationMeta?.nodeId && mask.relations) {
        const relIdx = mask.relations.nodes.findIndex(n => n.id === contact.relationMeta.nodeId);
        if (relIdx >= 0) {
          mask.relations.nodes.splice(relIdx, 1);
        }
      }
      mask.contacts.splice(idx, 1);
      window.DataHub.save();
      console.log('[contactStore] delete -> 已删除联系人:', contactId);
      return true;
    },

    /**
     * 新增联系人
     * @param {Object} contactData 联系人数据（必须包含 id, name）
     * @returns {string|null} 新联系人的ID
     */
    create(contactData) {
      if (!contactData || !contactData.id || !contactData.name) {
        console.warn('[contactStore] create -> 缺少必要字段 (id, name)');
        return null;
      }
      const activeId = window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      if (!mask) return null;
      // 检查是否已存在
      if (mask.contacts.some(c => c.id === contactData.id)) {
        console.warn('[contactStore] create -> 联系人已存在:', contactData.id);
        return null;
      }
      const newContact = {
        id: contactData.id,
        name: contactData.name,
        remark: contactData.remark || contactData.name,
        role: contactData.role || '',
        avatar: contactData.avatar || '',
        lastMessage: contactData.lastMessage || '',
        timestamp: Date.now(),
        mode: 'online',
        ...contactData
      };
      mask.contacts.push(newContact);
      // 同步创建 relation 节点
      if (!mask.relations) mask.relations = { nodes: [], edges: [] };
      const nodeId = `rel_from_${contactData.id}`;
      mask.relations.nodes.push({
        id: nodeId,
        name: newContact.name,
        role: newContact.role || '',
        group: contactData.group || 'other',
        level: 'L2',
        distanceLabel: '普通',
        notes: contactData.desc || '',
        isFish: true,
        contactId: contactData.id,
        source: 'manual_create',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      newContact.relationMeta = { nodeId, source: 'manual_create', priority: 30 };
      // 初始化聊天记录
      if (!mask.chatHistory) mask.chatHistory = {};
      if (!mask.chatHistory[contactData.id]) mask.chatHistory[contactData.id] = [];
      window.DataHub.save();
      console.log('[contactStore] create -> 已创建联系人:', contactData.id);
      return contactData.id;
    },

    /**
     * 获取联系人的聊天历史
     * @param {string} contactId
     * @returns {Array} 消息列表
     */
    getHistory(contactId) {
      const activeId = window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      const history = (mask && mask.chatHistory && mask.chatHistory[contactId]) ? mask.chatHistory[contactId].slice() : [];
      console.log('[contactStore] getHistory(', contactId, ') ->', history.length, '条消息');
      return history;
    },

    /**
     * 添加消息到联系人聊天历史
     * @param {string} contactId
     * @param {Object} message 消息对象
     * @returns {boolean} 是否成功
     */
    addMessage(contactId, message) {
      const activeId = window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      if (!mask) return false;
      if (!mask.chatHistory) mask.chatHistory = {};
      if (!mask.chatHistory[contactId]) mask.chatHistory[contactId] = [];
      mask.chatHistory[contactId].push({
        id: message.id || ('msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
        sender: message.sender || '我',
        type: message.type || 'text',
        content: message.content || '',
        time: message.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ...message
      });
      // 更新联系人的最后一条消息
      const contact = mask.contacts.find(c => c.id === contactId);
      if (contact) {
        contact.lastMessage = message.content || '[消息]';
        contact.timestamp = Date.now();
      }
      window.DataHub.save();
      console.log('[contactStore] addMessage -> 已添加消息到:', contactId);
      return true;
    },

    /**
     * 清空联系人的聊天历史
     * @param {string} contactId
     * @returns {boolean} 是否成功
     */
    clearHistory(contactId) {
      const activeId = window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      if (!mask) return false;
      if (mask.chatHistory && mask.chatHistory[contactId]) {
        mask.chatHistory[contactId] = [];
        window.DataHub.save();
        console.log('[contactStore] clearHistory -> 已清空:', contactId);
        return true;
      }
      console.warn('[contactStore] clearHistory -> 无记录:', contactId);
      return false;
    }
  };

  window.contactStore = store;
  console.log('[contactStore] 已就绪');
})();