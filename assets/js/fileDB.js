// ==========================================
// Jinyu Phone - 重型文件超级仓库 (IndexedDB)
// 专门用于存储大体积文件：高清壁纸、自定义字体等
// 容量：50MB ~ 几百MB (取决于设备剩余空间)
// ==========================================

const FileDB = {
    dbName: 'JinyuPhone_Storage',
    storeName: 'HeavyFiles',
    db: null,

    // 1. 初始化打开仓库大门
    init: function() {
        return new Promise((resolve, reject) => {
            if (this.db) return resolve(this.db);
            
            const request = indexedDB.open(this.dbName, 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName); // 创建专属货架
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ 超级仓库 (IndexedDB) 连接成功！');
                resolve(this.db);
            };
            
            request.onerror = (event) => {
                console.error('❌ 超级仓库连接失败:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    // 2. 存入大文件 (异步)
    save: async function(key, data) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(data, key);
            
            request.onsuccess = () => resolve(true);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    // 3. 读取大文件 (异步)
    get: async function(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    // 4. 删除大文件 (异步)
    remove: async function(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve(true);
            request.onerror = (e) => reject(e.target.error);
        });
    }
};

// 挂载到全局，方便子窗口调用
window.FileDB = FileDB;
