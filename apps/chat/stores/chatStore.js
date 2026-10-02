// stores/chatStore.js
// 聊天记录相关数据操作

(function() {
  'use strict';

  const store = {
    /**
     * 获取与某联系人的聊天历史
     * @param {string} contactId
     * @returns {Array} 消息列表
     */
    getHistory(contactId) {
      const activeId = window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      const history = (mask && mask.chatHistory && mask.chatHistory[contactId]) ? mask.chatHistory[contactId].slice() : [];
      console.log('[chatStore] getHistory(', contactId, ') ->', history.length, '条消息');
      return history;
    },

    /**
     * 发送消息（添加到聊天历史）
     * @param {string} contactId
     * @param {Object} message 消息对象
     * @returns {boolean} 是否成功
     */
    sendMessage(contactId, message) {
      const result = window.contactStore ? window.contactStore.addMessage(contactId, message) : false;
      console.log('[chatStore] sendMessage ->', result ? '成功' : '失败');
      return result;
    },

    /**
     * 删除单条消息
     * @param {string} contactId
     * @param {string} messageId
     * @returns {boolean} 是否成功
     */
    deleteMessage(contactId, messageId) {
      const activeId = window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      if (!mask || !mask.chatHistory || !mask.chatHistory[contactId]) {
        console.warn('[chatStore] deleteMessage -> 无聊天记录:', contactId);
        return false;
      }
      const idx = mask.chatHistory[contactId].findIndex(m => m.id === messageId);
      if (idx === -1) {
        console.warn('[chatStore] deleteMessage -> 消息不存在:', messageId);
        return false;
      }
      mask.chatHistory[contactId].splice(idx, 1);
      window.DataHub.save();
      console.log('[chatStore] deleteMessage -> 已删除消息:', messageId);
      return true;
    },

    /**
     * 编辑单条消息
     * @param {string} contactId
     * @param {string} messageId
     * @param {string} newContent
     * @returns {boolean} 是否成功
     */
    editMessage(contactId, messageId, newContent) {
      const activeId = window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      if (!mask || !mask.chatHistory || !mask.chatHistory[contactId]) {
        console.warn('[chatStore] editMessage -> 无聊天记录:', contactId);
        return false;
      }
      const msg = mask.chatHistory[contactId].find(m => m.id === messageId);
      if (!msg) {
        console.warn('[chatStore] editMessage -> 消息不存在:', messageId);
        return false;
      }
      msg.content = newContent;
      window.DataHub.save();
      console.log('[chatStore] editMessage -> 已更新消息:', messageId);
      return true;
    },

    /**
     * 获取所有聊天记录（按联系人分组）
     * @returns {Object} { contactId: [messages], ... }
     */
    getAllHistories() {
      const activeId = window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      const histories = (mask && mask.chatHistory) ? mask.chatHistory : {};
      console.log('[chatStore] getAllHistories ->', Object.keys(histories).length, '个对话');
      return histories;
    },

    /**
     * 搜索所有聊天记录
     * @param {string} keyword
     * @returns {Array} 匹配的消息列表（附带 contactId）
     */
    search(keyword) {
      if (!keyword || !keyword.trim()) {
        console.log('[chatStore] search -> 关键字为空');
        return [];
      }
      const activeId = window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      const histories = (mask && mask.chatHistory) ? mask.chatHistory : {};
      const results = [];
      const kw = keyword.trim().toLowerCase();
      Object.keys(histories).forEach(contactId => {
        (histories[contactId] || []).forEach(msg => {
          if (msg.content && msg.content.toLowerCase().includes(kw)) {
            results.push({ contactId, ...msg });
          }
        });
      });
      console.log('[chatStore] search(', keyword, ') ->', results.length, '条结果');
      return results;
    },

    /**
     * 获取对话摘要（最近N条消息）
     * @param {string} contactId
     * @param {number} limit 默认10条
     * @returns {Array} 最近的消息列表
     */
    getRecent(contactId, limit = 10) {
      const history = this.getHistory(contactId);
      const recent = history.slice(-limit);
      console.log('[chatStore] getRecent(', contactId, ',', limit, ') ->', recent.length, '条');
      return recent;
    },

    /**
     * 导出聊天记录为纯文本
     * @param {string} contactId
     * @param {string} contactName 联系人名称（用于标题）
     * @returns {string} 纯文本格式的聊天记录
     */
    exportText(contactId, contactName = '') {
      const history = this.getHistory(contactId);
      const lines = [];
      lines.push(`=== 与 ${contactName || contactId} 的聊天记录 ===`);
      lines.push(`导出时间: ${new Date().toLocaleString()}`);
      lines.push('---');
      history.forEach(msg => {
        const sender = msg.sender || '未知';
        const content = msg.content || '';
        const time = msg.time || '';
        lines.push(`[${time}] ${sender}: ${content}`);
      });
      lines.push('---');
      lines.push(`共 ${history.length} 条消息`);
      const result = lines.join('\n');
      console.log('[chatStore] exportText ->', history.length, '条消息已导出');
      return result;
    }
  };

  window.chatStore = store;
  console.log('[chatStore] 已就绪');
})();