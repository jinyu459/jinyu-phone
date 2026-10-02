/* ============================================================
 * nativeSave.js —— 统一导出通道
 * 职责：把“已经生成好的文件内容”交给正确的保存/分享通道。
 *   · 原生环境（含外壳 iframe 内）：逐层安全探测 window→parent→top
 *     的 Capacitor 插件，Filesystem 写入 Cache 目录后调起系统分享；
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

    // 取原生插件，并确认关键方法确实可调用。
    // 返回 { Filesystem, Share }；纯浏览器环境返回 null；
    // 原生环境但插件不可用时抛错（绝不静默退化）。
    function getNativePlugins() {
        var Cap = findCapacitor();
        if (!Cap) return null;

        var isNative = false;
        try {
            if (typeof Cap.isNativePlatform === 'function') {
                isNative = !!Cap.isNativePlatform();
            } else if (typeof Cap.getPlatform === 'function') {
                isNative = Cap.getPlatform() !== 'web';
            }
        } catch (e) {
            isNative = false;
        }
        if (!isNative) return null;

        var FS = null, Share = null;
        try { FS = (Cap.Plugins && Cap.Plugins.Filesystem) || null; } catch (e) { FS = null; }
        try { Share = (Cap.Plugins && Cap.Plugins.Share) || null; } catch (e) { Share = null; }

        if (!FS || typeof FS.writeFile !== 'function' || typeof FS.getUri !== 'function') {
            throw new Error('原生环境但未检测到可用的 Filesystem 插件（请先 npm i @capacitor/filesystem@^8 并 npx cap sync android）');
        }
        if (!Share || typeof Share.share !== 'function') {
            throw new Error('原生环境但未检测到可用的 Share 插件（请先 npm i @capacitor/share@^8 并 npx cap sync android）');
        }
        return { Filesystem: FS, Share: Share };
    }

    function isCancelError(e) {
        var msg = String((e && (e.message || e)) || '');
        return /cancel|dismiss|abort|取消/i.test(msg);
    }

    /**
     * nativeSaveFile(options) -> Promise<{ ok:true, channel:'native'|'browser' }>
     * options:
     *   fileName    : 保存文件名（必填）
     *   data        : 文本内容（json/txt 等）
     *   base64      : base64 内容（图片等二进制；与 data 二选一，优先 base64）
     *   mime        : MIME 类型（浏览器兜底用）
     *   dialogTitle : 系统分享面板标题（可选，默认“导出文件”）
     */
    window.nativeSaveFile = function (options) {
        options = options || {};
        var fileName = options.fileName;
        var data = options.data;
        var base64 = options.base64;
        var mime = options.mime || 'application/octet-stream';
        var dialogTitle = options.dialogTitle || '导出文件';

        if (!fileName) return Promise.reject(new Error('缺少文件名'));

        var plugins;
        try {
            plugins = getNativePlugins();
        } catch (e) {
            return Promise.reject(e);
        }

        // ---- 原生路径：Cache 写文件 → 系统分享 ----
        if (plugins) {
            var FS = plugins.Filesystem, Share = plugins.Share;
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
