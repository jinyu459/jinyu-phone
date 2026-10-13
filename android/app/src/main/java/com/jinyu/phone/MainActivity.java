package com.jinyu.phone;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 批次E：登记「系统保存为」直存零件（必须在 super.onCreate 之前注册）
        registerPlugin(JinyuSaveAsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
