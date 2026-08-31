const BRAND = {
    name: "PhonePe",
    product: "PRECIOUS METALS",
    gameTitle: "Big Wealth Starts Small!",
    tagline: "Catch micro-saving products. Build macro wealth.",
    logo: "assets/logo-phonepe.png",
};

const CONFIG = {
    duration: 30,
    basketSpeed: 620,
    spawnStart: 880,
    spawnEnd: 220,
    fallStart: 170,
    fallEnd: 560,
    maxItemsStart: 5,
    maxItemsEnd: 12,
    catchPoints: 10,
    missPoints: -10,
    fallAccelTime: 0.9,
    itemGap: 22,
    mobileSprite: 0.4,
    tabletSprite: 0.62,
    storageKey: "coinCatcherScores",
};

const SAMPLE_SCORES = [
    { name: "Aarav", score: 240 },
    { name: "Priya", score: 195 },
    { name: "Rohan", score: 160 },
    { name: "Ananya", score: 125 },
    { name: "Vikram", score: 90 },
    { name: "Meera", score: 55 },
];

function stores() {
    const list = [];
    try { list.push(window.localStorage); } catch (_err) { /* blocked */ }
    try { list.push(window.sessionStorage); } catch (_err) { /* blocked */ }
    return list;
}

function readCookie(key) {
    try {
        const parts = document.cookie.split("; ");
        for (const part of parts) {
            const eq = part.indexOf("=");
            if (eq < 0) continue;
            if (decodeURIComponent(part.slice(0, eq)) === key) {
                return decodeURIComponent(part.slice(eq + 1));
            }
        }
    } catch (_err) {
        /* ignore cookie access */
    }
    return null;
}

function storageGetRaw(key) {
    for (const store of stores()) {
        try {
            const raw = store.getItem(key);
            if (raw != null && raw !== "") return raw;
        } catch (_err) {
            /* ignore blocked storage */
        }
    }
    return readCookie(key);
}

function parseScoreRows(raw) {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch (_err) {
        return null;
    }
}

function readStorage(key) {
    const chunks = [];
    for (const store of stores()) {
        try {
            const rows = parseScoreRows(store.getItem(key));
            if (rows) chunks.push(rows);
        } catch (_err) {
            /* ignore blocked storage */
        }
    }
    const cookieRows = parseScoreRows(readCookie(key));
    if (cookieRows) chunks.push(cookieRows);
    if (!chunks.length) return null;
    return chunks.flat();
}

function storageSetRaw(key, value) {
    let ok = false;
    for (const store of stores()) {
        try {
            store.setItem(key, value);
            if (store.getItem(key) === value) ok = true;
        } catch (_err) {
            /* ignore blocked storage */
        }
    }
    try {
        if (String(value).length <= 3500) {
            document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)};path=/;max-age=31536000;SameSite=Lax`;
        }
    } catch (_err) {
        /* ignore cookie access */
    }
    return ok;
}

function storageRemoveRaw(key) {
    for (const store of stores()) {
        try { store.removeItem(key); } catch (_err) { /* ignore blocked storage */ }
    }
    try {
        document.cookie = `${encodeURIComponent(key)}=;path=/;max-age=0;SameSite=Lax`;
    } catch (_err) { /* ignore cookie access */ }
}

function newPlayerId() {
    return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeScores(rows) {
    const best = new Map();
    for (const row of rows || []) {
        const name = String(row?.name || "").trim();
        if (!name) continue;
        const id = String(row?.id || "").trim() || `legacy-${name.toLowerCase()}`;
        const score = Number(row.score);
        const pts = Number.isFinite(score) ? score : 0;
        const prev = best.get(id);
        if (!prev || pts > prev.score || (pts === prev.score && (row.at || 0) > (prev.at || 0))) {
            best.set(id, { id, name, score: pts, at: row.at || Date.now() });
        }
    }
    return [...best.values()].sort((a, b) => b.score - a.score || (b.at || 0) - (a.at || 0) || String(a.name).localeCompare(String(b.name)));
}

function writeStorage(key, value) {
    return storageSetRaw(key, JSON.stringify(value));
}

function sampleRows() {
    const base = Date.now() - 86_400_000;
    return SAMPLE_SCORES.map((row, i) => ({
        id: `sample-${row.name.toLowerCase()}`,
        name: row.name,
        score: row.score,
        at: base - i * 3_600_000,
    }));
}

const ScoreStore = {
    rows: [],
    load() {
        this.rows = normalizeScores([
            ...this.rows,
            ...(readStorage(CONFIG.storageKey) || []),
            ...sampleRows(),
        ]);
        return this.rows.map((row) => ({ ...row }));
    },
    save(rows) {
        this.rows = normalizeScores(rows);
        return writeStorage(CONFIG.storageKey, this.rows);
    },
    upsert(name, score, playerId) {
        const clean = String(name || "").trim().slice(0, 16);
        const id = String(playerId || "").trim();
        if (!clean || !id) return false;
        const pts = Number(score);
        const value = Number.isFinite(pts) ? Math.max(0, pts) : 0;
        const rows = this.load();
        const existing = rows.find((row) => row.id === id);
        if (existing) {
            if (value > existing.score) {
                existing.score = value;
                existing.at = Date.now();
                existing.name = clean;
            }
        } else {
            rows.push({ id, name: clean, score: value, at: Date.now() });
        }
        this.rows = normalizeScores(rows);
        writeStorage(CONFIG.storageKey, this.rows);
        return true;
    },
};
ScoreStore.load();

const ITEMS = {
    gold: { id: "gold", label: "Gold", points: 10, src: "assets/icon-gold.png?v=21", size: 104, glow: "#f0b429", trail: "rgba(240, 180, 41, 0.22)", weight: 28, good: true },
    silver: { id: "silver", label: "Silver", points: 10, src: "assets/icon-silver.png?v=21", size: 100, glow: "#9aa4b2", trail: "rgba(154, 164, 178, 0.22)", weight: 26, good: true },
    platinum: { id: "platinum", label: "Platinum", points: 10, src: "assets/icon-platinum.png?v=21", size: 108, glow: "#8d9aab", trail: "rgba(141, 154, 171, 0.22)", weight: 24, good: true },
    rd: { id: "rd", label: "Daily RD", points: 10, src: "assets/icon-savings.png?v=7", size: 100, glow: "#f472b6", trail: "rgba(244, 114, 182, 0.22)", weight: 22, good: true },
    insurance: { id: "insurance", label: "Insurance", points: 10, src: "assets/icon-insurance.png?v=7", size: 100, glow: "#c4b5fd", trail: "rgba(196, 181, 253, 0.22)", weight: 22, good: true },
    sip: { id: "sip", label: "Daily SIP", points: 10, src: "assets/icon-invest.png?v=7", size: 100, glow: "#4ade80", trail: "rgba(74, 222, 128, 0.22)", weight: 22, good: true },
};

const TIPS = [
    "Don’t miss — a dropped product costs 10 points!",
    "Each catch adds to your micro-savings score.",
    "Gold, silver, platinum, RDs, insurance, and SIPs are all +10.",
    "Move the basket left or right to catch.",
];

function $(id) {
    return document.getElementById(id);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

class Game {
    constructor(images) {
        this.images = images;
        this.canvas = $("gameCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.keys = {};
        this.items = [];
        this.popups = [];
        this.particles = [];
        this.raf = 0;
        this.lastTs = 0;
        this.spawnAt = 0;
        this.mode = "attract";
        this.fromScreen = "title";
        this.prevRanks = {};
        this.scoreSaved = false;
        this.sessionLevel = 0;
        this.playerName = "";
        this.playerId = "";
        this.holdDir = 0;

        this.resetRoundState();
        this.bindUi();
        this.resize();
        window.addEventListener("resize", () => this.resize());
        if (window.ResizeObserver) {
            new ResizeObserver(() => this.resize()).observe($("playfield"));
        }

        this.showScreen("title");
        this.renderBoards();
        this.loop(performance.now());
    }

    resetRoundState() {
        this.score = 0;
        this.timeLeft = CONFIG.duration;
        this.roundElapsed = 0;
        this.items = [];
        this.popups = [];
        this.particles = [];
        this.spawnAt = 0;
        this.stats = { gold: 0, silver: 0, platinum: 0, rd: 0, insurance: 0, sip: 0, missed: 0 };
        this.basketX = 0.5;
        this.scoreSaved = false;
        this.prevRanks = {};
        const saveStatus = $("save-status");
        if (saveStatus) saveStatus.textContent = "";
        this.syncHud();
        this.renderBoards();
    }

    bindUi() {
        document.addEventListener("keydown", (e) => {
            this.keys[e.key] = true;
            if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
            if (e.key === "Escape") this.togglePause();
            if ((e.key === "p" || e.key === "P") && this.mode === "play") this.togglePause();
        });
        document.addEventListener("keyup", (e) => {
            this.keys[e.key] = false;
        });

        $("play-btn").addEventListener("click", () => this.requestPlay("title"));
        $("howto-btn").addEventListener("click", () => {
            this.fromScreen = "title";
            this.showScreen("howto");
        });
        $("message-back-btn").addEventListener("click", () => this.showScreen("title"));
        $("message-go-btn").addEventListener("click", () => this.requestPlay("message"));
        $("howto-back-btn").addEventListener("click", () => this.showScreen(this.fromScreen === "title" ? "title" : "message"));
        $("howto-play-btn").addEventListener("click", () => this.requestPlay("howto"));
        this.bindHold($("move-left"), -1);
        this.bindHold($("move-right"), 1);
        $("leaderboard-btn").addEventListener("click", () => {
            this.fromScreen = "title";
            this.showScreen("leaderboard");
        });
        $("pause-btn").addEventListener("click", () => this.togglePause());
        $("field-pause").addEventListener("click", () => this.togglePause());
        $("resume-btn").addEventListener("click", () => this.togglePause(false));
        $("pause-home-btn").addEventListener("click", () => {
            this.saveScore();
            this.goHome();
        });
        $("replay-btn").addEventListener("click", () => {
            this.saveScore();
            this.beginCountdown();
        });
        $("results-home-btn").addEventListener("click", () => {
            this.saveScore();
            this.goHome();
        });
        $("results-board-btn").addEventListener("click", () => {
            this.saveScore();
            this.fromScreen = "results";
            this.showScreen("leaderboard");
        });
        $("board-back-btn").addEventListener("click", () => this.showScreen(this.fromScreen || "title"));
        $("board-play-btn").addEventListener("click", () => this.requestPlay("leaderboard"));
        $("player-name").addEventListener("keydown", (e) => {
            if (e.key === "Enter") this.requestPlay("title");
        });
        $("player-name").value = "";

        const persistIfPlaying = () => {
            if (this.mode === "play" || this.mode === "paused" || this.mode === "results") this.saveScore();
        };
        window.addEventListener("pagehide", persistIfPlaying);
        window.addEventListener("beforeunload", persistIfPlaying);
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") persistIfPlaying();
        });

        this.canvas.addEventListener("pointerdown", (e) => this.nudgeFromPointer(e));
        this.canvas.addEventListener("pointermove", (e) => {
            if (e.buttons) this.nudgeFromPointer(e);
        });
    }

    nudgeFromPointer(event) {
        if (this.mode !== "play") return;
        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        this.basketX = clamp(x, 0.08, 0.92);
    }

    ensureName() {
        const field = $("player-name");
        const error = $("name-error");
        const name = field.value.trim();
        if (!name) {
            this.showScreen("title");
            error.textContent = "Enter your name to start the round.";
            error.classList.remove("hidden");
            field.classList.add("invalid");
            field.focus();
            return false;
        }
        this.playerName = name.slice(0, 16);
        if (!this.playerId) this.playerId = newPlayerId();
        error.textContent = "";
        error.classList.add("hidden");
        field.classList.remove("invalid");
        return true;
    }

    releasePlayer() {
        this.playerName = "";
        this.playerId = "";
        const field = $("player-name");
        if (field) {
            field.value = "";
            field.classList.remove("invalid");
        }
        const error = $("name-error");
        if (error) {
            error.textContent = "";
            error.classList.add("hidden");
        }
        storageRemoveRaw("coinCatcherPlayerName");
    }

    goHome() {
        this.releasePlayer();
        this.mode = "attract";
        this.sessionLevel = 0;
        this.resetRoundState();
        this.showScreen("title");
    }

    bindHold(btn, dir) {
        if (!btn) return;
        const press = (e) => {
            e.preventDefault();
            btn.setPointerCapture?.(e.pointerId);
            this.holdDir = dir;
        };
        const release = () => {
            if (this.holdDir === dir) this.holdDir = 0;
        };
        btn.addEventListener("pointerdown", press);
        btn.addEventListener("pointerup", release);
        btn.addEventListener("pointercancel", release);
        btn.addEventListener("pointerleave", release);
    }

    requestPlay(from) {
        if (!this.ensureName()) return;
        if (from === "howto") {
            this.beginCountdown();
            return;
        }
        if (from === "message") {
            this.fromScreen = "message";
            this.showScreen("howto");
            return;
        }
        this.showScreen("message");
    }

    showScreen(name) {
        document.querySelectorAll(".screen").forEach((el) => el.classList.add("hidden"));
        const screen = $(`screen-${name}`);
        if (screen) screen.classList.remove("hidden");

        const mode = name === "pause" ? "paused" : name;
        document.body.dataset.mode = mode;

        if (name === "title" || name === "howto" || name === "message") this.mode = "attract";
        if (name === "leaderboard") {
            try { this.persistBest(); } catch (_err) { /* ignore */ }
            this.renderBoards();
        }
        if (name === "howto") storageSetRaw("coinCatcherHowToSeen", "1");
    }

    beginCountdown() {
        if (this.mode === "countdown") return;
        this.resetRoundState();
        this.mode = "countdown";
        this.renderBoards();
        this.showScreenPlayChrome();
        const overlay = $("countdown-overlay");
        const text = $("countdown-text");
        overlay.classList.remove("hidden");
        const beats = ["3", "2", "1", "GO"];
        let i = 0;
        const tick = () => {
            text.textContent = beats[i];
            text.style.animation = "none";
            text.offsetHeight;
            text.style.animation = "";
            i += 1;
            if (i < beats.length) {
                setTimeout(tick, 650);
            } else {
                setTimeout(() => {
                    overlay.classList.add("hidden");
                    this.showStartCue();
                }, 420);
            }
        };
        tick();
    }

    showStartCue() {
        const start = $("start-overlay");
        if (!start) {
            this.mode = "play";
            this.lastTs = performance.now();
            return;
        }
        start.classList.remove("hidden");
        setTimeout(() => {
            start.classList.add("hidden");
            this.mode = "play";
            this.lastTs = performance.now();
        }, 1600);
    }

    showScreenPlayChrome() {
        document.querySelectorAll(".screen").forEach((el) => el.classList.add("hidden"));
        document.body.dataset.mode = "play";
    }

    togglePause(force) {
        if (this.mode !== "play" && this.mode !== "paused") return;
        const shouldPause = force === undefined ? this.mode === "play" : force;
        if (shouldPause) {
            this.mode = "paused";
            this.showScreen("pause");
        } else {
            this.mode = "play";
            this.showScreenPlayChrome();
            this.lastTs = performance.now();
        }
    }

    resize() {
        const field = $("playfield");
        const rect = field.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.max(320, Math.floor(rect.width * dpr));
        this.canvas.height = Math.max(240, Math.floor(rect.height * dpr));
        this.w = this.canvas.width;
        this.h = this.canvas.height;
        this.scale = dpr;
    }

    spriteScale() {
        const cssW = this.w / (this.scale || 1);
        if (cssW <= 480) return CONFIG.mobileSprite;
        if (cssW <= 820) return CONFIG.tabletSprite;
        return 1;
    }

    spritePx(value) {
        return value * this.scale * this.spriteScale();
    }

    difficulty() {
        const round = clamp(this.roundElapsed / CONFIG.duration, 0, 1);
        const session = clamp(this.sessionLevel * 0.22, 0, 1.4);
        return clamp(round * 0.85 + session, 0, 1.7);
    }

    spawnInterval() {
        const d = this.difficulty();
        return CONFIG.spawnStart + (CONFIG.spawnEnd - CONFIG.spawnStart) * Math.min(d, 1);
    }

    fallSpeed() {
        const d = this.difficulty();
        return CONFIG.fallStart + (CONFIG.fallEnd - CONFIG.fallStart) * Math.min(d, 1.15) / 1.15;
    }

    maxItemsNow() {
        const d = Math.min(this.difficulty(), 1);
        return Math.round(CONFIG.maxItemsStart + (CONFIG.maxItemsEnd - CONFIG.maxItemsStart) * d);
    }

    pickItem() {
        const pool = Object.values(ITEMS);
        const total = pool.reduce((sum, item) => sum + item.weight, 0);
        let roll = Math.random() * total;
        for (const item of pool) {
            roll -= item.weight;
            if (roll <= 0) return ITEMS[item.id];
        }
        return ITEMS.gold;
    }

    itemOverlaps(x, y, size, ignore) {
        const gap = this.spritePx(CONFIG.itemGap);
        for (const other of this.items) {
            if (other === ignore) continue;
            if (x < other.x + other.size + gap &&
                x + size + gap > other.x &&
                y < other.y + other.size + gap &&
                y + size + gap > other.y) {
                return true;
            }
        }
        return false;
    }

    pickSpawnX(size) {
        const gap = this.spritePx(CONFIG.itemGap);
        const usable = Math.max(1, this.w - size);
        const laneCount = Math.max(3, Math.floor(this.w / (size + gap)));
        const laneW = usable / Math.max(1, laneCount - 1);
        const blocked = new Set();
        for (const item of this.items) {
            if (item.y > item.size * 1.8) continue;
            blocked.add(clamp(Math.round(item.x / laneW), 0, laneCount - 1));
        }
        const free = [];
        for (let i = 0; i < laneCount; i += 1) {
            if (!blocked.has(i)) free.push(i);
        }
        const lanes = free.length ? free : [...Array(laneCount).keys()];
        for (let n = lanes.length - 1; n > 0; n -= 1) {
            const k = Math.floor(Math.random() * (n + 1));
            [lanes[n], lanes[k]] = [lanes[k], lanes[n]];
        }
        for (const lane of lanes) {
            const jitter = (Math.random() - 0.5) * Math.min(this.spritePx(18), laneW * 0.28);
            const x = clamp(lane * laneW + jitter, 0, usable);
            if (!this.itemOverlaps(x, -size, size)) return x;
        }
        return null;
    }

    spawn() {
        if (this.items.length >= this.maxItemsNow()) return false;
        const def = this.pickItem();
        const size = this.spritePx(def.size);
        const x = this.pickSpawnX(size);
        if (x == null) return false;
        const terminal = this.fallSpeed() * this.scale * (0.82 + Math.random() * 0.28);
        this.items.push({
            def,
            x,
            y: -size - Math.random() * this.spritePx(12),
            size,
            vx: (Math.random() - 0.5) * this.spritePx(36),
            vy: terminal * (0.28 + Math.random() * 0.18),
            terminal,
            rot: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 2.6,
            sway: Math.random() * Math.PI * 2,
            swaySpeed: 1.1 + Math.random() * 1.7,
            swayAmp: this.spritePx(16 + Math.random() * 22),
        });
        return true;
    }

    basketRect() {
        const compact = this.spriteScale() < 0.75;
        const width = this.spritePx(compact ? 172 : 248);
        const height = this.spritePx(compact ? 144 : 208);
        const x = this.basketX * this.w - width / 2;
        const y = this.h - height - this.spritePx(compact ? 10 : 18);
        return { x: clamp(x, 0, this.w - width), y, width, height };
    }

    update(dt) {
        if (this.mode === "attract") {
            this.roundElapsed = (this.roundElapsed + dt) % 20;
            if (this.items.length < 4) this.spawn();
            this.updateItems(dt, false);
            this.basketX = 0.5 + Math.sin(performance.now() / 1400) * 0.28;
            return;
        }

        if (this.mode !== "play") {
            this.updatePopups(dt);
            return;
        }

        this.roundElapsed += dt;
        this.timeLeft = Math.max(0, CONFIG.duration - this.roundElapsed);
        if (this.timeLeft <= 0) {
            this.endRound();
            return;
        }

        let move = this.holdDir;
        if (this.keys.ArrowLeft || this.keys.a || this.keys.A) move -= 1;
        if (this.keys.ArrowRight || this.keys.d || this.keys.D) move += 1;
        this.basketX = clamp(this.basketX + move * (CONFIG.basketSpeed * this.scale / this.w) * dt, 0.08, 0.92);

        this.spawnAt -= dt * 1000;
        if (this.spawnAt <= 0) {
            this.spawnAt = this.spawn() ? this.spawnInterval() : 70;
        }

        this.updateItems(dt, true);
        this.updatePopups(dt);
        this.updateParticles(dt);
        this.syncHud();
    }

    updateItems(dt, collide) {
        const basket = this.basketRect();
        const tight = this.spriteScale() < 0.75;
        const catchZone = {
            x: basket.x + basket.width * (tight ? 0.2 : 0.14),
            y: basket.y + basket.height * (tight ? 0.3 : 0.2),
            width: basket.width * (tight ? 0.56 : 0.7),
            height: basket.height * (tight ? 0.3 : 0.4),
        };

        const accelTime = CONFIG.fallAccelTime;
        this.items.forEach((item) => {
            item.sway += item.swaySpeed * dt;
            item.vy = Math.min(item.terminal, item.vy + (item.terminal / accelTime) * dt);
            item.vx += Math.sin(item.sway) * item.swayAmp * 0.55 * dt;
            item.vx *= Math.pow(0.9, dt * 60);
            item.x += item.vx * dt;
            item.y += item.vy * dt;
            item.rot += item.spin * dt;
            if (item.x < 0) {
                item.x = 0;
                item.vx = Math.abs(item.vx) * 0.35;
            } else if (item.x > this.w - item.size) {
                item.x = this.w - item.size;
                item.vx = -Math.abs(item.vx) * 0.35;
            }
        });
        this.separateItems();
        this.items = this.items.filter((item) => {
            if (collide && this.hits(item, catchZone)) {
                this.catchItem(item);
                return false;
            }
            if (item.y >= this.h - item.size * 0.15) {
                if (collide && item.def.good) this.missItem(item);
                return false;
            }
            return true;
        });
    }

    separateItems() {
        const gap = this.spritePx(CONFIG.itemGap);
        for (let i = 0; i < this.items.length; i += 1) {
            for (let j = i + 1; j < this.items.length; j += 1) {
                const a = this.items[i];
                const b = this.items[j];
                const minX = (a.size + b.size) * 0.5 + gap;
                const minY = (a.size + b.size) * 0.5 + gap;
                const dx = (b.x + b.size / 2) - (a.x + a.size / 2);
                const dy = (b.y + b.size / 2) - (a.y + a.size / 2);
                const overlapX = minX - Math.abs(dx);
                const overlapY = minY - Math.abs(dy);
                if (overlapX <= 0 || overlapY <= 0) continue;
                if (overlapX < overlapY) {
                    const dir = dx < 0 ? -1 : 1;
                    const push = overlapX / 2;
                    a.x -= dir * push;
                    b.x += dir * push;
                    a.vx -= dir * 28 * this.scale;
                    b.vx += dir * 28 * this.scale;
                } else {
                    const dir = dy < 0 ? -1 : 1;
                    const push = overlapY / 2;
                    a.y -= dir * push;
                    b.y += dir * push;
                }
                a.x = clamp(a.x, 0, this.w - a.size);
                b.x = clamp(b.x, 0, this.w - b.size);
            }
        }
    }

    hits(item, zone) {
        return item.x < zone.x + zone.width &&
            item.x + item.size > zone.x &&
            item.y < zone.y + zone.height &&
            item.y + item.size > zone.y;
    }

    catchItem(item) {
        this.applyScore(CONFIG.catchPoints, item.x + item.size / 2, item.y, item.def.glow, true);
        this.stats[item.def.id] += 1;
        if (this.stats.gold + this.stats.silver + this.stats.platinum + this.stats.rd + this.stats.insurance + this.stats.sip === 6) {
            $("tip-text").textContent = TIPS[1];
        }
    }

    missItem(item) {
        this.stats.missed += 1;
        this.applyScore(CONFIG.missPoints, item.x + item.size / 2, this.h - 24 * this.scale, "#ff5d7a", false);
        $("tip-text").textContent = TIPS[0];
    }

    applyScore(points, x, y, glow, good) {
        this.score = Math.max(0, this.score + points);
        this.popups.push({
            x,
            y,
            text: points > 0 ? `+${points}` : `${points}`,
            color: points > 0 ? "#5dffb2" : "#ff5d7a",
            life: 0.8,
        });
        this.burst(x, y, glow, good);
        this.syncHud();
        try { this.persistBest(); } catch (_err) { /* never block scoring */ }
        this.renderBoards();
    }

    currentPlayerName() {
        return (this.playerName || $("player-name")?.value || "").trim();
    }

    boardEntries() {
        const youName = this.currentPlayerName();
        const youId = this.playerId;
        const overlayLive = ["countdown", "play", "paused"].includes(this.mode);
        const saved = this.loadScores();
        const rows = [];
        let sawYou = false;

        for (const row of saved) {
            const name = String(row.name || "").trim();
            if (!name) continue;
            const id = String(row.id || "").trim() || `legacy-${name.toLowerCase()}`;
            const me = Boolean(youId) && id === youId;
            const savedScore = Number(row.score) || 0;
            const score = me && overlayLive ? Math.max(savedScore, this.score) : savedScore;
            if (me) sawYou = true;
            rows.push({
                id,
                name,
                score,
                at: row.at || 0,
                me,
            });
        }

        if (youId && youName && overlayLive && !sawYou) {
            rows.push({
                id: youId,
                name: youName,
                score: this.score,
                at: Date.now(),
                me: true,
            });
        }

        return rows.sort((a, b) => b.score - a.score || (b.at || 0) - (a.at || 0) || String(a.name).localeCompare(String(b.name)));
    }

    boardLabel(row) {
        const safe = String(row.name).replace(/[<>]/g, "");
        return row.me ? `${safe} <span class="you-tag">YOU</span>` : safe;
    }

    renderBoards() {
        const rows = this.boardEntries();
        this.renderLiveBoard(rows);
        this.renderLeaderboard(rows);
    }

    renderLiveBoard(rows = this.boardEntries()) {
        const list = $("live-board-list");
        const you = $("live-board-you");
        if (!list || !you) return;
        const myIndex = rows.findIndex((row) => row.me);
        list.innerHTML = rows.map((row, i) => {
            const prev = this.prevRanks[row.id];
            const move = prev == null || prev === i ? "" : prev > i ? " up" : " down";
            return `<div class="live-row${row.me ? " me" : ""}${move}" data-id="${row.id}">
                <span class="rank">#${i + 1}</span>
                <span class="who">${this.boardLabel(row)}</span>
                <span class="pts">${row.score}</span>
            </div>`;
        }).join("");
        this.prevRanks = Object.fromEntries(rows.map((row, i) => [row.id, i]));
        if (!rows.length) {
            you.textContent = "No scores yet";
        } else if (myIndex < 0) {
            you.textContent = `${rows.length} player${rows.length === 1 ? "" : "s"}`;
        } else {
            you.textContent = myIndex === 0
                ? `You're in the lead · ${rows.length} player${rows.length === 1 ? "" : "s"}`
                : `Rank #${myIndex + 1} of ${rows.length}`;
        }
        const meRow = list.querySelector(".live-row.me");
        if (meRow) meRow.scrollIntoView({ block: "nearest" });
    }

    renderLeaderboard(rows = this.boardEntries()) {
        const list = $("scores-list");
        if (!list) return;
        if (!rows.length) {
            list.innerHTML = `<p class="empty-board">No scores yet. Play a round and save your name.</p>`;
                return;
            }
        list.innerHTML = `
            <div class="scores-header"><div>RANK</div><div>PLAYER</div><div>SCORE</div></div>
            ${rows.map((row, i) => `
                <div class="score-entry${row.me ? " me" : ""}">
                    <div class="rank">#${i + 1}</div>
                    <div>${this.boardLabel(row)}</div>
                    <div>${row.score}</div>
                </div>
            `).join("")}
        `;
    }

    burst(x, y, color, good) {
        const count = good ? 14 : 10;
        for (let i = 0; i < count; i += 1) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 140;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.45 + Math.random() * 0.3,
                color,
                size: 2 + Math.random() * 3,
            });
        }
    }

    updatePopups(dt) {
        this.popups = this.popups.filter((p) => {
            p.life -= dt;
            p.y -= 50 * dt * this.scale;
            return p.life > 0;
        });
    }

    updateParticles(dt) {
        this.particles = this.particles.filter((p) => {
            p.life -= dt;
            p.x += p.vx * dt * this.scale;
            p.y += p.vy * dt * this.scale;
            p.vy += 80 * dt;
            return p.life > 0;
        });
    }

    endRound() {
        if (this.mode === "results") return;
        this.mode = "results";
        this.timeLeft = 0;
        this.sessionLevel += 1;
        this.syncHud();
        try {
            this.saveScore();
        } catch (err) {
            const status = $("save-status");
            if (status) status.textContent = "Could not save score.";
        }
        this.renderResults();
        this.renderBoards();
        this.showScreen("results");
    }

    renderResults() {
        $("final-score").textContent = this.score;
        const personal = this.bestForPlayer(this.playerId);
        const isBest = this.score >= personal && this.score > 0;
        const caught = this.stats.gold + this.stats.silver + this.stats.platinum + this.stats.rd + this.stats.insurance + this.stats.sip;
        $("results-note").textContent = isBest
            ? `NEW PERSONAL BEST · ${this.playerName}`
            : `${caught} products caught · ${this.stats.missed} missed`;

        const order = [
            ["gold", "Gold"],
            ["silver", "Silver"],
            ["platinum", "Platinum"],
            ["rd", "Daily RD"],
            ["insurance", "Insurance"],
            ["sip", "Daily SIP"],
            ["missed", "Missed"],
        ];
        $("breakdown").innerHTML = order.map(([id, label]) => {
            const src = id === "missed" ? ITEMS.gold.src : ITEMS[id].src;
            return `<li>
                <img src="${src}" alt="${label}">
                <b>${this.stats[id]}</b>
                <span>${label}</span>
            </li>`;
        }).join("");
    }

    bestScore() {
        const scores = this.loadScores();
        return scores[0]?.score || 0;
    }

    bestForPlayer(playerId) {
        const id = String(playerId || "").trim();
        if (!id) return 0;
        return this.loadScores().find((row) => row.id === id)?.score || 0;
    }

    uniqueScores(rows) {
        return normalizeScores(rows);
    }

    loadScores() {
        return ScoreStore.load();
    }

    persistBest() {
        const name = (this.playerName || $("player-name")?.value || "").trim();
        if (!name || !this.playerId) return false;
        if (this.score <= 0 && this.bestForPlayer(this.playerId) > 0) return true;
        return ScoreStore.upsert(name, this.score, this.playerId);
    }

    saveScore() {
        const typed = $("player-name")?.value?.trim();
        const name = (this.playerName || typed || "").trim().slice(0, 16);
        if (!name || !this.playerId) return false;
        this.playerName = name;
        const previous = this.bestForPlayer(this.playerId);
        ScoreStore.upsert(name, this.score, this.playerId);
        this.scoreSaved = true;
        const stored = this.bestForPlayer(this.playerId);
        let message = `Saved ${stored} for ${name}.`;
        if (this.score > previous) message = `New best for ${name}: ${this.score}.`;
        else if (previous > this.score) message = `Best for ${name} stays ${previous}.`;
        const status = $("save-status");
        if (status) {
            status.textContent = message;
            status.classList.remove("blocked");
        }
        this.renderBoards();
        return true;
    }

    syncHud() {
        const seconds = Math.ceil(this.timeLeft);
        $("timer-value").textContent = `${seconds} SEC`;
        $("score-value").textContent = this.score;
        $("timer-chip").classList.toggle("urgent", this.mode === "play" && seconds <= 10);
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.w, this.h);
        if (this.images.background) {
            ctx.drawImage(this.images.background, 0, 0, this.w, this.h);
            ctx.fillStyle = "rgba(20, 8, 42, 0.28)";
            ctx.fillRect(0, 0, this.w, this.h);
        } else {
            this.drawPlayfield();
        }

        this.drawLane();
        this.items.forEach((item) => this.drawItem(item));
        this.drawBasket();
        this.particles.forEach((p) => {
            ctx.globalAlpha = clamp(p.life * 2, 0, 1);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * this.scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        });
        this.popups.forEach((p) => {
            ctx.globalAlpha = clamp(p.life * 1.6, 0, 1);
            ctx.fillStyle = p.color;
            ctx.font = `700 ${18 * this.scale}px "Plus Jakarta Sans", sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(p.text, p.x, p.y);
            ctx.globalAlpha = 1;
        });
    }

    drawPlayfield() {
        const ctx = this.ctx;
        const sky = ctx.createLinearGradient(0, 0, 0, this.h);
        sky.addColorStop(0, "#faf7fd");
        sky.addColorStop(0.55, "#efe6f8");
        sky.addColorStop(1, "#e4d6f3");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, this.w, this.h);

        const beam = ctx.createRadialGradient(this.w * 0.5, 0, this.spritePx(20), this.w * 0.5, 0, this.h * 0.62);
        beam.addColorStop(0, "rgba(95, 37, 159, 0.12)");
        beam.addColorStop(1, "rgba(95, 37, 159, 0)");
        ctx.fillStyle = beam;
        ctx.fillRect(0, 0, this.w, this.h);

        const groundH = this.spritePx(92);
        ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
        ctx.fillRect(0, this.h - groundH, this.w, groundH);
        ctx.fillStyle = "rgba(95, 37, 159, 0.08)";
        ctx.fillRect(0, this.h - groundH, this.w, this.spritePx(3));
    }

    drawLane() {
        const ctx = this.ctx;
        const basket = this.basketRect();
        const y = basket.y + basket.height * 0.55;
        ctx.save();
        ctx.strokeStyle = "rgba(240, 193, 77, 0.45)";
        ctx.setLineDash([10 * this.scale, 10 * this.scale]);
        ctx.lineWidth = 2 * this.scale;
        ctx.beginPath();
        ctx.moveTo(24 * this.scale, y);
        ctx.lineTo(this.w - 24 * this.scale, y);
        ctx.stroke();
        ctx.restore();
    }

    drawItem(item) {
        const ctx = this.ctx;
        const img = this.images[item.def.id];
        const cx = item.x + item.size / 2;
        const cy = item.y + item.size / 2;
        const vx = item.vx || 0;
        const vy = item.vy || 1;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.atan2(vy, vx) - Math.PI / 2);
        const trail = ctx.createLinearGradient(0, -item.size * 1.15, 0, item.size * 0.1);
        trail.addColorStop(0, "rgba(0, 0, 0, 0)");
        trail.addColorStop(0.55, item.def.trail);
        trail.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = trail;
        ctx.beginPath();
        ctx.ellipse(0, -item.size * 0.2, item.size * 0.15, item.size * 0.58, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(item.rot || 0);
        const flip = 0.88 + 0.12 * Math.abs(Math.cos(item.rot || 0));
        ctx.scale(flip, 1);
        ctx.drawImage(img, -item.size / 2, -item.size / 2, item.size, item.size);
        ctx.restore();
    }

    drawBasket() {
        const { x, y, width, height } = this.basketRect();
        this.ctx.drawImage(this.images.basket, x, y, width, height);
    }

    loop(ts) {
        const dt = Math.min(0.033, (ts - this.lastTs) / 1000 || 0.016);
        this.lastTs = ts;
        this.update(dt);
        this.draw();
        this.raf = requestAnimationFrame((next) => this.loop(next));
    }
}

async function boot() {
    $("brand-product").textContent = BRAND.product;
    $("brand-logo").src = BRAND.logo;

    const imageMap = {
        background: "assets/bg-city.png",
        basket: "assets/basket.png?v=6",
    };
    for (const item of Object.values(ITEMS)) {
        imageMap[item.id] = item.src;
    }
    const images = {};
    await Promise.all(Object.entries(imageMap).map(async ([key, src]) => {
        images[key] = await loadImage(src);
    }));
    window.game = new Game(images);
}

window.addEventListener("load", boot);
