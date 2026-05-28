/**
 * tunnel.js
 * Starts a Cloudflare Quick Tunnel exposing the local backend (port 3000) to the internet,
 * then automatically updates EXPO_PUBLIC_API_URL in .env with the public tunnel URL.
 * Run: node tunnel.js  (or: pnpm tunnel from apps/frontend)
 *
 * Requires cloudflared installed:
 *   winget install Cloudflare.cloudflared
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '.env');
const TUNNEL_URL_REGEX = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

function updateEnv(url) {
    if (!fs.existsSync(ENV_PATH)) {
        console.error('❌ .env not found at', ENV_PATH);
        return;
    }

    const original = fs.readFileSync(ENV_PATH, 'utf8');

    if (!/EXPO_PUBLIC_API_URL=/.test(original)) {
        console.warn('⚠️  EXPO_PUBLIC_API_URL not found in .env — nothing changed.');
        return;
    }

    const updated = original.replace(/EXPO_PUBLIC_API_URL=.*/, `EXPO_PUBLIC_API_URL='${url}'`);
    fs.writeFileSync(ENV_PATH, updated, 'utf8');

    console.log(`\n✅ EXPO_PUBLIC_API_URL → ${url}`);
    console.log('ℹ️  Restart Expo (press r in the Expo terminal) for the change to take effect.\n');
}

const isWindows = process.platform === 'win32';
const cloudflared = spawn(
    isWindows ? 'cmd' : 'cloudflared',
    isWindows
        ? ['/c', 'cloudflared', 'tunnel', '--url', 'http://localhost:3000']
        : ['tunnel', '--url', 'http://localhost:3000'],
    { stdio: ['ignore', 'pipe', 'pipe'] }
);

let urlFound = false;

function handleOutput(chunk) {
    const text = chunk.toString();
    process.stdout.write(text);

    if (!urlFound) {
        const match = text.match(TUNNEL_URL_REGEX);
        if (match) {
            urlFound = true;
            updateEnv(match[0]);
        }
    }
}

cloudflared.stdout.on('data', handleOutput);
cloudflared.stderr.on('data', handleOutput);

cloudflared.on('error', (err) => {
    if (err.code === 'ENOENT') {
        console.error(
            '\n❌ cloudflared not found in PATH.\n' +
            '   If you just installed it, close this terminal and open a new one.\n' +
            '   If not installed yet: winget install Cloudflare.cloudflared\n'
        );
    } else {
        console.error('❌ cloudflared error:', err.message);
    }
    process.exit(1);
});

cloudflared.on('close', (code) => {
    console.log(`\nTunnel closed (exit code ${code})`);
});

process.on('SIGINT', () => {
    cloudflared.kill();
    process.exit(0);
});
