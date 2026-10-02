// js/auth.js - 烟雨渡口版

class AuthenticationSystem {
    constructor() {
        this.STORAGE_KEYS = {
            DEVICE_ID: 'jy_device_id',
            QUALIFICATION_CODE: 'jy_qualification_code',
            IS_VERIFIED: 'jy_is_verified',
            ADMIN_CODES: 'jy_qualification_codes_v2'
        };
        this.init();
    }

    // 提示（用新的toast）
    showNote(msg) {
        var t = document.getElementById('toast');
        if (t) {
            t.textContent = msg;
            t.classList.add('show');
            setTimeout(function(){ t.classList.remove('show'); }, 2500);
        }
    }

    init() {
        // 设备指纹
        var deviceId = localStorage.getItem(this.STORAGE_KEYS.DEVICE_ID);
        if (!deviceId) {
            deviceId = 'JY-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            localStorage.setItem(this.STORAGE_KEYS.DEVICE_ID, deviceId);
        }
        var deviceEl = document.getElementById('deviceId');
        if (deviceEl) deviceEl.textContent = deviceId;

        // 绑定按钮
        var self = this;
        document.getElementById('verifyBtn').onclick = function() { self.verifyCode(); };

        // 回车也能验证
        document.getElementById('qualificationCode').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') self.verifyCode();
        });
    }

    verifyCode() {
        var code = document.getElementById('qualificationCode').value.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
        if (!code) {
            this.showNote('请输入资格码');
            return;
        }

        // 1. 万能码
        var masterKeys = ['JY0003-MLGZ-ZWDU', 'JY0003-MLGZ-ZWDU6W', 'JINYU666', 'JY2024-ABCD-1234'];
        if (masterKeys.includes(code)) {
            this.grantAccess(code);
            return;
        }

        // 2. 签名校验（与admin端一致）
        if (code.length >= 9) {
            var body = code.substring(0, code.length - 2);
            var tail = code.substring(code.length - 2);
            var key = 'JINYU2026';
            var hash = 0;
            for (var i = 0; i < body.length; i++) hash = ((hash << 5) - hash + body.charCodeAt(i)) & 0xFFFFFF;
            for (var i = 0; i < key.length; i++) hash = ((hash << 5) - hash + key.charCodeAt(i)) & 0xFFFFFF;
            var c = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
            var expected = c[hash % c.length] + c[Math.floor(hash / c.length) % c.length];
            if (tail === expected) {
                this.grantAccess(code);
                return;
            }
        }

        this.showNote('码不对 · 再试试');
        var zone = document.getElementById('inputZone');
        zone.classList.add('error');
        setTimeout(function() { zone.classList.remove('error'); }, 500);
    }


    grantAccess(code) {
        var self = this;

        // 存储验证状态
        localStorage.setItem(this.STORAGE_KEYS.IS_VERIFIED, 'true');
        localStorage.setItem(this.STORAGE_KEYS.QUALIFICATION_CODE, code);

        // 提示
        this.showNote('解缆 · 启程');

        // 0.5s → 绳结解开 + 船漂走
        setTimeout(function() {
            document.getElementById('scene').classList.add('departing');
        }, 500);

        // 3s → 雾气铺满 + "旅人靠岸"
        setTimeout(function() {
            document.getElementById('fogOverlay').classList.add('active');
        }, 3000);

        // 5.5s → 雾散
        setTimeout(function() {
            document.getElementById('fogOverlay').classList.add('clearing');
        }, 5500);

        // 7s → 跳转
        setTimeout(function() {
            window.location.href = 'index.html';
        }, 7000);
    }
}

function copyDeviceId() {
    var code = document.getElementById('deviceId').textContent;
    if (!code || code === '正在生成...') return;
    var ta = document.createElement('input');
    ta.value = code; ta.readOnly = true;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus(); ta.select(); ta.setSelectionRange(0, 9999);
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(ta);
    var t = document.getElementById('toast');
    if (t) {
        t.textContent = '设备码已复制'; t.classList.add('show');
        setTimeout(function(){ t.classList.remove('show'); }, 2000);
    }
}

window.onload = function() { new AuthenticationSystem(); };
