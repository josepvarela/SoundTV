// api/twitch-token.js
// Función serverless de Vercel para SoundTV
// Obtiene un token de Twitch de forma segura

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    try {
        const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
        const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

        if (!CLIENT_ID || !CLIENT_SECRET) {
            return res.status(500).json({
                error: 'Faltan variables de entorno TWITCH_CLIENT_ID o TWITCH_CLIENT_SECRET'
            });
        }

        const response = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({
                error: 'Error al obtener token de Twitch',
                details: errorText
            });
        }

        const data = await response.json();

        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

        return res.status(200).json({
            token: data.access_token,
            clientId: CLIENT_ID
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}