// stores/settingsStore.js
// 全局设置相关数据操作

(function() {
  'use strict';

  const store = {
    /**
     * 获取所有设置
     * @returns {Object} 设置对象
     */
    getAll() {
      const settings = window.DataHub.state.settings || {};
      console.log('[settingsStore] getAll -> 已获取');
      return settings;
    },

    /**
     * 获取用户样式（头像、签名、徽章等）
     * @returns {Object} { avatar, badge, signature, background, cardBg, themePresets }
     */
    getStyle() {
      const style = window.DataHub.state.currentStyle || {};
      console.log('[settingsStore] getStyle ->', Object.keys(style));
      return style;
    },

    /**
     * 更新用户样式
     * @param {Object} patch 要更新的字段
     * @returns {boolean}
     */
    updateStyle(patch) {
      if (!patch || typeof patch !== 'object') {
        console.warn('[settingsStore] updateStyle -> 无效参数');
        return false;
      }
      if (!window.DataHub.state.currentStyle) {
        window.DataHub.state.currentStyle = {};
      }
      Object.assign(window.DataHub.state.currentStyle, patch);
      window.DataHub.save();
      console.log('[settingsStore] updateStyle -> 已更新:', Object.keys(patch));
      return true;
    },

    /**
     * 获取当前气泡样式
     * @returns {Object} { meBg, themBg, rad, fz, pad, isCss?, rawCss? }
     */
    getBubbleStyle() {
      const settings = window.DataHub.state.settings || {};
      const style = settings.bubbleStyle || { meBg: '#95ec69', themBg: '#ffffff', rad: 8, fz: 15, pad: 10, isCss: false };
      console.log('[settingsStore] getBubbleStyle ->', style.isCss ? 'CSS特效' : '常规样式');
      return style;
    },

    /**
     * 更新气泡样式
     * @param {Object} style { meBg?, themBg?, rad?, fz?, pad?, isCss?, rawCss? }
     * @returns {boolean}
     */
    updateBubbleStyle(style) {
      if (!style || typeof style !== 'object') {
        console.warn('[settingsStore] updateBubbleStyle -> 无效参数');
        return false;
      }
      if (!window.DataHub.state.settings) {
        window.DataHub.state.settings = {};
      }
      window.DataHub.state.settings.bubbleStyle = { ...style };
      window.DataHub.save();
      console.log('[settingsStore] updateBubbleStyle -> 已更新');
      return true;
    },

    /**
     * 获取聊天背景
     * @returns {string} 背景图片 URL
     */
    getChatBackground() {
      const bg = window.DataHub.state.settings?.chatBackground || '';
      console.log('[settingsStore] getChatBackground ->', bg ? '已设置' : '未设置');
      return bg;
    },

    /**
     * 设置聊天背景
     * @param {string} url 背景图片 URL
     * @returns {boolean}
     */
    setChatBackground(url) {
      if (!window.DataHub.state.settings) {
        window.DataHub.state.settings = {};
      }
      window.DataHub.state.settings.chatBackground = url || '';
      window.DataHub.save();
      console.log('[settingsStore] setChatBackground ->', url ? '已设置' : '已清除');
      return true;
    },

    /**
     * 获取主题预设列表
     * @returns {Array} [{ name, hex, tint, hover, border }, ...]
     */
    getThemePresets() {
      const style = window.DataHub.state.currentStyle || {};
      const presets = style.themePresets || [];
      console.log('[settingsStore] getThemePresets ->', presets.length, '个预设');
      return presets;
    },

    /**
     * 保存主题预设
     * @param {string} name 预设名称
     * @param {string} hex 颜色值
     * @param {Object} meta 可选 { tint, hover, border }
     * @returns {boolean}
     */
    saveThemePreset(name, hex, meta) {
      if (!name || !hex) {
        console.warn('[settingsStore] saveThemePreset -> 缺少参数');
        return false;
      }
      if (!window.DataHub.state.currentStyle) {
        window.DataHub.state.currentStyle = {};
      }
      if (!Array.isArray(window.DataHub.state.currentStyle.themePresets)) {
        window.DataHub.state.currentStyle.themePresets = [];
      }
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      window.DataHub.state.currentStyle.themePresets.push({
        name,
        hex,
        tint: meta?.tint || `rgba(${r},${g},${b},0.18)`,
        hover: meta?.hover || `rgba(${r},${g},${b},0.3)`,
        border: meta?.border || `rgba(${r},${g},${b},0.15)`
      });
      window.DataHub.save();
      console.log('[settingsStore] saveThemePreset -> 已保存:', name);
      return true;
    },

    /**
     * 删除主题预设
     * @param {number} index
     * @returns {boolean}
     */
    deleteThemePreset(index) {
      const style = window.DataHub.state.currentStyle || {};
      if (!Array.isArray(style.themePresets)) {
        console.warn('[settingsStore] deleteThemePreset -> 无预设');
        return false;
      }
      if (index < 0 || index >= style.themePresets.length) {
        console.warn('[settingsStore] deleteThemePreset -> 索引无效');
        return false;
      }
      style.themePresets.splice(index, 1);
      window.DataHub.save();
      console.log('[settingsStore] deleteThemePreset -> 已删除');
      return true;
    },

    /**
     * 获取当前主题颜色（从激活的预设中读取）
     * @returns {string} 颜色值
     */
    getCurrentThemeColor() {
      const mask = window.DataHub.getActiveMask();
      const color = mask?.themeColor || '#c0a062';
      console.log('[settingsStore] getCurrentThemeColor ->', color);
      return color;
    },

    /**
     * 批量更新设置
     * @param {Object} patch 要更新的字段
     * @returns {boolean}
     */
    update(patch) {
      if (!patch || typeof patch !== 'object') {
        console.warn('[settingsStore] update -> 无效参数');
        return false;
      }
      if (!window.DataHub.state.settings) {
        window.DataHub.state.settings = {};
      }
      Object.assign(window.DataHub.state.settings, patch);
      window.DataHub.save();
      console.log('[settingsStore] update -> 已更新:', Object.keys(patch));
      return true;
    },

    /**
     * 重置所有设置为默认值
     * @returns {boolean}
     */
    reset() {
      window.DataHub.state.settings = {
        chatBackground: '',
        bubbleStyle: { meBg: '#95ec69', themBg: '#ffffff', rad: 8, fz: 15, pad: 10, isCss: false }
      };
      window.DataHub.save();
      console.log('[settingsStore] reset -> 已重置');
      return true;
    }
  };

  window.settingsStore = store;
  console.log('[settingsStore] 已就绪');
})();