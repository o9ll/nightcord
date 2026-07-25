import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..', '..');
const distDir = path.join(rootDir, 'dist', 'desktop');

console.log("[collect] Collecting assets into dist/desktop...");

if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

function copyIfExists(src, dst) {
    if (fs.existsSync(src)) {
        if (fs.statSync(src).isDirectory()) {
            fs.cpSync(src, dst, { recursive: true });
        } else {
            fs.copyFileSync(src, dst);
        }
        return true;
    }
    return false;
}


// ── multi-instance icons ────────────────────────────────────────────────────
const lolllSrc    = path.join(process.env.USERPROFILE || "", "Desktop", "lolll");
const outMIIcons  = path.join(distDir, "multi-instance-icons");
fs.mkdirSync(outMIIcons, { recursive: true });
if (fs.existsSync(lolllSrc)) {
    let copied = 0;
    for (let i = 1; i <= 5; i++) {
        const src = path.join(lolllSrc, `${i}.ico`);
        if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(outMIIcons, `${i}.ico`)); copied++; }
    }
    console.log(`[collect] ✅ ${copied} multi-instance icons copied`);
} else {
    console.warn("[collect] ⚠️ Desktop/lolll NOT FOUND — multi-instance icons missing");
}

// ── ghost-server : npm install puis copie ──────────────────────────────────
const ghostServerSrc = path.join(rootDir, "ghost-server");
const ghostServerDst = path.join(distDir, "ghost-server");
if (fs.existsSync(ghostServerSrc)) {
    const packageJson = path.join(ghostServerSrc, "package.json");
    if (fs.existsSync(packageJson)) {
        console.log("[collect] Running npm install in ghost-server (full, no --production)...");
        try {
            execSync("npm install", { cwd: ghostServerSrc, stdio: "inherit" });
            console.log("[collect] ghost-server npm install done.");
        } catch (e) {
            console.error("[collect] ❌ npm install failed in ghost-server:", e.message);
        }
    }
    if (copyIfExists(ghostServerSrc, ghostServerDst)) {
        console.log("[collect] ghost-server folder copied (with node_modules)");
    }
} else {
    console.warn("[collect] ⚠️ ghost-server folder NOT FOUND");
}

// ── mac folder ──────────────────────────────────────────────────────────────
if (copyIfExists(path.join(rootDir, "mac"), path.join(distDir, "mac"))) {
    console.log("[collect] ✅ mac folder copied");
}

console.log("\n[collect] Done collecting assets!");
