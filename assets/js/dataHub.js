window.dataHub = {
    set(key, value) {
        localStorage.setItem('jinyu_' + key, JSON.stringify(value));
    },
    get(key, defaultValue) {
        const val = localStorage.getItem('jinyu_' + key);
        return val ? JSON.parse(val) : defaultValue;
    }
};

window.dataHub = {
    set(key, value) {
        localStorage.setItem('jinyu_' + key, JSON.stringify(value));
    },
    get(key, defaultValue) {
        const val = localStorage.getItem('jinyu_' + key);
        return val ? JSON.parse(val) : defaultValue;
    }
};

// 初始化同步：页面加载时读取当前季节，设到本页面的 <html> 上
(function() {
    var season = window.dataHub.get('current_season', 'spring');
    document.documentElement.setAttribute('data-theme', season);
})();

// 监听父页面广播的季节切换消息，实时同步 data-theme
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'changeTheme' && event.data.season) {
        document.documentElement.setAttribute('data-theme', event.data.season);
    }
});
