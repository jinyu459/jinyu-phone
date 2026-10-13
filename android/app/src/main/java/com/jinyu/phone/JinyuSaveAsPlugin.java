package com.jinyu.phone;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * JinyuSaveAsPlugin —— 系统「保存为」直存零件（批次E，v2 修复版）
 *
 * 职责：调起安卓官方 ACTION_CREATE_DOCUMENT「保存为」页面
 * （就是文件管理器那个界面）：文件名预设好，用户可改名、选位置；
 * 用户点「保存」后把内容写进所选位置；点「取消」回传取消标记。
 *
 * JS 侧调用：Capacitor.Plugins.JinyuSaveAs.saveFile({ fileName, mime, text|base64 })
 *
 * v2 修复：Capacitor 8.5.2 已移除 com.getcapacitor.ActivityResult 类
 * （v1 因 import 它导致云端编译失败）。改用 Capacitor 官方保留的
 * Plugin.handleOnActivityResult(requestCode,resultCode,data) 钩子，
 * 通过自定义 requestCode 区分回调，不依赖已删除的辅助类。
 *
 * 注意：@CapacitorPlugin 的 requestCodes 必须声明本零件使用的请求码——
 * Capacitor 8 的 Bridge.onActivityResult 靠这个数组把回调路由到本插件，
 * 不声明则系统选完文件后回调到不了这里（已在 8.5.2 源码核实）。
 */
// requestCodes 字面量必须与下方 SAVE_REQUEST_CODE 一致（0x51A5）——
// 注解里写字面量，彻底避免「类注解自引用」的编译歧义。
@CapacitorPlugin(name = "JinyuSaveAs", requestCodes = { 0x51A5 })
public class JinyuSaveAsPlugin extends Plugin {

    /** 自定义请求码：用于让 Bridge 路由回调、并在 handleOnActivityResult 里识别本零件的保存回调 */
    private static final int SAVE_REQUEST_CODE = 0x51A5;

    /** 保存页拉起期间暂存的调用句柄，回调时取回 */
    private PluginCall pendingSaveCall;

    public JinyuSaveAsPlugin() {
        super();
    }

    @Override
    public void load() {
        super.load();
    }

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
            pendingSaveCall = call;
            // 经典写法：用自定义 requestCode 拉起系统保存页，结果回到 handleOnActivityResult
            getActivity().startActivityForResult(intent, SAVE_REQUEST_CODE);
        } catch (Exception e) {
            pendingSaveCall = null;
            call.reject("无法打开系统保存页面：" + e.getMessage());
        }
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);

        if (requestCode != SAVE_REQUEST_CODE) {
            return;
        }

        PluginCall call = pendingSaveCall;
        pendingSaveCall = null;

        if (call == null) {
            return;
        }

        // 用户在保存页直接返回/取消
        if (resultCode != Activity.RESULT_OK || data == null || data.getData() == null) {
            call.reject("已取消保存");
            return;
        }

        Uri uri = data.getData();
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
