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