// ==========================================
// SoundTV - Lógica principal
// ==========================================

let TOKEN = null;            // Token de la app (Client Credentials)
let CLIENT_ID = null;
let USER_TOKEN = null;       // Token del usuario (OAuth)
let USER_INFO = null;        // Datos del usuario logueado
let focusableElements = [];
let currentFocusIndex = 0;
let currentSection = 'followed';

// Canales de ejemplo (para cuando NO hay login)
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
    await checkOAuthRedirect();  // Procesa el token si viene del login
    await initApp();
    updateUserArea();
};

async function initApp() {
    try {
        const res = await fetch('/api/twitch-token');
        if (!res.ok) throw new Error('Error obteniendo token');

        const data = await res.json();
        TOKEN = data.token;
        CLIENT_ID = data.clientId;

        // Cargar la sección por defecto
        await loadSection('followed');
    } catch (err) {
        console.error('Error iniciando SoundTV:', err);
        showMessage('⚠️ Error al cargar. Verifica las credenciales en Vercel.');
    }
}

// ==========================================
// 2. OAUTH CON TWITCH
// ==========================================
async function checkOAuthRedirect() {
    // El token viene en el hash de la URL: #access_token=xxx
    if (window.location.hash.includes('access_token')) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        USER_TOKEN = params.get('access_token');

        if (USER_TOKEN) {
            localStorage.setItem('soundtv_user_token', USER_TOKEN);
            // Limpiar el hash de la URL
            history.replaceState(null, '', window.location.pathname);
            // Obtener info del usuario
            await fetchUserInfo();
        }
    } else {
        // Intentar recuperar de sesión anterior
        USER_TOKEN = localStorage.getItem('soundtv_user_token');
        if (USER_TOKEN) {
            await fetchUserInfo();
            if (!USER_INFO) {
                // Token expirado o inválido
                USER_TOKEN = null;
                localStorage.removeItem('soundtv_user_token');
            }
        }
    }
}

async function fetchUserInfo() {
    try {
        const res = await fetch('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${USER_TOKEN}`
            }
        });
        const data = await res.json();
        if (data.data && data.data.length > 0) {
            USER_INFO = data.data[0];
        }
    } catch (err) {
        console.error('Error obteniendo info de usuario:', err);
    }
}

function loginWithTwitch() {
    const redirectUri = window.location.origin;
    const scopes = 'user:read:follows';
    const url = `https://id.twitch.tv/oauth2/authorize` +
        `?client_id=${CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token` +
        `&scope=${scopes}`;
    window.location.href = url;
}

function logout() {
    USER_TOKEN = null;
    USER_INFO = null;
    localStorage.removeItem('soundtv_user_token');
    updateUserArea();
    loadSection('followed');
}

// ==========================================
// 3. UI DEL USUARIO (arriba a la derecha)
// ==========================================
function updateUserArea() {
    const area = document.getElementById('user-area');

    if (USER_INFO) {
        area.innerHTML = `
            <div class="user-info">
                <img src="${USER_INFO.profile_image_url}" alt="avatar">
                <span>${USER_INFO.display_name}</span>
                <button class="logout-btn" id="logout-btn">Salir</button>
            </div>
        `;
        document.getElementById('logout-btn').onclick = logout;
    } else {
        area.innerHTML = `
            <button class="login-btn" id="login-btn">Iniciar sesión con Twitch</button>
        `;
        document.getElementById('login-btn').onclick = loginWithTwitch;
    }
}

// ==========================================
// 4. CONTROL REMOTO (Tizen)
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
        console.warn('Tizen no disponible');
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
// 5. NAVEGACIÓN ESPACIAL
// ==========================================
function refreshFocusableElements() {
    focusableElements = Array.from(
        document.querySelectorAll(
            '.stream-card:not([style*="display: none"]), #sidebar-menu li, .login-btn, .logout-btn'
        )
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
            behavior: 'smooth', block: 'nearest'
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
        window.location.href = `player.html?channel=${el.dataset.channel}`;
    } else if (el.dataset.section) {
        handleSidebarClick(el.dataset.section);
    } else if (el.id === 'login-btn') {
        loginWithTwitch();
    } else if (el.id === 'logout-btn') {
        logout();
    }
}

function goBack() {
    if (window.location.pathname.includes('player.html')) {
        window.location.href = 'index.html';
    }
}

// ==========================================
// 6. SIDEBAR Y SECCIONES
// ==========================================
function setupSidebarNavigation() {
    document.querySelectorAll('#sidebar-menu li').forEach(item => {
        item.addEventListener('click', () => handleSidebarClick(item.dataset.section));
    });
}

function handleSidebarClick(section) {
    currentSection = section;
    document.querySelectorAll('#sidebar-menu li').forEach(li => {
        li.classList.toggle('active', li.dataset.section === section);
    });
    loadSection(section);
}

async function loadSection(section) {
    const container = document.getElementById('stream-container');
    const loading = document.getElementById('loading');
    const title = document.getElementById('page-title');

    // Títulos por sección
    const titles = {
        followed: 'Seguidos',
        games: 'Juegos Seguidos',
        past: 'Transmisiones Pasadas',
        channels: 'Canales Seguidos',
        top: 'Juegos Populares',
        settings: 'Configuración'
    };
    title.textContent = titles[section] || 'SoundTV';

    container.innerHTML = '';
    loading.style.display = 'block';

    // Secciones que requieren login
    const loginRequired = ['followed', 'games', 'past', 'channels'];

    if (loginRequired.includes(section) && !USER_TOKEN) {
        showLoginRequired();
        return;
    }

    switch (section) {
        case 'followed':
            await loadFollowedStreams();
            break;
        case 'top':
            await loadTopStreams();
            break;
        case 'past':
            await loadPastStreams();
            break;
        case 'games':
        case 'channels':
        case 'settings':
            showMessage('🚧 Esta sección estará disponible pronto.');
            break;
    }
}

function showLoginRequired() {
    const container = document.getElementById('stream-container');
    const loading = document.getElementById('loading');
    loading.style.display = 'none';

    container.innerHTML = `
        <div class="login-required">
            <h2>🔒 Inicia sesión para continuar</h2>
            <p>Necesitas iniciar sesión con Twitch para ver tus canales seguidos.</p>
            <button class="login-btn" id="login-required-btn">Iniciar sesión con Twitch</button>
        </div>
    `;
    document.getElementById('login-required-btn').onclick = loginWithTwitch;
    refreshFocusableElements();
    document.getElementById('login-required-btn').focus();
}

function showMessage(text) {
    const container = document.getElementById('stream-container');
    const loading = document.getElementById('loading');
    loading.style.display = 'none';
    container.innerHTML = `<div class="login-required"><p>${text}</p></div>`;
}

// ==========================================
// 7. CARGAR STREAMS (requiere login)
// ==========================================
async function loadFollowedStreams() {
    const container = document.getElementById('stream-container');
    const loading = document.getElementById('loading');

    try {
        // 1. Obtener los canales que el usuario sigue
        const followsRes = await fetch(
            `https://api.twitch.tv/helix/channels/followed?user_id=${USER_INFO.id}&first=20`,
            {
                headers: {
                    'Client-ID': CLIENT_ID,
                    'Authorization': `Bearer ${USER_TOKEN}`
                }
            }
        );
        const followsData = await followsRes.json();
        const followedIds = followsData.data.map(f => f.broadcaster_id);

        if (followedIds.length === 0) {
            showMessage('No sigues a ningún canal todavía.');
            return;
        }

        // 2. Obtener los streams en vivo de esos canales
        const query = followedIds.slice(0, 20).map(id => `user_id=${id}`).join('&');
        const streamsRes = await fetch(
            `https://api.twitch.tv/helix/streams?${query}`,
            {
                headers: {
                    'Client-ID': CLIENT_ID,
                    'Authorization': `Bearer ${USER_TOKEN}`
                }
            }
        );
        const streamsData = await streamsRes.json();

        if (!streamsData.data || streamsData.data.length === 0) {
            showMessage('Ninguno de los canales que sigues está en vivo ahora.');
            return;
        }

        renderStreamCards(streamsData.data);
        loading.style.display = 'none';

    } catch (err) {
        console.error('Error:', err);
        showMessage('⚠️ Error al cargar tus canales seguidos.');
    }
}

// ==========================================
// 8. TRANSMISIONES PASADAS
// ==========================================
async function loadPastStreams() {
    const container = document.getElementById('stream-container');
    const loading = document.getElementById('loading');

    try {
        // 1. Obtener canales seguidos
        const followsRes = await fetch(
            `https://api.twitch.tv/helix/channels/followed?user_id=${USER_INFO.id}&first=20`,
            {
                headers: {
                    'Client-ID': CLIENT_ID,
                    'Authorization': `Bearer ${USER_TOKEN}`
                }
            }
        );
        const followsData = await followsRes.json();
        const followedIds = followsData.data.map(f => f.broadcaster_id);

        if (followedIds.length === 0) {
            showMessage('No sigues a ningún canal todavía.');
            return;
        }

        // 2. Obtener últimos videos de cada canal (máx 5 canales para no exceder límites)
        const allVideos = [];
        for (const id of followedIds.slice(0, 5)) {
            const videosRes = await fetch(
                `https://api.twitch.tv/helix/videos?user_id=${id}&first=3&type=archive`,
                {
                    headers: {
                        'Client-ID': CLIENT_ID,
                        'Authorization': `Bearer ${USER_TOKEN}`
                    }
                }
            );
            const videosData = await videosRes.json();
            if (videosData.data) {
                allVideos.push(...videosData.data);
            }
        }

        if (allVideos.length === 0) {
            showMessage('No hay transmisiones pasadas de tus canales seguidos.');
            return;
        }

        renderVideoCards(allVideos);
        loading.style.display = 'none';

    } catch (err) {
        console.error('Error:', err);
        showMessage('⚠️ Error al cargar transmisiones pasadas.');
    }
}

// ==========================================
// 9. TOP STREAMS (no requiere login)
// ==========================================
async function loadTopStreams() {
    const loading = document.getElementById('loading');

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
        renderStreamCards(data.data);
        loading.style.display = 'none';
    } catch (err) {
        console.error(err);
        showMessage('⚠️ Error al cargar streams.');
    }
}

// ==========================================
// 10. RENDERIZADO DE TARJETAS
// ==========================================
function renderStreamCards(streams) {
    const container = document.getElementById('stream-container');
    container.innerHTML = '';

    streams.forEach(stream => {
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

    refreshFocusableElements();
    focusableElements[0]?.focus();
}

function renderVideoCards(videos) {
    const container = document.getElementById('stream-container');
    container.innerHTML = '';

    videos.forEach(video => {
        const card = document.createElement('div');
        card.className = 'stream-card';
        card.tabIndex = 0;
        card.dataset.channel = video.user_login;
        card.dataset.videoId = video.id;
        card.innerHTML = `
            <img src="${video.thumbnail_url.replace('%{width}', '440').replace('%{height}', '248')}"
                 alt="${video.title}"
                 onerror="this.src='https://static-cdn.jtvnw.net/ttv-static/404_preview-440x248.jpg'">
            <div class="stream-info">
                <h3>${video.user_name}</h3>
                <p>${video.title}</p>
                <span>⏱️ ${video.duration} · ${video.created_at.substring(0, 10)}</span>
            </div>
        `;
        card.addEventListener('click', () => {
            window.open(video.url, '_blank');
        });
        container.appendChild(card);
    });

    refreshFocusableElements();
    focusableElements[0]?.focus();
}
