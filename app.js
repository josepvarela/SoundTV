const CLIENT_ID = 'TU_CLIENT_ID_AQUI';
const ACCESS_TOKEN = 'TU_TOKEN_AQUI'; // Normalmente se obtiene via OAuth

// Función para obtener los streams seguidos (simulado)
async function getFollowedStreams() {
    // En una app real, aquí llamarías a la API de Twitch: 
    // GET https://api.twitch.tv/helix/streams/followed
    
    // Datos de ejemplo basados en tus capturas (forsen, Quin69, LIRIK)
    const mockData = [
        { user_name: 'forsen', game_name: 'Counter-Strike', viewers: 17083, thumbnail_url: 'url_imagen' },
        { user_name: 'Quin69', game_name: 'Path of Exile', viewers: 5000, thumbnail_url: 'url_imagen' },
        { user_name: 'LIRIK', game_name: 'Just Chatting', viewers: 25000, thumbnail_url: 'url_imagen' }
    ];

    const container = document.getElementById('stream-container');
    
    mockData.forEach(stream => {
        const card = document.createElement('div');
        card.className = 'stream-card';
        card.innerHTML = `
            <img src="${stream.thumbnail_url}" alt="Stream">
            <div class="stream-info">
                <h3>${stream.user_name}</h3>
                <p>${stream.game_name}</p>
                <span>🔴 ${stream.viewers} espectadores</span>
            </div>
        `;
        // Al hacer clic, abrir el reproductor
        card.onclick = () => openPlayer(stream.user_name);
        container.appendChild(card);
    });
}

function openPlayer(channelName) {
    // Redirigir a la página del reproductor con el nombre del canal
    window.location.href = `player.html?channel=${channelName}`;
}

// Inicializar
window.onload = getFollowedStreams;
// ==========================================
// VARIABLES GLOBALES
// ==========================================
let TOKEN = null;
let CLIENT_ID = null;
let focusableElements = [];       // Elementos navegables
let currentFocusIndex = 0;        // Índice del elemento con foco

// Lista de canales de ejemplo (puedes cargarla desde la API de "followed")
const SAMPLE_CHANNELS = ['forsen', 'quin69', 'lirik', 'myth', 'summit1g', 'sodapoppin'];

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================
window.onload = async function () {
    registerRemoteKeys();
    await initApp();
};

async function initApp() {
    try {
        // 1. Obtener token desde la función serverless de Vercel
        const res = await fetch('/api/twitch-token');
        const data = await res.json();
        TOKEN = data.token;
        CLIENT_ID = data.clientId;

        // 2. Cargar streams reales
        await loadStreams(SAMPLE_CHANNELS);
    } catch (err) {
        console.error('Error iniciando app:', err);
    }
}

// ==========================================
// 2. CONTROL REMOTO (Tizen)
// ==========================================
function registerRemoteKeys() {
    try {
        tizen.tvinputdevice.registerKeyBatch([
            'MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop',
            'MediaRewind', 'MediaFastForward'
        ]);
    } catch (e) {
        console.warn('Tizen no disponible (probablemente en navegador)');
    }
}

document.addEventListener('keydown', function (e) {
    switch (e.keyCode) {
        case 37: navigate('left'); break;    // Izquierda
        case 38: navigate('up'); break;      // Arriba
        case 39: navigate('right'); break;   // Derecha
        case 40: navigate('down'); break;    // Abajo
        case 13: selectCurrent(); break;     // Enter
        case 10009: goBack(); break;         // Back
        case 415: playStream(); break;       // Play
        case 19: pauseStream(); break;       // Pause
    }
});

// ==========================================
// 3. NAVEGACIÓN ESPACIAL
// ==========================================
function refreshFocusableElements() {
    focusableElements = Array.from(
        document.querySelectorAll('.stream-card, .sidebar li')
    );
}

function navigate(direction) {
    if (focusableElements.length === 0) return;

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
    }
}

function getDistance(from, to, direction) {
    const centerX = from.left + from.width / 2;
    const centerY = from.top + from.height / 2;
    const toCenterX = to.left + to.width / 2;
    const toCenterY = to.top + to.height / 2;
    const dx = toCenterX - centerX;
    const dy = toCenterY - centerY;

    // Verifica que el candidato esté en la dirección correcta
    if (direction === 'left' && dx > -5) return null;
    if (direction === 'right' && dx < 5) return null;
    if (direction === 'up' && dy > -5) return null;
    if (direction === 'down' && dy < 5) return null;

    return Math.sqrt(dx * dx + dy * dy);
}

function selectCurrent() {
    const el = focusableElements[currentFocusIndex];
    if (!el) return;

    if (el.classList.contains('stream-card')) {
        const channel = el.dataset.channel;
        window.location.href = `player.html?channel=${channel}`;
    } else {
        // Es un ítem del sidebar
        el.click();
    }
}

function goBack() {
    if (window.location.pathname.includes('player.html')) {
        window.location.href = 'index.html';
    }
}

// ==========================================
// 4. CARGAR STREAMS REALES DE TWITCH
// ==========================================
async function loadStreams(channelNames) {
    const container = document.getElementById('stream-container');
    container.innerHTML = '';

    const query = channelNames.map(c => `user_login=${c}`).join('&');

    const response = await fetch(
        `https://api.twitch.tv/helix/streams?${query}`,
        {
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${TOKEN}`
            }
        }
    );

    const data = await response.json();

    // Actualizar contador total de espectadores
    const totalViewers = data.data.reduce((sum, s) => sum + s.viewer_count, 0);
    document.getElementById('viewer-count').textContent =
        `Espectadores Totales: ${totalViewers.toLocaleString()}`;

    // Crear tarjetas
    data.data.forEach(stream => {
        const card = document.createElement('div');
        card.className = 'stream-card';
        card.tabIndex = 0; // Hacer el elemento focusable
        card.dataset.channel = stream.user_login;
        card.innerHTML = `
            <img src="${stream.thumbnail_url.replace('{width}', '440').replace('{height}', '248')}" alt="${stream.user_name}">
            <div class="stream-info">
                <h3>${stream.user_name}</h3>
                <p>${stream.game_name}</p>
                <span>🔴 ${stream.viewer_count.toLocaleString()} espectadores</span>
            </div>
        `;
        container.appendChild(card);
    });

    refreshFocusableElements();
    focusableElements[0]?.focus();
}

// ==========================================
// 5. CONTROLES DE REPRODUCCIÓN (player.html)
// ==========================================
function playStream() {
    const video = document.getElementById('videoPlayer');
    if (video) video.play();
}

function pauseStream() {
    const video = document.getElementById('videoPlayer');
    if (video) video.pause();
}
