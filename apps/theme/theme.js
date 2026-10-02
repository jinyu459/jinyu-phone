// ================= 新增：烟雾浮标接管系统 =================
    function showSmokeMsg(msg, isConfirm = false, onConfirm = null) {
        let oldToast = document.getElementById('sys-smoke-toast');
        let oldMask = document.getElementById('sys-smoke-mask');
        if (oldToast) oldToast.remove();
        if (oldMask) oldMask.remove();

        const mask = document.createElement('div');
        mask.id = 'sys-smoke-mask';
        mask.className = 'smoke-toast-mask';
        
        const toast = document.createElement('div');
        toast.id = 'sys-smoke-toast';
        toast.className = 'smoke-toast';
        
        let html = `<div class="smoke-msg">${msg}</div>`;
        if (isConfirm) {
            html += `
                <div class="smoke-btns">
                    <button class="smoke-btn smoke-btn-cancel" id="smoke-cancel">取消</button>
                    <button class="smoke-btn smoke-btn-confirm" id="smoke-confirm">确定</button>
                </div>
            `;
        }
        
        toast.innerHTML = html;
        document.body.appendChild(mask);
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            mask.classList.add('active');
            toast.classList.add('active');
        });

        const closeToast = () => {
            toast.classList.remove('active');
            toast.classList.add('fade-out');
            mask.classList.remove('active');
            setTimeout(() => { toast.remove(); mask.remove(); }, 300);
        };

        if (isConfirm) {
            document.getElementById('smoke-cancel').onclick = closeToast;
            document.getElementById('smoke-confirm').onclick = () => {
                closeToast();
                if (onConfirm) onConfirm();
            };
        } else {
            setTimeout(closeToast, 1500);
        }
    }

    // 暴力接管全局 alert，并在底层自动净化所有弹窗里的 Emoji！
    window.alert = function(msg) {
        // 利用正则一键干掉所有烦人的 Emoji
        let cleanMsg = msg.replace(/[✅⚠️✨🎨🖼️📐✏️📦]/g, '').trim();
        showSmokeMsg(cleanMsg, false);
    };
    // ========================================================
    // === 页面切换逻辑及2A核心业务逻辑 ===
    // 来源：2A// ========== 1. 返回按钮 ==========
    document.getElementById('backBtn').addEventListener('click', function() {
        if (typeof window.closeApp === 'function') {
            window.closeApp();
        } else if (window.parent) {
            window.parent.postMessage('closeApp', '*');
        }
    });

    // ========== 2. 标签页切换 ==========
    var tabItems = document.querySelectorAll('.tab-item');
    var tabContents = document.querySelectorAll('.tab-content');
    tabItems.forEach(function(item) {
        item.addEventListener('click', function() {
            tabItems.forEach(function(t) { t.classList.remove('active'); });
            tabContents.forEach(function(c) { c.classList.remove('active'); });
            this.classList.add('active');
            document.getElementById(this.getAttribute('data-target')).classList.add('active');
        });
    });

    // ========== 3. 四季主题 ==========
    document.querySelectorAll('#tab-seasons .season-card').forEach(function(card) {
        card.addEventListener('click', function() {
            var season = this.getAttribute('data-season');
            if (window.parent && window.parent.dataHub && typeof window.parent.dataHub.set === 'function') {
                window.parent.dataHub.set('current_season', season);
            } else {
                localStorage.setItem('current_season', season);
            }
            if(window.parent) window.parent.postMessage({ type: 'changeTheme', season: season }, '*');
            document.documentElement.setAttribute('data-theme', season);
            alert('岁时已入' + this.innerText + '');
        });
    });

    // ========== 4. 系统自带字体 ==========
    document.querySelectorAll('.font-card').forEach(function(card) {
        card.addEventListener('click', function() {
            var font = this.getAttribute('data-font');
            setSystemFont(font); // 统一调用切换函数
            alert('已切换' + this.innerText + '字体');
        });
    });

    // ========== 5. 壁纸 ==========
    document.querySelectorAll('.wallpaper-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var wallpaper = this.getAttribute('data-wallpaper');
            if (window.parent && window.parent.dataHub && typeof window.parent.dataHub.set === 'function') {
                window.parent.dataHub.set('wallpaper', wallpaper);
            } else {
                localStorage.setItem('wallpaper', wallpaper);
            }
            if(window.parent) window.parent.postMessage({ type: 'changeWallpaper', wallpaper: wallpaper }, '*');
            alert('已切换' + this.innerText + '');
        });
    });

    // ========== 6. 应用自定义：图标圆角 & 大小 ==========
    var DEFAULT_RADIUS = 15;
    var DEFAULT_SIZE   = 60;
    var ICON_KEYS = ['chat', 'setting', 'music', 'theme', 'worldbook', 'online', 'farm', 'study'];
    var DEFAULT_NAMES = { chat: '聊天', setting: '设置', music: '音乐', theme: '美化', worldbook: '世界书', online: '联机', farm: '农场', study: '学习' };

    var rangeRadius = document.getElementById('rangeRadius');
    var rangeSize   = document.getElementById('rangeSize');
    var valRadius   = document.getElementById('valRadius');
    var valSize     = document.getElementById('valSize');
    var previewIcon = document.getElementById('previewIcon');

    function loadSavedCustom() {
        var savedRadius = DEFAULT_RADIUS;
        var savedSize   = DEFAULT_SIZE;

        if (window.parent && window.parent.dataHub && typeof window.parent.dataHub.get === 'function') {
            savedRadius = parseInt(window.parent.dataHub.get('icon_radius', DEFAULT_RADIUS), 10);
            savedSize   = parseInt(window.parent.dataHub.get('icon_size',   DEFAULT_SIZE),   10);
        } else {
            savedRadius = parseInt(localStorage.getItem('icon_radius') || DEFAULT_RADIUS, 10);
            savedSize   = parseInt(localStorage.getItem('icon_size')   || DEFAULT_SIZE,   10);
        }

        rangeRadius.value = savedRadius;
        rangeSize.value   = savedSize;
        refreshPreview();

        ICON_KEYS.forEach(function(key) {
            var savedName = '';
            if (window.parent && window.parent.dataHub && typeof window.parent.dataHub.get === 'function') {
                savedName = window.parent.dataHub.get('name_' + key, '');
            } else {
                savedName = localStorage.getItem('name_' + key) || '';
            }
            var nameInput = document.getElementById('name_' + key);
            if (nameInput) nameInput.value = savedName || DEFAULT_NAMES[key];
        });

        ICON_KEYS.forEach(function(key) {
            var imgData = null;
            if (window.parent && window.parent.dataHub && typeof window.parent.dataHub.get === 'function') {
                imgData = window.parent.dataHub.get('icon_' + key + '_image', null);
            } else {
                imgData = localStorage.getItem('icon_' + key + '_image') || null;
            }
            var preview = document.getElementById('preview_' + key);
            if (preview && imgData) {
                preview.style.backgroundImage = 'url(' + imgData + ')';
                preview.classList.add('has-image');
            }
        });
    }

    function refreshPreview() {
        var r = rangeRadius.value;
        var s = rangeSize.value;
        valRadius.textContent = r + 'px';
        valSize.textContent   = s + 'px';
        previewIcon.style.width        = s + 'px';
        previewIcon.style.height       = s + 'px';
        previewIcon.style.borderRadius = r + 'px';
        previewIcon.style.fontSize     = Math.max(11, Math.round(s * 0.22)) + 'px';
    }

    rangeRadius.addEventListener('input', refreshPreview);
    rangeSize.addEventListener('input',   refreshPreview);

    // ========== 7. 图标图片选择 ==========
    function pickIconImage(key) { document.getElementById('fileInput_' + key).click(); }

    function handleImageSelect(key, input) {
        if (!input.files || !input.files[0]) return;
        var file = input.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                var size = 150;
                canvas.width = size; canvas.height = size;
                var min = Math.min(img.width, img.height);
                var sx = (img.width - min) / 2, sy = (img.height - min) / 2;
                ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
                var dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                if (window.parent && window.parent.dataHub && typeof window.parent.dataHub.set === 'function') {
                    window.parent.dataHub.set('icon_' + key + '_image', dataUrl);
                } else {
                    localStorage.setItem('icon_' + key + '_image', dataUrl);
                }
                var preview = document.getElementById('preview_' + key);
                if (preview) {
                    preview.style.backgroundImage = 'url(' + dataUrl + ')';
                    preview.classList.add('has-image');
                }
                if(window.parent) window.parent.postMessage({ type: 'applyIconImages' }, '*');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function clearIconImage(key) {
        if (window.parent && window.parent.dataHub && typeof window.parent.dataHub.set === 'function') {
            window.parent.dataHub.set('icon_' + key + '_image', null);
        } else {
            localStorage.removeItem('icon_' + key + '_image');
        }
        var preview = document.getElementById('preview_' + key);
        if (preview) {
            preview.style.backgroundImage = '';
            preview.classList.remove('has-image');
        }
        var fileInput = document.getElementById('fileInput_' + key);
        if (fileInput) fileInput.value = '';
        if(window.parent) window.parent.postMessage({ type: 'applyIconImages' }, '*');
    }

    document.getElementById('saveBtn').addEventListener('click', function() {
        var r = rangeRadius.value;
        var s = rangeSize.value;
        if (window.parent && window.parent.dataHub && typeof window.parent.dataHub.set === 'function') {
            window.parent.dataHub.set('icon_radius', r);
            window.parent.dataHub.set('icon_size',   s);
        } else {
            localStorage.setItem('icon_radius', r);
            localStorage.setItem('icon_size',   s);
        }
        ICON_KEYS.forEach(function(key) {
            var nameVal = document.getElementById('name_' + key).value.trim();
            if (window.parent && window.parent.dataHub && typeof window.parent.dataHub.set === 'function') {
                window.parent.dataHub.set('name_' + key, nameVal || DEFAULT_NAMES[key]);
            } else {
                localStorage.setItem('name_' + key, nameVal || DEFAULT_NAMES[key]);
            }
        });
        if(window.parent){
            window.parent.postMessage({ type: 'applyIconCustom', radius: r, size: s }, '*');
            window.parent.postMessage({ type: 'applyIconNames' }, '*');
        }
        showSmokeMsg('设置已保存');
    });

    document.getElementById('resetBtn').addEventListener('click', function() {
        rangeRadius.value = DEFAULT_RADIUS;
        rangeSize.value   = DEFAULT_SIZE;
        refreshPreview();
        ICON_KEYS.forEach(function(key) {
            var nameInput = document.getElementById('name_' + key);
            if (nameInput) nameInput.value = DEFAULT_NAMES[key];
            clearIconImage(key);
        });
    });

    // ================= 稳定版：自定义壁纸图库 =================
    let customWallpapersList = []; 
    let activeCustomWallpaper = null; 

    document.addEventListener('DOMContentLoaded', () => {
        if (window.parent && window.parent.dataHub) {
            customWallpapersList = window.parent.dataHub.get('custom_wallpapers_list', []);
            activeCustomWallpaper = window.parent.dataHub.get('custom_wallpaper', null);
        } else {
            customWallpapersList = JSON.parse(localStorage.getItem('custom_wallpapers_list') || '[]');
            activeCustomWallpaper = localStorage.getItem('custom_wallpaper');
        }
        renderWallpaperGallery();
    });

    document.getElementById('custom-wallpaper-upload').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileDB = window.parent?.FileDB || window.FileDB;
    if (!fileDB) {
        showSmokeMsg('存储仓库未就绪');
        e.target.value = '';
        return;
    }

    const wallpaperId = 'wallpaper_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    
    try {
        await fileDB.save(wallpaperId, file);
        customWallpapersList.unshift(wallpaperId);
        selectCustomWallpaper(wallpaperId);
    } catch (err) {
        showSmokeMsg('上传失败');
    }
    
    e.target.value = '';
});

    function saveWallpaperData() {
    const mode = activeCustomWallpaper ? 'custom' : 'default';
    if (window.parent && window.parent.dataHub) {
        window.parent.dataHub.set('custom_wallpapers_list', customWallpapersList);
        window.parent.dataHub.set('custom_wallpaper', activeCustomWallpaper || '');
        window.parent.dataHub.set('wallpaper', mode);
    } else {
        localStorage.setItem('custom_wallpapers_list', JSON.stringify(customWallpapersList));
        localStorage.setItem('custom_wallpaper', activeCustomWallpaper || '');
        localStorage.setItem('wallpaper', mode);
    }
}

// === 新增：保存壁纸名字的逻辑 ===
    function saveWallpaperName() {
    const nameInput = document.getElementById('wallpaper-name-input');
    const name = nameInput ? nameInput.value.trim() : '';

    if (!activeCustomWallpaper) {
        showSmokeMsg('请先在下方点击选中一张自定义壁纸！');
        return;
    }
    if (!name) {
        showSmokeMsg('请输入壁纸名称！');
        return;
    }

        let mapping = {};
if (window.parent && window.parent.dataHub) {
    mapping = window.parent.dataHub.get('wallpaper_name_mapping', {});
    mapping[activeCustomWallpaper] = name;
    window.parent.dataHub.set('wallpaper_name_mapping', mapping);
} else {
    mapping = JSON.parse(localStorage.getItem('wallpaper_name_mapping') || '{}');
    mapping[activeCustomWallpaper] = name;
    localStorage.setItem('wallpaper_name_mapping', JSON.stringify(mapping));
}

        alert('✅ 它喜欢新名字');
        nameInput.value = ''; 
        renderWallpaperGallery(); // 重新渲染，显示名字
    }


async function selectCustomWallpaper(wallpaperId) {
    showSmokeMsg('壁纸已选中');
    activeCustomWallpaper = wallpaperId;
    saveWallpaperData();
    renderWallpaperGallery();
    
    if (window.parent !== window && window.parent) {
        // 核心修改：直接发 ID，不发图片数据了
        window.parent.postMessage({ 
            type: 'changeWallpaper', 
            wallpaper: 'custom',
            wallpaperId: wallpaperId
        }, '*');
    }
}

    async function deleteCustomWallpaper(index) {
    const deletedId = customWallpapersList[index];
    
    const fileDB = window.parent?.FileDB || window.FileDB;
    if (fileDB) {
        await fileDB.remove(deletedId);
    }
    
    customWallpapersList.splice(index, 1);
    
    if (activeCustomWallpaper === deletedId) {
        activeCustomWallpaper = null;
        saveWallpaperData();
        if (window.parent !== window && window.parent) window.parent.postMessage({ type: 'changeWallpaper', wallpaper: 'default' }, '*');
    } else {
        saveWallpaperData();
    }
    
    renderWallpaperGallery();
}

   function clearCustomWallpaper() {
    activeCustomWallpaper = null;
    saveWallpaperData();
    renderWallpaperGallery();
    if (window.parent !== window && window.parent) {
        window.parent.postMessage({ 
            type: 'changeWallpaper', 
            wallpaper: 'default' 
        }, '*');
    }
}

  async function renderWallpaperGallery() {
    const gallery = document.getElementById('wallpaper-gallery');
    const clearBtn = document.getElementById('clear-wallpaper-btn');
    if(!gallery) return;
    
    if (gallery.dataset.rendering === 'true') return;
    gallery.dataset.rendering = 'true';
    
    if (customWallpapersList.length > 0) {
        gallery.innerHTML = '';
        gallery.style.justifyContent = 'flex-start';
        gallery.style.padding = '15px 10px';
        gallery.style.flexWrap = 'wrap';
        clearBtn.style.display = 'inline-block';
        clearBtn.textContent = '不使用自定义壁纸';
        
        const fileDB = window.parent?.FileDB || window.FileDB;
        if (!fileDB) return;
        
        // 先把所有壁纸的 blob 和 url 准备好
        const wallpaperData = [];
        for (let index = 0; index < customWallpapersList.length; index++) {
            const wallpaperId = customWallpapersList[index];
            const blob = await fileDB.get(wallpaperId);
            if (blob) {
                const imgUrl = URL.createObjectURL(blob);
                wallpaperData.push({ wallpaperId, imgUrl, index });
            }
        }
        
        // 再统一创建缩略图
        for (let item of wallpaperData) {
            const { wallpaperId, imgUrl, index } = item;
            
            const thumb = document.createElement('div');
            thumb.className = 'wallpaper-thumb';
            if (wallpaperId === activeCustomWallpaper) thumb.classList.add('active-wallpaper');
            thumb.style.backgroundImage = `url('${imgUrl}')`;
            thumb.onclick = () => selectCustomWallpaper(wallpaperId);

            let mapping = {};
            if (window.parent && window.parent.dataHub) {
                mapping = window.parent.dataHub.get('wallpaper_name_mapping', {});
            } else {
                mapping = JSON.parse(localStorage.getItem('wallpaper_name_mapping') || '{}');
            }
            if (mapping[wallpaperId]) {
                const nameTag = document.createElement('div');
                nameTag.style.cssText = 'position:absolute; bottom:-24px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.6); color:white; font-size:10px; padding:2px 8px; border-radius:10px; white-space:nowrap; z-index:10;';
                nameTag.textContent = mapping[wallpaperId];
                thumb.appendChild(nameTag);
                thumb.style.marginBottom = '20px';
            }
            
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-thumb-btn';
            delBtn.innerHTML = '×';
            delBtn.onclick = (e) => { e.stopPropagation(); deleteCustomWallpaper(index); };
            
            thumb.appendChild(delBtn);
            gallery.appendChild(thumb);
        }
    } else {
        gallery.innerHTML = '<span style="color:#999; font-size:12px;">暂无自定义图片</span>';
        gallery.style.justifyContent = 'center';
        clearBtn.style.display = 'none';
    }
    gallery.dataset.rendering = 'false';
}


// ================= 双通道字体库 =================
let customFontsList = [];

// 立即从 dataHub 或 localStorage 加载
if (window.parent && window.parent.dataHub) {
    customFontsList = window.parent.dataHub.get('custom_fonts_list', []);
} else {
    customFontsList = JSON.parse(localStorage.getItem('custom_fonts_list') || '[]');
}

window.customFontsList = customFontsList;


    document.addEventListener('DOMContentLoaded', () => {
    if (window.parent && window.parent.dataHub) {
        customWallpapersList = window.parent.dataHub.get('custom_wallpapers_list', []);
        activeCustomWallpaper = window.parent.dataHub.get('custom_wallpaper', null);
    } else {
        customWallpapersList = JSON.parse(localStorage.getItem('custom_wallpapers_list') || '[]');
        activeCustomWallpaper = localStorage.getItem('custom_wallpaper');
    }
    renderWallpaperGallery();
});

    function saveCustomFonts() {
        if (window.parent && window.parent.dataHub) {
            window.parent.dataHub.set('custom_fonts_list', customFontsList);
        } else {
            localStorage.setItem('custom_fonts_list', JSON.stringify(customFontsList));
        }
    }



    let tempFontBlob = null;
    let tempFontUrl = null;

    document.getElementById('custom-font-file-input').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (tempFontUrl) URL.revokeObjectURL(tempFontUrl);
        tempFontBlob = file;
        tempFontUrl = URL.createObjectURL(file);

        const previewFace = new FontFace('PreviewFont', `url(${tempFontUrl})`);
        previewFace.load().then(function(loadedFace) {
            document.fonts.add(loadedFace);
            const previewText = document.getElementById('font-preview-text');
            previewText.style.fontFamily = 'PreviewFont';
            document.getElementById('font-preview-area').style.display = 'block';
            document.getElementById('font-name-input').value = file.name.split('.')[0]; 
        }).catch(function(error) {
            alert('字体预览加载失败，可能是文件格式不支持。');
        });
        
        e.target.value = ''; 
    });

    function cancelSaveFont() {
        document.getElementById('font-preview-area').style.display = 'none';
        if (tempFontUrl) URL.revokeObjectURL(tempFontUrl);
        tempFontBlob = null;
    }

   async function confirmSaveFont() {
    const name = document.getElementById('font-name-input').value.trim();
    if (!name) { showSmokeMsg('请填写字体名称！'); return; }

    if (!tempFontBlob) {
        showSmokeMsg('请先选择字体文件');
        return;
    }

    const fontId = 'font_' + Date.now();
    
    try {
        if(window.parent && window.parent.FileDB) {
            await window.parent.FileDB.save(fontId, tempFontBlob);
        } else {
            showSmokeMsg('存储仓库未就绪');
            return;
        }
        
        customFontsList.push({ id: fontId, name: name, type: 'filedb' });
        saveCustomFonts();
        
        cancelSaveFont();
        renderCustomFonts();
        setSystemFont(fontId);
        showSmokeMsg('字体保存成功');
    } catch (e) {
    console.error('字体保存失败:', e);
    showSmokeMsg('保存失败: ' + (e.message || '未知错误'));
    return;
}
}

function renderCustomFonts() {
    const gallery = document.getElementById('custom-fonts-gallery');
    if (!gallery) return;

    let currentFont = (window.parent && window.parent.dataHub) ? window.parent.dataHub.get('current_font', 'default') : (localStorage.getItem('current_font') || 'default');

    // 过滤掉 FileDB 中不存在的字体
    const validFonts = [];
    const fileDB = window.parent?.FileDB || window.FileDB;
    
    // 使用 Promise.all 检查所有字体
    const checkPromises = customFontsList.map((font) => {
        return fileDB.get(font.id).then((blob) => {
            if (blob) {
                validFonts.push(font);
            } else {
                console.log('[字体] 文件不存在，移除:', font.name);
            }
        }).catch(() => {
            console.log('[字体] 获取失败，移除:', font.name);
        });
    });

    Promise.all(checkPromises).then(() => {
        // 如果有字体被移除，更新列表
        if (validFonts.length !== customFontsList.length) {
            customFontsList = validFonts;
            saveCustomFonts();
        }

        if (customFontsList.length === 0) {
            gallery.innerHTML = '<span style="color:#999; font-size:12px; margin: auto;">暂无自定义字体</span>';
            return;
        }

        gallery.innerHTML = '';
        customFontsList.forEach((font, index) => {
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.display = 'inline-block';
            wrapper.style.margin = '5px';

            const btn = document.createElement('button');
            btn.className = 'jinyu-btn font-btn';
            btn.textContent = font.name;
            btn.onclick = () => setSystemFont(font.id);

            if (currentFont === font.id) {
                btn.style.borderColor = 'var(--primary-color, #007bff)';
                btn.style.color = 'var(--primary-color, #007bff)';
                btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
            }

            const delBtn = document.createElement('button');
            delBtn.innerHTML = '×';
            delBtn.style.cssText = 'position:absolute; top:-8px; right:-8px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:12px; cursor:pointer; display:none; line-height:20px; text-align:center; padding:0;';
            
            wrapper.onmouseenter = () => delBtn.style.display = 'block';
            wrapper.onmouseleave = () => delBtn.style.display = 'none';

            delBtn.onclick = (e) => {
                e.stopPropagation();
                showSmokeMsg(`确定删除字体 "${font.name}" 吗？`, true, async () => {
                    if (font.type === 'filedb') {
                        if (window.parent && window.parent.FileDB) {
                            await window.parent.FileDB.remove(font.id);
                        }
                    }
                    customFontsList.splice(index, 1);
                    saveCustomFonts();
                    if (currentFont === font.id) setSystemFont('default');
                    else renderCustomFonts();
                });
            };

            wrapper.appendChild(btn);
            wrapper.appendChild(delBtn);
            gallery.appendChild(wrapper);
        });
    });
}

function updateFontPreview(fontId) {
    var previewEl = document.getElementById('font-preview-display');
    if (!previewEl) return;

    var fontMap = {
        'default': 'sans-serif',
        'kaiti': "'KaiTi', '楷体', serif",
        'songti': "'SimSun', '宋体', serif"
    };

    if (fontMap[fontId]) {
        previewEl.style.fontFamily = fontMap[fontId];
    } else if (fontId.startsWith('font_')) {
        var targetFont = customFontsList.find(function(f) { return f.id === fontId; });
        if (!targetFont) return;

        if (targetFont.type === 'url') {
            var face = new FontFace('PreviewSelectedFont', 'url(' + targetFont.data + ')');
            face.load().then(function(loaded) {
                document.fonts.add(loaded);
                previewEl.style.fontFamily = 'PreviewSelectedFont';
            }).catch(function() {
                previewEl.style.fontFamily = 'inherit';
            });
        } else if (targetFont.type === 'filedb') {
            if (window.parent && window.parent.FileDB) {
                window.parent.FileDB.get(fontId).then(function(blob) {
                    if (blob) {
                        var url = URL.createObjectURL(blob);
                        var face = new FontFace('PreviewSelectedFont', 'url(' + url + ')');
                        face.load().then(function(loaded) {
                            document.fonts.add(loaded);
                            previewEl.style.fontFamily = 'PreviewSelectedFont';
                        });
                    }
                });
            }
        }
    }
}


    function setSystemFont(fontId) {
            updateFontPreview(fontId);

        if (window.parent && window.parent.dataHub) {
            window.parent.dataHub.set('current_font', fontId);
        } else {
            localStorage.setItem('current_font', fontId);
        }
        
        updateFontBtnUI(fontId); 
        renderCustomFonts();     
        
        if (window.parent !== window && window.parent) {
            window.parent.postMessage({ 
            type: 'changeWallpaper', 
            wallpaper: 'custom', 
        }, '*');
    }
}

    function updateFontBtnUI(activeFont) {
        const btns = document.querySelectorAll('#tab-fonts .font-card');
        btns.forEach(btn => {
            if(btn.getAttribute('data-font') === activeFont) {
                btn.style.borderColor = 'var(--primary-color, #007bff)';
                btn.style.color = 'var(--primary-color, #007bff)';
            } else {
                btn.style.borderColor = 'var(--border-color, #ddd)';
                btn.style.color = 'var(--text-color, #333)';
            }
        });
    }

    // ================= 新增：图标预设存档逻辑 =================
    let iconPresetsList = [];

    document.addEventListener('DOMContentLoaded', () => {
        if (window.parent && window.parent.dataHub) {
            iconPresetsList = window.parent.dataHub.get('icon_presets_list', []);
        } else {
            iconPresetsList = JSON.parse(localStorage.getItem('icon_presets_list') || '[]');
        }
        renderIconPresets();
    });

    // 1. 保存预设
    async function saveIconPreset() {
        const nameInput = document.getElementById('icon-preset-name-input');
        const name = nameInput ? nameInput.value.trim() : '';
        if (!name) { alert('请输入预设名称！'); return; }

        let imageKeys = [];
        const presetId = 'icon_preset_' + Date.now();
        var fileDB = (window.parent && window.parent.FileDB) ? window.parent.FileDB : (window.FileDB || null);

        if (!fileDB) { alert('存储仓库未就绪，请稍后再试'); return; }

        for (var i = 0; i < ICON_KEYS.length; i++) {
            var key = ICON_KEYS[i];
            var imgData = null;
            if (window.parent && window.parent.dataHub && typeof window.parent.dataHub.get === 'function') {
                imgData = window.parent.dataHub.get('icon_' + key + '_image', null);
            } else {
                imgData = localStorage.getItem('icon_' + key + '_image') || null;
            }
            if (imgData) {
                await fileDB.save(presetId + '_' + key, imgData);
                imageKeys.push(key);
            }
        }

        if (imageKeys.length === 0) { alert('请至少上传一个图标图片再保存预设！'); return; }

        iconPresetsList.push({ id: presetId, name: name, keys: imageKeys });

        if (window.parent && window.parent.dataHub && typeof window.parent.dataHub.set === 'function') {
            window.parent.dataHub.set('icon_presets_list', iconPresetsList);
        } else {
            localStorage.setItem('icon_presets_list', JSON.stringify(iconPresetsList));
        }

        alert('预设已保存');
        nameInput.value = '';
        renderIconPresets();
    }


    // 2. 一键应用预设
    async function applyIconPreset(presetId) {
        const preset = iconPresetsList.find(function(p) { return p.id === presetId; });
        if (!preset) return;

        var fileDB = (window.parent && window.parent.FileDB) ? window.parent.FileDB : (window.FileDB || null);
        if (!fileDB) { alert('存储仓库未就绪'); return; }

        var keys = preset.keys || ICON_KEYS;

        for (var i = 0; i < ICON_KEYS.length; i++) {
            var key = ICON_KEYS[i];
            var imgData = null;

            if (keys.indexOf(key) !== -1) {
                imgData = await fileDB.get(preset.id + '_' + key);
            }

            if (window.parent && window.parent.dataHub) {
                window.parent.dataHub.set('icon_' + key + '_image', imgData);
            } else {
                if (imgData) localStorage.setItem('icon_' + key + '_image', imgData);
                else localStorage.removeItem('icon_' + key + '_image');
            }

            var preview = document.getElementById('preview_' + key);
            if (preview) {
                if (imgData) {
                    preview.style.backgroundImage = 'url(' + imgData + ')';
                    preview.classList.add('has-image');
                } else {
                    preview.style.backgroundImage = '';
                    preview.classList.remove('has-image');
                }
            }
        }

        if (window.parent) window.parent.postMessage({ type: 'applyIconImages' }, '*');
        alert('已应用：' + preset.name);
    }


    // 3. 渲染出胶囊按钮
    function renderIconPresets() {
        const gallery = document.getElementById('icon-presets-gallery');
        if(!gallery) return;

        if (iconPresetsList.length === 0) {
            gallery.innerHTML = '<span class="empty-tip">暂无保存的图标预设</span>';
            return;
        }

        gallery.innerHTML = '';
        iconPresetsList.forEach((preset, index) => {
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.display = 'inline-block';
            wrapper.style.margin = '5px';

            const btn = document.createElement('button');
            btn.className = 'jinyu-btn font-btn';
            btn.textContent = preset.name;
            btn.onclick = () => applyIconPreset(preset.id);

            const delBtn = document.createElement('button');
            delBtn.innerHTML = '×';
            delBtn.style.cssText = 'position:absolute; top:-8px; right:-8px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:12px; cursor:pointer; display:none; line-height:20px; text-align:center; padding:0;';
            
            wrapper.onmouseenter = () => delBtn.style.display = 'block';
            wrapper.onmouseleave = () => delBtn.style.display = 'none';

            delBtn.onclick = (e) => {
                e.stopPropagation();
                showSmokeMsg('确定删除这套预设 "' + preset.name + '" 吗？', true, async () => {
                    var fileDB = (window.parent && window.parent.FileDB) ? window.parent.FileDB : (window.FileDB || null);
                    var keys = preset.keys || ICON_KEYS;
                    if (fileDB) {
                        for (var j = 0; j < keys.length; j++) {
                            await fileDB.remove(preset.id + '_' + keys[j]);
                        }
                    }
                    iconPresetsList.splice(index, 1);
                    if (window.parent && window.parent.dataHub) {
                        window.parent.dataHub.set('icon_presets_list', iconPresetsList);
                    } else {
                        localStorage.setItem('icon_presets_list', JSON.stringify(iconPresetsList));
                    }
                    renderIconPresets();
                });
            };


            wrapper.appendChild(btn);
            wrapper.appendChild(delBtn);
            gallery.appendChild(wrapper);
        });
    }


    // ================= 修正版：我的主题 (弹窗组合逻辑) =================
    let myThemesList = [];
    let tempSelectedFont = null;
    let tempSelectedWallpaper = null;
    let tempSelectedIconPreset = null;

    document.addEventListener('DOMContentLoaded', () => {
        if (window.parent && window.parent.dataHub) {
            myThemesList = window.parent.dataHub.get('my_themes_list', []);
        } else {
            myThemesList = JSON.parse(localStorage.getItem('my_themes_list') || '[]');
        }
        renderMyThemes();
    });

    // 1. 打开弹窗，渲染三个小胶囊列表
    function openThemeModal() {
        tempSelectedFont = null;
        tempSelectedWallpaper = null;
        tempSelectedIconPreset = null;
        document.getElementById('modal-theme-name').value = '';

        renderModalList('modal-font-list', customFontsList, 'font');
        
        let mapping = {};
        if (window.parent && window.parent.dataHub) {
            mapping = window.parent.dataHub.get('wallpaper_name_mapping', {});
        } else {
            mapping = JSON.parse(localStorage.getItem('wallpaper_name_mapping') || '{}');
        }
        let wallpaperItems = customWallpapersList.map(wallpaperId => ({ id: wallpaperId, name: mapping[wallpaperId] || '未命名壁纸' }));
        renderModalList('modal-wallpaper-list', wallpaperItems, 'wallpaper');

        renderModalList('modal-icon-list', iconPresetsList, 'icon');

        document.getElementById('theme-modal-overlay').style.display = 'flex';
    }

    function closeThemeModal() {
        document.getElementById('theme-modal-overlay').style.display = 'none';
    }

    // 生成弹窗里面的小胶囊按钮
    function renderModalList(containerId, items, type) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        if (items.length === 0) {
            container.innerHTML = '<span style="font-size:12px; color:#999;">暂无预设，请先去添加</span>';
            return;
        }

        items.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'jinyu-btn font-btn';
            btn.style.padding = '4px 10px';
            btn.style.fontSize = '12px';
            btn.style.borderRadius = '12px';
            btn.style.background = '#f0f0f0';
            btn.style.color = '#333';
            btn.style.border = '1px solid transparent';
            btn.textContent = item.name;

            btn.onclick = () => {
                Array.from(container.children).forEach(c => {
                    c.style.background = '#f0f0f0';
                    c.style.color = '#333';
                    c.style.borderColor = 'transparent';
                });
                btn.style.background = 'var(--primary-light)';
                btn.style.color = 'var(--primary)';
                btn.style.borderColor = 'var(--primary)';

                if (type === 'font') tempSelectedFont = item.id;
                if (type === 'wallpaper') tempSelectedWallpaper = item.id;
                if (type === 'icon') tempSelectedIconPreset = item.id;
            };
            container.appendChild(btn);
        });
    }

    // 2. 点击确定，生成终极主题胶囊
    function confirmCreateTheme() {
        const name = document.getElementById('modal-theme-name').value.trim();
        if (!tempSelectedFont || !tempSelectedWallpaper || !tempSelectedIconPreset) {
            alert('请从字体、壁纸、图标中各选一个小胶囊！');
            return;
        }
        if (!name) { alert('请给这个新主题起个名字！'); return; }

        const newTheme = {
            id: 'theme_' + Date.now(),
            name: name,
            font: tempSelectedFont,
            wallpaper: tempSelectedWallpaper,
            iconPreset: tempSelectedIconPreset
        };

        myThemesList.push(newTheme);
        if (window.parent && window.parent.dataHub) {
            window.parent.dataHub.set('my_themes_list', myThemesList);
        } else {
            localStorage.setItem('my_themes_list', JSON.stringify(myThemesList));
        }

        alert('✅ 我的主题已应用');
        closeThemeModal();
        renderMyThemes();
    }

    // 3. 一键应用主题
    function applyMyTheme(themeId) {
        const theme = myThemesList.find(t => t.id === themeId);
        if (!theme) return;

        setSystemFont(theme.font);

       if (!customWallpapersList.includes(theme.wallpaper)) {
    customWallpapersList.unshift(theme.wallpaper);
}
selectCustomWallpaper(theme.wallpaper);

        applyIconPreset(theme.iconPreset);

        alert(`✨ 已全局切换至主题：${theme.name}`);
    }

    // 4. 渲染页面上的主题胶囊和加号
    function renderMyThemes() {
        const gallery = document.getElementById('my-themes-gallery');
        if(!gallery) return;

        gallery.innerHTML = `
            <button class="jinyu-btn dashed-btn" id="add-theme-btn" style="width: auto; padding: 8px 16px; border-radius: 20px; margin-right: 8px;" onclick="openThemeModal()">
                + 新建主题组合
            </button>
        `;

        myThemesList.forEach((theme, index) => {
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.display = 'inline-block';
            wrapper.style.margin = '5px 5px 5px 0';

            const btn = document.createElement('button');
            btn.className = 'jinyu-btn font-btn';
            btn.style.background = 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)'; 
            btn.style.fontWeight = 'bold';
            btn.style.borderRadius = '20px';
            btn.textContent = theme.name;
            btn.onclick = () => applyMyTheme(theme.id);

            const delBtn = document.createElement('button');
            delBtn.innerHTML = '×';
            delBtn.style.cssText = 'position:absolute; top:-8px; right:-8px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:12px; cursor:pointer; display:none; line-height:20px; text-align:center; padding:0; z-index:10;';
            
            wrapper.onmouseenter = () => delBtn.style.display = 'block';
            wrapper.onmouseleave = () => delBtn.style.display = 'none';


        delBtn.onclick = (e) => {
                e.stopPropagation();
                showSmokeMsg(`确定删除主题组合 "${theme.name}" 吗？`, true, () => {
                    myThemesList.splice(index, 1);
                    if (window.parent && window.parent.dataHub) {
                        window.parent.dataHub.set('my_themes_list', myThemesList);
                    } else {
                        localStorage.setItem('my_themes_list', JSON.stringify(myThemesList));
                    }
                    renderMyThemes();
                });
            };
            wrapper.appendChild(btn);
            wrapper.appendChild(delBtn);
            gallery.appendChild(wrapper);
        });
    }

    loadSavedCustom();

    // 字体预览同步
    document.addEventListener('DOMContentLoaded', function() {
      var previewInput = document.getElementById('preview-text-input');
      var previewDisplay = document.getElementById('font-preview-display');
      if (previewInput && previewDisplay) {
        previewInput.addEventListener('input', function() {
          previewDisplay.textContent = this.value || '海内存知己，天涯若比邻';
        });
      }
      
      // 加载字体胶囊
    renderCustomFonts();

    });

    // ================= 批量导入图标图库 =================
    var batchPool = [];
    var selectedBatchIndex = null;

    function renderBatchPool() {
        var pool = document.getElementById('batch-pool');
        var hint = document.getElementById('batch-hint');
        if (!pool) return;

        if (batchPool.length === 0) {
            pool.innerHTML = '<span class="empty-tip">点击上方按钮批量导入图片</span>';
            if (hint) hint.style.display = 'none';
            selectedBatchIndex = null;
            return;
        }

        pool.innerHTML = '';
        if (hint) hint.style.display = 'block';

        batchPool.forEach(function(imgData, index) {
            var thumb = document.createElement('div');
            thumb.className = 'batch-thumb';
            if (index === selectedBatchIndex) thumb.classList.add('selected');
            thumb.style.backgroundImage = 'url(' + imgData + ')';
            thumb.onclick = function() {
                selectedBatchIndex = (selectedBatchIndex === index) ? null : index;
                renderBatchPool();
            };
            pool.appendChild(thumb);
        });
    }

    function clearBatchPool() {
        batchPool = [];
        selectedBatchIndex = null;
        renderBatchPool();
    }

    try {
        document.addEventListener('DOMContentLoaded', function() {
            var batchInput = document.getElementById('batch-icon-input');
            if (!batchInput) return;

            batchInput.addEventListener('change', function(e) {
                var files = [];
                for (var i = 0; i < e.target.files.length; i++) {
                    files.push(e.target.files[i]);
                }
                if (!files.length) return;

                var maxFiles = 8 - batchPool.length;
                if (maxFiles <= 0) {
                    showSmokeMsg('图库已满，请先清空');
                    e.target.value = '';
                    return;
                }
                var filesToProcess = files.slice(0, maxFiles);

                function processNext(index) {
                    if (index >= filesToProcess.length) {
                        renderBatchPool();
                        showSmokeMsg('已导入 ' + filesToProcess.length + ' 张');
                        return;
                    }
                    var reader = new FileReader();
                    reader.onload = function(event) {
                        var img = new Image();
                        img.onload = function() {
                            var canvas = document.createElement('canvas');
                            var ctx = canvas.getContext('2d');
                            var size = 150;
                            canvas.width = size; canvas.height = size;
                            var min = Math.min(img.width, img.height);
                            var sx = (img.width - min) / 2, sy = (img.height - min) / 2;
                            ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
                            batchPool.push(canvas.toDataURL('image/jpeg', 0.8));
                            processNext(index + 1);
                        };
                        img.src = event.target.result;
                    };
                    reader.onerror = function() {
                        processNext(index + 1);
                    };
                    reader.readAsDataURL(filesToProcess[index]);
                }
                processNext(0);
                e.target.value = '';
            });

            ICON_KEYS.forEach(function(key) {
                var preview = document.getElementById('preview_' + key);
                if (!preview) return;
                preview.addEventListener('click', function() {
                    if (selectedBatchIndex === null || !batchPool[selectedBatchIndex]) return;
                    var dataUrl = batchPool[selectedBatchIndex];

                    if (window.parent && window.parent.dataHub && typeof window.parent.dataHub.set === 'function') {
                        window.parent.dataHub.set('icon_' + key + '_image', dataUrl);
                    } else {
                        localStorage.setItem('icon_' + key + '_image', dataUrl);
                    }

                    preview.style.backgroundImage = 'url(' + dataUrl + ')';
                    preview.classList.add('has-image');
                    if (window.parent) window.parent.postMessage({ type: 'applyIconImages' }, '*');

                    selectedBatchIndex = null;
                    renderBatchPool();
                    showSmokeMsg('已分配到「' + (document.getElementById('name_' + key).value || key) + '」');
                });
            });
        });
    } catch(e) {
        console.warn('批量导入模块加载失败，不影响其他功能', e);
    }

    // ================= 应用内部主题 =================
    document.addEventListener('DOMContentLoaded', function() {
        var saved = 'default';
        if (window.parent && window.parent.dataHub) {
            saved = window.parent.dataHub.get('app_theme_theme', 'default');
        } else {
            saved = localStorage.getItem('app_theme_theme') || 'default';
        }
        applyAppTheme(saved);

        document.querySelectorAll('.app-theme-card').forEach(function(card) {
            card.addEventListener('click', function() {
                var theme = this.getAttribute('data-app-theme');
                applyAppTheme(theme);
                if (window.parent && window.parent.dataHub) {
                    window.parent.dataHub.set('app_theme_theme', theme);
                } else {
                    localStorage.setItem('app_theme_theme', theme);
                }
                showSmokeMsg('已切换：' + this.innerText);
            });
        });
    });

    function applyAppTheme(theme) {
        if (theme === 'default') {
            document.documentElement.removeAttribute('data-app-theme');
        } else {
            document.documentElement.setAttribute('data-app-theme', theme);
        }
        document.querySelectorAll('.app-theme-card').forEach(function(card) {
            if (card.getAttribute('data-app-theme') === theme) {
                card.classList.add('active-app-theme');
            } else {
                card.classList.remove('active-app-theme');
            }
        });
    }
    // 读取全屏状态并应用
    document.addEventListener('DOMContentLoaded', function() {
        var isFullScreen = false;
        if (window.parent && window.parent.dataHub) {
            isFullScreen = window.parent.dataHub.get('is_fullscreen', false);
        }
        var phone = document.querySelector('.phone-container');
        if (phone && isFullScreen) {
            phone.classList.add('fullscreen-mode');
        }
    });

    // 监听父页面广播的全屏切换消息
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'toggleFullScreen') {
            var phone = document.querySelector('.phone-container');
            if (phone) {
                if (event.data.value) {
                    phone.classList.add('fullscreen-mode');
                } else {
                    phone.classList.remove('fullscreen-mode');
                }
            }
        }
    });
