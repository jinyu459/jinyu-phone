
    // ==========================================
    // 2. 预设封面与数据初始化
    // ==========================================
    const presetCovers = [
        '<div class="asset-scaler" style="transform: scale(0.6);"><div class="pl-cover-disc-wrap"><div class="pl-jade-disc"></div><div class="pl-sleeve"></div></div></div>',
        '<div class="asset-scaler" style="transform: scale(0.65);"><div class="deco-bamboo"><div class="hook"></div><div class="slips"><div class="slip"></div><div class="slip"></div><div class="slip"></div><div class="slip"></div><div class="slip"></div><div class="slip"></div><div class="string-top"></div><div class="string-bottom"></div></div></div></div>',
        '<div class="asset-scaler" style="transform: scale(0.5); margin-top:-10px;"><div class="deco-hanging"><div class="bar"></div><div class="board"></div></div></div>',
        '<div class="asset-scaler" style="transform: scale(0.45); margin-top: 10px;"><div class="fan-folding"><div class="fan-folding-tassel"></div></div></div>',
        '<div class="asset-scaler" style="transform: scale(0.45); margin-top: -10px;"><div class="fan-haitang"><div class="fan-haitang-handle"></div><div class="fan-haitang-tassel"></div></div></div>'
    ];

    const defaultData = {
        playlists: [
            { id: 'p1', name: '我喜欢', desc: '红尘客栈，旧时明月。', coverHTML: presetCovers[0], songs: [] },
            { id: 'p2', name: '古风精选', desc: '高山流水遇知音。', coverHTML: presetCovers[1], songs: [] }
        ]
    };

    let appData = JSON.parse(localStorage.getItem('jinyu_data')) || defaultData;
    function saveData() { localStorage.setItem('jinyu_data', JSON.stringify(appData)); }

    let currentViewPlaylistId = null;
    let selectedSongIds = new Set();
    let isManageMode = false;
    let isEditingPlaylistId = null; 
    let tempCustomImage = null; 
    let tempSelectedCoverIndex = 1; 

    // ==========================================
    // 3. 渲染主页歌单
    // ==========================================
    function renderMainPlaylists() {
        const container = document.getElementById('playlist-grid-container');
        if (!container) return;
        container.innerHTML = '';
        
        let totalSongs = 0;
        appData.playlists.forEach(pl => {
            totalSongs += pl.songs.length;
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.onclick = () => openDetail(pl.id);
            item.innerHTML = `<div class="pl-cover-box">${pl.coverHTML}</div><div class="pl-info"><div class="pl-name">${pl.name}</div><div class="pl-count">${pl.songs.length} 首曲目</div></div>`;
            container.appendChild(item);
        });
        
        document.getElementById('stat-total-songs').innerText = totalSongs;

        const addBtn = document.createElement('div');
        addBtn.className = 'playlist-item';
        addBtn.style = 'border: 1px dashed rgba(180,160,150,0.4); background: rgba(255,255,255,0.3);';
        addBtn.onclick = () => openCreateModal();
        addBtn.innerHTML = `<div class="pl-cover-box" style="background:transparent; border:none; font-size:24px; color:#a08a82; font-weight:300;">+</div><div class="pl-info"><div class="pl-name" style="color:#a08a82;">创立新卷</div></div>`;
        container.appendChild(addBtn);
    }

    // ==========================================
    // 4. 详情页与整理模式
    // ==========================================
    function openDetail(playlistId) {
        currentViewPlaylistId = playlistId;
        const pl = appData.playlists.find(p => p.id === playlistId);
        if (!pl) return;
        document.getElementById('detail-cover').innerHTML = pl.coverHTML;
        document.getElementById('detail-name').innerText = pl.name;
        document.getElementById('detail-desc').innerText = pl.desc || '暂无小志...';
        exitManageMode();
        renderDetailSongs();
        document.getElementById('detail-page').classList.add('active');
    }
    
    function closeDetail() {
        document.getElementById('detail-page').classList.remove('active');
        currentViewPlaylistId = null;
        exitManageMode();
        renderMainPlaylists();
    }
    
    function renderDetailSongs() {
        const pl = appData.playlists.find(p => p.id === currentViewPlaylistId);
        const container = document.getElementById('detail-song-list');
        container.innerHTML = '';
        if (!pl || pl.songs.length === 0) {
            container.innerHTML = '<div style="text-align:center; margin-top:40px; color:#a08a82; font-size:12px;">卷宗空空如也，请导入曲目</div>';
            return;
        }
        pl.songs.forEach((song) => {
            const item = document.createElement('div');
            item.className = `song-item ${selectedSongIds.has(song.id) ? 'selected' : ''}`;
            const tagHtml = song.hasLyric ? '<span class="s-tag">词</span>' : '<span class="s-tag" style="color:#8abca8; border-color:rgba(138,188,168,0.4);">纯</span>';
            item.innerHTML = `<div class="song-checkbox">✓</div><div class="s-info"><div class="s-name">${song.name} ${tagHtml}</div><div class="s-artist">${song.artist}</div></div>`;
           item.ondblclick = (e) => { e.stopPropagation(); openSongEdit(pl.id, song.id, 'detail'); };
            item.onclick = () => {
                if (isManageMode) {
                    if (selectedSongIds.has(song.id)) { selectedSongIds.delete(song.id); item.classList.remove('selected'); } 
                    else { selectedSongIds.add(song.id); item.classList.add('selected'); }
                } else { 
                    playSongFromPlaylist(pl.id, song.id); 
                }
            };
            container.appendChild(item);
        });
    }

    function toggleManageMode() {
        const page = document.getElementById('detail-page');
        const btn = document.getElementById('btn-toggle-manage');
        if (isManageMode) { exitManageMode(); } 
        else { isManageMode = true; page.classList.add('manage-mode'); btn.innerText = '完成整理'; btn.style.background = '#d4a0a0'; btn.style.color = '#fff'; btn.style.borderColor = '#d4a0a0'; }
    }
    
    function exitManageMode() {
        isManageMode = false; selectedSongIds.clear();
        document.getElementById('detail-page').classList.remove('manage-mode');
        const btn = document.getElementById('btn-toggle-manage');
        btn.innerText = '整理卷宗'; btn.style = '';
        renderDetailSongs();
    }
    
    async function deleteSelectedSongs() {
        if (selectedSongIds.size === 0) { showToast('请先选择要抹去的曲目'); return; }
        const pl = appData.playlists.find(p => p.id === currentViewPlaylistId);
        
        // 【核心】从 3号柜 彻底销毁 MP3 实体
        for (let songId of selectedSongIds) {
            await FileDB.remove(songId);
        }

        // 从 1号柜 移除记录
        pl.songs = pl.songs.filter(song => !selectedSongIds.has(song.id));
        saveData(); 
        showToast(`已抹去 ${selectedSongIds.size} 首曲目及源文件`); 
        exitManageMode();
    }

        // ==========================================
    // 转移歌单核心逻辑
    // ==========================================
    function openTransferModal() {
        if (selectedSongIds.size === 0) {
            showToast('请先选择要转移的曲目');
            return;
        }
        
        const container = document.getElementById('transfer-pl-list');
        container.innerHTML = '';
        let hasOtherPlaylists = false;
        
        // 遍历除了当前歌单以外的所有歌单
        appData.playlists.forEach(pl => {
            if (pl.id !== currentViewPlaylistId) {
                hasOtherPlaylists = true;
                const item = document.createElement('div');
                item.className = 'd-pl-item'; // 复用筷子抽屉里的样式
                item.innerHTML = `
                    <div class="d-pl-cover">${pl.coverHTML}</div>
                    <div style="flex:1;">
                        <div class="d-pl-name">${pl.name}</div>
                        <div class="d-pl-count">${pl.songs.length} 首</div>
                    </div>
                `;
                item.onclick = () => confirmTransfer(pl.id);
                container.appendChild(item);
            }
        });
        
        if (!hasOtherPlaylists) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#a08a82; font-size:12px;">暂无其他卷宗可供转移</div>';
        }
        document.getElementById('modal-transfer').classList.add('active');
    }

    function confirmTransfer(targetPlId) {

        const sourcePl = appData.playlists.find(p => p.id === currentViewPlaylistId);
        const targetPl = appData.playlists.find(p => p.id === targetPlId);
        if (!sourcePl || !targetPl) return;

        // 1. 提取选中的歌曲对象
        const songsToMove = sourcePl.songs.filter(s => selectedSongIds.has(s.id));
        
        // 2. 将歌曲加入目标歌单（可以加个去重判断，防止重复添加）
        songsToMove.forEach(song => {
            if (!targetPl.songs.some(s => s.id === song.id)) {
                targetPl.songs.push(song);
            }
        });

        // 3. 从原歌单删除
        sourcePl.songs = sourcePl.songs.filter(s => !selectedSongIds.has(s.id));

        saveData();
        closeModal('modal-transfer');
        exitManageMode(); // 退出整理模式并刷新列表
        checkBadgeProgress('f5'); // 触发"栀子·栀子不渝"
        showToast(`成功转移 ${songsToMove.length} 首曲目`);
        renderMainPlaylists(); // 刷新藏阁页面的歌单数量
    }


    // ==========================================
    // 5. 封面网格与歌单编辑
    // ==========================================
    function renderCoverGrid() {
        const grid = document.getElementById('cover-grid');
        grid.innerHTML = '';
        const customSlot = document.createElement('div');
        customSlot.className = `cover-grid-item ${tempSelectedCoverIndex === 0 ? 'active' : ''}`;
        if (tempCustomImage) {
            customSlot.innerHTML = `<img src="${tempCustomImage}" style="width:100%;height:100%;object-fit:cover;"><div class="remove-custom" onclick="event.stopPropagation(); removeCustomImage()">✕</div>`;
            customSlot.onclick = () => selectCover(0);
        } else {
            customSlot.innerHTML = `<div style="font-size:24px;color:#a08a82;font-weight:300;">+</div>`;
            customSlot.onclick = () => document.getElementById('playlist-cover-upload').click();
        }
        grid.appendChild(customSlot);
        presetCovers.forEach((html, idx) => {
            const item = document.createElement('div');
            item.className = `cover-grid-item ${tempSelectedCoverIndex === idx + 1 ? 'active' : ''}`;
            item.innerHTML = html;
            item.onclick = () => selectCover(idx + 1);
            grid.appendChild(item);
        });
    }
    
    function selectCover(index) { tempSelectedCoverIndex = index; renderCoverGrid(); }
    function removeCustomImage() { tempCustomImage = null; if (tempSelectedCoverIndex === 0) tempSelectedCoverIndex = 1; renderCoverGrid(); }

    document.getElementById('playlist-cover-upload').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) { const reader = new FileReader(); reader.onload = function(e) { tempCustomImage = e.target.result; tempSelectedCoverIndex = 0; renderCoverGrid(); }; reader.readAsDataURL(file); }
        event.target.value = '';
    });

    function openCreateModal() {
        isEditingPlaylistId = null;
        document.getElementById('modal-edit-title').innerText = '创立新卷';
        document.getElementById('edit-input-name').value = '';
        document.getElementById('edit-input-desc').value = '';
        document.getElementById('btn-delete-playlist-wrap').style.display = 'none';
        tempCustomImage = null; tempSelectedCoverIndex = 1;
        renderCoverGrid(); document.getElementById('modal-edit').classList.add('active');
    }

    function openEditModal() {
        isEditingPlaylistId = currentViewPlaylistId;
        const pl = appData.playlists.find(p => p.id === currentViewPlaylistId);
        document.getElementById('modal-edit-title').innerText = '修缮卷宗';
        document.getElementById('edit-input-name').value = pl.name;
        document.getElementById('edit-input-desc').value = pl.desc;
        document.getElementById('btn-delete-playlist-wrap').style.display = 'flex';
        if (pl.coverHTML.includes('<img')) {
            const match = pl.coverHTML.match(/src="([^"]+)"/);
            tempCustomImage = match ? match[1] : null; tempSelectedCoverIndex = 0;
        } else {
            tempCustomImage = null; const idx = presetCovers.indexOf(pl.coverHTML);
            tempSelectedCoverIndex = idx !== -1 ? idx + 1 : 1;
        }
        renderCoverGrid(); document.getElementById('modal-edit').classList.add('active');
    }

    function savePlaylistEdit() {
        const name = document.getElementById('edit-input-name').value.trim();
        const desc = document.getElementById('edit-input-desc').value.trim();
        if (!name) { showToast('名号不可为空'); return; }
        let finalCoverHTML = '';
        if (tempSelectedCoverIndex === 0 && tempCustomImage) { finalCoverHTML = `<img src="${tempCustomImage}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`; } 
        else { finalCoverHTML = presetCovers[tempSelectedCoverIndex - 1]; }

        if (isEditingPlaylistId) {
            const pl = appData.playlists.find(p => p.id === isEditingPlaylistId);
            pl.name = name; pl.desc = desc; pl.coverHTML = finalCoverHTML;
            document.getElementById('detail-name').innerText = pl.name;
            document.getElementById('detail-desc').innerText = pl.desc;
            document.getElementById('detail-cover').innerHTML = pl.coverHTML;
            showToast('卷宗已修缮');
        } else {
            const newId = 'p' + Date.now();
            appData.playlists.push({ id: newId, name: name, desc: desc, coverHTML: finalCoverHTML, songs: [] });
            showToast('新卷已创立');
        }
        saveData(); checkBadgeProgress(); renderMainPlaylists(); closeModal('modal-edit');
    }

    async function deleteCurrentPlaylist() {
        const pl = appData.playlists.find(p => p.id === isEditingPlaylistId);
        // 【核心】删除歌单时，销毁所有歌曲的 3号柜 实体文件
        for (let song of pl.songs) {
            await FileDB.remove(song.id);
        }
        appData.playlists = appData.playlists.filter(p => p.id !== isEditingPlaylistId);
        saveData(); closeModal('modal-edit'); closeDetail(); showToast('卷宗及曲目已付之一炬');
    }

    // ==========================================
    // 6. 真实文件导入与配对逻辑
    // ==========================================
    function openImportModal() { document.getElementById('modal-import').classList.add('active'); }
    function closeModal(id) { document.getElementById(id).classList.remove('active'); }
    
    function triggerRealImport(type) {
        closeModal('modal-import');
        // 废除文件夹导入，全部改为多选文件配对
        if (type === 'audio') document.getElementById('real-import-audio').click();
        if (type === 'lyric') document.getElementById('real-import-lyric').click();
    }

    document.getElementById('real-import-audio').addEventListener('change', e => processImportedFiles(e.target.files));
    document.getElementById('real-import-lyric').addEventListener('change', e => processImportedFiles(e.target.files));

    async function processImportedFiles(files) {
        if (!files || files.length === 0) return;

        
        const audioFiles = [];
        const lrcFiles = {};

        // 1. 分类文件
        for (let file of files) {
            const ext = file.name.split('.').pop().toLowerCase();
            const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
            
            if (['mp3', 'flac', 'wav', 'aac', 'm4a'].includes(ext)) {
                audioFiles.push({ file, name: nameWithoutExt });
            } else if (ext === 'lrc') {
                lrcFiles[nameWithoutExt] = file;
            }
        }

        if (audioFiles.length === 0) { showToast('未发现音频文件'); return; }
        showToast(`正在解析 ${audioFiles.length} 首曲目...`);
        
        const pl = appData.playlists.find(p => p.id === currentViewPlaylistId);
        let addedCount = 0;
        if (files.length > 10) checkBadgeProgress('p7');



        // 2. 匹配与装载进 3号柜
        for (let item of audioFiles) {
            const newId = 'song_' + Date.now() + '_' + Math.floor(Math.random()*1000);
            let hasLyric = false;
            let lrcText = '';

            if (lrcFiles[item.name]) {
                hasLyric = true;
                lrcText = await lrcFiles[item.name].text();
            }

            // 【核心】：将 MP3 实体存入 3号柜 (IndexedDB)
            await FileDB.save(newId, item.file);

            let artist = '未知';
            let title = item.name;
            if (item.name.includes('-')) {
                const parts = item.name.split('-');
                // 歌名在前，作者在后：歌名 - 作者
                title = parts.slice(0, parts.length - 1).join('-').trim();
                artist = parts[parts.length - 1].trim();
            }

            pl.songs.push({
                id: newId,
                name: title,
                artist: artist,
                hasLyric: hasLyric,
                lrcText: lrcText // 歌词存入 1号柜
            });
            addedCount++;
        }

        // 3. 收尾更新
        saveData();
        renderDetailSongs();
        renderMainPlaylists();
        showToast(`成功揽入 ${addedCount} 首曲目`);
        checkBadgeProgress();
    }

    // ==========================================
    // 7. 真实播放引擎接入 & 歌词解析
    // ==========================================


    async function playSongFromPlaylist(playlistId, songId) {
        const pl = appData.playlists.find(p => p.id === playlistId);
        const song = pl.songs.find(s => s.id === songId);
        
        document.getElementById('play-song-title').innerText = song.name;
        currentPlayingSongId = songId;
        currentPlayingPlId = playlistId;

        document.getElementById('play-song-title').ondblclick = () => openSongEdit(playlistId, songId, 'player');

        showToast(`正在提取: ${song.name}...`);
        
        try {
            // 1. 提取并装载音频
            const audioFile = await FileDB.get(song.id);
            if (!audioFile) {
                showToast('文件已丢失，请尝试重新导入');
                return;
            }
            const audioUrl = URL.createObjectURL(audioFile);
            const audioEl = document.getElementById('global-audio-player');
            audioEl.src = audioUrl;
            audioEl.load();

            // 2. 解析并渲染歌词
            parseAndRenderLyrics(song.lrcText);

            // 3. 播放控制
            audioEl.oncanplay = async () => {
                try {
                    await audioEl.play();
                    isPlaying = true;
                    setPlayingState(true);

                    document.getElementById('btn-play').innerHTML = '<span style="font-size:12px; font-weight:bold;">||</span>';
                    switchPage('play', document.querySelector('.desk-tab:nth-child(1)'));
                } catch (playErr) {
                    console.error("浏览器拦截:", playErr);
                    isPlaying = false;
                    document.getElementById('btn-play').innerHTML = '▶';
                    showToast('浏览器拦截了自动播放，请点击花糕播放');
                    switchPage('play', document.querySelector('.desk-tab:nth-child(1)'));
                }
            };
            audioEl.onerror = () => showToast('浏览器不支持该音频格式');

        } catch (error) {
            console.error("提取出错:", error);
            showToast('提取失败: ' + error.message);
        }
    }

           // ==========================================
    // 8. 终极播放引擎 (进度条 + 歌词高亮与滚动 + 中英双语)
    // ==========================================
       let currentLyrics = [];
    let currentLang = 'cn';
    let colMap = [];
    let colMapEN = [];
    let currentHighlightCN = -1;
    let currentHighlightEN = -1;

    function cleanLyricText(t) {
        let s = t.replace(/[（(）)]/g, '').replace(/\//g, '·').replace(/~/g, '～').replace(/\.\.\./g, '…').replace(/\s+/g, '');
        return s.replace(/[A-Za-z]/g, c => {
            const d = c.charCodeAt(0);
            return d >= 65 && d <= 90 ? String.fromCharCode(d + 65248) : d >= 97 && d <= 122 ? String.fromCharCode(d + 65248) : c;
        });
    }
    function cleanLyricTextEN(t) { return t.replace(/[（(]/g, '').replace(/[）)]/g, '').trim(); }
    function isMetadata(t) { return ['作词','作曲','编曲','制作','录音','混音','母带','监制','出品','发行','词：','曲：','编：','词:','曲:','编:','原唱','翻唱','和声','吉他','贝斯','鼓','弦乐','后期','企划','统筹'].some(k => t.includes(k)); }
    function detectLanguage(lyrics) {
        let cnCount = 0, totalChars = 0;
        lyrics.forEach(line => {
            const text = line.text || line;
            for (let i = 0; i < text.length; i++) {
                const code = text.charCodeAt(i);
                if (code > 127) cnCount++;
                if (code > 32) totalChars++;
            }
        });
        return totalChars > 0 && (cnCount / totalChars) > 0.5 ? 'cn' : 'en';
    }
    function splitEnCn(text) {
        for (let i = 0; i < text.length; i++) {
            const code = text.charCodeAt(i);
            if (code >= 0x4E00 && code <= 0x9FFF) return { en: text.substring(0, i).trim(), cn: text.substring(i).trim() };
        }
        return { en: text.trim(), cn: '' };
    }

    function parseAndRenderLyrics(lrcText) {
        currentLyrics = []; colMap = []; colMapEN = [];
        currentHighlightCN = -1; currentHighlightEN = -1;
        const cnWrapper = document.getElementById('lyrics-cn');
        const enWrapper = document.getElementById('lyrics-en');
        const cnScroll = document.getElementById('cn-scroll-area');

        if (!lrcText) {
            cnWrapper.style.display = 'block'; enWrapper.style.display = 'none';
            cnScroll.innerHTML = '<div class="lyric-col active">暂无音律题词</div>';
            return;
        }

        const lines = lrcText.split('\n');
        lines.forEach(line => {
            const m = line.match(/\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))?\](.*)/);
            if (m) {
                const time = parseInt(m[1]) * 60 + parseInt(m[2]) + (m[3] ? parseFloat('0.' + m[3]) : 0);
                const text = m[4].trim();
                if (text && !isMetadata(text)) currentLyrics.push({ time, text });
            }
        });
        currentLyrics.sort((a, b) => a.time - b.time);

        if (currentLyrics.length === 0) {
            cnWrapper.style.display = 'block'; enWrapper.style.display = 'none';
            cnScroll.innerHTML = '<div class="lyric-col active">未能解析题词</div>';
            return;
        }

        currentLang = detectLanguage(currentLyrics);
        if (currentLang === 'cn') {
            cnWrapper.style.display = 'block'; enWrapper.style.display = 'none';
            renderLyricsCN(currentLyrics);
        } else {
            cnWrapper.style.display = 'none'; enWrapper.style.display = 'flex';
            renderLyricsEN(currentLyrics);
        }
    }

    function renderLyricsCN(lyrics) {
        const c = document.getElementById('cn-scroll-area'); c.innerHTML = '';
        const cleaned = lyrics.map(line => ({ time: line.time, text: cleanLyricText(line.text) }));
        let maxLen = 0; cleaned.forEach(line => { if (line.text.length > maxLen) maxLen = line.text.length; });
        
        let fontSize = 13, letterSpacing = 3, lineH = 30;
        if (maxLen <= 8) { fontSize = 14; letterSpacing = 4; lineH = 30; } 
        else if (maxLen <= 12) { fontSize = 13; letterSpacing = 3; lineH = 28; } 
        else if (maxLen <= 16) { fontSize = 12; letterSpacing = 2; lineH = 26; } 
        else if (maxLen <= 22) { fontSize = 11; letterSpacing = 1; lineH = 24; } 
        else { fontSize = 10; letterSpacing = 0; lineH = 22; }

        c.style.setProperty('--lyric-size', fontSize + 'px');
        c.style.setProperty('--lyric-gap', letterSpacing + 'px');
        c.style.setProperty('--lyric-line', lineH + 'px');

        cleaned.forEach((line, i) => {
            const col = document.createElement('div'); col.className = 'lyric-col'; col.textContent = line.text;
            c.appendChild(col); colMap.push({ lineIndex: i, el: col });
        });
        setTimeout(() => { c.scrollLeft = c.scrollWidth; }, 10);
    }

    function renderLyricsEN(lyrics) {
        checkBadgeProgress('f10');
        const mirrorEl = document.getElementById('en-lyrics-top');
        const reflectEl = document.getElementById('en-lyrics-bottom');
        mirrorEl.innerHTML = ''; reflectEl.innerHTML = '';
        lyrics.forEach((line, i) => {
            const cleaned = cleanLyricTextEN(line.text); if (!cleaned) return;
            const { en, cn } = splitEnCn(cleaned); if (!en) return;
            const row = document.createElement('div'); row.className = 'mirror-line'; row.textContent = en; mirrorEl.appendChild(row);
            let trans = null;
            if (cn) { trans = document.createElement('div'); trans.className = 'mirror-translate'; trans.textContent = cn; mirrorEl.appendChild(trans); }
            const ref = document.createElement('div'); ref.className = 'reflect-line'; ref.textContent = en; reflectEl.appendChild(ref);
            colMapEN.push({ lineIndex: i, el: row, transEl: trans, refEl: ref });
        });
    }


       // --- 监听音频时间，驱动进度条与歌词 ---
    const audioEl = document.getElementById('global-audio-player');
    const fillEl = document.getElementById('progress-fill');
    const dotEl = document.getElementById('progress-dot');
    const timeLabels = document.querySelectorAll('.time-label');

    function formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return "00:00";
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    function highlightLineCN(idx) {
        if (idx === currentHighlightCN) return; currentHighlightCN = idx;
        colMap.forEach(c => c.el.classList.remove('active'));
        if (idx === -1) return;
        const t = colMap.find(c => c.lineIndex === idx);
        if (t) {
            t.el.classList.add('active');
            const container = document.getElementById('cn-scroll-area');
            const cr = container.getBoundingClientRect(), tr = t.el.getBoundingClientRect();
            container.scrollLeft += tr.right - cr.right + container.clientWidth * 0.4;
        }
    }

    function highlightLineEN(idx) {
        if (idx === currentHighlightEN) return; currentHighlightEN = idx;
        colMapEN.forEach(c => {
            c.el.classList.remove('active'); c.refEl.classList.remove('active');
            if(c.transEl) c.transEl.classList.remove('show');
        });
        if (idx === -1) return;
        const t = colMapEN.find(c => c.lineIndex === idx);
        if (t) {
            t.el.classList.add('active'); t.refEl.classList.add('active');
            if (t.transEl && t.transEl.textContent) t.transEl.classList.add('show');
            const container = document.getElementById('en-lyrics-top');
            const targetTop = t.el.offsetTop - container.clientHeight / 2 + t.el.clientHeight / 2;
            container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
            const refContainer = document.getElementById('en-lyrics-bottom');
            const refTop = t.refEl.offsetTop - refContainer.clientHeight / 2 + t.refEl.clientHeight / 2;
            refContainer.scrollTo({ top: Math.max(0, refTop), behavior: 'smooth' });
        }
    }

    audioEl.addEventListener('timeupdate', () => {
        const currentTime = audioEl.currentTime;
        const duration = audioEl.duration;
        
        if (duration > 0 && isFinite(duration)) {
            const percent = (currentTime / duration) * 100;
            fillEl.style.width = percent + '%';
            dotEl.style.left = percent + '%';
            timeLabels[0].innerText = formatTime(currentTime);
            timeLabels[1].innerText = formatTime(duration);
        }

        if (currentLyrics.length === 0) return;
        let activeIndex = -1;
        for (let i = currentLyrics.length - 1; i >= 0; i--) {
            if (currentTime >= currentLyrics[i].time) { activeIndex = i; break; }
        }
        
        if (currentLang === 'cn') highlightLineCN(activeIndex);
        else highlightLineEN(activeIndex);
    });
        audioEl.addEventListener('ended', () => {
        // 【核心修复】：歌曲播完，立刻检查“藕粉桂花”徽章
        if (currentLyrics.length > 0) { // 确保是有歌词的歌曲
             checkBadgeProgress('p6');
        }
        if (!currentPlayingPlId || !currentPlayingSongId) return;
        const pl = appData.playlists.find(p => p.id === currentPlayingPlId);
        if (!pl || pl.songs.length === 0) return;
        const idx = pl.songs.findIndex(s => s.id === currentPlayingSongId);

        if (PLAY_MODES[currentModeIndex] === '单曲循环') {
            // 单曲循环：直接重播
            audioEl.currentTime = 0;
            audioEl.play();
        } else if (PLAY_MODES[currentModeIndex] === '随机播放') {
            // 随机播放
            let nextIdx;
            do { nextIdx = Math.floor(Math.random() * pl.songs.length); } while (pl.songs.length > 1 && nextIdx === idx);
            playSongFromPlaylist(pl.id, pl.songs[nextIdx].id);
        } else {
            // 顺序播放：到最后一首就停
            if (idx < pl.songs.length - 1) {
                playSongFromPlaylist(pl.id, pl.songs[idx + 1].id);
            } else {
                // 最后一首播完，复位状态
                isPlaying = false;
                setPlayingState(false);
                document.getElementById('btn-play').innerHTML = '▶';
                showToast('本卷已奏完');
            }
        }
    });


    audioEl.addEventListener('loadedmetadata', () => {
        if (audioEl.duration && isFinite(audioEl.duration)) {
            timeLabels[1].innerText = formatTime(audioEl.duration);
        }
    });

    // 修复点击进度条拨动琴弦
    document.getElementById('progress-track').onclick = function(e) {
        if (!audioEl.src || isNaN(audioEl.duration) || !isFinite(audioEl.duration)) return;
        const rect = this.getBoundingClientRect();
        let percent = (e.clientX - rect.left) / rect.width;
        if (percent < 0) percent = 0;
        if (percent > 1) percent = 1;
        audioEl.currentTime = audioEl.duration * percent;
    };

    // ==========================================
    // 基础交互与初始化
    // ==========================================
    let toastTimeout;
    function showToast(msg) { const toast = document.getElementById('toast-msg'); toast.innerText = msg; toast.classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 1500); }
    function switchPage(pageId, navElement) { document.querySelectorAll('.page').forEach(page => page.classList.remove('active')); document.getElementById('page-' + pageId).classList.add('active'); document.querySelectorAll('.desk-tab').forEach(item => item.classList.remove('active')); navElement.classList.add('active'); }
    function changeTheme(season, phoneBgColor, windowBgColor, el) {
        if (season !== 'spring') checkBadgeProgress('f7');
        document.querySelectorAll('.dot-wrap').forEach(d => d.classList.remove('active'));
        el.classList.add('active');
        document.getElementById('app-phone').style.background = phoneBgColor;
        document.getElementById('window-bg').style.background = windowBgColor;
        document.getElementById('nav-desk').style.background = `linear-gradient(to top, ${phoneBgColor} 60%, transparent)`;
        document.querySelectorAll('.scenery-layer').forEach(l => l.style.opacity = '0');
        document.getElementById('scn-' + season).style.opacity = '1';
    }

    // ================== 播放计时逻辑 ==================
    let playTimerInterval = null;

    function startPlayTimer() {
        if (playTimerInterval) return;
        playTimerInterval = setInterval(() => {
            // 今日听风（分钟）
            const todayKey = 'jinyu_today_' + new Date().toDateString();
            const todayMin = parseInt(localStorage.getItem(todayKey) || '0') + 1;
            localStorage.setItem(todayKey, todayMin);
            document.getElementById('stat-today-min').innerText = todayMin;

            // 留声岁月（小时，精确到一位小数）
            const totalMin = parseInt(localStorage.getItem('jinyu_total_min') || '0') + 1;
            localStorage.setItem('jinyu_total_min', totalMin);
            const totalHours = (totalMin / 60).toFixed(1);
            document.getElementById('stat-total-hours').innerText = totalHours;
            checkBadgeProgress();
        }, 60000); // 每分钟计一次
    }

    function stopPlayTimer() {
        if (playTimerInterval) {
            clearInterval(playTimerInterval);
            playTimerInterval = null;
        }
    }

    function loadStats() {
        // 今日听风
        const todayKey = 'jinyu_today_' + new Date().toDateString();
        const todayMin = localStorage.getItem(todayKey) || '0';
        document.getElementById('stat-today-min').innerText = todayMin;

        // 留声岁月
        const totalMin = parseInt(localStorage.getItem('jinyu_total_min') || '0');
        document.getElementById('stat-total-hours').innerText = (totalMin / 60).toFixed(1);
    }

    document.getElementById('avatar-upload').addEventListener('change', function(event) { const file = event.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = function(e) { const imgBase64 = e.target.result; updateAvatars(imgBase64); localStorage.setItem('jinyu_avatar', imgBase64); }; reader.readAsDataURL(file); } event.target.value = ''; });
    function updateAvatars(imgSrc) { document.getElementById('user-avatar-img').src = imgSrc; const playerAvatarImg = document.getElementById('player-avatar-img'); playerAvatarImg.src = imgSrc; playerAvatarImg.style.display = 'block'; document.getElementById('player-avatar-text').style.display = 'none'; }
    function editProfileText(elementId, inputClass, defaultText, storageKey) { const textElement = document.getElementById(elementId); if (textElement.querySelector('input')) return; const currentText = textElement.innerText; const input = document.createElement('input'); input.type = 'text'; input.className = `edit-input ${inputClass}`; input.value = (currentText === defaultText) ? '' : currentText; input.placeholder = defaultText; textElement.innerHTML = ''; textElement.appendChild(input); input.focus(); const saveText = () => { const newVal = input.value.trim(); textElement.innerHTML = newVal || defaultText; if (newVal) localStorage.setItem(storageKey, newVal); else localStorage.removeItem(storageKey); }; input.addEventListener('keypress', e => { if (e.key === 'Enter') saveText(); }); input.addEventListener('blur', saveText); }

    let isPlaying = false;
    function setPlayingState(playing) {
        const stage = document.querySelector('.player-stage');
        const yuqin = document.getElementById('yuqin-box');
        if (playing) {
            stage.classList.add('playing');
            yuqin.classList.add('playing');
            startPlayTimer();
        } else {
            stage.classList.remove('playing');
            yuqin.classList.remove('playing');
            stopPlayTimer();
        }
    }


    function togglePlay() { 
        const audioEl = document.getElementById('global-audio-player');
        if (!audioEl.src) {
            showToast('请先在藏阁选择一首曲目');
            return;
        }
        if (audioEl.paused) {
            audioEl.play();
            isPlaying = true;
            setPlayingState(true);

            document.getElementById('btn-play').innerHTML = '<span style="font-size:12px; font-weight:bold;">||</span>';
        } else {
            audioEl.pause();
            isPlaying = false;
            setPlayingState(false);

            document.getElementById('btn-play').innerHTML = '▶';
        }
    }

    function prevSong() {
        if (!currentPlayingPlId || !currentPlayingSongId) { showToast('请先选择曲目'); return; }
        const pl = appData.playlists.find(p => p.id === currentPlayingPlId);
        if (!pl || pl.songs.length === 0) return;
        const idx = pl.songs.findIndex(s => s.id === currentPlayingSongId);
        const prevIdx = (idx - 1 + pl.songs.length) % pl.songs.length;
        playSongFromPlaylist(pl.id, pl.songs[prevIdx].id);
    }

    function nextSong() {
        if (!currentPlayingPlId || !currentPlayingSongId) { showToast('请先选择曲目'); return; }
        const pl = appData.playlists.find(p => p.id === currentPlayingPlId);
        if (!pl || pl.songs.length === 0) return;
        const idx = pl.songs.findIndex(s => s.id === currentPlayingSongId);
        let nextIdx;
        if (PLAY_MODES[currentModeIndex] === '随机播放') {
            do { nextIdx = Math.floor(Math.random() * pl.songs.length); } while (pl.songs.length > 1 && nextIdx === idx);
        } else {
            nextIdx = (idx + 1) % pl.songs.length;
        }
        playSongFromPlaylist(pl.id, pl.songs[nextIdx].id);
    }
    function togglePlayMode() {
        currentModeIndex = (currentModeIndex + 1) % PLAY_MODES.length;
        showToast(PLAY_MODES[currentModeIndex]);
    }
       function seekProgress(event) {
        if (!audioEl.src || isNaN(audioEl.duration) || !isFinite(audioEl.duration)) return;
        const track = document.getElementById('progress-track');
        const rect = track.getBoundingClientRect();
        let percent = (event.clientX - rect.left) / rect.width;
        if (percent < 0) percent = 0;
        if (percent > 1) percent = 1;
        
        audioEl.currentTime = audioEl.duration * percent;
        // 视觉会由 timeupdate 事件自动接管更新
    }

    // ==========================================
    // 筷子抽屉弹窗逻辑
    // ==========================================
    function openDrawer() {
        renderDrawerPlaylists();
        document.getElementById('drawer-overlay').classList.add('active');
    }
    function closeDrawer() {
        document.getElementById('drawer-overlay').classList.remove('active');
        closeDrawerSongPanel();
    }
    function handleDrawerOverlay(e) {
        if (e.target === document.getElementById('drawer-overlay')) closeDrawer();
    }

    function switchDrawerTab(viewId, el) {
        document.querySelectorAll('.d-tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        document.querySelectorAll('.d-view').forEach(v => v.classList.remove('active'));
        document.getElementById('d-view-' + viewId).classList.add('active');
    }

    // 渲染歌单列表（直接读 appData.playlists，与藏阁完全同步）
    function renderDrawerPlaylists() {
        const container = document.getElementById('d-pl-scroll');
        container.innerHTML = '';
        appData.playlists.forEach((pl, idx) => {
            const item = document.createElement('div');
            item.className = 'd-pl-item';
            item.innerHTML = `
                <div class="d-pl-cover">${pl.coverHTML}</div>
                <div style="flex:1;">
                    <div class="d-pl-name">${pl.name}</div>
                    <div class="d-pl-count">${pl.songs.length} 首</div>
                </div>
                <div class="d-pl-arrow">›</div>
            `;
            item.onclick = () => openDrawerSongPanel(pl.id);
            container.appendChild(item);
        });
    }

    // 进入歌曲列表（淡入，无位移）
    function openDrawerSongPanel(plId) {
        const pl = appData.playlists.find(p => p.id === plId);
        if (!pl) return;
        document.getElementById('d-song-panel-title').textContent = pl.name;
        renderDrawerSongs(pl);
        document.getElementById('d-song-panel').classList.add('active');
    }

    function closeDrawerSongPanel() {
        document.getElementById('d-song-panel').classList.remove('active');
    }

    // 渲染歌曲列表，高亮当前播放
    function renderDrawerSongs(pl) {
        const container = document.getElementById('d-song-scroll');
        container.innerHTML = '';
        if (pl.songs.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px 0;font-size:12px;color:#a08a82;">此卷宗空空如也</div>';
            return;
        }
        pl.songs.forEach((song, i) => {
            const isPlaying = (audioEl.src && song.id === currentPlayingSongId);
            const item = document.createElement('div');
            item.className = 'd-song-item' + (isPlaying ? ' playing' : '');
            item.innerHTML = `
                <div class="d-s-num">${isPlaying ? '' : i + 1}</div>
                <div class="d-s-info">
                    <div class="d-s-name">${song.name}</div>
                    <div class="d-s-artist">${song.artist}</div>
                </div>
            `;
            item.ondblclick = (e) => { e.stopPropagation(); openSongEdit(pl.id, song.id, 'drawer'); };
            item.onclick = () => {
                playSongFromPlaylist(pl.id, song.id);
                currentPlayingSongId = song.id;
                renderDrawerSongs(pl);
            };
            container.appendChild(item);
        });
    }

    // 全局搜索（跨所有歌单）
    function handleDrawerSearch(keyword) {
        const results = document.getElementById('d-search-results');
        results.innerHTML = '';
        const k = keyword.trim();
        if (!k) return;

        let found = false;
        appData.playlists.forEach(pl => {
            pl.songs.forEach((song, i) => {
                if (song.name.includes(k) || song.artist.includes(k)) {
                    found = true;
                    const isPlaying = (audioEl.src && song.id === currentPlayingSongId);
                    const item = document.createElement('div');
                    item.className = 'd-song-item' + (isPlaying ? ' playing' : '');
                    item.innerHTML = `
                        <div class="d-s-num">${isPlaying ? '' : '·'}</div>
                        <div class="d-s-info">
                            <div class="d-s-name">${song.name}</div>
                            <div class="d-s-artist">${song.artist}</div>
                            <div class="search-from">来自：${pl.name}</div>
                        </div>
                    `;
                    item.onclick = () => {
                        playSongFromPlaylist(pl.id, song.id);
                        currentPlayingSongId = song.id;
                        results.querySelectorAll('.d-song-item').forEach(el => el.classList.remove('playing'));
                        item.classList.add('playing');
                    };
                    results.appendChild(item);
                }
            });
        });

        if (!found) {
            results.innerHTML = '<div style="text-align:center;padding:30px 0;font-size:12px;color:rgba(160,138,130,0.4);">未觅得此曲</div>';
        }
    }

    // 记录当前播放的歌曲 ID（用于抽屉高亮同步）
    let currentPlayingSongId = null;
    let currentPlayingPlId = null;  // 记住当前播放的歌单
    const PLAY_MODES = ['顺序播放', '单曲循环', '随机播放'];
    let currentModeIndex = 0;


    // ==========================================
    // 歌曲信息编辑（全局同步）
    // ==========================================

    // 当前正在编辑的歌曲信息
    let editingSong = null;
    let editingPlaylistId = null;

    // 打开编辑框
    // source: 'player'(听风页) | 'detail'(歌单详情) | 'drawer'(筷子抽屉)
    function openSongEdit(plId, songId, source) {
        const pl = appData.playlists.find(p => p.id === plId);
        if (!pl) return;
        const song = pl.songs.find(s => s.id === songId);
        if (!song) return;

        editingSong = song;
        editingPlaylistId = plId;

        // 如果已有编辑框先移除
        const old = document.getElementById('song-inline-edit');
        if (old) old.remove();

        const box = document.createElement('div');
        box.className = 'inline-edit-box';
        box.id = 'song-inline-edit';
        box.innerHTML = `
            <div class="inline-edit-title">修改曲目信息</div>
            <input class="inline-edit-input" id="edit-song-name" type="text" placeholder="曲名" value="${song.name}">
            <input class="inline-edit-input" id="edit-song-artist" type="text" placeholder="名号（作者）" value="${song.artist}">
            
            <!-- 新增：单曲歌词导入入口 -->
            <div class="inline-edit-btn" style="margin-top:5px; border-style:dashed; color:#a08a82;" onclick="document.getElementById('single-lrc-upload').click()">导入词卷 (.lrc)</div>
            
            <div class="inline-edit-btns">
                <div class="inline-edit-btn" onclick="closeSongEdit()">取消</div>
                <div class="inline-edit-btn fill" onclick="saveSongEdit('${source}', '${plId}')">落笔</div>
            </div>
        `;


        // 挂载到 phone 上，居中显示
        document.getElementById('app-phone').appendChild(box);

        // 自动聚焦歌名
        setTimeout(() => document.getElementById('edit-song-name').focus(), 50);
    }

    function closeSongEdit() {
        const box = document.getElementById('song-inline-edit');
        if (box) box.remove();
        editingSong = null;
        editingPlaylistId = null;
    }

    function saveSongEdit(source, plId) {
        checkBadgeProgress('f8'); // 👈 加上这句，触发“木芙蓉”
        const newName = document.getElementById('edit-song-name').value.trim();
        const newArtist = document.getElementById('edit-song-artist').value.trim();
        if (!newName) { showToast('曲名不可为空'); return; }

        // 写回 appData，全局同步
        editingSong.name = newName;
        editingSong.artist = newArtist || '未知';
        saveData();

        // 同步更新各处 UI
        // 1. 听风页歌名
        if (currentPlayingSongId === editingSong.id) {
            document.getElementById('play-song-title').innerText = newName;
        }

        // 2. 歌单详情页
        if (currentViewPlaylistId) renderDetailSongs();

        // 3. 筷子抽屉（如果当前歌曲面板是这个歌单就刷新）
        const panelTitle = document.getElementById('d-song-panel-title').textContent;
        const pl = appData.playlists.find(p => p.id === plId);
        if (pl && panelTitle === pl.name) {
            renderDrawerSongs(pl);
        }

        showToast('曲目已更新');
        closeSongEdit();
    }


    // ==========================================
    // 锦囊系统数据与渲染逻辑
    // ==========================================
       const badgeSeries = [
        {
            seriesId: 'flower', seriesName: '十二花神', type: 'rouge', 
            badges: [
                { id: 'f1', name: '春兰·知音难觅',cond: '同一歌单内含2种以上语言的歌词', quote: '幽兰露，如啼眼。无物结同心，烟花不堪剪', source: '李贺·《苏小小墓》', max: 1, themeColor: '#d8e8e4', boxColor: { base: '#d8e8e4', lid: '#E8F0EE' },html: '<div class="chunlan"><div class="p p1"></div><div class="p p2"></div><div class="p p3"></div><div class="p p4"></div><div class="p p5"></div><div class="p p6"></div><div class="core"></div></div>'},
                { id: 'f2', name: '郁李·初听欢喜', cond: '首次成功分享歌单', quote: '春风一夜吹乡梦，又逐春风到洛城', source: '武元衡·《春兴》', max: 1, themeColor: '#F9EBED', boxColor: { base: '#F9EBED', lid: '#FCEEF0' }, html: '<div class="yuli"><div class="p p1"></div><div class="p p2"></div><div class="p p3"></div><div class="p p4"></div><div class="p p5"></div><div class="center"></div></div>' },
                { id: 'f3', name: '杏花·杏林春暖', cond: '首次使用伴聊功能', quote: '沾衣欲湿杏花雨，吹面不寒杨柳风', source: '释志南·《绝句》', max: 1, themeColor: '#FFE4E1', boxColor: { base: '#FFE4E1', lid: '#FFF0F0' }, html: '<div class="badge-xinghua"><div class="xp xp1"></div><div class="xp xp2"></div><div class="xp xp3"></div><div class="xp xp4"></div><div class="xp xp5"></div><div class="xc"></div></div>' },
                { id: 'f4', name: '莲·莲心不染', cond: '创建纯音乐过半且不少于5首的歌单', quote: '出淤泥而不染，濯清涟而不妖', source: '周敦颐·《爱莲说》', max: 1, themeColor: '#FCEEF0', boxColor: { base: '#FCEEF0', lid: '#FDE8EB' }, html: '<div class="badge-lian"><div class="lp lp1"></div><div class="lp lp2"></div><div class="lp lp3"></div><div class="lp lp4"></div><div class="lp lp5"></div><div class="lp lp6"></div><div class="lp lp7"></div><div class="lp lp8"></div><div class="lpod"></div></div>' },
                { id: 'f5', name: '栀子·栀子不渝', cond: '首次使用转移曲目功能', quote: '栀子比众木，人间诚未多', source: '杜甫·《栀子》', max: 1, themeColor: '#DDE7E1', boxColor: { base: '#DDE7E1', lid: '#E8F0EE' }, html: '<div class="zhizi"><div class="p p1"></div><div class="p p2"></div><div class="p p3"></div><div class="p p4"></div><div class="p p5"></div><div class="p p6"></div><div class="center"></div></div>' },
                { id: 'f6', name: '合欢·合欢共赏', cond: '分享歌单3次', quote: '合欢蠲忿，萱草忘忧', source: '嵇康·《养生论》', max: 3, themeColor: '#FFDCE1', boxColor: { base: '#FFE4E8', lid: '#FFDCE1' }, html: '<div class="hehuan"><div class="thread t1"></div><div class="thread t2"></div><div class="thread t3"></div><div class="thread t4"></div><div class="thread t5"></div><div class="thread t6"></div><div class="thread t7"></div><div class="thread t8"></div><div class="thread t9"></div><div class="thread t10"></div><div class="thread t11"></div><div class="base-part"></div></div>' },
                { id: 'f7', name: '玉簪·玉簪听雨', cond: '切换任意夏秋冬主题', quote: '玉簪堕地无人拾，化作秋风入砚池', source: '明·夏完淳·《玉簪》', max: 1, themeColor: '#FDF5E6', boxColor: { base: '#FDF5E6', lid: '#FFF8EE' }, html: '<div class="yuzan"><div class="trumpet"></div><div class="pistil"></div></div>' },
                { id: 'f8', name: '木芙蓉·芙蓉百变', cond: '成功修改一次歌曲信息', quote: '晓妆初了明肌雪，春殿嫔娥鱼贯列', source: '李煜·《木芙蓉》', max: 1, themeColor: '#F9F2F2', boxColor: { base: '#F9F2F2', lid: '#FCF8F8' }, html: '<div class="mufurong"><div class="p p1"></div><div class="p p2"></div><div class="p p3"></div><div class="p p4"></div><div class="p p5"></div><div class="pistil-col"></div><div class="center"></div></div>' },
                { id: 'f9', name: '桂花·桂子满庭', cond: '累计导入歌曲达50首', quote: '桂子月中落，天香云外飘', source: '宋之问·《灵隐寺》', max: 50, themeColor: '#EAD7B1', boxColor: { base: '#EAD7B1', lid: '#F5E6C8' }, html: '<div style="position: relative; width: 60px; height: 60px;"><div class="gui-cluster gc1"><div class="gp"></div><div class="gp"></div><div class="gp"></div><div class="gp"></div></div><div class="gui-cluster gc2"><div class="gp"></div><div class="gp"></div><div class="gp"></div><div class="gp"></div></div><div class="gui-cluster gc3"><div class="gp"></div><div class="gp"></div><div class="gp"></div><div class="gp"></div></div><div class="gui-cluster gc4"><div class="gp"></div><div class="gp"></div><div class="gp"></div><div class="gp"></div></div><div class="gui-cluster gc5"><div class="gp"></div><div class="gp"></div><div class="gp"></div><div class="gp"></div></div><div class="gui-cluster gc6"><div class="gp"></div><div class="gp"></div><div class="gp"></div><div class="gp"></div></div><div class="gui-cluster gc7"><div class="gp"></div><div class="gp"></div><div class="gp"></div><div class="gp"></div></div><div class="gui-cluster gc8"><div class="gp"></div><div class="gp"></div><div class="gp"></div><div class="gp"></div></div></div>'},
                { id: 'f10', name: '水仙·水仙映月', cond: '首次使用英文倒影歌词', quote: '得成比目何辞死，愿作鸳鸯不羡仙', source: '卢照邻·《长安古意》', max: 1, themeColor: '#E8F1F5', boxColor: { base: '#E8F1F5', lid: '#F0F6F9' }, html: '<div class="shuixian"><div class="p p1"></div><div class="p p2"></div><div class="p p3"></div><div class="p p4"></div><div class="p p5"></div><div class="p p6"></div><div class="crown"></div></div>' },
                { id: 'f11', name: '茶梅·茶梅清供', cond: '首次使用字帖结集', quote: '墙角数枝梅，凌寒独自开', source: '王安石·《梅花》', max: 1, themeColor: '#B9CAD4', boxColor: { base: '#B9CAD4', lid: '#D0DDE5' }, html: '<div class="chamei"><div class="p p1"></div><div class="p p2"></div><div class="p p3"></div><div class="p p4"></div><div class="p p5"></div><div class="p p6"></div><div class="stamens"><div class="sd sd1"></div><div class="sd sd2"></div><div class="sd sd3"></div><div class="sd sd4"></div><div class="sd sd5"></div></div></div>' },
                { id: 'f12', name: '瑞香·瑞香满堂', cond: '集齐前十一枚花神徽章', quote: '此曲只应天上有，人间能得几回闻', source: '杜甫·《赠花卿》', max: 11, themeColor: '#F2EFF5', boxColor: { base: '#F2EFF5', lid: '#F8F6FA' },html: '<div style="position: relative; width: 60px; height: 60px;"><div class="rui-cluster rx1"><div class="rp rp1"></div><div class="rp rp2"></div><div class="rp rp3"></div><div class="rp rp4"></div><div class="rc"></div></div><div class="rui-cluster rx2"><div class="rp rp1"></div><div class="rp rp2"></div><div class="rp rp3"></div><div class="rp rp4"></div><div class="rc"></div></div><div class="rui-cluster rx3"><div class="rp rp1"></div><div class="rp rp2"></div><div class="rp rp3"></div><div class="rp rp4"></div><div class="rc"></div></div><div class="rui-cluster rx4"><div class="rp rp1"></div><div class="rp rp2"></div><div class="rp rp3"></div><div class="rp rp4"></div><div class="rc"></div></div><div class="rui-cluster rx5"><div class="rp rp1"></div><div class="rp rp2"></div><div class="rp rp3"></div><div class="rp rp4"></div><div class="rc"></div></div><div class="rui-cluster rx6"><div class="rp rp1"></div><div class="rp rp2"></div><div class="rp rp3"></div><div class="rp rp4"></div><div class="rc"></div></div><div class="rui-cluster rx7"><div class="rp rp1"></div><div class="rp rp2"></div><div class="rp rp3"></div><div class="rp rp4"></div><div class="rc"></div></div></div>' },


            ]
        },
        {
            seriesId: 'pastry', seriesName: '十二时点', type: 'plate',
            badges: [
                { id: 'p1', name: '酒酿饼·初酿', cond: '首次打开锦囊页面', quote: '莫笑农家腊酒浑，丰年留客足鸡豚', source: '陆游·《游山西村》', max: 1, themeColor: '#ffeef0', html: '<div class="jiuniang"></div>' },
                { id: 'p2', name: '青团·第一口甜', cond: '导入第1首歌', quote: '最是一年春好处，绝胜烟柳满皇都', source: '韩愈·《早春呈水部张十八员外》', max: 1, themeColor: '#d2ebd2', html: '<div class="qingtuan"></div>' },
                { id: 'p3', name: '杏花酥·用心装扮', cond: '自定义歌单封面', quote: '绮席象床寒玉枕，美人何处醉黄花', source: '汪元量·《醉花阴》', max: 1, themeColor: '#ffebe6', html: '<div class="xinghuasu"><div class="dot d1"></div><div class="dot d2"></div><div class="dot d3"></div><div class="dot d4"></div><div class="dot d5"></div></div>' },
                { id: 'p4', name: '绿豆糕·百首清凉', cond: '累计导入歌曲达20首', quote: '绿阴不减来时路，添得黄鹂四五声', source: '曾几·《三衢道中》', max: 20, themeColor: '#ebf5ee', html: '<div class="lvdougao"><div class="vline"></div></div>' },
                { id: 'p5', name: '莲子糕·三卷连心', cond: '创建第3个歌单', quote: '莲之爱，同予者何人', source: '周敦颐·《爱莲说》', max: 3, themeColor: '#fcfaf8', html: '<div class="lianzi"></div>' },
                { id: 'p6', name: '藕粉桂花·丝丝入扣', cond: '完整听完一首歌词', quote: '此情无计可消除，才下眉头却上心头', source: '李清照·《一剪梅》', max: 1, themeColor: '#fdf5e6', html: '<div class="oufen"></div>' },
                { id: 'p7', name: '柿子饼·事事如意', cond: '一次性导入超过10首歌曲', quote: '一年好景君须记，最是橙黄橘绿时', source: '苏轼·《赠刘景文》', max: 1, themeColor: '#f5d7aa', html: '<div class="shizi"><div class="stem"></div></div>' },
                { id: 'p8', name: '重阳糕·步步登高', cond: '创建第5个歌单', quote: '会当凌绝顶，一览众山小', source: '杜甫·《望岳》', max: 5, themeColor: '#f5e6cd', html: '<div class="chongyang"><div class="ly l1"></div><div class="ly l2"></div><div class="ly l3"></div><div class="divider dv1"></div><div class="divider dv2"></div><div class="flag-pole"></div><div class="flag"></div></div>' },
                { id: 'p9', name: '桂花栗子·硕果千首', cond: '单个歌单歌曲超过20首', quote: '稻花香里说丰年，听取蛙声一片', source: '辛弃疾·《西江月》', max: 1, themeColor: '#f5e6c8', html: '<div class="lizigao"></div>' },
                { id: 'p10', name: '糖年糕·年年高升', cond: '首次使用自定义画轴', quote: '爆竹声中一岁除，春风送暖入屠苏', source: '王安石·《元日》', max: 1, themeColor: '#eef6fc', html: '<div class="niangao"></div>' },
                { id: 'p11', name: '枣泥糕·早早圆满', cond: '集齐前十款时点徽章', quote: '枣花至小能成实，桑叶虽柔解吐丝', source: '王安石·《咏枣》', max: 10, themeColor: '#d2a5a5', html: '<div class="zaoni"><div class="grain g1"></div><div class="grain g2"></div><div class="grain g3"></div></div>' },
                { id: 'p12', name: '蜜供·大圆满', cond: '集齐前二十二枚雅集徽章', quote: '此曲只应天上有，人间能得几回闻', source: '杜甫·《赠花卿》', max: 22, themeColor: '#fff8e6', html: '<div class="migong"><div class="tier t1"></div><div class="tier t2"></div><div class="tier t3"></div><div class="tier t4"></div></div>' }
            ]
        }
    ];


// ==========================================
// 真实徽章数据中心
// ==========================================
const defaultBadgeData = {
    progress: {}, 
    equipped: [],
    customBadges: []
};
let badgeUserData = JSON.parse(localStorage.getItem('jinyu_badge_data')) || defaultBadgeData;
if (!badgeUserData.equipped) badgeUserData.equipped = [];

// 强制清空所有佩戴的徽章（重置荣誉墙）
badgeUserData.equipped = [];
saveBadgeData();

function saveBadgeData() {
    localStorage.setItem('jinyu_badge_data', JSON.stringify(badgeUserData));
}

    function checkBadgeProgress(specificId = null) {
        let newlyUnlocked = [];

        // 辅助更新函数，只更新 badgeUserData.progress
        function updateSingleProgress(id, currentVal) {
            const b = getBadgeById(id);
            if (!b) return;
            const oldVal = badgeUserData.progress[id] || 0;
            const newVal = Math.max(oldVal, currentVal);
            if (oldVal < b.max && newVal >= b.max) {
                badgeUserData.progress[id] = newVal;
                newlyUnlocked.push(b.name.split('·')[0]);
            } else if (newVal < b.max) {
                badgeUserData.progress[id] = newVal;
            }
        }

        // --- 重新组织扫描逻辑，确保只读 appData ---
        if (specificId) {
            updateSingleProgress(specificId, 1);
        } else {
            // 1. 安全地收集所有 appData 信息
            let totalSongs = 0;
            let hasCustomCover = false;
            let songCollectionCount = {};
            let maxSongsInPlaylist = 0;
            let hasPureMusicPlaylist = false;
            let hasMultiLangPlaylist = false;

            appData.playlists.forEach(pl => {
                totalSongs += pl.songs.length;
                if (pl.coverHTML && pl.coverHTML.includes('<img')) hasCustomCover = true;
                if (pl.songs.length > maxSongsInPlaylist) maxSongsInPlaylist = pl.songs.length;
                
                // 安全检测：莲 (f4)
                if (pl.songs.length >= 5) {
                    const pureCount = pl.songs.filter(s => !s.hasLyric).length;
                    if (pureCount / pl.songs.length > 0.5) hasPureMusicPlaylist = true;
                }

                // 安全检测：春兰 (f1)
                if (!hasMultiLangPlaylist) {
                    const langs = new Set();
                    pl.songs.forEach(song => {
                        if (song.lrcText) {
                            // 简单的正则判断
                            const hasChinese = /[\u4e00-\u9fa5]/.test(song.lrcText);
                            const hasEnglish = /[a-zA-Z]/.test(song.lrcText);
                            if (hasChinese) langs.add('zh');
                            if (hasEnglish) langs.add('en');
                        }
                    });
                    if (langs.size >= 2) hasMultiLangPlaylist = true;
                }


                // 安全检测：栀子 (f5)
                pl.songs.forEach(song => {
                    songCollectionCount[song.id] = (songCollectionCount[song.id] || 0) + 1;
                });
            });

            let playlistCount = appData.playlists.length;
            let shareCount = parseInt(localStorage.getItem('jinyu_share_count') || 0);

            // 2. 将收集到的信息，安全地更新到徽章进度
            updateSingleProgress('p2', totalSongs > 0 ? 1 : 0);
            updateSingleProgress('p3', hasCustomCover ? 1 : 0);
            updateSingleProgress('p4', totalSongs);
            updateSingleProgress('p5', playlistCount);
            updateSingleProgress('p8', playlistCount);
            updateSingleProgress('p9', maxSongsInPlaylist >= 20 ? 1 : 0);

            updateSingleProgress('f1', hasMultiLangPlaylist ? 1 : 0);
            updateSingleProgress('f4', hasPureMusicPlaylist ? 1 : 0);
            updateSingleProgress('f6', shareCount);
            updateSingleProgress('f9', totalSongs);
            
            const hasCherishedSong = Object.values(songCollectionCount).some(count => count >= 3);
            updateSingleProgress('f5', hasCherishedSong ? 1 : 0);

            // 3. 安全地计算联动徽章
            let unlockedFlowers = 0;
            for(let i=1; i<=11; i++) { if((badgeUserData.progress['f'+i] || 0) >= getBadgeById('f'+i).max) unlockedFlowers++; }
            updateSingleProgress('f12', unlockedFlowers);

            let unlockedPastries = 0;
            for(let i=1; i<=10; i++) { if((badgeUserData.progress['p'+i] || 0) >= getBadgeById('p'+i).max) unlockedPastries++; }
            updateSingleProgress('p11', unlockedPastries);

            let p11Unlocked = (badgeUserData.progress['p11'] || 0) >= getBadgeById('p11').max ? 1 : 0;
            let f12Unlocked = (badgeUserData.progress['f12'] || 0) >= getBadgeById('f12').max ? 1 : 0;
            updateSingleProgress('p12', unlockedFlowers + unlockedPastries + p11Unlocked + f12Unlocked);
        }

        saveBadgeData();
        if (typeof renderAchievements === 'function') renderAchievements();
        if (typeof renderPlaza === 'function') renderPlaza();
        if (newlyUnlocked.length > 0) {
            setTimeout(() => { showToast(`恭喜点亮: ${newlyUnlocked.join(', ')}`); }, 300);
        }
    }



    const scrollColors = {
        'jade':   { light: '#ffffff', dark: '#e8e4dc', cap: '#dcd6ce' },
        'bamboo': { light: '#dce5e3', dark: '#b8c8c2', cap: '#a0b0aa' },
        'wood':   { light: '#a89890', dark: '#887870', cap: '#685850' },
        'rouge':  { light: '#f0d8d8', dark: '#d4a0a0', cap: '#c48a8a' }
    };

    function toggleGroup(el) {
        const txt = el.querySelector('.group-toggle-txt');
        const body = el.nextElementSibling;
        if (body.style.display === 'none') { body.style.display = 'flex'; txt.innerText = '收起'; } 
        else { body.style.display = 'none'; txt.innerText = '展开'; }
    }

    // 真实的佩戴/卸下逻辑
    function toggleState(el, id) {
        if(el.classList.contains('locked')) return;
        const label = el.querySelector('.toggle-label');
        
        if(el.classList.contains('on')) {
            // 卸下：入匣
            el.classList.remove('on'); 
            el.classList.add('off'); 
            label.innerText = '入匣'; 
            badgeUserData.equipped = badgeUserData.equipped.filter(x => x !== id);
        } else {
            // 佩戴：检查是否超过6个
            if (badgeUserData.equipped.length >= 6) {
                showToast('荣誉墙最多陈列 6 枚雅集');
                return;
            }
            el.classList.remove('off'); 
            el.classList.add('on'); 
            label.innerText = '已佩'; 
            badgeUserData.equipped.push(id);
        }
        saveBadgeData();
        renderHonorWall(); // 瞬间同步更新藏阁的荣誉墙！
    }

    // 动态渲染藏阁的荣誉墙 (固定 6 个槽位，兼容官方徽章与自定义画轴图片)
    function renderHonorWall() {
        const grid = document.querySelector('.badge-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        const equippedIds = badgeUserData.equipped || [];
        
        // 更新标题旁的 数量/6
        const subTitle = document.querySelector('.honor-title-sub');
        if (subTitle) subTitle.innerText = `${equippedIds.length}/6`;

        // 强制循环 6 次，填满 6 个格子
        for (let i = 0; i < 6; i++) {
            if (i < equippedIds.length) {
                // 这个槽位有装备
                const id = equippedIds[i];
                const b = getBadgeById(id);
                
                if (b) {
                    // 1. 如果是官方花神/糕点
                    grid.innerHTML += `
                        <div class="badge-card" onclick="openJinnang()">
                            <div class="badge-icon"><div style="transform:scale(0.85); display:flex; justify-content:center; align-items:center; width:100%; height:100%;">${b.html}</div></div>
                            <div class="badge-label">${b.name.split('·')[0]}</div>
                        </div>
                    `;
                } else {
                    // 2. 如果官方找不到，去自定义画轴里找
                    const customB = badgeUserData.customBadges.find(x => x.id === id);
                    if (customB) {
                        // 【完美修复】：直接显示用户上传的图片
                        grid.innerHTML += `
                            <div class="badge-card" onclick="openJinnang()">
                                <div class="badge-icon">
                                    <img src="${customB.img}" style="width:40px; height:40px; border-radius:8px; object-fit:cover; box-shadow:0 2px 6px rgba(0,0,0,0.1);">
                                </div>
                                <div class="badge-label" style="max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${customB.name}</div>
                            </div>
                        `;
                    }
                }
            } else {
                // 没有装备的空位，渲染虚线底座
                grid.innerHTML += `
                    <div class="badge-card" style="background:transparent; border:1px dashed rgba(180,160,150,0.3); box-shadow:none;" onclick="openJinnang()">
                        <div class="badge-icon">
                            <div style="width:24px; height:24px; border-radius:50%; background:rgba(210,170,155,0.1);"></div>
                        </div>
                        <div class="badge-label" style="color:rgba(160,138,130,0.5);">虚位以待</div>
                    </div>
                `;
            }
        }
    }

    // 点击画轴左侧，和右侧按钮执行一样的佩戴/卸下逻辑
    function toggleScroll(el, id) {
        toggleSlip(null, id);
    }

    // 真实的自定义画轴佩戴/卸下逻辑
    function toggleSlip(event, id) {
        if (event) event.stopPropagation(); // 防止误触
        
        const b = badgeUserData.customBadges.find(x => x.id === id);
        if(!b) return;

        const isEquipped = badgeUserData.equipped.includes(id);
        
        if (isEquipped) {
            // 卸下：状态变闲(卷起)，移出荣誉墙
            b.state = 'off';
            badgeUserData.equipped = badgeUserData.equipped.filter(x => x !== id);
        } else {
            // 佩戴：检查上限，状态变佩(展开)，加入荣誉墙
            if (badgeUserData.equipped.length >= 6) {
                showToast('荣誉墙最多陈列 6 枚雅集');
                return;
            }
            b.state = 'on';
            badgeUserData.equipped.push(id);
        }
        
        saveBadgeData();
        renderCustom();    // 刷新画轴列表（自动展开/卷起）
        renderHonorWall(); // 瞬间同步到藏阁荣誉墙
    }

    function renderAchievements() {
        const container = document.getElementById('achievement-list');
        if(!container) return;
        container.innerHTML = '';
        badgeSeries.forEach(series => {
            let unlockedHtml = ''; let lockedHtml = ''; let unlockedCount = 0;
            series.badges.forEach(b => {
                const val = badgeUserData.progress[b.id] || 0;
                const isUnlocked = val >= b.max;
                if (isUnlocked) unlockedCount++;
                const tColor = b.themeColor || '#e8e4dc';
                const cardStyle = `background: linear-gradient(135deg, rgba(255,255,255,0.9) 30%, ${tColor}4D 100%); border-color: #fff;`;

            if (isUnlocked) {
                // 【核心修改】：判断这个徽章的ID在不在佩戴列表里
                const isEquipped = badgeUserData.equipped.includes(b.id);
                const stateClass = isEquipped ? 'on' : 'off';
                const stateText = isEquipped ? '已佩' : '入匣';

                let actionHtml = '';
                if (series.type === 'rouge') {
                    const baseColor = b.boxColor ? b.boxColor.base : '#D4A5A5';
                    const lidColor = b.boxColor ? b.boxColor.lid : '#EAC7CC';
                    actionHtml = `<div class="rouge-box-wrap"><div class="rouge-base" style="background: radial-gradient(circle at 50% 50%, ${baseColor} 0%, #fff 100%);"></div><div class="rouge-flower">${b.html}</div><div class="rouge-lid" style="background: radial-gradient(circle at 30% 30%, white, ${lidColor});"></div></div>`;
                } else {
                    actionHtml = `<div class="plate-box-wrap"><div class="plate"></div><div class="mini-pastry-wrap">${b.html}</div></div>`;
                }
                // onclick 传入真实的 b.id
                unlockedHtml += `<div class="card-base" style="${cardStyle}"><div class="icon-box" style="transform:scale(1.2); border:none; background:transparent; box-shadow:none; cursor:pointer;" onclick="openPostcard('${b.id}')">${b.html}</div><div class="info-box" style="cursor:pointer;" onclick="openPostcard('${b.id}')"><div class="card-title">${b.name.split('·')[0]}</div><div class="card-desc">已达成：${b.cond}</div></div><div class="toggle-action ${stateClass}" onclick="toggleState(this, '${b.id}')">${actionHtml}<div class="toggle-label">${stateText}</div></div></div>`;
            } else {

                    const percent = Math.min(100, (val / b.max) * 100);
                    const colorClass = series.type === 'rouge' ? 'color-rouge' : 'color-dew';
                    let actionHtml = '';
                    if (series.type === 'rouge') {
                        const baseColor = b.boxColor ? b.boxColor.base : '#D4A5A5';
                        const lidColor = b.boxColor ? b.boxColor.lid : '#EAC7CC';
                        actionHtml = `<div class="rouge-box-wrap"><div class="rouge-base" style="background: radial-gradient(circle at 50% 50%, ${baseColor} 0%, #fff 100%);"></div><div class="rouge-lid" style="background: radial-gradient(circle at 30% 30%, white, ${lidColor});"></div></div>`;
                    } else { actionHtml = `<div class="plate-box-wrap"><div class="plate"></div></div>`; }
                    lockedHtml += `<div class="card-base locked"><div class="icon-box" style="transform:scale(1.2); border:none; background:transparent; box-shadow:none; cursor:pointer;" onclick="openFog('${b.id}')">${b.html}</div><div class="info-box" style="cursor:pointer;" onclick="openFog('${b.id}')"><div class="card-title">${b.name.split('·')[0]}</div><div class="card-desc">${b.cond}</div><div class="prog-text">${val} / ${b.max}</div><div class="prog-track"><div class="prog-fill ${colorClass}" style="width: ${percent}%;"></div></div></div><div class="toggle-action locked">${actionHtml}<div class="toggle-label">未得</div></div></div>`;
                }
            });
            container.innerHTML += `<div class="group-title" onclick="toggleGroup(this)">${series.seriesName} - 已获 (${unlockedCount}/${series.badges.length})<div class="group-line"></div><span class="group-toggle-txt">收起</span></div><div class="group-body">${unlockedHtml || '<div style="font-size:11px;color:#a08a82;text-align:center;padding:10px;">暂无</div>'}</div><div class="group-title" onclick="toggleGroup(this)" style="margin-top:20px;">待点亮 (${series.badges.length - unlockedCount})<div class="group-line"></div><span class="group-toggle-txt">展开</span></div><div class="group-body" style="display:none;">${lockedHtml || '<div style="font-size:11px;color:#a08a82;text-align:center;padding:10px;">已全部点亮</div>'}</div>`;
        });
    }

    function renderPlaza() {
        const container = document.getElementById('plaza-list');
        if(!container) return;
        container.innerHTML = '';
        badgeSeries.forEach(series => {
            let gridHtml = '';
            series.badges.forEach(b => {
                const val = badgeUserData.progress[b.id] || 0;
                const isUnlocked = val >= b.max;
                const tColor = b.themeColor || '#e8e4dc';
                if (isUnlocked) {
                    const floatStyle = `background: radial-gradient(circle, #fff 30%, ${tColor}66 70%, transparent 80%);`;
                    gridHtml += `<div class="item-float" onclick="openPostcard('${b.id}')"><div class="float-base" style="${floatStyle}"><div style="transform:scale(1.2);">${b.html}</div></div><div class="item-name">${b.name.split('·')[0]}</div></div>`;
                } else {
                    gridHtml += `<div class="item-float locked" onclick="openFog('${b.id}')"><div class="float-base"><div style="transform:scale(1.2); filter:grayscale(100%); opacity:0.3;">${b.html}</div></div><div class="item-name">未解锁</div></div>`;
                }
            });
            container.innerHTML += `<div class="group-title" style="margin-top:10px;">${series.seriesName}<div class="group-line"></div></div><div class="grid-float">${gridHtml}</div>`;
        });
        container.innerHTML += `<div class="group-title" style="margin-top:20px;">更多雅集<div class="group-line"></div></div><div class="grid-float"><div class="item-float locked" style="opacity:0.6; cursor:default;"><div class="float-base"><div style="font-size:24px; color:#c4b0a8; font-weight:300;">+</div></div><div class="item-name">敬请期待</div></div></div>`;
    }

    function renderCustom() {
        const container = document.getElementById('custom-badge-list');
        if(!container) return;
        container.innerHTML = '';
        badgeUserData.customBadges.forEach(b => {
            let c;
            if (b.color && b.color.startsWith('#')) { c = { light: '#ffffff', dark: b.color, cap: b.color }; } 
            else { c = scrollColors[b.color] || scrollColors['jade']; }
            const rollerStyle = `background: linear-gradient(to bottom, ${c.light}, ${c.dark});`;
            const capStyle = `<style>#roller-${b.id}::before, #roller-${b.id}::after { background: ${c.cap}; }</style>`;
            const bottomStyle = `background: linear-gradient(to bottom, ${c.light}, ${c.cap});`;

            // 【修复重名冲突】：把 onclick 里的 openEditModal 改为 openJnEditModal
            container.innerHTML += `<div class="card-base">${capStyle}<div class="scroll-container ${b.state}" onclick="toggleScroll(this, '${b.id}')"><div class="scroll-roller" id="roller-${b.id}" style="${rollerStyle}"></div><div class="scroll-paper"><img src="${b.img}" class="custom-img"></div><div class="scroll-bottom" style="${bottomStyle}"></div><div class="state-label">${b.state==='on'?'展开':'卷起'}</div></div><div class="info-box"><div class="card-title" style="color:${c.dark}">${b.name}</div><div class="card-desc">${b.desc}</div><div class="card-actions"><span class="action-link" onclick="openJnEditModal('${b.id}')">修饰</span><span class="action-link" onclick="deleteCustom('${b.id}')">抹去</span></div></div><div class="slip-action-b ${b.state}" onclick="toggleSlip(event, '${b.id}')"><div class="slip-body-b">${b.state==='on'?'佩':'闲'}</div></div></div>`;
        });
    }


    // 锦囊弹窗核心逻辑
    function getBadgeById(id) {
        for (let s of badgeSeries) { let b = s.badges.find(x => x.id === id); if (b) return b; } return null;
    }

    function getLunarDateStr() {
        const d = new Date();
        const formatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { year: 'numeric', month: 'long', day: 'numeric' });
        let str = formatter.format(d).replace(/^\d+/, ''); 
        const cnNums = ['〇','一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十','卅一'];
        str = str.replace(/\d+/g, match => cnNums[parseInt(match)] || match);
        return str.replace(/月(一|二|三|四|五|六|七|八|九)$/, '月初$1').replace('年', '年 '); 
    }

    function flipCard() { document.getElementById('jn-myCard').classList.toggle('flipped'); }

    function openPostcard(id) {
        const b = getBadgeById(id);
        if(!b) return;
        const lunarDate = getLunarDateStr(); 
        const isFlower = badgeSeries[0].badges.some(x => x.id === id); 
        const tColor = b.themeColor || '#e8e4dc';

        const front = document.getElementById('jn-export-front');
        const back = document.getElementById('jn-export-back');
        const animBox = document.getElementById('jn-anim-container');

        document.getElementById('jn-myCard').classList.remove('flipped');

        front.style.background = `linear-gradient(to bottom, #fffcf8, ${tColor})`;
        if (isFlower) {
            const petalStyle = `background: radial-gradient(ellipse at 50% 40%, #fff, ${tColor});`;
            animBox.innerHTML = `<div class="petal-fly pf-1" style="${petalStyle}"></div><div class="petal-fly pf-2" style="${petalStyle}"></div><div class="petal-fly pf-3" style="${petalStyle}"></div>`;
            document.getElementById('jn-modal-icon').innerHTML = `<div style="transform:scale(3.5);">${b.html}</div>`;
        } else {
            animBox.innerHTML = `<div class="smoke-rise sm-1"></div><div class="smoke-rise sm-2"></div><div class="smoke-rise sm-3"></div>`;
            document.getElementById('jn-modal-icon').innerHTML = `<div style="transform:scale(2.5);">${b.html}</div>`;
        }

        document.getElementById('jn-modal-title').innerHTML = b.name.split('·')[0];
        document.getElementById('jn-modal-subtitle').innerHTML = b.name.split('·')[1] || '';
        document.getElementById('jn-modal-quote').innerHTML = b.quote.replace('，', '<br>');
        // 填入真正的诗句出处，前面加个破折号
        document.getElementById('jn-modal-author').innerHTML = '—— ' + b.source; 

        // 【核心修复】：卡片背面颜色直接跟随徽章自己的主题色
        back.style.background = `linear-gradient(145deg, #fff, ${tColor})`;
        back.style.color = '#5c4a45';
        document.querySelector('.jn-data-box').style.borderColor = tColor;
        document.querySelectorAll('.jn-data-label, .jn-back-date').forEach(el => el.style.color = '#a08a82');
        document.querySelector('.jn-data-value').style.color = '#5c4a45';
        document.querySelector('.jn-back-sub').style.color = '#a08a82';

        
        document.getElementById('jn-modal-cond').innerHTML = b.cond;
        document.getElementById('jn-modal-date-back').innerHTML = `${lunarDate} 录`;
        document.getElementById('jn-postcard-modal').classList.add('active');
    }

    function closePostcard() { document.getElementById('jn-postcard-modal').classList.remove('active'); }

function simulateExport() {
    const card = document.getElementById('jn-myCard');
    const isFlipped = card.classList.contains('flipped');
    const btn = document.getElementById('jn-exportBtn');
    
    btn.innerText = '拓印中...';
    btn.style.opacity = '0.5';

    const targetNode = isFlipped 
        ? document.getElementById('jn-export-back') 
        : document.getElementById('jn-export-front');
    
    const cloneNode = targetNode.cloneNode(true);
    
    // 改成塞进 body，彻底脱离 .phone 的 overflow:hidden
    cloneNode.style.position = 'fixed';
    cloneNode.style.top = '-9999px';
    cloneNode.style.left = '-9999px';
    cloneNode.style.width = '280px';
    cloneNode.style.height = '480px';
    cloneNode.style.transform = 'none';
    cloneNode.style.zIndex = '-1';
    cloneNode.style.margin = '0';
    
    document.body.appendChild(cloneNode);

    setTimeout(() => {
        html2canvas(cloneNode, { 
            scale: window.devicePixelRatio || 2,
            backgroundColor: null,
            useCORS: true,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 280,
            windowHeight: 480
        }).then(canvas => {
            document.body.removeChild(cloneNode);
            
            const link = document.createElement('a');
            link.download = isFlipped ? '锦玉_成就印记.png' : '锦玉_诗意画卷.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            btn.innerText = '拓印留影';
            btn.style.opacity = '1';
        }).catch(err => {
            document.body.removeChild(cloneNode);
            btn.innerText = '拓印失败';
            btn.style.opacity = '1';
            console.error(err);
        });
    }, 150);
}


    function openFog(id) {
        const b = getBadgeById(id); if(!b) return;
        const val = badgeUserData.progress[id] || 0;
        const percent = Math.min(100, (val / b.max) * 100);
        document.getElementById('jn-fog-icon').innerHTML = `<div style="transform:scale(1.5);">${b.html}</div>`;
        document.getElementById('jn-fog-title').innerText = b.name.split('·')[0];
        document.getElementById('jn-fog-condition').innerText = `解锁条件：\n${b.cond}`;
        document.getElementById('jn-fog-prog-text').innerText = `${val} / ${b.max}`;
        const fill = document.getElementById('jn-fog-prog-fill'); fill.style.width = '0%';
        document.getElementById('jn-fog-overlay').classList.add('active');
        setTimeout(() => { fill.style.width = percent + '%'; }, 50);
    }
    function closeFog() { document.getElementById('jn-fog-overlay').classList.remove('active'); }

    let tempCustomImg = null; let tempCustomColor = 'jade'; let editingCustomId = null;
    function selectJnColor(el, colorKey) { document.querySelectorAll('.jn-c-dot').forEach(d => d.classList.remove('active')); if(el) el.classList.add('active'); tempCustomColor = colorKey; }
    function selectJnCustomColor(color) { document.querySelectorAll('.jn-c-dot').forEach(d => d.classList.remove('active')); tempCustomColor = color; }
    
    function renderCustom() {
        const container = document.getElementById('custom-badge-list');
        if(!container) return;
        container.innerHTML = '';
        badgeUserData.customBadges.forEach(b => {
            let c;
            if (b.color && b.color.startsWith('#')) { c = { light: '#ffffff', dark: b.color, cap: b.color }; } 
            else { c = scrollColors[b.color] || scrollColors['jade']; }
            const rollerStyle = `background: linear-gradient(to bottom, ${c.light}, ${c.dark});`;
            const capStyle = `<style>#roller-${b.id}::before, #roller-${b.id}::after { background: ${c.cap}; }</style>`;
            const bottomStyle = `background: linear-gradient(to bottom, ${c.light}, ${c.cap});`;

            // 【修复重名冲突】：把 onclick 里的 openEditModal 改为 openJnEditModal
            container.innerHTML += `<div class="card-base">${capStyle}<div class="scroll-container ${b.state}" onclick="toggleScroll(this, '${b.id}')"><div class="scroll-roller" id="roller-${b.id}" style="${rollerStyle}"></div><div class="scroll-paper"><img src="${b.img}" class="custom-img"></div><div class="scroll-bottom" style="${bottomStyle}"></div><div class="state-label">${b.state==='on'?'展开':'卷起'}</div></div><div class="info-box"><div class="card-title" style="color:${c.dark}">${b.name}</div><div class="card-desc">${b.desc}</div><div class="card-actions"><span class="action-link" onclick="openJnEditModal('${b.id}')">修饰</span><span class="action-link" onclick="deleteCustom('${b.id}')">抹去</span></div></div><div class="slip-action-b ${b.state}" onclick="toggleSlip(this, '${b.id}')"><div class="slip-body-b">${b.state==='on'?'佩':'闲'}</div></div></div>`;
        });
    }

    function toggleScroll(el, id) {
        const b = badgeUserData.customBadges.find(x => x.id === id);
        if(b) { b.state = b.state === 'on' ? 'off' : 'on'; renderCustom(); }
    }
    // 真实的自定义画轴佩戴/卸下逻辑
    function toggleSlip(el, id) {
        // 阻止冒泡，防止触发画轴展开
        event.stopPropagation(); 
        const b = badgeUserData.customBadges.find(x => x.id === id);
        if(!b) return;

        if (b.state === 'on') {
            // 卸下
            b.state = 'off';
            badgeUserData.equipped = badgeUserData.equipped.filter(x => x !== id);
        } else {
            // 佩戴
            if (badgeUserData.equipped.length >= 6) {
                showToast('荣誉墙最多陈列 6 枚雅集');
                return;
            }
            b.state = 'on';
            if (!badgeUserData.equipped.includes(id)) {
                badgeUserData.equipped.push(id);
            }
        }
        saveBadgeData();
        renderCustom();    // 刷新自定义列表
        renderHonorWall(); // 瞬间同步到藏阁荣誉墙！
    }

    // 【修复重名冲突】：改名为 openJnEditModal
    function openJnEditModal(id = null) { 
        editingCustomId = id;
        if (id) {
            let b = badgeUserData.customBadges.find(x => x.id === id);
            document.getElementById('jn-edit-name').value = b.name; document.getElementById('jn-edit-desc').value = b.desc;
            tempCustomImg = b.img; tempCustomColor = b.color;
            document.querySelector('.jn-upload-box').innerHTML = `<img src="${b.img}" style="width:100%;height:100%;object-fit:cover;">`;
            if(b.color.startsWith('#')) { document.getElementById('jn-custom-color-picker').value = b.color; selectJnCustomColor(b.color); }
        } else {
            document.getElementById('jn-edit-name').value = ''; document.getElementById('jn-edit-desc').value = '';
            tempCustomImg = null; selectJnColor(document.querySelectorAll('.jn-c-dot')[0], 'jade'); document.querySelector('.jn-upload-box').innerHTML = '+';
        }
        document.getElementById('jn-edit-modal').classList.add('active'); 
    }
    
    // 【修复重名冲突】：改名为 closeJnEditModal
    function closeJnEditModal() { document.getElementById('jn-edit-modal').classList.remove('active'); }
    
    function triggerJnUpload() { document.getElementById('jn-upload-input').click(); }
    function handleJnUpload(e) {
        const file = e.target.files[0];
        if(file) { const reader = new FileReader(); reader.onload = (e) => { tempCustomImg = e.target.result; document.querySelector('.jn-upload-box').innerHTML = `<img src="${tempCustomImg}" style="width:100%;height:100%;object-fit:cover;">`; }; reader.readAsDataURL(file); }
    }
    
    function saveCustomBadge() {
        checkBadgeProgress('p10');
        const name = document.getElementById('jn-edit-name').value || '未命名'; const desc = document.getElementById('jn-edit-desc').value || '暂无小志';
        const finalImg = tempCustomImg || 'https://via.placeholder.com/100/d4a0a0/ffffff?text=新';
        if (editingCustomId) { let b = badgeUserData.customBadges.find(x => x.id === editingCustomId); if (b) { b.name = name; b.desc = desc; b.img = finalImg; b.color = tempCustomColor; } } 
        else { badgeUserData.customBadges.push({ id: 'c'+Date.now(), name, desc, img: finalImg, color: tempCustomColor, state: 'off' }); }
        closeJnEditModal(); renderCustom();
    }
    
    function deleteCustom(id) {
        // 1. 【核心修复】：在删除徽章实体前，先检查它在不在佩戴列表里
        const isEquipped = badgeUserData.equipped.includes(id);
        if (isEquipped) {
            // 如果在，就先从佩戴列表里把它除名！
            badgeUserData.equipped = badgeUserData.equipped.filter(x => x !== id);
        }

        // 2. 从自定义徽章列表里彻底删除它
        badgeUserData.customBadges = badgeUserData.customBadges.filter(x => x.id !== id);
        
        // 3. 保存数据
        saveBadgeData();
        
        // 4. 刷新两个相关的界面
        renderCustom();    // 刷新锦囊里的自定义列表
        renderHonorWall(); // 刷新藏阁的荣誉墙，幽灵尸体瞬间消失！

        showToast('画轴已抹去');
    }

        // ==========================================
    // 锦囊系统基础交互 (第一阶段)
    // ==========================================
    function openJinnang() {
         // 触发“酒酿饼”徽章
        checkBadgeProgress('p1');
        document.getElementById('jinnang-system').classList.add('active');
    }
    
    function closeJinnang() {
        document.getElementById('jinnang-system').classList.remove('active');
    }
    
    function switchJinnangTab(idx, el) {
        document.querySelectorAll('.jn-tab-jade').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        document.querySelectorAll('.jn-page-container').forEach(p => p.classList.remove('active'));
        document.getElementById('jn-page-' + idx).classList.add('active');
    }


        // ==========================================
    // 飞鸽传书：生成歌单分享卡片并截图
    // ==========================================
    function sharePlaylist() {
        if (!currentViewPlaylistId) return;
        const pl = appData.playlists.find(p => p.id === currentViewPlaylistId);
        if (!pl) return;

        showToast('正在绘制长卷...');

        // 1. 填充数据到隐藏模板
        const coverBox = document.getElementById('share-pl-cover');
        coverBox.innerHTML = pl.coverHTML;
        // 如果是预设的HTML封面，稍微放大一点适应大框
        if (coverBox.querySelector('.asset-scaler')) {
            coverBox.querySelector('.asset-scaler').style.transform = 'scale(1.2)';
        }
        
        document.getElementById('share-pl-title').innerText = pl.name;
        document.getElementById('share-pl-desc').innerText = pl.desc || '暂无小志...';

        // 2. 填充前 6 首歌曲
        const grid = document.getElementById('share-pl-grid');
        grid.innerHTML = '';
        const maxSongs = Math.min(pl.songs.length, 6);
        for (let i = 0; i < maxSongs; i++) {
            grid.innerHTML += `
                <div class="js-track-item">
                    <div class="js-track-num">${String(i + 1).padStart(2, '0')}</div>
                    <div class="js-track-name">${pl.songs[i].name}</div>
                </div>
            `;
        }

        // 3. 处理底部省略提示
        const moreDiv = document.getElementById('share-pl-more');
        if (pl.songs.length > 6) {
            moreDiv.style.display = 'block';
            moreDiv.innerText = `... 等 ${pl.songs.length} 首曲目`;
        } else {
            moreDiv.style.display = 'none';
        }

        // 4. 填充落款信息
        const authorName = document.getElementById('user-name').innerText || '锦玉音乐家';
        document.getElementById('share-pl-author').innerText = authorName;
        document.getElementById('share-pl-date').innerText = getLunarDateStr() + ' 录';

        // 5. 呼叫 html2canvas 拍照
        const targetNode = document.getElementById('export-share-card');
        // 临时显示一下让它能截到图
        document.getElementById('share-card-container').style.opacity = '1';
        
        setTimeout(() => {
            html2canvas(targetNode, {
                scale: 2,
                backgroundColor: null
            }).then(canvas => {
                // 拍完立刻隐藏
                document.getElementById('share-card-container').style.opacity = '0';
                
                // 触发下载
                const link = document.createElement('a');
                link.download = `锦玉_${pl.name}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                
                showToast('拓印成功！');

                // 6. 核心：增加分享次数，触发合欢徽章！
                let shareCount = parseInt(localStorage.getItem('jinyu_share_count') || '0');
                shareCount++;
                localStorage.setItem('jinyu_share_count', shareCount);

           // 触发“郁李”徽章
            checkBadgeProgress('f2');

                checkBadgeProgress(); // 呼叫全知之眼检查进度
                
            }).catch(err => {
                document.getElementById('share-card-container').style.opacity = '0';
                showToast('拓印失败');
                console.error(err);
            });
        }, 150);
    }


        // ==========================================
    // 歌词挂件：单曲导入词卷
    // ==========================================
    document.getElementById('single-lrc-upload').addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file || !editingSong) return;
        const text = await file.text();
        
        editingSong.lrcText = text;
        editingSong.hasLyric = true;
        saveData();
        showToast('词卷已装裱');
        e.target.value = ''; // 清空 input
        
        // 如果正在播放这首歌，立刻刷新听风页的歌词
        if (currentPlayingSongId === editingSong.id) {
            parseAndRenderLyrics(text);
        }
        // 刷新详情页，让 [纯] 变成粉色的 [词]
        if (currentViewPlaylistId) renderDetailSongs();
    });

       // ==========================================
    // 字体挂件：玉牌结集与笔山管理系统
    // ==========================================
    
    // ==========================================
    // 字体挂件：玉牌结集与笔山管理系统
    // ==========================================
    
    let tempPresetColor = 'jade-white'; // 记录选中的玉石颜色

    function selectPresetColor(el, color) {
        document.querySelectorAll('.p-dot').forEach(d => d.classList.remove('active'));
        if(el) el.classList.add('active');
        tempPresetColor = color;
    }

    // 1. 渲染玉牌列表
    function renderFontPresets() {
        const list = document.getElementById('font-preset-list');
        list.innerHTML = '';
        let presets = JSON.parse(localStorage.getItem('jinyu_font_presets') || '[]');
        
        const activePresetId = localStorage.getItem('jinyu_active_preset_id');

        presets.forEach(p => {
            const isActive = p.id === activePresetId;
            const colorClass = p.color || 'jade-white'; // 兼容旧数据，默认白玉
            list.innerHTML += `
                <div class="jade-token ${colorClass} ${isActive ? 'active' : ''}" onclick="applyFontPreset('${p.id}')">
                    <div class="token-del" onclick="deleteFontPreset(event, '${p.id}')">✕</div>
                    <span>${p.name}</span>
                   <span class="jade-token-sub">${p.font1Name || p.cnName || ''}</span>


                </div>
            `;
        });

        // 添加结集按钮
        list.innerHTML += `<div class="jade-token add-token" onclick="saveFontPreset()">+ 结集</div>`;
    }

    // 2. 触发结集，打开古风弹窗
    function saveFontPreset() {
        const cnId = localStorage.getItem('current_cn_font_id');
        const enId = localStorage.getItem('current_en_font_id');
        
        if (!cnId && !enId) {
            showToast('请先提起笔山研墨');
            return;
        }

        let presets = JSON.parse(localStorage.getItem('jinyu_font_presets') || '[]');
        if (presets.length >= 5) {
            showToast('最多结集 5 组字帖');
            return;
        }

        document.getElementById('input-preset-name').value = '新字帖';
        selectPresetColor(document.querySelectorAll('.p-dot')[0], 'jade-white'); // 默认重置为白玉
        document.getElementById('modal-preset-name').classList.add('active');
        setTimeout(() => document.getElementById('input-preset-name').focus(), 100);
    }

    // 2.1 弹窗点击“落笔”后的真实保存逻辑
    function confirmSaveFontPreset() {
        checkBadgeProgress('f11');
        const presetName = document.getElementById('input-preset-name').value.trim();
        if (!presetName) {
            showToast('雅号不可为空');
            return;
        }

        const cnId = localStorage.getItem('current_cn_font_id');
        const enId = localStorage.getItem('current_en_font_id');
const font1Name = localStorage.getItem('current_cn_font_name') || '无';
const font2Name = localStorage.getItem('current_en_font_name') || '无';

        
        let presets = JSON.parse(localStorage.getItem('jinyu_font_presets') || '[]');
        const newId = 'preset_' + Date.now();
        // 【核心】：把选中的颜色一起存进去
        presets.push({ id: newId, name: presetName, cnId, enId, font1Name, font2Name, color: tempPresetColor });
        localStorage.setItem('jinyu_font_presets', JSON.stringify(presets));
        
        closeModal('modal-preset-name');
        applyFontPreset(newId); 
        showToast('结集成功');
    }

    // 3. 应用玉牌
    function applyFontPreset(presetId) {
        let presets = JSON.parse(localStorage.getItem('jinyu_font_presets') || '[]');
        const p = presets.find(x => x.id === presetId);
        if (!p) return;

        localStorage.setItem('jinyu_active_preset_id', presetId);
        
// 恢复笔山状态
        if (p.cnId) {
            localStorage.setItem('current_cn_font_id', p.cnId);
            localStorage.setItem('current_cn_font_name', p.font1Name);
            document.getElementById('label-font-cn').innerText = p.font1Name;
            document.getElementById('brush-cn').classList.add('active');
        } else {
            localStorage.removeItem('current_cn_font_id');
            document.getElementById('label-font-cn').innerText = '自定1';
            document.getElementById('brush-cn').classList.remove('active');
        }

        if (p.enId) {
            localStorage.setItem('current_en_font_id', p.enId);
            localStorage.setItem('current_en_font_name', p.font2Name);
            document.getElementById('label-font-en').innerText = p.font2Name;
            document.getElementById('brush-en').classList.add('active');
        } else {
            localStorage.removeItem('current_en_font_id');
            document.getElementById('label-font-en').innerText = '自定2';
            document.getElementById('brush-en').classList.remove('active');
        }

        document.getElementById('brush-default').classList.remove('active');
        renderFontPresets();
        applyFonts();
    }

    // 4. 删除玉牌
    function deleteFontPreset(event, presetId) {
        event.stopPropagation();
        let presets = JSON.parse(localStorage.getItem('jinyu_font_presets') || '[]');
        presets = presets.filter(x => x.id !== presetId);
        localStorage.setItem('jinyu_font_presets', JSON.stringify(presets));
        
        if (localStorage.getItem('jinyu_active_preset_id') === presetId) {
            switchFontBrush('default'); // 如果删的是当前用的，直接归真
        } else {
            renderFontPresets();
        }
    }

    // 5. 点击笔山的逻辑 (上传或激活)
    async function switchFontBrush(type) {
        const brushDefault = document.getElementById('brush-default');
        const brushCn = document.getElementById('brush-cn');
        const brushEn = document.getElementById('brush-en');

        if (type === 'default') {
            brushDefault.classList.add('active');
            brushCn.classList.remove('active');
            brushEn.classList.remove('active');
            localStorage.removeItem('current_cn_font_id');
            localStorage.removeItem('current_en_font_id');
            localStorage.removeItem('jinyu_active_preset_id');
            document.getElementById('label-font-cn').innerText = '中文';
            document.getElementById('label-font-en').innerText = '英文';
            
            const style = document.getElementById('custom-font-style');
            if (style) style.innerHTML = ''; 
            renderFontPresets();
        } 
        else if (type === 'cn') {
            document.getElementById('font-upload-cn').click();
        }
        else if (type === 'en') {
            document.getElementById('font-upload-en').click();
        }
    }

    // 监听上传
    document.getElementById('font-upload-cn').addEventListener('change', async function(e) {
        const file = e.target.files[0]; if (!file) return;
        showToast('正在研墨...');
        const fileId = 'font_cn_' + Date.now();
        await FileDB.save(fileId, file);
        
        localStorage.setItem('current_cn_font_id', fileId);
        const shortName = file.name.substring(0, 2);
        localStorage.setItem('current_cn_font_name', shortName);
        document.getElementById('label-font-cn').innerText = shortName;
        
        document.getElementById('brush-cn').classList.add('active');
        document.getElementById('brush-default').classList.remove('active');
        localStorage.removeItem('jinyu_active_preset_id'); // 手动传字，脱离预设
        
        applyFonts(); renderFontPresets(); e.target.value = '';
    });

    document.getElementById('font-upload-en').addEventListener('change', async function(e) {
        const file = e.target.files[0]; if (!file) return;
        showToast('正在研墨...');
        const fileId = 'font_en_' + Date.now();
        await FileDB.save(fileId, file);
        
        localStorage.setItem('current_en_font_id', fileId);
        const shortName = file.name.substring(0, 2);
        localStorage.setItem('current_en_font_name', shortName);
        document.getElementById('label-font-en').innerText = shortName;
        
        document.getElementById('brush-en').classList.add('active');
        document.getElementById('brush-default').classList.remove('active');
        localStorage.removeItem('jinyu_active_preset_id'); 
        
        applyFonts(); renderFontPresets(); e.target.value = '';
    });

async function applyFonts() {
    const cnId = localStorage.getItem('current_cn_font_id');
    const enId = localStorage.getItem('current_en_font_id');
    
    const cnActive = document.getElementById('brush-cn').classList.contains('active');
    const enActive = document.getElementById('brush-en').classList.contains('active');
    const activeId = cnActive ? cnId : (enActive ? enId : null);
    
    let styleStr = '';
    if (activeId) {
        const file = await FileDB.get(activeId);
        if (file) {
            styleStr += `@font-face { font-family: 'JinyuFont'; src: url('${URL.createObjectURL(file)}'); } `;
            styleStr += `.lyric-col, .mirror-line, .reflect-line, .mirror-translate, #play-song-title { font-family: 'JinyuFont', 'STKaiti', serif !important; }`;
        }
    }
    let styleEl = document.getElementById('custom-font-style');
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'custom-font-style'; document.head.appendChild(styleEl); }
    styleEl.innerHTML = styleStr;
}


    // ==========================================
    // 纸短情长：浮动气泡伴聊系统
    // ==========================================
    let currentRole = null;
    let bubbleTimeoutL, bubbleTimeoutR;

    function handleAvatarClick() {
        if (!currentRole) {
            document.getElementById('role-drawer').classList.add('active');
            document.getElementById('chat-overlay').classList.add('active');
        } else {
            document.getElementById('chat-input').placeholder = `与 ${currentRole.name} 闲聊...`;
            document.getElementById('chat-input-bar').classList.add('active');
            document.getElementById('chat-overlay').classList.add('active');
            setTimeout(() => document.getElementById('chat-input').focus(), 100);
        }
    }

    function selectRole(icon, name) {
        currentRole = { icon, name };
        document.getElementById('role-avatar').innerText = icon;
        closeChatAll();
        setTimeout(() => { showBubble('left', `我是${name}，一起听歌吗？`); }, 500);
    }

    function closeChatAll() {
        document.getElementById('role-drawer').classList.remove('active');
        document.getElementById('chat-input-bar').classList.remove('active');
        document.getElementById('chat-overlay').classList.remove('active');
    }

    function openRoleDrawer() {
        document.getElementById('chat-input-bar').classList.remove('active');
        document.getElementById('role-drawer').classList.add('active');
        document.getElementById('chat-overlay').classList.add('active');
    }

    function sendChatMessage() {
        checkBadgeProgress('f3');
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        closeChatAll();

        showBubble('right', text);

        setTimeout(() => {
            const reply = getMockReply(text);
            showBubble('left', reply);
        }, 1200);
    }

    function showBubble(side, text) {
        const el = document.getElementById(`bubble-${side}`);
        el.innerText = text;
        el.classList.add('show');

        if (side === 'left') clearTimeout(bubbleTimeoutL);
        if (side === 'right') clearTimeout(bubbleTimeoutR);

        const timeout = setTimeout(() => { el.classList.remove('show'); }, 4000);

        if (side === 'left') bubbleTimeoutL = timeout;
        if (side === 'right') bubbleTimeoutR = timeout;
    }

    function getMockReply(text) {
        const role = currentRole.name;
        if (role === '听歌搭子') {
            if (text.includes('好听') || text.includes('喜欢')) return '确实不错，这首我早就加红心了。';
            if (text.includes('难过') || text.includes('烦')) return '听点欢快的吧，别想太多。';
            return '嗯嗯，我在听呢。';
        } 
        else if (role === '情感树洞') {
            if (text.includes('好听') || text.includes('喜欢')) return '这首歌的歌词写得真好，很懂你吧。';
            if (text.includes('难过') || text.includes('烦')) return '抱抱你，今天辛苦了，把烦恼都交给音乐吧。';
            return '没关系，你可以随便说，我都在。';
        }
        else if (role === '毒舌网友') {
            if (text.includes('好听') || text.includes('喜欢')) return '就这？你这品味有待提高啊。';
            if (text.includes('难过') || text.includes('烦')) return '又emo了？网抑云时间还没到呢，收一收。';
            return '有话快说，别打扰我听前奏。';
        }
    }



    window.addEventListener('DOMContentLoaded', () => {
    // 清理幽灵徽章：过滤掉 equipped 里已不存在的 ID
    if (badgeUserData.equipped) {
        const allValidIds = [
            ...badgeSeries.flatMap(s => s.badges.map(b => b.id)),
            ...badgeUserData.customBadges.map(b => b.id)
        ];
        badgeUserData.equipped = badgeUserData.equipped.filter(id => allValidIds.includes(id));
        saveBadgeData();
    }
    
    const savedAvatar = localStorage.getItem('jinyu_avatar'); 
    if (savedAvatar) updateAvatars(savedAvatar);
        const savedName = localStorage.getItem('jinyu_name'); if (savedName) document.getElementById('user-name').innerText = savedName;
        const savedSig = localStorage.getItem('jinyu_sig'); if (savedSig) document.getElementById('user-sig').innerText = savedSig;
        renderMainPlaylists();
        loadStats();
        checkBadgeProgress();

                // 初始化玉牌和笔山状态
        renderFontPresets();
        const activePreset = localStorage.getItem('jinyu_active_preset_id');
        if (activePreset) {
            applyFontPreset(activePreset);
        } else if (localStorage.getItem('current_cn_font_id') || localStorage.getItem('current_en_font_id')) {
            document.getElementById('brush-default').classList.remove('active');
            if (localStorage.getItem('current_cn_font_id')) {
                document.getElementById('brush-cn').classList.add('active');
                document.getElementById('label-font-cn').innerText = localStorage.getItem('current_cn_font_name');
            }
            if (localStorage.getItem('current_en_font_id')) {
                document.getElementById('brush-en').classList.add('active');
                document.getElementById('label-font-en').innerText = localStorage.getItem('current_en_font_name');
            }
            applyFonts();
        }
                // 绑定回车发送聊天
        document.getElementById('chat-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendChatMessage();
        });

    });