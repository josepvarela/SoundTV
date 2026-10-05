// ==========================================
// SoundTV - Lógica principal
// ==========================================

let TOKEN = null;
let CLIENT_ID = null;
let focusableElements = [];
let currentFocusIndex = 0;

const SAMPLE_CHANNELS = [
    'forsen', 'quin69', 'lirik', 'myth',
    'summit1g', 'sodapoppin', 'xqc', 'tarik'
];

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================
window.onload = async function () {
    registerRemoteKeys();
    setupSidebarNavigation();
    await initApp();
};

async function initApp() {
    try {
        const res = await fetch('/api/twitch-token');
        if (!res.ok) throw new Error('Error obteniendo token');

        const data = await res.json();
        TOKEN = data.token;
        CLIENT_ID = data.clientId;

        await loadStreams(SAMPLE_CHANNELS);
        document.getElementById('loading').style.display = 'none';
    } catch (err) {
        console.error('Error iniciando SoundTV:', err);
        document.getElementById('loading').textContent =
            '⚠️ Error al cargar streams. Verifica las credenciales en Vercel.';
    }
}

// ==========================================
// 2. CONTROL REMOTO (Tizen)
// ==========================================
function registerRemoteKeys() {
    try {
        if (typeof tizen !== 'undefined' && tizen.tvinputdevice) {
            tizen.tvinputdevice.registerKeyBatch([
                'MediaPlayPause', 'MediaPlay', 'MediaPause',
                'MediaStop', 'MediaRewind', 'MediaFastForward'
            ]);
        }
    } catch (e) {
        console.warn('Tizen no disponible (modo navegador)');
    }
}

document.addEventListener('keydown', function (e) {
    switch (e.keyCode) {
        case 37: navigate('left'); e.preventDefault(); break;
        case 38: navigate('up'); e.preventDefault(); break;
        case 39: navigate('right'); e.preventDefault(); break;
        case 40: navigate('down'); e.preventDefault(); break;
        case 13: selectCurrent(); e.preventDefault(); break;
        case 10009: goBack(); break;
    }
});

// ==========================================
// 3. NAVEGACIÓN ESPACIAL
// ==========================================
function refreshFocusableElements() {
    focusableElements = Array.from(
        document.querySelectorAll('.stream-card:not([style*="display: none"]), #sidebar-menu li')
    );
}

function navigate(direction) {
    if (focusableElements.length === 0) return;

    if (!document.activeElement ||
        !focusableElements.includes(document.activeElement)) {
        currentFocusIndex = 0;
        focusableElements[0].focus();
        return;
    }

    currentFocusIndex = focusableElements.indexOf(document.activeElement);
    const current = focusableElements[currentFocusIndex];
    const currentRect = current.getBoundingClientRect();

    let bestCandidate = null;
    let bestDistance = Infinity;

    focusableElements.forEach((el, idx) => {
        if (el === current) return;
        const rect = el.getBoundingClientRect();
        const distance = getDistance(currentRect, rect, direction);
        if (distance !== null && distance < bestDistance) {
            bestDistance = distance;
            bestCandidate = idx;
        }
    });

    if (bestCandidate !== null) {
        currentFocusIndex = bestCandidate;
        focusableElements[currentFocusIndex].focus();
        focusableElements[currentFocusIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }
}

function getDistance(from, to, direction) {
    const centerX = from.left + from.width / 2;
    const centerY = from.top + from.height / 2;
    const toCenterX = to.left + to.width / 2;
    const toCenterY = to.top + to.height / 2;
    const dx = toCenterX - centerX;
    const dy = toCenterY - centerY;

    if (direction === 'left' && dx > -5) return null;
    if (direction === 'right' && dx < 5) return null;
    if (direction === 'up' && dy > -5) return null;
    if (direction === 'down' && dy < 5) return null;

    return Math.sqrt(dx * dx + dy * dy);
}

function selectCurrent() {
    const el = document.activeElement;
    if (!el) return;

    if (el.classList.contains('stream-card')) {
        const channel = el.dataset.channel;
        window.location.href = `player.html?channel=${channel}`;
    } else if (el.dataset.section) {
        handleSidebarClick(el.dataset.section);
    }
}

function goBack() {
    if (window.location.pathname.includes('player.html')) {
        window.location.href = 'index.html';
    }
}

// ==========================================
// 4. SIDEBAR
// ==========================================
function setupSidebarNavigation() {
    const menuItems = document.querySelectorAll('#sidebar-menu li');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            handleSidebarClick(item.dataset.section);
        });
    });
}

function handleSidebarClick(section) {
    document.querySelectorAll('#sidebar-menu li').forEach(li => {
        li.classList.toggle('active', li.dataset.section === section);
    });

    switch (section) {
        case 'followed':
            loadStreams(SAMPLE_CHANNELS);
            break;
        case 'top':
            loadTopStreams();
            break;
        default:
            console.log('Sección:', section);
    }
}

// ==========================================
// 5. CARGAR STREAMS
// ==========================================
async function loadStreams(channelNames) {
    const container = document.getElementById('stream-container');
    container.innerHTML = '';
    document.getElementById('loading').style.display = 'block';
    document.getElementById('loading').textContent = 'Cargando streams...';

    const query = channelNames.map(c => `user_login=${c}`).join('&');

    try {
        const response = await fetch(
            `https://api.twitch.tv/helix/streams?${query}&first=20`,
            {
                headers: {
                    'Client-ID': CLIENT_ID,
                    'Authorization': `Bearer ${TOKEN}`
                }
            }
        );

        const data = await response.json();

        if (!data.data || data.data.length === 0) {
            document.getElementById('loading').textContent =
                'Ningún canal está en vivo ahora mismo.';
            return;
        }

        const totalViewers = data.data.reduce((sum, s) => sum + s.viewer_count, 0);
        document.getElementById('viewer-count').textContent =
            `Espectadores Totales: ${totalViewers.toLocaleString()}`;

        data.data.forEach(stream => {
            const card = document.createElement('div');
            card.className = 'stream-card';
            card.tabIndex = 0;
            card.dataset.channel = stream.user_login;
            card.innerHTML = `
                <img src="${stream.thumbnail_url.replace('{width}', '440').replace('{height}', '248')}"
                     alt="${stream.user_name}"
                     onerror="this.src='https://static-cdn.jtvnw.net/ttv-static/404_preview-440x248.jpg'">
                <div class="stream-info">
                    <h3>${stream.user_name}</h3>
                    <p>${stream.game_name || 'Sin categoría'}</p>
                    <span>🔴 ${stream.viewer_count.toLocaleString()} espectadores</span>
                </div>
            `;
            card.addEventListener('click', () => {
                window.location.href = `player.html?channel=${stream.user_login}`;
            });
            container.appendChild(card);
        });

        document.getElementById('loading').style.display = 'none';
        refreshFocusableElements();

        if (focusableElements.length > 0) {
            currentFocusIndex = 0;
            focusableElements[0].focus();
        }

    } catch (err) {
        console.error('Error cargando streams en SoundTV:', err);
        document.getElementById('loading').textContent =
            '⚠️ Error al cargar streams.';
    }
}

// ==========================================
// 6. TOP STREAMS
// ==========================================
async function loadTopStreams() {
    const container = document.getElementById('stream-container');
    container.innerHTML = '';
    document.getElementById('loading').style.display = 'block';

    try {
        const response = await fetch(
            'https://api.twitch.tv/helix/streams?first=20',
            {
                headers: {
                    'Client-ID': CLIENT_ID,
                    'Authorization': `Bearer ${TOKEN}`
                }
            }
        );

        const data = await response.json();

        const totalViewers = data.data.reduce((sum, s) => sum + s.viewer_count, 0);
        document.getElementById('viewer-count').textContent =
            `Top Streams - ${totalViewers.toLocaleString()} espectadores`;

        data.data.forEach(stream => {
            const card = document.createElement('div');
            card.className = 'stream-card';
            card.tabIndex = 0;
            card.dataset.channel = stream.user_login;
            card.innerHTML = `
                <img src="${stream.thumbnail_url.replace('{width}', '440').replace('{height}', '248')}"
                     alt="${stream.user_name}"
                     onerror="this.src='https://static-cdn.jtvnw.net/ttv-static/404_preview-440x248.jpg'">
                <div class="stream-info">
                    <h3>${stream.user_name}</h3>
                    <p>${stream.game_name || 'Sin categoría'}</p>
                    <span>🔴 ${stream.viewer_count.toLocaleString()} espectadores</span>
                </div>
            `;
            card.addEventListener('click', () => {
                window.location.href = `player.html?channel=${stream.user_login}`;
            });
            container.appendChild(card);
        });

        document.getElementById('loading').style.display = 'none';
        refreshFocusableElements();
        focusableElements[0]?.focus();

    } catch (err) {
        console.error(err);
    }
}