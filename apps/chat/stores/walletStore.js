// stores/walletStore.js
// 钱包相关数据操作

(function() {
  'use strict';

  const store = {
    /**
     * 获取当前预设的钱包数据
     * @param {string} maskId 可选，默认使用当前激活的预设
     * @returns {Object} { balance, ledger, baseAmount, dynamicDelta }
     */
    getWallet(maskId) {
      const activeId = maskId || window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      if (!mask) {
        console.warn('[walletStore] getWallet -> 预设不存在:', activeId);
        return { balance: 0, ledger: [], baseAmount: 0, dynamicDelta: 0 };
      }
      const wallet = mask.wallet || { baseAmount: 0, dynamicDelta: 0, ledger: [] };
      const balance = Number((Number(wallet.baseAmount) + Number(wallet.dynamicDelta)).toFixed(2));
      console.log('[walletStore] getWallet -> 余额:', balance);
      return { ...wallet, balance };
    },

    /**
     * 获取当前余额
     * @param {string} maskId 可选
     * @returns {number}
     */
    getBalance(maskId) {
      const wallet = this.getWallet(maskId);
      console.log('[walletStore] getBalance ->', wallet.balance);
      return wallet.balance;
    },

    /**
     * 更新钱包（合并更新）
     * @param {Object} patch 要更新的字段 { balance?, baseAmount?, dynamicDelta?, ledger?, pending? }
     * @param {string} maskId 可选
     * @returns {boolean}
     */
    update(patch, maskId) {
      const activeId = maskId || window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      if (!mask) {
        console.warn('[walletStore] update -> 预设不存在:', activeId);
        return false;
      }
      if (!mask.wallet) mask.wallet = { baseAmount: 0, dynamicDelta: 0, ledger: [], pending: [] };
      
      // 处理 balance 字段：如果传了 balance，转换为 dynamicDelta
      if (patch.balance !== undefined) {
        const currentBase = Number(mask.wallet.baseAmount) || 0;
        const targetBalance = Number(patch.balance) || 0;
        patch.dynamicDelta = Number((targetBalance - currentBase).toFixed(2));
        delete patch.balance;
      }
      
      Object.assign(mask.wallet, patch);
      // 确保 ledger 和 pending 是数组
      if (!Array.isArray(mask.wallet.ledger)) mask.wallet.ledger = [];
      if (!Array.isArray(mask.wallet.pending)) mask.wallet.pending = [];
      // 计算 balance
      const base = Number(mask.wallet.baseAmount) || 0;
      const delta = Number(mask.wallet.dynamicDelta) || 0;
      mask.wallet.balance = Number((base + delta).toFixed(2));
      
      window.DataHub.save();
      console.log('[walletStore] update -> 已更新, 新余额:', mask.wallet.balance);
      return true;
    },

    /**
     * 添加流水记录
     * @param {Object} record { type, amount, remark?, contactId?, timestamp? }
     * @param {string} maskId 可选
     * @returns {string|null} 记录ID
     */
    addRecord(record, maskId) {
      const activeId = maskId || window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      if (!mask) {
        console.warn('[walletStore] addRecord -> 预设不存在:', activeId);
        return null;
      }
      if (!mask.wallet) mask.wallet = { baseAmount: 0, dynamicDelta: 0, ledger: [], pending: [] };
      if (!Array.isArray(mask.wallet.ledger)) mask.wallet.ledger = [];
      
      const newRecord = {
        id: 'wallet_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        type: record.type || 'other',
        amount: Number(record.amount) || 0,
        remark: record.remark || '',
        contactId: record.contactId || '',
        timestamp: record.timestamp || Date.now(),
        ...record
      };
      
      mask.wallet.ledger.unshift(newRecord);
      // 更新余额
      const currentBalance = Number(mask.wallet.balance) || 0;
      mask.wallet.balance = Number((currentBalance + newRecord.amount).toFixed(2));
      // 同步更新 dynamicDelta
      const base = Number(mask.wallet.baseAmount) || 0;
      mask.wallet.dynamicDelta = Number((mask.wallet.balance - base).toFixed(2));
      
      window.DataHub.save();
      console.log('[walletStore] addRecord -> 已添加, 类型:', newRecord.type, '金额:', newRecord.amount);
      return newRecord.id;
    },

    /**
     * 获取今日收支汇总
     * @param {string} maskId 可选
     * @returns {number} 今日净变化
     */
    getTodayDelta(maskId) {
      const wallet = this.getWallet(maskId);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      let delta = 0;
      (wallet.ledger || []).forEach(record => {
        if ((record.timestamp || 0) >= todayStart.getTime()) {
          delta += Number(record.amount) || 0;
        }
      });
      console.log('[walletStore] getTodayDelta ->', delta);
      return delta;
    },

    /**
     * 筛选流水记录
     * @param {string} filterType 类型过滤 (all / spin_income / incoming_transfer / outgoing_transfer)
     * @param {string} keyword 搜索关键词
     * @param {string} maskId 可选
     * @returns {Array} 筛选后的记录
     */
    filterLedger(filterType, keyword, maskId) {
      const wallet = this.getWallet(maskId);
      let records = wallet.ledger || [];
      
      if (filterType && filterType !== 'all') {
        records = records.filter(r => r.type === filterType);
      }
      
      if (keyword && keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        records = records.filter(r => 
          (r.remark || '').toLowerCase().includes(kw) ||
          (r.contactId || '').toLowerCase().includes(kw)
        );
      }
      
      console.log('[walletStore] filterLedger ->', records.length, '条匹配');
      return records;
    },

    /**
     * 清空流水
     * @param {string} maskId 可选
     * @returns {boolean}
     */
    clearLedger(maskId) {
      const activeId = maskId || window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      if (!mask || !mask.wallet) {
        console.warn('[walletStore] clearLedger -> 无钱包数据');
        return false;
      }
      mask.wallet.ledger = [];
      window.DataHub.save();
      console.log('[walletStore] clearLedger -> 已清空');
      return true;
    },

    /**
     * 删除单条流水记录
     * @param {string} recordId
     * @param {string} maskId 可选
     * @returns {boolean}
     */
    deleteRecord(recordId, maskId) {
      const activeId = maskId || window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId];
      if (!mask || !mask.wallet || !Array.isArray(mask.wallet.ledger)) {
        console.warn('[walletStore] deleteRecord -> 无流水');
        return false;
      }
      const idx = mask.wallet.ledger.findIndex(r => r.id === recordId);
      if (idx === -1) {
        console.warn('[walletStore] deleteRecord -> 记录不存在:', recordId);
        return false;
      }
      // 从余额中扣除该记录的影响
      const record = mask.wallet.ledger[idx];
      const currentBalance = Number(mask.wallet.balance) || 0;
      mask.wallet.balance = Number((currentBalance - (Number(record.amount) || 0)).toFixed(2));
      const base = Number(mask.wallet.baseAmount) || 0;
      mask.wallet.dynamicDelta = Number((mask.wallet.balance - base).toFixed(2));
      
      mask.wallet.ledger.splice(idx, 1);
      window.DataHub.save();
      console.log('[walletStore] deleteRecord -> 已删除:', recordId);
      return true;
    }
  };

  window.walletStore = store;
  console.log('[walletStore] 已就绪');
})();