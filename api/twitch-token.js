export default async function handler(req, res) {
    try {
        const response = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        });

        if (!response.ok) {
            return res.status(500).json({ error: 'Error al obtener token' });
        }

        const data = await response.json();

        // Devuelve el token y el Client ID (que sí es público) al frontend
        res.setHeader('Cache-Control', 's-maxage=3600'); // Cache 1 hora
        res.status(200).json({
            token: data.access_token,
            clientId: process.env.TWITCH_CLIENT_ID
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
