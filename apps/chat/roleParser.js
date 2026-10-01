// roleParser.js
// 作用：锦玉「角色解析层」—— 阶段0 核心实现。
//       把作者写下的【自然语言角色卡】解析成结构化 parsedProfile = { header, canon, metadata }。
//       本文件只做「解析」（模型在这里【不扮演角色】，只做理解/提取/推导/分级）。
//       解析产物挂在 contact.parsedProfile，供运行层 characterPipeline.js 使用。
//
// 与运行层（characterPipeline.js）的边界：
//   - roleParser： 自然语言角色卡 -> { header, canon, metadata }（无 runtime 块）
//   - characterPipeline： 读 parsedProfile + runtimeCtx -> system prompt
//
// 设计对齐《角色解析层 V1.0》：
//   1. 输出 { header, canon, metadata }，【不含 runtime】。
//   2. 四类单元库：information_units / relation_units / experience_units / behavior_candidates。
//   3. 证据分级纪律：A=作者明确事实；B=稳定推导（多事实支持）；C=弱推导；D=模型假设。
//      · 推导【不能】自动升级为 A（Canon）。
//      · 行为候选【只允许 B 或 C】，禁止标成 A。
//      · 某一块无法确定 -> 输出空数组 + 写进 metadata.uncertainties。
//   4. 只处理二元关系；复杂社会网络剥离到未来世界观系统，不在此写。
//   5. source 用「字段名优先」（代码无文档分段），不硬标段落。
// ============================================================
(function () {
  'use strict';

  function str(v) { return (v === null || v === undefined) ? '' : String(v); }

  // ---------- 解析 Prompt（模块1 V1.0 草案：让模型理解角色资料，不扮演角色） ----------
  // 返回 { system, user } 两条消息；user 携带作者原始角色卡文本。
  function buildParseMessages(rawText, opts) {
    var o = opts || {};
    var characterName = str(o.characterName);
    var parseProtocol = str(o.parseProtocolVersion) || '1.0';

    var system = [
      '【任务】你是锦玉角色系统的「角色解析器」。你不扮演任何角色；你的任务是【理解作者写下的角色资料】并将其解析成结构化角色模型。',
      '',
      '【输入】作者以自然语言写下的原始角色资料（可能含外貌/性格/经历/关系/偏好/禁忌/状态，篇幅不等，格式自由）。',
      '【输出】严格返回一个 JSON 对象，结构如下：',
      '{',
      '  "header": {',
      '    "character_id": "唯一id，如 cen_shuke",',
      '    "character_name": "角色名",',
      '    "core_summary": "一段不强制压缩的稳定画像：这个人到底是什么样的人（身份/核心性格/1-2条关键经历/1-2条最核心关系底色/1-2条最稳定行为倾向）。不写情境块。",',
      '    "canon_version": "1.0"',
      '  },',
      '  "canon": {',
      '    "information_units": [ /* 信息单元：作者明确的原子事实 */ ],',
      '    "relation_units": [ /* 关系单元：两个实体间的单向关系线 */ ],',
      '    "experience_units": [ /* 经历单元：带时序、有因果的事件链 */ ],',
      '    "behavior_candidates": [ /* 行为模式候选：从经历推导的、特定情境下的行为倾向 */ ]',
      '  },',
      '  "metadata": {',
      '    "parsed_by": "jinyu-role-parser",',
      '    "parse_protocol_version": "' + parseProtocol + '",',
      '    "source_documents": ["作者原始角色卡"],',
      '    "uncertainties": [ "无法确定或作者未明说、只能靠推导的事项，写在这里" ]',
      '  }',
      '}',
      '',
      '【信息单元 information_units】每个：',
      '{ "unit_id":"IU_001", "content":"原子事实一句话", "type":"身份|外貌|性格|经历|关系|偏好|禁忌|状态|other",',
      '  "source_field":"字段名（如 性格内核/个人经历/外形特征，不要硬标段落）",',
      '  "evidence_level":"A|B|C|D", "temporal":"过去|现在|未来",',
      '  "durability":"稳定持续|阶段性持续|可中断|已封存|待验证", "scope":"自身|行为倾向|表达方式|情感反应|职业|童年家庭|关系演进",',
      '  "related_units":[], "note":"简短说明证据依据" }',
      '* 一句话可拆多个单元；一条单元可被多个经历引用；无法归类用 type=other。',
      '',
      '【关系单元 relation_units】只处理【二元单向关系】，每个：',
      '{ "relation_id":"RU_001", "relation_type":"亲情|友情|爱情|同事|师生|敌对|竞争|其他",',
      '  "subject":"主体名（必须带名字）", "object":"客体名（必须带名字）",',
      '  "direction":"subject_perceives_object",',
      '  "canon_state":{"summary":"关系底色一句话","dimensions":{}},',
      '  "runtime_state":"", "history_events":[], "source":"字段名",',
      '  "evidence_level":"A|B|C|D", "note":"" }',
      '* 只写 subject->object 这一条方向；反向关系若存在需单独建单元。',
      '* 主体/对象都必须带名字（如「岑纾客的父亲」vs「岑纾客」），禁止用「他对他」。',
      '* 多人关系/复杂社会网络/第三方深层动机（如「父亲是否有苦衷」）一律【不写】，归未来世界观系统。',
      '',
      '【经历单元 experience_units】带时序、有因果，每个：',
      '{ "experience_id":"EX_001",',
      '  "trigger_event":"触发事件", "immediate_reaction":"即时反应",',
      '  "formed_belief":"形成的信念(若作者未明说，标(推导))", "longterm_effect":"长期影响(若作者未明说，标(推导))",',
      '  "evidence_level":"A|B|C|D", "related_units":[], "note":"" }',
      '* 推荐四层但不强制；某层缺证据就标「缺失/待推导」，【禁止硬编】。',
      '* 长期影响必须是推导，evidence_level【不能为 A】。',
      '* 经历必须指向具体信息单元（related_units 填实），不能悬空。',
      '',
      '【行为模式候选 behavior_candidates】从【经历单元】生长出来（不是关系单元），每个：',
      '{ "behavior_id":"BC_001", "summary":"行为倾向一句话",',
      '  "trigger_conditions":[], "cognition":"内在认知/内心os", "tendency":"倾向", "possible_actions":[],',
      '  "exceptions":"例外情形", "root_experiences":[], "affected_relations":[],',
      '  "evidence_level":"B|C", "source_chain":"完整证据链(作者事实->系统推导)", "note":"" }',
      '* 行为候选【只允许 evidence_level 为 B 或 C】，【禁止 A】。',
      '* 必须保留 source_chain 证据链；禁止把模型假设包装成角色事实。',
      '* 是「候选」不是「规则」：只是「角色在特定情境下可能怎样」，不是「一定会怎样」。',
      '',
      '【证据分级纪律（最重要）】',
      '- A：作者明确写出的事实。例：「父亲经常要求他考高分。」',
      '- B：稳定推导（多事实支持）。例：行为模式候选。',
      '- C：弱推导（少量证据）。例：可轻度影响行为。',
      '- D：模型假设。只能当临时假设，【不进】长期记忆/不能标成角色事实。',
      '- 推导【永远不能】自动升级为 A（Canon）。如果某内容作者没直说、是你推出来的，evidence_level 只能是 B/C/D。',
      '- 作者没写清楚、你无法确定的：该单元数组给空数组 []，并把原因写进 metadata.uncertainties。宁可暂时不知道，也不要自作主张地知道。',
      '',
      '【core_summary 要求】',
      '- 一句话或一段话，说清「这个人底色」。',
      '- 严格区分【作者事实】与【推导倾向】：推导倾向用「可能倾向于……」，并对推导附来源（如「这或与童年经历有关」）。',
      '- 禁止把模型猜测写进画像当事实、禁止塞无关细节、禁止写情境块。',
      '',
      '【输出要求】只输出 JSON，不要任何解释、Markdown 代码块标记或前后缀文字。'
    ].join('\n');

    var user = '【作者原始角色资料】\n' + (rawText || '') + '\n\n请按上述结构解析并只输出 JSON。';

    return { system: system, user: user };
  }

  // ---------- 调用模型（复用 characterPipeline.completion 的同款协议，自包含无依赖） ----------
  function completion(preset, messages, params) {
    if (!preset || !preset.url || !preset.model) {
      return Promise.resolve({ ok: false, error: 'no_preset', content: '' });
    }
    var url = str(preset.url).replace(/\/+$/, '');
    if (!/\/chat\/completions$/.test(url)) url = url + '/chat/completions';
    var body = { model: preset.model, messages: messages, temperature: (typeof preset.temperature === 'number' ? preset.temperature : 0.2) };
    if (params) {
      if (typeof params.temperature === 'number') body.temperature = params.temperature;
      if (typeof params.top_p === 'number') body.top_p = params.top_p;
      if (typeof params.seed === 'number') body.seed = params.seed;
      if (typeof params.response_format === 'object') body.response_format = params.response_format;
    } else {
      // 默认优先 JSON 输出，失败不致命
      body.response_format = { type: 'json_object' };
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
        return { ok: false, error: (e && e.status) ? ('http_' + e.status) : 'network', content: '' };
      });
  }

  // ---------- 从模型输出里剥离 JSON（容忍 ```json ... ``` 或前后杂讯） ----------
  function extractJson(raw) {
    var s = str(raw).trim();
    // 去掉 ```json ... ``` 围栏
    var fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1].trim();
    // 找第一个 { 到最后一个 }
    var a = s.indexOf('{');
    var b = s.lastIndexOf('}');
    if (a >= 0 && b > a) s = s.slice(a, b + 1);
    try { return JSON.parse(s); } catch (e) { return null; }
  }

  // ---------- 归一化/校验：强制证据分级纪律，确保输出结构安全 ----------
  // 规则：
  //   · 四类数组若缺失/非法 -> 空数组。
  //   · 行为候选 behavior_candidates 的 evidence_level 只能是 B/C，非法则降为 B。
  //   · experience_units 的 longterm_effect 若标 A，降为 B（推导不能是 A）。
  //   · 推导型 source_field（含「推导」字样）其 evidence_level 不允许 A，非法则降为 B。
  //   · 任何注定无法确定的东西 -> 写进 metadata.uncertainties，不硬编。
  function normalize(rawObj, rawText, opts) {
    var r = (rawObj && typeof rawObj === 'object') ? rawObj : {};
    var header = (r.header && typeof r.header === 'object') ? r.header : {};
    var canon = (r.canon && typeof r.canon === 'object') ? r.canon : {};
    var meta = (r.metadata && typeof r.metadata === 'object') ? r.metadata : {};

    var infos = Array.isArray(canon.information_units) ? canon.information_units : [];
    var rels = Array.isArray(canon.relation_units) ? canon.relation_units : [];
    var exps = Array.isArray(canon.experience_units) ? canon.experience_units : [];
    var behs = Array.isArray(canon.behavior_candidates) ? canon.behavior_candidates : [];

    var uncertainties = Array.isArray(meta.uncertainties) ? meta.uncertainties.slice() : [];

    // 行为候选只能 B/C
    behs = behs.map(function (b) {
      var lv = str(b && b.evidence_level).toUpperCase();
      if (lv !== 'B' && lv !== 'C') {
        if (b && b.evidence_level) {
          uncertainties.push('行为候选 ' + str(b.behavior_id) + ' 的证据等级被标为 ' + str(b.evidence_level) + '（非法），按纪律降为 B（行为候选只允许 B/C）。');
        }
        if (b) b.evidence_level = 'B';
      }
      return b;
    });

    // 经历长期影响不能是 A
    exps = exps.map(function (e) {
      if (e && str(e.longterm_effect).indexOf('推导') >= 0 && str(e.evidence_level).toUpperCase() === 'A') {
        e.evidence_level = 'B';
        e.note = (e.note ? e.note + ' | ' : '') + '长期影响为推导，按纪律降为 B，不能为 A。';
      }
      return e;
    });

    // 推导型字段不能是 A
    infos = infos.map(function (u) {
      var sf = str(u && u.source_field);
      var lv = str(u && u.evidence_level).toUpperCase();
      if (u && sf.indexOf('推导') >= 0 && lv === 'A') {
        u.evidence_level = 'B';
        u.note = (u.note ? u.note + ' | ' : '') + '来源标「推导」，按纪律不能为 A，降为 B。';
      }
      return u;
    });

    return {
      header: {
        character_id: str(header.character_id),
        character_name: str(header.character_name),
        core_summary: str(header.core_summary),
        canon_version: str(header.canon_version) || '1.0'
      },
      canon: {
        information_units: infos,
        relation_units: rels,
        experience_units: exps,
        behavior_candidates: behs
      },
      metadata: {
        parsed_by: str(meta.parsed_by) || 'jinyu-role-parser',
        parse_protocol_version: str(meta.parse_protocol_version) || '1.0',
        source_documents: Array.isArray(meta.source_documents) ? meta.source_documents : ['作者原始角色卡'],
        uncertainties: uncertainties
      }
    };
  }

  // ---------- 统一入口：parseRoleCard(rawText, opts) -> Promise<{ok, parsedProfile|error, rawJson}> ----------
  // opts: { provider, characterName, params, parseProtocolVersion, rawTextSource }
  function parseRoleCard(rawText, opts) {
    var o = opts || {};
    var text = str(rawText);
    if (!text.trim()) {
      return Promise.resolve({ ok: false, error: 'empty_raw_text', parsedProfile: null });
    }
    var preset = o.provider || (window.llmService && typeof window.llmService.getActivePreset === 'function' ? window.llmService.getActivePreset() : null);
    if (!preset || !preset.url || !preset.model) {
      return Promise.resolve({ ok: false, error: 'no_preset', parsedProfile: null });
    }
    var msgs = buildParseMessages(text, o);
    var messages = [{ role: 'system', content: msgs.system }, { role: 'user', content: msgs.user }];
    return completion(preset, messages, o.params || {}).then(function (res) {
      if (!res.ok || !res.content) {
        return { ok: false, error: res.error || 'empty_content', parsedProfile: null };
      }
      var rawJson = extractJson(res.content);
      if (!rawJson) {
        return { ok: false, error: 'invalid_json', parsedProfile: null, modelRaw: res.content };
      }
      var parsedProfile = normalize(rawJson, text, o);
      return { ok: true, parsedProfile: parsedProfile, rawJson: rawJson, usage: res.usage };
    });
  }

  // ---------- 暴露到 window ----------
  window.roleParser = {
    buildParseMessages: buildParseMessages,
    parseRoleCard: parseRoleCard,
    normalize: normalize,
    extractJson: extractJson
  };
})();
