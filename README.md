# Twitch TV App para Samsung Tizen 🎮📺

Una aplicación no oficial de Twitch optimizada para Smart TVs Samsung (Tizen OS).

## Características
- Interfaz oscura optimizada para control remoto.
- Navegación lateral (Sidebar) para streams seguidos.
- Reproductor de video integrado (HLS).
- Visor de chat en vivo (próximamente).

## Tecnologías
- HTML5 / CSS3 / JavaScript (Vanilla)
- Tizen Web App
- Twitch API (Helix)

## Capturas de pantalla
*(Arrastra aquí las imágenes que me enviaste)*

## Instalación y Pruebas
1. Clona este repositorio.
2. Abre el proyecto en **Tizen Studio**.
3. Conecta tu Samsung TV en modo desarrollador.
4. Ejecuta `Run As > Tizen Web Application`.

## Configuración de la API
Crea un archivo `config.js` con:
```javascript
const TWITCH_CLIENT_ID = 'tu_client_id_aqui';
const TWITCH_ACCESS_TOKEN = 'tu_token_aqui';
