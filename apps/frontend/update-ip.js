/**
 * update-ip.js
 * Automatically detects the machine's LAN IP and updates EXPO_PUBLIC_API_URL in .env.
 * Run: node update-ip.js  (or: pnpm update-ip from apps/frontend)
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

function getLanIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family !== 'IPv4' || iface.internal) continue;
            const addr = iface.address;
            if (
                addr.startsWith('192.168.') ||
                addr.startsWith('10.') ||
                /^172\.(1[6-9]|2\d|3[01])\./.test(addr)
            ) {
                return addr;
            }
        }
    }
    return null;
}

const ip = getLanIp();
if (!ip) {
    console.error('❌ Could not find a LAN IP. Make sure you are connected to a network.');
    process.exit(1);
}

const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found at', envPath);
    process.exit(1);
}

const original = fs.readFileSync(envPath, 'utf8');
const updated = original.replace(
    /EXPO_PUBLIC_API_URL=.*/,
    `EXPO_PUBLIC_API_URL='http://${ip}:3000'`
);

if (original === updated) {
    console.warn('⚠️  EXPO_PUBLIC_API_URL line not found in .env — nothing changed.');
    process.exit(1);
}

fs.writeFileSync(envPath, updated, 'utf8');
console.log(`✅ EXPO_PUBLIC_API_URL set to http://${ip}:3000`);
console.log('ℹ️  Restart the Expo dev server (press s then r, or Ctrl+C and re-run) for the change to take effect.');
