// stores/maskStore.js
// 预设/角色相关数据操作

(function() {
  'use strict';

  const store = {
    /**
     * 获取所有预设
     * @returns {Object} 所有预设对象 { maskId: maskData, ... }
     */
    getAllMasks() {
      const data = window.DataHub.state.masks || {};
      console.log('[maskStore] getAllMasks ->', Object.keys(data).length, '个预设');
      return data;
    },

    /**
     * 获取单个预设
     * @param {string} maskId
     * @returns {Object|null} 预设数据
     */
    getMask(maskId) {
      const mask = window.DataHub.state.masks[maskId] || null;
      console.log('[maskStore] getMask(', maskId, ') ->', mask ? '找到' : '未找到');
      return mask;
    },

    /**
     * 获取当前激活的预设
     * @returns {Object|null} 当前预设数据
     */
    getActiveMask() {
      const activeId = window.DataHub.state.activeMaskId;
      const mask = window.DataHub.state.masks[activeId] || null;
      console.log('[maskStore] getActiveMask ->', mask ? mask.name : '无');
      return mask;
    },

    /**
     * 获取当前激活的预设ID
     * @returns {string} 预设ID
     */
    getActiveMaskId() {
      const id = window.DataHub.state.activeMaskId || '';
      console.log('[maskStore] getActiveMaskId ->', id);
      return id;
    },

    /**
     * 切换预设
     * @param {string} maskId
     * @returns {boolean} 是否成功
     */
    setActiveMask(maskId) {
      if (!window.DataHub.state.masks[maskId]) {
        console.warn('[maskStore] setActiveMask -> 预设不存在:', maskId);
        return false;
      }
      window.DataHub.state.activeMaskId = maskId;
      window.DataHub.save();
      console.log('[maskStore] setActiveMask -> 已切换到:', maskId);
      return true;
    },

    /**
     * 更新预设数据
     * @param {string} maskId
     * @param {Object} patch 要更新的字段
     * @returns {boolean} 是否成功
     */
    update(maskId, patch) {
      if (!window.DataHub.state.masks[maskId]) {
        console.warn('[maskStore] update -> 预设不存在:', maskId);
        return false;
      }
      Object.assign(window.DataHub.state.masks[maskId], patch);
      window.DataHub.save();
      console.log('[maskStore] update(', maskId, ') -> 已更新字段:', Object.keys(patch));
      return true;
    },

    /**
     * 删除预设
     * @param {string} maskId
     * @returns {boolean} 是否成功
     */
    delete(maskId) {
      if (!window.DataHub.state.masks[maskId]) {
        console.warn('[maskStore] delete -> 预设不存在:', maskId);
        return false;
      }
      // 不允许删除系统预设
      if (maskId === 'jinyu' || maskId === 'songzhi') {
        console.warn('[maskStore] delete -> 系统预设不可删除:', maskId);
        return false;
      }
      delete window.DataHub.state.masks[maskId];
      window.DataHub.save();
      console.log('[maskStore] delete -> 已删除预设:', maskId);
      return true;
    },

    /**
     * 新增预设
     * @param {Object} maskData 预设数据（必须包含 id）
     * @returns {string|null} 新预设的ID
     */
    create(maskData) {
      if (!maskData || !maskData.id) {
        console.warn('[maskStore] create -> 缺少 id');
        return null;
      }
      if (window.DataHub.state.masks[maskData.id]) {
        console.warn('[maskStore] create -> 预设已存在:', maskData.id);
        return null;
      }
      // 借用 DataHub 的方法创建默认结构
      const defaultMask = window.DataHub._defaultMaskTemplate(maskData.id);
      const merged = window.DataHub._deepMerge(defaultMask, maskData);
      window.DataHub.state.masks[maskData.id] = merged;
      window.DataHub.save();
      console.log('[maskStore] create -> 已创建预设:', maskData.id);
      return maskData.id;
    }
  };

  window.maskStore = store;
  console.log('[maskStore] 已就绪');
})();