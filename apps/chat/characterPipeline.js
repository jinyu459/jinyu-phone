// ============================================================
// characterPipeline.js
// 作用：锦玉「最小垂直切片」—— 运行层 B组（解析后）管线
//       selectRelevantUnits（规则粗筛） + formatSystemPrompt（8块 + 行为推演指令）
//       + buildSystemPromptB（B组入口） + A/B 实验台 runHarness
//
// 设计说明（对齐《最小垂直切片：范围与接口》）：
//   1. 纯新增文件，不做任何已有逻辑改动；A组基线 = 现有 llmService.buildSystemPrompt，
//      原样保留，通过 buildSystemPromptA 复用，不推翻。
//   2. 依赖 contact.parsedProfile（{header, canon, metadata}，无 runtime 块）；
//      若缺失则回退到空结构，不报错、不白屏。
//   3. runtimeCtx 阶段1可为空（state / relations / memories 留空）。
//   4. selectRelevantUnits 阶段1只做规则粗筛（实体 / 情境 / 情绪匹配），
//      语义精排（向量）后置；经历 / 行为各取 top 3，不做精细预算调优。
//   5. 记忆系统未接入：memorySummary 阶段1 = compressHistory 保留的近期对话原文。
//
// 边界：本文件只做「运行层」；解析（把自然语言角色卡转成 parsedProfile）属阶段0/独立，
//       不在此实现。运行前需 contact.parsedProfile 已存在。
// ============================================================
(function () {
  'use strict';

  // ---------- 基础工具 ----------
  function isStr(v) { return typeof v === 'string'; }
  function str(v) { return isStr(v) ? v : (v == null ? '' : String(v)); }

  // 粗略 token 估算（中文约 1 字符 ≈ 0.6~1 token，这里按 1.6 字符/token 保守估算）
  function estTokens(text) { return Math.ceil(str(text).length / 1.6); }

  // 按 token 预算软截断（超过则截断并附注，不丢最重要的开头）
  function clip(text, budgetTokens) {
    var t = str(text);
    if (estTokens(t) <= budgetTokens) return t;
    var chars = Math.floor(budgetTokens * 1.6);
    return t.slice(0, chars) + '\n…（已按预算截断）';
  }

  // 安全读取 parsedProfile（缺失给空结构）
  function parsedProfileOf(contact) {
    var p = (contact && contact.parsedProfile) || {};
    return {
      header: p.header || {},
      canon: p.canon || {},
      metadata: p.metadata || {}
    };
  }

  // 安全读取四类单元库
  function libsOf(parsedProfile) {
    var canon = parsedProfile.canon || {};
    return {
      information_units: Array.isArray(canon.information_units) ? canon.information_units : [],
      relation_units: Array.isArray(canon.relation_units) ? canon.relation_units : [],
      experience_units: Array.isArray(canon.experience_units) ? canon.experience_units : [],
      behavior_candidates: Array.isArray(canon.behavior_candidates) ? canon.behavior_candidates : []
    };
  }

  // ---------- selectRelevantUnits：阶段1 规则粗筛 ----------
  // 从 situation / 实体 / 情绪 提取关键词做匹配打分，返回带命中分数的相关单元。
  function tokenize(text) {
    return str(text).split(/[\s,，。.!！?？:：;；、/《》（）()]+/).filter(function (x) { return x && x.length >= 1; });
  }

  // 情境关键词映射：把 situation 归类为若干触发场景词，用于匹配 trigger_conditions
  function situationKeywords(situation) {
    var sit = str(situation).toLowerCase();
    var kws = [];
    var map = {
      authority: ['权威', '领导', '父亲', '上级', '命令', '压迫', '压力', '要求'],
      intimacy: ['亲密', '爱人', '喜欢', '依赖', '亲近', '信任', '朋友'],
      conflict: ['冲突', '吵架', '争执', '矛盾', '敌对', '对立', '拒绝'],
      memory: ['回忆', '想起', '过去', '以前', '那时', '曾经'],
      emotion: ['生气', '难过', '委屈', '孤独', '焦虑', '害怕', '开心']
    };
    Object.keys(map).forEach(function (k) {
      map[k].forEach(function (w) {
        if (sit.indexOf(w.toLowerCase()) >= 0) kws.push(w.toLowerCase());
      });
    });
    return kws;
  }

  // 单条单元是否命中实体 / 情境 / 情绪，返回得分
  function scoreUnit(text, entities, sitKws, emotion) {
    var t = str(text).toLowerCase();
    var score = 0;
    // 实体匹配
    if (entities && entities.length) {
      for (var i = 0; i < entities.length; i++) {
        if (entities[i].length >= 2 && t.indexOf(entities[i].toLowerCase()) >= 0) { score += 2; break; }
      }
    }
    // 情境匹配
    if (sitKws && sitKws.length) {
      for (var j = 0; j < sitKws.length; j++) {
        if (t.indexOf(sitKws[j]) >= 0) { score += 2; break; }
      }
    }
    // 情绪匹配
    if (emotion && t.indexOf(emotion) >= 0) { score += 1; }
    return score;
  }

  // 提取一条单元的“可匹配文本”（含其关系主体/对象/相关经历等字段）
  function unitSearchText(unit) {
    var parts = [];
    ['content', 'summary', 'cognition', 'tendency', 'trigger_conditions',
     'subject', 'object', 'relation_type', 'belong'].forEach(function (k) {
      if (unit && unit[k]) parts.push(str(unit[k]));
    });
    if (unit && unit.related_units) parts.push(str(unit.related_units));
    if (unit && unit.possible_actions) parts.push(str(unit.possible_actions));
    return parts.join(' ');
  }

  // 规则粗筛：返回 { information_units, experiences, behaviors, relations }（各带 score）
  function selectRelevantUnits(parsedProfile, runtimeCtx, situation) {
    var libs = libsOf(parsedProfile);
    var ctx = runtimeCtx || {};
    var state = ctx.state || {};
    var emotion = str(state.emotion || state.mood || '').toLowerCase();
    var entities = tokenize(situation);
    var sitKws = situationKeywords(situation);

    function scoreList(arr, key) {
      var out = [];
      for (var i = 0; i < arr.length; i++) {
        var u = arr[i];
        var s = scoreUnit(unitSearchText(u), entities, sitKws, emotion);
        if (s > 0) out.push({ unit: u, score: s });
      }
      out.sort(function (a, b) { return b.score - a.score; });
      return out.map(function (x) { return { unit: x.unit, score: x.score }; });
    }

    var infoScored = scoreList(libs.information_units);
    var relScored = scoreList(libs.relation_units);
    var expScored = scoreList(libs.experience_units).slice(0, 3);   // 经历 top3
    var behScored = scoreList(libs.behavior_candidates).slice(0, 3); // 行为候选 top3

    return {
      information_units: infoScored.slice(0, 5),
      relations: relScored.slice(0, 5),
      experiences: expScored,
      behaviors: behScored
    };
  }

  // ---------- ① 核心画像（≤300）----------
  function corePortrait(contact, parsedProfile) {
    // 优先用解析层 header.core_summary（全量、不强制压缩）
    var summary = str(parsedProfile.header.core_summary);
    if (summary) return clip('[角色核心画像]\n' + summary, 300);

    // 回退：从最稳定的信息单元（证据等级 A、durability=稳定持续/可中断）拼一个短画像
    var libs = libsOf(parsedProfile);
    var stable = libs.information_units.filter(function (u) {
      return u && (u.evidence_level === 'A' || u.evidence_level === 'B');
    });
    // 保底再加身份/性格等低可变的官方单元
    var lines = [];
    stable.forEach(function (u) {
      if (u.type === '身份' || u.type === '性格' || u.type === '偏好') {
        lines.push('· ' + str(u.content));
      }
    });
    if (!lines.length) {
      return clip('[角色核心画像]\n（暂无可用画像，角色将以基础设定回应）', 300);
    }
    return clip('[角色核心画像]\n' + lines.join('\n'), 300);
  }

  // ---------- ②③④ 当前情境 / 状态 / 关系（合计 ≤300）----------
  function situationBlock(situation, runtimeCtx) {
    var ctx = runtimeCtx || {};
    var state = ctx.state || {};
    var rels = ctx.relations || {};
    var parts = [];
    if (str(situation)) parts.push('【当前情境】' + str(situation));
    if (state && (str(state.emotion) || str(state.pressure) || str(state.goal))) {
      var st = [];
      if (str(state.emotion)) st.push('情绪:' + str(state.emotion));
      if (str(state.pressure)) st.push('压力:' + str(state.pressure));
      if (str(state.goal)) st.push('目标:' + str(state.goal));
      parts.push('【当前状态】' + st.join('、'));
    }
    if (rels && Object.keys(rels).length) {
      parts.push('【当前关系状态】' + str(rels.summary || JSON.stringify(rels)));
    }
    if (!parts.length) return clip('【当前情境·状态·关系】（无）', 300);
    return clip(parts.join('\n'), 300);
  }

  // ---------- ⑤⑥ 相关记忆 + 近期对话（阶段1 = memorySummary 近期对话原文）----------
  function memoryBlock(memorySummary) {
    var ms = str(memorySummary);
    if (!ms) return clip('（阶段1：记忆系统未接入，暂无相关记忆）', 500);
    return clip('（阶段1：记忆系统未接入，相关记忆暂以近期对话替代）\n' + ms, 500);
  }

  function recentDialogBlock(memorySummary) {
    var ms = str(memorySummary);
    if (!ms) return clip('（暂无更早对话原文）', 800);
    return clip('（近期对话原文，保留发送时原样）\n' + ms, 800);
  }

  // ---------- ⑦ 相关经历与行为倾向（≤500，标“推导/候选、非规则”）----------
  function experienceBehaviorBlock(relevant) {
    var rel = relevant || {};
    var lines = [];
    lines.push('【相关经历与行为倾向】以下为「推导/候选」，是倾向而非规则：');
    var exps = rel.experiences || [];
    if (exps.length) {
      exps.forEach(function (e) {
        var u = e.unit || {};
        var src = str(u.trigger_event || u.summary || u.content || '');
        lines.push('- 经历：' + src + (u.evidence_level ? '（证据等级:' + u.evidence_level + '）' : ''));
      });
    }
    var behs = rel.behaviors || [];
    if (behs.length) {
      behs.forEach(function (b) {
        var u = b.unit || {};
        lines.push('- 行为倾向：' + str(u.summary || u.cognition || u.tendency || '') +
          (u.evidence_level ? '（证据等级:' + u.evidence_level + '）' : ''));
      });
    }
    if (!exps.length && !behs.length) lines.push('-（当前情境暂无相关经历/行为候选）');
    return clip(lines.join('\n'), 500);
  }

  // ---------- ⑧ 固定兜底（≤200）= 行为推演指令 + 用户身份 + 模式 + worldbook ----------
  // 说明：行为推演指令块是全链路反 AI 化的核心锚点，必须完整保留，不做截断；
  //       因此预算仅对 worldbook / 追加内容做软约束，指令块本体始终完整。
  function behaviorInstructionBlock() {
    return [
      '【行为推演指令】',
      '- 仅以角色第一人称、从其此刻能看到/知道/感受到的有限视角出发；禁止全知/旁白式分析。',
      '- 你的任务不是“写一段自然的话”，而是“作为' + 'X' + '，面对情境Y，按你的性格、此刻状态、你与对方的关系、你的经历，你会怎么做、说什么”。',
      '- 允许给出中间值：偶尔含糊、敷衍、口是心非、情绪化；不必永远得体周全、不必永远正确。',
      '- 只依据 canon/画像/相关经历与行为候选（推导与候选是倾向，不是规则）。'
    ].join('\n');
  }

  function fallbackBlock(contact, userMask, mode, worldbook) {
    var name = (contact && (contact.remark || contact.name)) || '角色';
    var mask = str(userMask && (userMask.rawText || userMask.letterText));
    var wb = worldbook && worldbook !== '未选择世界书' ? str(worldbook) : '';
    var lines = [];
    lines.push('【行为推演指令】');
    lines.push('- 仅以角色第一人称、从其此刻能看到/知道/感受到的有限视角出发；禁止全知/旁白式分析。');
    lines.push('- 你的任务不是“写一段自然的话”，而是“作为' + name + '，面对情境Y，按你的性格、此刻状态、你与对方的关系、你的经历，你会怎么做、说什么”。');
    lines.push('- 允许给出中间值：偶尔含糊、敷衍、口是心非、情绪化；不必永远得体周全、不必永远正确。');
    lines.push('- 只依据 canon/画像/相关经历与行为候选（推导与候选是倾向，不是规则）。');
    if (mask) lines.push('【用户身份】' + mask);
    if (mode === 'online') lines.push('【模式】线上·隔着屏幕聊天，只输出聊天文字；如线下则按小说叙事。');
    else if (mode === 'offline') lines.push('【模式】线下·面对面/小说叙事，允许动作、神态、环境描写。');
    if (wb) lines.push('【世界书】' + clip(wb, 100));
    return clip(lines.join('\n'), 500); // 指令块完整，软约束仅对追加内容，整体不超 500 兜底
  }

  // ---------- formatSystemPrompt：8块结构（B组核心）----------
  // signature: formatSystemPrompt(contact, runtimeCtx, situation, userMask, mode, memorySummary, relevant)
  function formatSystemPrompt(contact, runtimeCtx, situation, userMask, mode, memorySummary, relevant) {
    var parsedProfile = parsedProfileOf(contact);
    var worldbook = (contact && contact.worldbook) || '';
    var blocks = [];

    // ① 核心画像 ≤300（稳定块）
    blocks.push('①【核心画像】(≤300)\n' + corePortrait(contact, parsedProfile));

    // ②③④ 当前情境/状态/关系 合计 ≤300
    blocks.push('②③④【当前情境·状态·关系】(≤300)\n' + situationBlock(situation, runtimeCtx));

    // ⑤ 相关记忆 ≤500（阶段1 = 近期对话摘要）
    blocks.push('⑤【相关记忆】(≤500)\n' + memoryBlock(memorySummary));

    // ⑥ 近期对话 ≤800（保留原文）
    blocks.push('⑥【近期对话】(≤800)\n' + recentDialogBlock(memorySummary));

    // ⑦ 相关经历与行为倾向 ≤500（标注推导/候选、非规则）
    blocks.push('⑦【相关经历与行为倾向】(≤500)\n' + experienceBehaviorBlock(relevant));

    // ⑧ 固定兜底（≤200，指令块完整）= 行为推演指令 + 用户身份 + 模式 + 世界书
    blocks.push('⑧【指令·身份·模式·世界书】\n' + fallbackBlock(contact, userMask, mode, worldbook));

    return blocks.join('\n\n');
  }

  // ---------- B组入口：buildSystemPromptB ----------
  // signature: buildSystemPromptB(contact, runtimeCtx, situation, userMask, mode, memorySummary)
  // 内部两步：检索（selectRelevantUnits）+ 格式化（formatSystemPrompt）
  function buildSystemPromptB(contact, runtimeCtx, situation, userMask, mode, memorySummary) {
    var parsedProfile = parsedProfileOf(contact);
    var relevant = selectRelevantUnits(parsedProfile, runtimeCtx, situation);
    return formatSystemPrompt(contact, runtimeCtx, situation, userMask, mode, memorySummary, relevant);
  }

  // ---------- A组基线：复用现有 llmService.buildSystemPrompt（原样保留，不推翻）----------
  function buildSystemPromptA(contact, userMask, mode, memorySummary) {
    if (window.llmService && typeof window.llmService.buildSystemPrompt === 'function') {
      return window.llmService.buildSystemPrompt(contact, userMask, mode, memorySummary);
    }
    // 兜底：若 llmService 未加载，退化为简易拼接，保证实验台不白屏
    var name = (contact && (contact.remark || contact.name)) || '角色';
    var lines = ['你正在扮演一位角色「' + name + '」，与用户一对一聊天。'];
    if (contact && contact.role) lines.push('【身份】' + contact.role);
    if (contact && (contact.desc || contact.notes)) lines.push('【背景设定】' + (contact.desc || contact.notes));
    return lines.join('\n');
  }

  // ---------- 实验台：A/B 对照 ----------
  // config: {
  //   contact, route: 'A'|'B',
  //   script: [{ role:'user'|'assistant', content, situation?, runtimeCtx?, mode?, memorySummary? }],
  //   userMask, mode, params, provider?   // provider 可注入 preset；缺省用 active preset
  // }
  // 返回 Promise<{ route, outputs:[{i, situation, turn_user, reply, ok, error, usage}] }>
  function completion(preset, messages, params) {
    if (!preset || !preset.url || !preset.model) {
      return Promise.resolve({ ok: false, error: 'no_preset', content: '' });
    }
    var url = str(preset.url).replace(/\/+$/, '');
    if (!/\/chat\/completions$/.test(url)) url = url + '/chat/completions';
    var body = { model: preset.model, messages: messages, temperature: preset.temperature };
    if (params) {
      if (typeof params.temperature === 'number') body.temperature = params.temperature;
      if (typeof params.top_p === 'number') body.top_p = params.top_p;
      if (typeof params.seed === 'number') body.seed = params.seed;
    }
    var headers = { 'Content-Type': 'application/json' };
    if (preset.key) headers['Authorization'] = 'Bearer ' + preset.key;
    return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw { status: r.status }; return r.json(); })
      .then(function (d) {
        var t = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
        return { ok: !!t, content: str(t), usage: d.usage || null };
      })
      .catch(function (e) {
        return { ok: false, error: e && e.status ? ('http_' + e.status) : 'network', content: '' };
      });
  }

  function runHarness(config) {
    var cfg = config || {};
    var route = cfg.route === 'B' ? 'B' : 'A';
    var contact = cfg.contact;
    var script = Array.isArray(cfg.script) ? cfg.script : [];
    var preset = cfg.provider || (window.llmService && window.llmService.getActivePreset ? window.llmService.getActivePreset() : null);
    var params = cfg.params || {};
    var messages = [];
    var outputs = [];

    function buildSystemForStep(step) {
      if (route === 'B') {
        return buildSystemPromptB(
          contact,
          step.runtimeCtx || cfg.runtimeCtx || {},
          step.situation || '',
          cfg.userMask,
          step.mode || cfg.mode,
          step.memorySummary || cfg.memorySummary
        );
      }
      return buildSystemPromptA(contact, cfg.userMask, step.mode || cfg.mode, step.memorySummary || cfg.memorySummary);
    }

    function run(i) {
      if (i >= script.length) return Promise.resolve({ route: route, outputs: outputs });
      var step = script[i] || {};
      var role = step.role === 'user' ? 'user' : 'assistant';
      var content = str(step.content);
      if (role === 'user') {
        var systemContent = buildSystemForStep(step);
        messages = [{ role: 'system', content: systemContent }].concat(
          messages.filter(function (m) { return m.role !== 'system'; })
        );
        messages.push({ role: 'user', content: content });
        return completion(preset, messages, params).then(function (res) {
          outputs.push({
            i: i,
            situation: str(step.situation),
            turn_user: content,
            reply: res.content || '',
            ok: res.ok,
            error: res.error || '',
            usage: res.usage || null
          });
          if (res.ok && res.content) messages.push({ role: 'assistant', content: res.content });
          return run(i + 1);
        });
      }
      // 预置 assistant 轮（如探针参考答案），仅入历史不调用模型
      messages.push({ role: 'assistant', content: content });
      return run(i + 1);
    }

    return run(0);
  }

  // ---------- 暴露到 window ----------
  window.characterPipeline = {
    selectRelevantUnits: selectRelevantUnits,
    formatSystemPrompt: formatSystemPrompt,
    buildSystemPromptB: buildSystemPromptB,
    buildSystemPromptA: buildSystemPromptA,
    runHarness: runHarness,
    estTokens: estTokens,
    clip: clip,
    parsedProfileOf: parsedProfileOf,
    libsOf: libsOf
  };
})();
