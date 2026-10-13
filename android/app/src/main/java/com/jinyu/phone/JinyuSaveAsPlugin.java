package com.jinyu.phone;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import com.getcapacitor.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * JinyuSaveAsPlugin —— 系统「保存为」直存零件（批次E）
 *
 * 职责：调起安卓官方 ACTION_CREATE_DOCUMENT「保存为」页面
 * （就是文件管理器那个界面）：文件名预设好，用户可改名、选位置；
 * 用户点「保存」后把内容写进所选位置；点「取消」回传取消标记。
 *
 * JS 侧调用：Capacitor.Plugins.JinyuSaveAs.saveFile({ fileName, mime, text|base64 })
 *
 * 为什么自造：Capacitor 官方没有现成插件调起这个系统保存页，
 * 旧导出只能走「写缓存 + 分享面板」的绕路（文件落在 App 私有
 * 缓存目录，文件管理器看不到，必须靠分享面板手动转存）。
 */
@CapacitorPlugin(name = "JinyuSaveAs")
public class JinyuSaveAsPlugin extends Plugin {

    @PluginMethod
    public void saveFile(PluginCall call) {
        String fileName = call.getString("fileName");
        String mime = call.getString("mime", "application/octet-stream");

        if (fileName == null || fileName.trim().isEmpty()) {
            call.reject("缺少文件名");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mime);
        intent.putExtra(Intent.EXTRA_TITLE, fileName);

        try {
            startActivityForResult(call, intent, "saveResult");
        } catch (Exception e) {
            call.reject("无法打开系统保存页面：" + e.getMessage());
        }
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        // 用户在保存页直接返回/取消
        if (result.getResultCode() != Activity.RESULT_OK
                || result.getData() == null
                || result.getData().getData() == null) {
            call.reject("已取消保存");
            return;
        }

        Uri uri = result.getData().getData();
        String base64 = call.getString("base64");
        String text = call.getString("text");

        OutputStream out = null;
        try {
            out = getContext().getContentResolver().openOutputStream(uri);
            if (out == null) {
                call.reject("无法打开所选位置进行写入");
                return;
            }
            if (base64 != null && !base64.isEmpty()) {
                out.write(Base64.decode(base64, Base64.DEFAULT));
            } else if (text != null) {
                out.write(text.getBytes(StandardCharsets.UTF_8));
            } else {
                call.reject("没有可写入的内容");
                return;
            }
            out.flush();

            JSObject ret = new JSObject();
            ret.put("ok", true);
            ret.put("uri", uri.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("写入文件失败：" + e.getMessage());
        } finally {
            if (out != null) {
                try {
                    out.close();
                } catch (Exception ignored) {
                    // 关闭失败不影响结果
                }
            }
        }
    }
}
