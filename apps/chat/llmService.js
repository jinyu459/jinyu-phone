// ============================================================
// llmService.js
// 作用：把“设置”里配置好的 LLM(OpenAI 兼容) API 预设，
//       接到聊天发送上，让角色真正“回答”用户。
//
// 设计原则（符合“怕改坏”的要求）：
//   1. 纯新增文件，不改动任何已有逻辑。
//   2. 读取预设时“多来源兜底”，无论预设被存到哪个地方都能读到。
//   3. 任何异常都返回 { ok:false }，由调用方（detail.html）退回模拟回复，
//      因此即使 API 没配、配错、网络失败，也绝不会白屏或报错。
//
// 本次增强：
//   a. 消息校验/归一化（过滤空内容、非法 role），避免 2nd+ 轮因消息畸形而失败。
//   b. 瞬时失败自动重试一次（网络错误 / 429 / 5xx），降低“第二句掉模拟回复”概率。
//   c. 返回真实错误原因 + token 用量 + 耗时，为调试面板铺路。
//   d. buildSystemPrompt 支持可选的线上/线下模式约束（mode）。
//   e. compressHistory 记忆压缩：保留最近 maxRaw 条原文，更早的压成一句摘要。
// ============================================================

(function () {
  // ---- 调试日志（供后续调试面板读取） ----
  window.__llmDebug = window.__llmDebug || { logs: [], max: 60 };
  function logCall(entry) {
    try {
      var logs = window.__llmDebug.logs;
      logs.unshift(entry);
      if (logs.length > window.__llmDebug.max) logs.length = window.__llmDebug.max;
    } catch (e) {}
  }

  // ---- 读取当前选中的 API 预设（多来源兜底） ----
  function parseJSON(str) {
    try { return JSON.parse(str); } catch (e) { return null; }
  }

  function readStorage(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function fromLocalStorage() {
    var preset = parseJSON(readStorage('activeApiPreset'));
    if (preset && preset.url && preset.model) return preset;

    var idStr = readStorage('activeApiPresetId');
    var listStr = readStorage('apiPresets');
    if (idStr && listStr) {
      var list = parseJSON(listStr);
      var id = idStr;
      try { id = JSON.parse(idStr); } catch (e) {}
      if (Array.isArray(list)) {
        var found = list.find(function (p) { return p.id === id || p.id === String(id); });
        if (found && found.url && found.model) return found;
      }
    }

    preset = parseJSON(readStorage('jinyu_activeApiPreset'));
    if (preset && preset.url && preset.model) return preset;
    idStr = readStorage('jinyu_activeApiPresetId');
    listStr = readStorage('jinyu_apiPresets');
    if (idStr && listStr) {
      var list2 = parseJSON(listStr);
      var id2 = idStr;
      try { id2 = JSON.parse(idStr); } catch (e) {}
      if (Array.isArray(list2)) {
        var found2 = list2.find(function (p) { return p.id === id2 || p.id === String(id2); });
        if (found2 && found2.url && found2.model) return found2;
      }
    }
    return null;
  }

  function fromParentDataHub() {
    try {
      var dh = (window.parent && window.parent.dataHub) || (window.dataHub) || null;
      if (!dh) return null;

      if (dh.activeApiPreset && dh.activeApiPreset.url && dh.activeApiPreset.model) {
        return dh.activeApiPreset;
      }
      var id = dh.activeApiPresetId;
      var list = dh.apiPresets;
      if (id && Array.isArray(list)) {
        var found = list.find(function (p) { return p.id === id || p.id === String(id); });
        if (found && found.url && found.model) return found;
      }
      if (typeof dh.get === 'function') {
        var p1 = dh.get('activeApiPreset', null);
        if (p1 && p1.url && p1.model) return p1;
        var id2 = dh.get('activeApiPresetId', null);
        var list2 = dh.get('apiPresets', null);
        if (id2 && Array.isArray(list2)) {
          var f2 = list2.find(function (p) { return p.id === id2 || p.id === String(id2); });
          if (f2 && f2.url && f2.model) return f2;
        }
      }
    } catch (e) {}
    return null;
  }

  function getActivePreset() {
    return fromParentDataHub() || fromLocalStorage();
  }

  // ---- 组装 system prompt（支持可选的线上/线下模式约束 + 记忆摘要） ----
  function buildSystemPrompt(contact, userMask, mode, memorySummary) {
    var name = (contact && (contact.remark || contact.name)) || '角色';
    var role = (contact && contact.role) || '';
    var desc = (contact && (contact.desc || contact.notes)) || '';
    var bg = (contact && (contact.bg || contact.background)) || '';
    var worldbook = (contact && contact.worldbook) || '';
    var mask = (userMask && (userMask.rawText || userMask.letterText)) || '';
    var lines = [];
    lines.push('你正在扮演一位角色「' + name + '」，与用户进行一对一聊天。');
    if (role) lines.push('【身份】' + role);
    if (desc) lines.push('【背景设定】' + desc);
    if (bg) lines.push('【人物背景】' + bg);
    if (worldbook && worldbook !== '未选择世界书') lines.push('【世界书/世界观】' + worldbook);
    if (mask) lines.push('【用户的身份/你的人设】用户的角色设定如下：' + mask);
    lines.push('请始终用「' + name + '」这个角色的口吻说话，符合其性格与背景，语气自然、贴近生活，不要让用户察觉你是 AI。');
    lines.push('回答要简洁、口语化，就像真人发消息一样，不要长篇大论。');

    if (mode === 'online') {
      lines.push('');
      lines.push('【当前模式：线上·隔着屏幕聊天】');
      lines.push('你正通过手机/聊天软件与对方发消息。因此：');
      lines.push('1. 只输出对方能看到的“聊天文字”，不要出现任何动作/神态/环境描写。');
      lines.push('2. 永远不要写 ((...)) 或任何括号动作，不要描述表情、走路、眼神、场景。');
      lines.push('3. 保持第一人称、口语化，像在微信/QQ里打字回消息。');
    } else if (mode === 'offline') {
      lines.push('');
      lines.push('【当前模式：线下·面对面/小说叙事】');
      lines.push('你们正处在同一个空间（线下见面），以第三人称小说/剧本方式叙事。因此：');
      lines.push('1. 允许也鼓励环境、神态、动作、冲突等描写，可适当使用 ((...)) 表达动作与氛围。');
      lines.push('2. 语言更有画面感和戏剧性，但仍要贴合角色性格。');
    }

    if (memorySummary) {
      lines.push('');
      lines.push('【更早的对话摘要（用于保持记忆连贯，不必逐条复述，但遇到相关话题时记得）】' + memorySummary);
    }

    return lines.join('\n');
  }

  // ---- 消息归一化：过滤空内容、非法 role ----
  function normalizeMessages(rawMessages) {
    var out = [];
    if (!Array.isArray(rawMessages)) return out;
    for (var i = 0; i < rawMessages.length; i++) {
      var m = rawMessages[i];
      if (!m) continue;
      var role = (m.role === 'system' || m.role === 'user' || m.role === 'assistant') ? m.role : 'user';
      var content = (typeof m.content === 'string') ? m.content : String(m.content || '');
      content = content.trim();
      if (!content) continue;
      out.push({ role: role, content: content });
    }
    return out;
  }

  // ---- 记忆压缩：保留最近 maxRaw 条原文，更早的压成一句话摘要 ----
  // history: [{sender, content, ...}]
  // 返回 { summaryText, recentMessages:[{role,content}] }
  function compressHistory(history, maxRaw) {
    maxRaw = (typeof maxRaw === 'number' && maxRaw > 0) ? maxRaw : 20;
    if (!Array.isArray(history) || history.length === 0) {
      return { summaryText: '', recentMessages: [] };
    }
    var roleMap = function (m) {
      return (m.sender === 'user' || m.sender === '我') ? 'user' : 'assistant';
    };
    var sliceContent = function (c) { return String(c || '').slice(0, 2000); };

    if (history.length <= maxRaw) {
      var out = [];
      for (var i = 0; i < history.length; i++) {
        var m = history[i];
        if (!m || !m.content) continue;
        var c = sliceContent(m.content).trim();
        if (!c) continue;
        out.push({ role: roleMap(m), content: c });
      }
      return { summaryText: '', recentMessages: out };
    }

    var older = history.slice(0, history.length - maxRaw);
    var recent = history.slice(history.length - maxRaw);
    var parts = [];
    for (var j = 0; j < older.length; j++) {
      var om = older[j];
      if (!om || !om.content) continue;
      var who = (om.sender === 'user' || om.sender === '我') ? '用户' : '角色';
      parts.push(who + '：' + String(om.content).slice(0, 300));
    }
    var summaryText = parts.join(' / ').slice(0, 1500);

    var recentMsgs = [];
    for (var k = 0; k < recent.length; k++) {
      var rm = recent[k];
      if (!rm || !rm.content) continue;
      var rc = sliceContent(rm.content).trim();
      if (!rc) continue;
      recentMsgs.push({ role: roleMap(rm), content: rc });
    }
    return { summaryText: summaryText, recentMessages: recentMsgs };
  }

  // ---- 调用 OpenAI 兼容接口（带一次瞬时失败重试） ----
  function doFetch(url, body, headers) {
    // 关键修复：App 内 CapacitorHttp 会接管 window.fetch，导致 AbortController 失效、
    // 请求永久悬挂（现象：一直转圈、永不报错）。因此：优先走 Capacitor 原生 HTTP，
    // 它绕过 WebView 的 CORS，并原生支持 connect/read 超时，彻底避免卡死。
    try {
      var Cap = window.Capacitor;
      var CapHttp = Cap && Cap.Plugins && Cap.Plugins.CapacitorHttp;
      if (CapHttp && typeof CapHttp.request === 'function') {
        return CapHttp.request({
          method: 'POST',
          url: url,
          headers: headers,
          data: body,
          connectTimeout: 20000,
          readTimeout: 25000
        }).then(function (res) {
          var status = (res && typeof res.status === 'number') ? res.status : 0;
          var data = (res && ('data' in res)) ? res.data : null;
          if (status === 0 || status >= 400) {
            throw { status: status, data: data };
          }
          if (typeof data === 'string') {
            try { return JSON.parse(data); } catch (e) { return {}; }
          }
          return data || {};
        });
      }
    } catch (e0) {}

    // 兜底：普通 fetch + Promise.race 硬超时（即使底层不支持 AbortController，也一定在 26 秒内返回）
    var _ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var _timer = null;
    if (_ctrl) { _timer = setTimeout(function () { try { _ctrl.abort(); } catch (e) {} }, 25000); }
    var _opts = { method: 'POST', headers: headers, body: JSON.stringify(body) };
    if (_ctrl) _opts.signal = _ctrl.signal;

    var _fetchP = fetch(url, _opts).then(function (resp) {
      if (_timer) clearTimeout(_timer);
      if (!resp.ok) {
        var err = { status: resp.status };
        return resp.json().catch(function () { return {}; }).then(function (j) {
          err.data = j;
          throw err;
        });
      }
      return resp.json();
    }, function (e) {
      if (_timer) clearTimeout(_timer);
      throw e;
    });

    var _timeoutP = new Promise(function (_, reject) {
      setTimeout(function () { reject({ status: 0, message: 'timeout' }); }, 26000);
    });

    return Promise.race([_fetchP, _timeoutP]);
  }

  function isTransient(status) {
    return status === 429 || (typeof status === 'number' && status >= 500);
  }

  // options: { contact, messages?, history?, maxRaw?, userMask, mode, preset }
  function sendChat(options) {
    var startedAt = Date.now();
    return new Promise(function (resolve) {
      var opts = options || {};
      var preset = opts.preset || getActivePreset();
      if (!preset || !preset.url || !preset.model) {
        var noPreset = { ok: false, error: 'no_preset', durationMs: Date.now() - startedAt };
        logCall({ ok: false, error: 'no_preset', durationMs: noPreset.durationMs });
        resolve(noPreset);
        return;
      }

      var _rawUrl = String(preset.url || '').trim();
      try { console.log('[llmService] 原始地址:', _rawUrl); } catch (e0) {}
      // 归一化：无论填裸域名 / 带 /v1 / 带完整路径，都统一成 .../v1/chat/completions
      var _base = _rawUrl.replace(/\/+$/, '');
      var _changed = true;
      while (_changed) {
        _changed = false;
        if (/\/chat\/completions$/.test(_base)) { _base = _base.replace(/\/chat\/completions$/, ''); _changed = true; }
        if (/\/v1$/.test(_base)) { _base = _base.replace(/\/v1$/, ''); _changed = true; }
      }
      var url = _base + '/v1/chat/completions';
      try { console.log('[llmService] 实际请求地址:', url); } catch (e1) {}

      // 记忆：优先用原始 history 做压缩，否则退回 messages 数组
      var memorySummary = null;
      var historyMessages;
      if (Array.isArray(opts.history)) {
        var comp = compressHistory(opts.history, opts.maxRaw || 20);
        memorySummary = comp.summaryText;
        historyMessages = comp.recentMessages;
      } else {
        historyMessages = normalizeMessages(opts.messages);
      }

      var systemContent = buildSystemPrompt(opts.contact, opts.userMask, opts.mode, memorySummary);
      var messages = [{ role: 'system', content: systemContent }].concat(historyMessages);
      if (messages.length <= 1) {
        var empty = { ok: false, error: 'no_messages', durationMs: Date.now() - startedAt };
        logCall({ ok: false, error: 'no_messages', durationMs: empty.durationMs });
        resolve(empty);
        return;
      }

      var body = {
        model: preset.model,
        messages: messages,
        temperature: (typeof preset.temperature === 'number') ? preset.temperature : 0.7
      };

      var headers = { 'Content-Type': 'application/json' };
      if (preset.key) headers['Authorization'] = 'Bearer ' + preset.key;

      var attempts = 0;
      var maxAttempts = 2;

      function attempt() {
        attempts++;
        doFetch(url, body, headers)
          .then(function (data) {
            var text = data && data.choices && data.choices[0] &&
                       data.choices[0].message && data.choices[0].message.content;
            text = (text || '').trim();
            var usage = (data && data.usage) || null;
            var durationMs = Date.now() - startedAt;
            if (text) {
              var okRes = { ok: true, content: text, usage: usage, durationMs: durationMs, attempts: attempts };
              logCall({ ok: true, attempts: attempts, durationMs: durationMs, usage: usage, model: preset.model, chars: text.length });
              resolve(okRes);
            } else {
              if (attempts < maxAttempts) {
                setTimeout(attempt, 400);
              } else {
                var eRes = { ok: false, error: 'empty', durationMs: Date.now() - startedAt, attempts: attempts };
                logCall({ ok: false, error: 'empty', durationMs: eRes.durationMs, attempts: attempts });
                resolve(eRes);
              }
            }
          })
          .catch(function (e) {
            var status = (e && e.status) ? e.status : 0;
            var errType = status === 0 ? 'network' : ('http_' + status);
            if (isTransient(status) && attempts < maxAttempts) {
              setTimeout(attempt, 600);
            } else {
              var fRes = { ok: false, error: errType, status: status, durationMs: Date.now() - startedAt, attempts: attempts };
              logCall({ ok: false, error: errType, status: status, durationMs: fRes.durationMs, attempts: attempts });
              resolve(fRes);
            }
          });
      }

      attempt();
    });
  }

  // 暴露到 window
  window.llmService = {
    getActivePreset: getActivePreset,
    buildSystemPrompt: buildSystemPrompt,
    normalizeMessages: normalizeMessages,
    compressHistory: compressHistory,
    sendChat: sendChat
  };
})();
