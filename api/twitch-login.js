// api/twitch-login.js
// Redirige al usuario a la página de autorización de Twitch

export default function handler(req, res) {
    const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
    // ⚠️ Debe coincidir EXACTAMENTE con la URL registrada en Twitch
    const REDIRECT_URI = 'https://soundtv.vercel.app/api/twitch-auth-callback';
    const SCOPES = 'user:read:follows';

    const authUrl = `https://id.twitch.tv/oauth2/authorize` +
        `?client_id=${CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${SCOPES}`;

    res.redirect(authUrl);
}
