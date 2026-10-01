// stores/mediaStore.js
// 媒体库相关数据操作（头像库、背景库、表情包库、气泡库）

(function() {
  'use strict';

  const store = {
    // ==================== 头像库 ====================
    avatar: {
      /**
       * 获取所有头像
       * @returns {Array} [{ imgKey, remark }, ...]
       */
      getAll() {
        const data = window.DataHub.state.avatarLibrary || { contacts: [] };
        const list = data.contacts || [];
        console.log('[mediaStore.avatar] getAll ->', list.length, '个头像');
        return list;
      },

      /**
       * 新增头像
       * @param {string} imgKey ChatDB 中的 key
       * @param {string} remark 备注标签
       * @returns {boolean}
       */
      add(imgKey, remark) {
        if (!imgKey || !remark) {
          console.warn('[mediaStore.avatar] add -> 缺少必要参数');
          return false;
        }
        if (!window.DataHub.state.avatarLibrary) {
          window.DataHub.state.avatarLibrary = { contacts: [] };
        }
        window.DataHub.state.avatarLibrary.contacts.push({ imgKey, remark });
        window.DataHub.save();
        console.log('[mediaStore.avatar] add -> 已添加:', remark);
        return true;
      },

      /**
       * 删除头像
       * @param {number|string} index 或 imgKey
       * @param {boolean} isImgKey 是否按 imgKey 查找
       * @returns {boolean}
       */
      remove(indexOrKey, isImgKey = false) {
        const list = window.DataHub.state.avatarLibrary?.contacts || [];
        let idx = -1;
        if (isImgKey) {
          idx = list.findIndex(item => item.imgKey === indexOrKey);
        } else {
          idx = Number(indexOrKey);
        }
        if (idx < 0 || idx >= list.length) {
          console.warn('[mediaStore.avatar] remove -> 未找到');
          return false;
        }
        list.splice(idx, 1);
        window.DataHub.save();
        console.log('[mediaStore.avatar] remove -> 已删除');
        return true;
      },

      /**
       * 更新头像备注
       * @param {string} imgKey
       * @param {string} newRemark
       * @returns {boolean}
       */
      update(imgKey, newRemark) {
        const list = window.DataHub.state.avatarLibrary?.contacts || [];
        const item = list.find(i => i.imgKey === imgKey);
        if (!item) {
          console.warn('[mediaStore.avatar] update -> 未找到:', imgKey);
          return false;
        }
        item.remark = newRemark;
        window.DataHub.save();
        console.log('[mediaStore.avatar] update -> 已更新:', newRemark);
        return true;
      },

      /**
       * 搜索头像
       * @param {string} keyword
       * @returns {Array}
       */
      search(keyword) {
        const list = this.getAll();
        if (!keyword || !keyword.trim()) return list;
        const kw = keyword.trim().toLowerCase();
        const result = list.filter(item => (item.remark || '').toLowerCase().includes(kw));
        console.log('[mediaStore.avatar] search ->', result.length, '条匹配');
        return result;
      }
    },

    // ==================== 背景库 ====================
    background: {
      /**
       * 获取所有背景
       * @returns {Array} [{ imgKey, remark }, ...]
       */
      getAll() {
        const list = window.DataHub.state.backgroundLibrary || [];
        console.log('[mediaStore.background] getAll ->', list.length, '个背景');
        return list;
      },

      /**
       * 新增背景
       * @param {string} imgKey ChatDB 中的 key
       * @param {string} remark 备注标签
       * @returns {boolean}
       */
      add(imgKey, remark) {
        if (!imgKey || !remark) {
          console.warn('[mediaStore.background] add -> 缺少必要参数');
          return false;
        }
        if (!Array.isArray(window.DataHub.state.backgroundLibrary)) {
          window.DataHub.state.backgroundLibrary = [];
        }
        window.DataHub.state.backgroundLibrary.push({ imgKey, remark });
        window.DataHub.save();
        console.log('[mediaStore.background] add -> 已添加:', remark);
        return true;
      },

      /**
       * 删除背景
       * @param {number|string} index 或 imgKey
       * @param {boolean} isImgKey 是否按 imgKey 查找
       * @returns {boolean}
       */
      remove(indexOrKey, isImgKey = false) {
        const list = window.DataHub.state.backgroundLibrary || [];
        let idx = -1;
        if (isImgKey) {
          idx = list.findIndex(item => item.imgKey === indexOrKey);
        } else {
          idx = Number(indexOrKey);
        }
        if (idx < 0 || idx >= list.length) {
          console.warn('[mediaStore.background] remove -> 未找到');
          return false;
        }
        list.splice(idx, 1);
        window.DataHub.save();
        console.log('[mediaStore.background] remove -> 已删除');
        return true;
      },

      /**
       * 更新背景备注
       * @param {string} imgKey
       * @param {string} newRemark
       * @returns {boolean}
       */
      update(imgKey, newRemark) {
        const list = window.DataHub.state.backgroundLibrary || [];
        const item = list.find(i => i.imgKey === imgKey);
        if (!item) {
          console.warn('[mediaStore.background] update -> 未找到:', imgKey);
          return false;
        }
        item.remark = newRemark;
        window.DataHub.save();
        console.log('[mediaStore.background] update -> 已更新:', newRemark);
        return true;
      },

      /**
       * 搜索背景
       * @param {string} keyword
       * @returns {Array}
       */
      search(keyword) {
        const list = this.getAll();
        if (!keyword || !keyword.trim()) return list;
        const kw = keyword.trim().toLowerCase();
        const result = list.filter(item => (item.remark || '').toLowerCase().includes(kw));
        console.log('[mediaStore.background] search ->', result.length, '条匹配');
        return result;
      },

      /**
       * 获取当前聊天使用的背景
       * @returns {string} 背景图片 URL 或空字符串
       */
      getCurrent() {
        const bg = window.DataHub.state.settings?.chatBackground || '';
        console.log('[mediaStore.background] getCurrent ->', bg ? '已设置' : '未设置');
        return bg;
      },

      /**
       * 设置聊天背景
       * @param {string} imgUrl 图片 URL
       * @returns {boolean}
       */
      setCurrent(imgUrl) {
        if (!window.DataHub.state.settings) {
          window.DataHub.state.settings = {};
        }
        window.DataHub.state.settings.chatBackground = imgUrl || '';
        window.DataHub.save();
        console.log('[mediaStore.background] setCurrent ->', imgUrl ? '已设置' : '已清除');
        return true;
      }
    },

    // ==================== 表情包库 ====================
    emoji: {
      /**
       * 获取所有表情系列
       * @returns {Array} [{ id, name, emojis: [{ imgKey, label }] }, ...]
       */
      getAllSeries() {
        const list = window.DataHub.state.emojiLibrary || [];
        console.log('[mediaStore.emoji] getAllSeries ->', list.length, '个系列');
        return list;
      },

      /**
       * 获取单个系列
       * @param {string} seriesId
       * @returns {Object|null}
       */
      getSeries(seriesId) {
        const series = (window.DataHub.state.emojiLibrary || []).find(s => s.id === seriesId) || null;
        console.log('[mediaStore.emoji] getSeries(', seriesId, ') ->', series ? '找到' : '未找到');
        return series;
      },

      /**
       * 获取当前选中的系列
       * @param {string} defaultId 默认系列ID
       * @returns {string} 系列ID
       */
      getCurrentSeriesId(defaultId) {
        // 从全局变量读取 currentEmojiTab（由 chat_emoji.js 维护）
        const id = (typeof window.currentEmojiTab !== 'undefined') ? window.currentEmojiTab : (defaultId || 's_default');
        console.log('[mediaStore.emoji] getCurrentSeriesId ->', id);
        return id;
      },

      /**
       * 新增表情系列
       * @param {string} name 系列名称
       * @param {string} id 可选，不传则自动生成
       * @returns {string|null} 新系列ID
       */
      addSeries(name, id) {
        if (!name || !name.trim()) {
          console.warn('[mediaStore.emoji] addSeries -> 名称不能为空');
          return null;
        }
        if (!Array.isArray(window.DataHub.state.emojiLibrary)) {
          window.DataHub.state.emojiLibrary = [];
        }
        const newId = id || 's_' + Date.now();
        // 检查 ID 是否已存在
        if (window.DataHub.state.emojiLibrary.some(s => s.id === newId)) {
          console.warn('[mediaStore.emoji] addSeries -> 系列已存在:', newId);
          return null;
        }
        window.DataHub.state.emojiLibrary.push({ id: newId, name: name.trim(), emojis: [] });
        window.DataHub.save();
        console.log('[mediaStore.emoji] addSeries -> 已创建:', name.trim());
        return newId;
      },

      /**
       * 删除表情系列
       * @param {string} seriesId
       * @returns {boolean}
       */
      removeSeries(seriesId) {
        const list = window.DataHub.state.emojiLibrary || [];
        const idx = list.findIndex(s => s.id === seriesId);
        if (idx === -1) {
          console.warn('[mediaStore.emoji] removeSeries -> 未找到:', seriesId);
          return false;
        }
        // 不允许删除默认系列
        if (seriesId === 's_default') {
          console.warn('[mediaStore.emoji] removeSeries -> 不能删除默认系列');
          return false;
        }
        list.splice(idx, 1);
        window.DataHub.save();
        console.log('[mediaStore.emoji] removeSeries -> 已删除:', seriesId);
        return true;
      },

      /**
       * 添加表情到系列
       * @param {string} seriesId
       * @param {string} imgKey ChatDB 中的 key
       * @param {string} label 表情标签
       * @returns {boolean}
       */
      addEmoji(seriesId, imgKey, label) {
        const series = this.getSeries(seriesId);
        if (!series) {
          console.warn('[mediaStore.emoji] addEmoji -> 系列不存在:', seriesId);
          return false;
        }
        series.emojis.push({ imgKey, label: label || '表情' });
        window.DataHub.save();
        console.log('[mediaStore.emoji] addEmoji -> 已添加到:', seriesId);
        return true;
      },

      /**
       * 从系列中删除表情
       * @param {string} seriesId
       * @param {number|string} index 或 imgKey
       * @param {boolean} isImgKey 是否按 imgKey 查找
       * @returns {boolean}
       */
      removeEmoji(seriesId, indexOrKey, isImgKey = false) {
        const series = this.getSeries(seriesId);
        if (!series) {
          console.warn('[mediaStore.emoji] removeEmoji -> 系列不存在:', seriesId);
          return false;
        }
        let idx = -1;
        if (isImgKey) {
          idx = series.emojis.findIndex(e => e.imgKey === indexOrKey);
        } else {
          idx = Number(indexOrKey);
        }
        if (idx < 0 || idx >= series.emojis.length) {
          console.warn('[mediaStore.emoji] removeEmoji -> 未找到');
          return false;
        }
        series.emojis.splice(idx, 1);
        window.DataHub.save();
        console.log('[mediaStore.emoji] removeEmoji -> 已删除');
        return true;
      },

      /**
       * 更新表情标签
       * @param {string} seriesId
       * @param {string} imgKey
       * @param {string} newLabel
       * @returns {boolean}
       */
      updateEmojiLabel(seriesId, imgKey, newLabel) {
        const series = this.getSeries(seriesId);
        if (!series) return false;
        const emoji = series.emojis.find(e => e.imgKey === imgKey);
        if (!emoji) {
          console.warn('[mediaStore.emoji] updateEmojiLabel -> 未找到');
          return false;
        }
        emoji.label = newLabel;
        window.DataHub.save();
        console.log('[mediaStore.emoji] updateEmojiLabel -> 已更新:', newLabel);
        return true;
      },

      /**
       * 获取系列中的所有表情
       * @param {string} seriesId
       * @returns {Array}
       */
      getEmojis(seriesId) {
        const series = this.getSeries(seriesId);
        const emojis = series ? series.emojis.slice() : [];
        console.log('[mediaStore.emoji] getEmojis ->', emojis.length, '个表情');
        return emojis;
      },

      /**
       * 搜索表情（在所有系列中）
       * @param {string} keyword
       * @returns {Array} [{ seriesId, seriesName, imgKey, label }, ...]
       */
      search(keyword) {
        const seriesList = this.getAllSeries();
        const results = [];
        if (!keyword || !keyword.trim()) return results;
        const kw = keyword.trim().toLowerCase();
        seriesList.forEach(series => {
          series.emojis.forEach(emoji => {
            if ((emoji.label || '').toLowerCase().includes(kw)) {
              results.push({
                seriesId: series.id,
                seriesName: series.name,
                imgKey: emoji.imgKey,
                label: emoji.label
              });
            }
          });
        });
        console.log('[mediaStore.emoji] search ->', results.length, '条匹配');
        return results;
      }
    },

    // ==================== 气泡库 ====================
    bubble: {
      /**
       * 获取所有气泡预设
       * @returns {Array} [{ id, name, style?, isCss?, rawCss? }, ...]
       */
      getAll() {
        const list = window.DataHub.state.bubbleLibrary || [];
        console.log('[mediaStore.bubble] getAll ->', list.length, '个预设');
        return list;
      },

      /**
       * 新增气泡预设
       * @param {Object} data { name, style?, isCss?, rawCss? }
       * @returns {string|null} 预设ID
       */
      add(data) {
        if (!data || !data.name) {
          console.warn('[mediaStore.bubble] add -> 缺少名称');
          return null;
        }
        if (!Array.isArray(window.DataHub.state.bubbleLibrary)) {
          window.DataHub.state.bubbleLibrary = [];
        }
        const newId = 'b_' + Date.now();
        window.DataHub.state.bubbleLibrary.push({
          id: newId,
          name: data.name,
          style: data.style || null,
          isCss: data.isCss || false,
          rawCss: data.rawCss || null
        });
        window.DataHub.save();
        console.log('[mediaStore.bubble] add -> 已添加:', data.name);
        return newId;
      },

      /**
       * 删除气泡预设
       * @param {string} presetId
       * @returns {boolean}
       */
      remove(presetId) {
        const list = window.DataHub.state.bubbleLibrary || [];
        const idx = list.findIndex(p => p.id === presetId);
        if (idx === -1) {
          console.warn('[mediaStore.bubble] remove -> 未找到:', presetId);
          return false;
        }
        list.splice(idx, 1);
        window.DataHub.save();
        console.log('[mediaStore.bubble] remove -> 已删除:', presetId);
        return true;
      },

      /**
       * 应用气泡预设到当前聊天
       * @param {string} presetId
       * @returns {boolean}
       */
      apply(presetId) {
        const preset = (window.DataHub.state.bubbleLibrary || []).find(p => p.id === presetId);
        if (!preset) {
          console.warn('[mediaStore.bubble] apply -> 未找到:', presetId);
          return false;
        }
        if (!window.DataHub.state.settings) window.DataHub.state.settings = {};
        
        if (preset.isCss && preset.rawCss) {
          window.DataHub.state.settings.bubbleStyle = { isCss: true, rawCss: preset.rawCss };
        } else if (preset.style) {
          window.DataHub.state.settings.bubbleStyle = { ...preset.style, isCss: false };
        } else {
          console.warn('[mediaStore.bubble] apply -> 预设无样式数据');
          return false;
        }
        window.DataHub.save();
        console.log('[mediaStore.bubble] apply -> 已应用:', preset.name);
        return true;
      },

      /**
       * 获取当前应用的气泡样式
       * @returns {Object} { meBg, themBg, rad, fz, pad, isCss?, rawCss? }
       */
      getCurrent() {
        const style = window.DataHub.state.settings?.bubbleStyle || { meBg: '#95ec69', themBg: '#ffffff', rad: 8, fz: 15, pad: 10, isCss: false };
        console.log('[mediaStore.bubble] getCurrent ->', style.isCss ? 'CSS特效' : '常规样式');
        return style;
      },

      /**
       * 保存当前气泡样式为预设
       * @param {string} name 预设名称
       * @returns {string|null} 预设ID
       */
      saveCurrentAs(name) {
        const current = this.getCurrent();
        if (current.isCss) {
          return this.add({ name, isCss: true, rawCss: current.rawCss });
        } else {
          return this.add({ name, style: { meBg: current.meBg, themBg: current.themBg, rad: current.rad, fz: current.fz, pad: current.pad } });
        }
      }
    }
  };

  window.mediaStore = store;
  console.log('[mediaStore] 已就绪');
})();