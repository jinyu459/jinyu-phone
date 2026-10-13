/* ============================================================
 * nativeSave.js —— 统一导出通道（批次E：系统「保存为」直存）
 * 职责：把“已经生成好的文件内容”交给正确的保存通道。
 *   · 原生环境（含外壳 iframe 内）：逐层安全探测 window→parent→top
 *     的 Capacitor 插件；
 *     - 优先走 JinyuSaveAs 原生零件：直接弹系统「保存为」页面
 *       （文件管理器界面，文件名预设好，可改名/选位置/取消）；
 *     - JinyuSaveAs 缺失或写入失败时，自动退回老路：
 *       Filesystem 写 Cache 目录 + 系统分享面板（文件绝不丢）；
 *   · 纯浏览器：a.download 兜底；
 *   · 分阶段报错（stage: 'write' | 'uri' | 'share' | 'cancelled' | 'browser'）。
 * 不负责：备份数据/文件内容的生成逻辑（由各页面组装 data/base64 后传入）。
 * ============================================================ */
(function () {
    'use strict';

    // 逐层安全探测 Capacitor 全局对象：window → parent → top。
    // 任何一层跨域/异常都会安全停下，绝不假设某层一定存在。
    function findCapacitor() {
        var win = window;
        for (var i = 0; i < 3 && win; i++) {
            try {
                if (win && win.Capacitor) return win.Capacitor;
                if (win === win.parent) break;   // 已到顶层
                win = win.parent;
            } catch (e) {
                return null;                      // 跨域等异常，安全停下
            }
        }
        return null;
    }

    // 判断是否处于原生环境（App 内）。
    function isNativeEnv(Cap) {
        if (!Cap) return false;
        try {
            if (typeof Cap.isNativePlatform === 'function') {
                return !!Cap.isNativePlatform();
            }
            if (typeof Cap.getPlatform === 'function') {
                return Cap.getPlatform() !== 'web';
            }
        } catch (e) {
            return false;
        }
        return false;
    }

    // 取批次E 新增的系统「保存为」零件；不存在（旧包）则返回 null。
    function getSaveAsPlugin(Cap) {
        try {
            var p = Cap && Cap.Plugins && Cap.Plugins.JinyuSaveAs;
            if (p && typeof p.saveFile === 'function') return p;
        } catch (e) {
            // 安全忽略，按无零件处理
        }
        return null;
    }

    function isCancelError(e) {
        var msg = String((e && (e.message || e)) || '');
        return /cancel|dismiss|abort|取消/i.test(msg);
    }

    // ---- 老路（保留作保险）：Filesystem 写 Cache → 系统分享面板 ----
    // 注意：Cache 是 App 私有目录，文件管理器看不到，
    // 必须靠分享面板手动“另存”才会落到用户看得见的文件夹。
    function legacyNativeShare(Cap, fileName, data, base64, dialogTitle) {
        var FS = null, Share = null;
        try { FS = (Cap.Plugins && Cap.Plugins.Filesystem) || null; } catch (e) { FS = null; }
        try { Share = (Cap.Plugins && Cap.Plugins.Share) || null; } catch (e) { Share = null; }

        if (!FS || typeof FS.writeFile !== 'function' || typeof FS.getUri !== 'function') {
            return Promise.reject(new Error('原生环境但未检测到可用的 Filesystem 插件（请先 npm i @capacitor/filesystem@^8 并 npx cap sync android）'));
        }
        if (!Share || typeof Share.share !== 'function') {
            return Promise.reject(new Error('原生环境但未检测到可用的 Share 插件（请先 npm i @capacitor/share@^8 并 npx cap sync android）'));
        }

        var writeArg = { path: fileName, directory: 'CACHE', recursive: true };
        if (base64) { writeArg.data = base64; }
        else { writeArg.data = data; writeArg.encoding = 'utf8'; }

        return FS.writeFile(writeArg)
            .catch(function (e) {
                var err = new Error('写入缓存失败：' + ((e && e.message) || e));
                err.stage = 'write';
                throw err;
            })
            .then(function () {
                return FS.getUri({ path: fileName, directory: 'CACHE' })
                    .catch(function (e) {
                        var err = new Error('获取文件地址失败：' + ((e && e.message) || e));
                        err.stage = 'uri';
                        throw err;
                    });
            })
            .then(function (uriRes) {
                return Share.share({ title: fileName, url: uriRes.uri, dialogTitle: dialogTitle })
                    .catch(function (e) {
                        if (isCancelError(e)) {
                            var ce = new Error('已取消分享');
                            ce.stage = 'cancelled';
                            throw ce;
                        }
                        var err = new Error('分享失败：' + ((e && e.message) || e));
                        err.stage = 'share';
                        throw err;
                    });
            })
            .then(function () { return { ok: true, channel: 'native' }; });
    }

    /**
     * nativeSaveFile(options) -> Promise<{ ok:true, channel:'native'|'browser' }>
     * options:
     *   fileName    : 保存文件名（必填）
     *   data        : 文本内容（json/txt 等）
     *   base64      : base64 内容（图片等二进制；与 data 二选一，优先 base64）
     *   mime        : MIME 类型（系统保存页/浏览器兜底用）
     *   dialogTitle : 老路分享面板标题（可选，默认“导出文件”）
     */
    window.nativeSaveFile = function (options) {
        options = options || {};
        var fileName = options.fileName;
        var data = options.data;
        var base64 = options.base64;
        var mime = options.mime || 'application/octet-stream';
        var dialogTitle = options.dialogTitle || '导出文件';

        if (!fileName) return Promise.reject(new Error('缺少文件名'));

        var Cap = findCapacitor();

        // ---- 原生路径 ----
        if (isNativeEnv(Cap)) {
            var saveAs = getSaveAsPlugin(Cap);
            if (saveAs) {
                // 新路：系统「保存为」页面直存（批次E）
                var args = { fileName: fileName, mime: mime };
                if (base64) { args.base64 = base64; }
                else { args.text = data; }

                return saveAs.saveFile(args)
                    .then(function () { return { ok: true, channel: 'native' }; })
                    .catch(function (e) {
                        // 用户主动取消 → 明确报“已取消”，不回退、不再弹分享面板
                        if (isCancelError(e)) {
                            var ce = new Error('已取消保存');
                            ce.stage = 'cancelled';
                            throw ce;
                        }
                        // 零件打不开/写入失败等异常 → 自动退回老路，文件不丢
                        return legacyNativeShare(Cap, fileName, data, base64, dialogTitle);
                    });
            }
            // 没有新零件（旧包）→ 老路
            return legacyNativeShare(Cap, fileName, data, base64, dialogTitle);
        }

        // ---- 浏览器兜底：a.download ----
        return new Promise(function (resolve, reject) {
            try {
                var blob;
                if (base64) {
                    var bin = atob(base64);
                    var bytes = new Uint8Array(bin.length);
                    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                    blob = new Blob([bytes], { type: mime });
                } else {
                    blob = new Blob([data], { type: mime + ';charset=utf-8' });
                }
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                setTimeout(function () {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 0);
                resolve({ ok: true, channel: 'browser' });
            } catch (e) {
                var err = new Error('浏览器下载失败：' + ((e && e.message) || e));
                err.stage = 'browser';
                reject(err);
            }
        });
    };
})();
