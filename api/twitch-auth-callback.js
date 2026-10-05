// api/twitch-auth-callback.js
// Recibe el código de Twitch y lo intercambia por un token de acceso

export default async function handler(req, res) {
    const { code, error } = req.query;

    // Si Twitch devolvió un error, mostrarlo
    if (error) {
        return res.redirect(`/?error=${error}`);
    }

    if (!code) {
        return res.status(400).send('Falta el código de autorización');
    }

    const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
    const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
    const REDIRECT_URI = 'https://soundtv.vercel.app/api/twitch-auth-callback';

    try {
        // Intercambiar el code por un access_token
        const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI
            })
        });

        if (!tokenRes.ok) {
            const errText = await tokenRes.text();
            return res.status(500).send('Error al obtener token: ' + errText);
        }

        const tokenData = await tokenRes.json();

        // Redirigir al usuario de vuelta a la app con el token en el hash
        // (El hash no se envía al servidor, es más seguro que un query param)
        return res.redirect(`/#access_token=${tokenData.access_token}`);

    } catch (err) {
        return res.status(500).send('Error: ' + err.message);
    }
}
