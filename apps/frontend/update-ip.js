/**
 * update-ip.js
 * Automatically detects the machine's LAN IP and updates EXPO_PUBLIC_API_URL in .env.
 * Run: node update-ip.js  (or: pnpm update-ip from apps/frontend)
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

const VIRTUAL_ADAPTER_PATTERN = /virtual|vmware|vmnet|vethernet|hyper-v|docker|wsl|loopback|virtualbox/i;

function getLanIp() {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    for (const name of Object.keys(interfaces)) {
        if (VIRTUAL_ADAPTER_PATTERN.test(name)) continue;

        for (const iface of interfaces[name]) {
            if (iface.family !== 'IPv4' || iface.internal) continue;
            const addr = iface.address;
            if (
                addr.startsWith('192.168.') ||
                addr.startsWith('10.') ||
                /^172\.(1[6-9]|2\d|3[01])\./.test(addr)
            ) {
                candidates.push({ name, addr });
            }
        }
    }

    if (candidates.length === 0) return null;

    // Prefer real Wi-Fi/Ethernet adapters if multiple candidates remain.
    const preferred = candidates.find((c) => /wi-?fi|ethernet/i.test(c.name));
    return (preferred || candidates[0]).addr;
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

if (!/EXPO_PUBLIC_API_URL=/.test(original)) {
    console.warn('⚠️  EXPO_PUBLIC_API_URL line not found in .env — nothing changed.');
    process.exit(1);
}

const newLine = `EXPO_PUBLIC_API_URL='http://${ip}:3000'`;
const updated = original.replace(/EXPO_PUBLIC_API_URL=.*/, newLine);

if (original === updated) {
    console.log(`✅ EXPO_PUBLIC_API_URL already set to http://${ip}:3000 — no change needed.`);
    process.exit(0);
}

fs.writeFileSync(envPath, updated, 'utf8');
console.log(`✅ EXPO_PUBLIC_API_URL set to http://${ip}:3000`);
console.log('ℹ️  Restart the Expo dev server (press s then r, or Ctrl+C and re-run) for the change to take effect.');
