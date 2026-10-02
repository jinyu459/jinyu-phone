// ============ 核心：网格系统与拖拽逻辑 ============
document.addEventListener("DOMContentLoaded", () => {
    sysData.init();

    // --- 1. 花窗组件自由拖拽逻辑 ---
    const widget = document.getElementById('winSys');
    const savedWidgetPos = localStorage.getItem('drag_pos_winSys');
    if (savedWidgetPos) {
        const { left, top } = JSON.parse(savedWidgetPos);
        widget.style.left = left;
        widget.style.top = top;
    }

    // --- 2. 图标网格系统初始化 ---
    const COLS = 3, ROWS = 4;
    const CELL_W = 350 / COLS; // 约 116.6px
    const CELL_H = 500 / ROWS; // 约 125px
    
    // 更新：图标包裹器的宽和高
    const ICON_W = 60;
    const ICON_H = 80; 
    const OFFSET_X = (CELL_W - ICON_W) / 2;
    const OFFSET_Y = (CELL_H - ICON_H) / 2;

    // 默认网格分布 (0: 左屏, 1: 右屏)
    const defaultGrid = [
        ['icon-setting', 'icon-theme', null, null, null, null, null, null, null, null, null, null],
        ['icon-chat', 'icon-worldbook', 'icon-online', 'icon-music', 'icon-farm', 'icon-study', null, null, null, null, null, null]
    ];
    
    let gridData = JSON.parse(localStorage.getItem('icon_grid_data')) || defaultGrid;

    function renderGrid() {
        const grids = [document.getElementById('icon-grid-left'), document.getElementById('icon-grid-right')];
        for (let s = 0; s < 2; s++) {
            for (let i = 0; i < 12; i++) {
                const iconId = gridData[s][i];
                if (iconId) {
                    const iconEl = document.getElementById(iconId);
                    if (iconEl) {
                        grids[s].appendChild(iconEl);
                        const col = i % COLS;
                        const row = Math.floor(i / COLS);
                        iconEl.style.left = `${col * CELL_W + OFFSET_X}px`;
                        iconEl.style.top = `${row * CELL_H + OFFSET_Y}px`;
                    }
                }
            }
        }
    }
    renderGrid();

    // --- 3. 统一拖拽事件处理 ---
    let activeElement = null;
    let isWidget = false;
    let startX, startY;
    let dragStartScreen, dragStartSlot;
    let dragStartTime = 0;
    let lastToggleTime = 0; 

    function getClientPos(e) {
        return {
            x: e.touches ? e.touches[0].clientX : e.clientX,
            y: e.touches ? e.touches[0].clientY : e.clientY
        };
    }

    function dragStart(e) {
        let target = e.target.closest('.icon, .widget-window');
        if (!target) return;

        activeElement = target;
        isWidget = target.classList.contains('widget-window');
        dragStartTime = Date.now();
        const pos = getClientPos(e);

        if (isWidget) {
            startX = pos.x - activeElement.offsetLeft;
            startY = pos.y - activeElement.offsetTop;
        } else {
            startX = pos.x;
            startY = pos.y;
            activeElement.style.transition = 'none'; 
            activeElement.style.zIndex = 1000;
            
            for (let s = 0; s < 2; s++) {
                const idx = gridData[s].indexOf(activeElement.id);
                if (idx !== -1) {
                    dragStartScreen = s;
                    dragStartSlot = idx;
                    break;
                }
            }
        }
    }

    function drag(e) {
        if (!activeElement) return;
        e.preventDefault(); 
        const pos = getClientPos(e);

        if (isWidget) {
            activeElement.style.left = (pos.x - startX) + "px";
            activeElement.style.top = (pos.y - startY) + "px";
        } else {
            const dx = pos.x - startX;
            const dy = pos.y - startY;
            activeElement.style.transform = `translate(${dx}px, ${dy}px)`;

            const phoneRect = document.querySelector('.phone-container').getBoundingClientRect();
            if (Date.now() - lastToggleTime > 800) {
                if (pos.x < phoneRect.left + 40 && currentScreen === 1) {
                    toggleScreen();
                    lastToggleTime = Date.now();
                } else if (pos.x > phoneRect.right - 40 && currentScreen === 0) {
                    toggleScreen();
                    lastToggleTime = Date.now();
                }
            }
        }
    }

    function dragEnd(e) {
        if (!activeElement) return;
        const timeDiff = Date.now() - dragStartTime;
        const pos = e.changedTouches ? {x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY} : {x: e.clientX, y: e.clientY};

        if (isWidget) {
            localStorage.setItem('drag_pos_winSys', JSON.stringify({ left: activeElement.style.left, top: activeElement.style.top }));
        } else {
            activeElement.style.transform = 'none';
            activeElement.style.transition = 'left 0.3s ease, top 0.3s ease';
            activeElement.style.zIndex = 15;

            const moveDist = Math.abs(pos.x - startX) + Math.abs(pos.y - startY);
            if (timeDiff < 200 && moveDist < 10) {
                const url = activeElement.getAttribute('data-url');
                if (url) openApp(url);
            } else {
                const gridEl = currentScreen === 0 ? document.getElementById('icon-grid-left') : document.getElementById('icon-grid-right');
                const rect = gridEl.getBoundingClientRect();
                const targetX = pos.x - rect.left;
                const targetY = pos.y - rect.top;

                let col = Math.floor(targetX / CELL_W);
                let row = Math.floor(targetY / CELL_H);
                
                col = Math.max(0, Math.min(COLS - 1, col));
                row = Math.max(0, Math.min(ROWS - 1, row));
                
                let targetSlot = row * COLS + col;
                let targetScreen = currentScreen;

                if (gridData[targetScreen][targetSlot] !== null && gridData[targetScreen][targetSlot] !== activeElement.id) {
                    sysData.showToast('该位置已有图标');
                } else {
                    gridData[dragStartScreen][dragStartSlot] = null;
                    gridData[targetScreen][targetSlot] = activeElement.id;
                    localStorage.setItem('icon_grid_data', JSON.stringify(gridData));
                }
                renderGrid();
            }
        }
        activeElement = null;
    }

    const desktop = document.getElementById('desktop');
    desktop.addEventListener("touchstart", dragStart, {passive: false});
    desktop.addEventListener("touchend", dragEnd, {passive: false});
    desktop.addEventListener("touchmove", drag, {passive: false});

    desktop.addEventListener("mousedown", dragStart);
    desktop.addEventListener("mouseup", dragEnd);
    desktop.addEventListener("mousemove", drag);
});
