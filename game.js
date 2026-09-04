const BRAND = {
    name: "PhonePe",
    gameTitle: "Big Wealth Starts Small!",
    tagline: "Catch micro-saving products. Build macro wealth.",
    logo: "assets/logo-phonepe-on-dark.svg",
};

const CONFIG = {
    attractRotateDuration: 10,
    duration: 30,
    basketCrossTime: 0.38,
    spawnStart: 1180,
    spawnEnd: 280,
    fallTimeStart: 1.85,
    fallTimeEnd: 0.44,
    maxItemsStart: 2,
    maxItemsEnd: 6,
    catchPoints: 10,
    missPoints: -10,
    comboStart: 2,
    comboMax: 5,
    scoreStep: 5,
    fallAccelTime: 0.36,
    itemGap: 22,
    mobileSprite: 0.4,
    tabletSprite: 0.62,
    storageKey: "coinCatcherScores",
};

const SAMPLE_SCORES = [
    { name: "Aarav", phone: "9876543210", score: 240, missed: 2 },
    { name: "Priya", phone: "9876543211", score: 195, missed: 4 },
    { name: "Rohan", phone: "9876543212", score: 160, missed: 5 },
    { name: "Ananya", phone: "9876543213", score: 125, missed: 7 },
    { name: "Vikram", phone: "9876543214", score: 90, missed: 9 },
    { name: "Meera", phone: "9876543215", score: 55, missed: 12 },
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

function normalizePhone(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
    return digits;
}

function playerKey(row) {
    const phone = normalizePhone(row?.phone);
    if (phone) return `phone:${phone}`;
    const id = String(row?.id || "").trim();
    if (id) return `id:${id}`;
    const name = String(row?.name || "").trim();
    return name ? `legacy:${name.toLowerCase()}` : "";
}

function normalizeScores(rows) {
    const best = new Map();
    for (const row of rows || []) {
        const name = String(row?.name || "").trim();
        if (!name) continue;
        const key = playerKey(row);
        if (!key) continue;
        const phone = normalizePhone(row.phone);
        const id = String(row?.id || "").trim() || phone || `legacy-${name.toLowerCase()}`;
        const score = Number(row.score);
        const pts = Number.isFinite(score) ? roundScore(score) : 0;
        const missed = Number(row.missed) || 0;
        const prev = best.get(key);
        const newer = !prev
            || pts > prev.score
            || (pts === prev.score && missed < (prev.missed ?? Infinity))
            || (pts === prev.score && missed === prev.missed && (row.at || 0) > (prev.at || 0));
        if (!newer) continue;
        best.set(key, {
            id,
            phone: phone || prev?.phone || "",
            name,
            score: pts,
            missed,
            at: row.at || Date.now(),
        });
    }
    return [...best.values()].sort((a, b) =>
        b.score - a.score
        || (a.missed ?? Infinity) - (b.missed ?? Infinity)
        || (b.at || 0) - (a.at || 0)
        || String(a.name).localeCompare(String(b.name))
    );
}

function writeStorage(key, value) {
    return storageSetRaw(key, JSON.stringify(value));
}

function sampleRows() {
    const base = Date.now() - 86_400_000;
    return SAMPLE_SCORES.map((row, i) => ({
        id: normalizePhone(row.phone),
        phone: normalizePhone(row.phone),
        name: row.name,
        score: row.score,
        missed: row.missed || 0,
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
    upsert(name, score, phone, missed) {
        const clean = String(name || "").trim().slice(0, 16);
        const number = normalizePhone(phone);
        if (!clean || !number) return false;
        const pts = Number(score);
        const value = Number.isFinite(pts) ? Math.max(0, roundScore(pts)) : 0;
        const missedCount = Number(missed) || 0;
        const rows = this.load();
        const existing = rows.find((row) => normalizePhone(row.phone) === number || row.id === number);
        if (existing) {
            const dominated = value > existing.score
                || (value === existing.score && missedCount < (existing.missed ?? Infinity));
            if (dominated) {
                existing.score = value;
                existing.missed = missedCount;
                existing.at = Date.now();
                existing.name = clean;
                existing.phone = number;
                existing.id = number;
            }
        } else {
            rows.push({ id: number, phone: number, name: clean, score: value, missed: missedCount, at: Date.now() });
        }
        this.rows = normalizeScores(rows);
        writeStorage(CONFIG.storageKey, this.rows);
        return true;
    },
};
ScoreStore.load();

const ITEMS = {
    gold: { id: "gold", label: "Gold", points: 10, src: "assets/icon-gold.png?v=24", size: 104, glow: "#f0b429", trail: "rgba(240, 180, 41, 0.22)", weight: 48, fall: 1.22, spin: 2.4, good: true },
    sip: { id: "sip", label: "SIP-MF", points: 10, src: "assets/icon-invest.png?v=7", size: 100, glow: "#4ade80", trail: "rgba(74, 222, 128, 0.22)", weight: 24, fall: 1.08, spin: 0.6, good: true },
    silver: { id: "silver", label: "Silver", points: 5, src: "assets/icon-silver.png?v=24", size: 100, glow: "#9aa4b2", trail: "rgba(154, 164, 178, 0.22)", weight: 16, fall: 0.96, spin: 1.8, good: true },
    platinum: { id: "platinum", label: "Platinum", points: 50, src: "assets/icon-platinum.png?v=24", size: 108, glow: "#8d9aab", trail: "rgba(141, 154, 171, 0.22)", weight: 8, fall: 0.8, spin: 1.2, good: true },
    rd: { id: "rd", label: "Daily RD", points: 100, src: "assets/icon-savings.png?v=7", size: 100, glow: "#f472b6", trail: "rgba(244, 114, 182, 0.22)", weight: 4, fall: 0.66, spin: 0.45, good: true },
};

function $(id) {
    return document.getElementById(id);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
}

function roundScore(value) {
    const step = CONFIG.scoreStep || 5;
    const n = Number(value) || 0;
    return Math.max(0, Math.round(n / step) * step);
}

function rankScoreRows(a, b) {
    return (b.score - a.score)
        || ((a.missed ?? Infinity) - (b.missed ?? Infinity))
        || ((b.at || 0) - (a.at || 0))
        || String(a.name || "").localeCompare(String(b.name || ""));
}

function uniqueScores(rows) {
    const step = CONFIG.scoreStep || 5;
    const ranked = [...(rows || [])].sort(rankScoreRows);
    const groups = new Map();
    for (const row of ranked) {
        const base = roundScore(row.score);
        if (!groups.has(base)) groups.set(base, []);
        groups.get(base).push(row);
    }
    const used = new Set();
    const byKey = new Map();
    for (const row of ranked) {
        const key = playerKey(row) || String(row.id || "");
        const base = roundScore(row.score);
        const group = groups.get(base) || [row];
        const idx = group.indexOf(row);
        const bonus = group.length > 1 ? (idx === 0 ? 10 : 5) : 0;
        let score = roundScore(base + bonus);
        while (used.has(score) && score >= step) score -= step;
        if (used.has(score)) {
            score = roundScore(base + bonus);
            while (used.has(score)) score += step;
        }
        used.add(score);
        byKey.set(key, score);
    }
    return (rows || []).map((row) => ({
        ...row,
        score: byKey.get(playerKey(row) || String(row.id || "")) ?? roundScore(row.score),
    })).sort(rankScoreRows);
}

function formatScore(value) {
    return String(roundScore(value));
}

function formatDelta(points) {
    const n = roundScore(points);
    if (n > 0) return `+${n}`;
    if (n < 0) return `−${Math.abs(n)}`;
    return "0";
}

function isValidPhone(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length === 10) return /^[6-9]\d{9}$/.test(digits);
    if (digits.length === 12 && digits.startsWith("91")) return /^91[6-9]\d{9}$/.test(digits);
    return false;
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
        this.playerPhone = "";
        this.playerId = "";
        this.tncAccepted = false;
        this.tncReadFull = false;
        this.currentScreen = "title";
        this.attractPhase = "hero";
        this.attractElapsed = 0;
        this.attractRotating = false;
        this.holdDir = 0;
        this.moveLeft = false;
        this.moveRight = false;
        this.basketGlow = 0;
        this.missMarks = [];
        this.toastTimer = 0;
        this.roundStartBest = 0;
        this.combo = 0;

        this.resetRoundState();
        this.bindUi();
        this.resize();
        window.addEventListener("resize", () => this.resize());
        window.addEventListener("orientationchange", () => this.resize());
        window.visualViewport?.addEventListener("resize", () => this.resize());
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
        this.stats = { gold: 0, silver: 0, platinum: 0, rd: 0, sip: 0, missed: 0 };
        this.basketX = 0.5;
        this.scoreSaved = false;
        this.prevRanks = {};
        this.basketGlow = 0;
        this.missMarks = [];
        this.combo = 0;
        this.clearMoveInput();
        this.hidePointToast();
        const saveStatus = $("save-status");
        if (saveStatus) saveStatus.textContent = "";
        this.syncHud();
        this.renderBoards();
    }

    bindUi() {
        document.addEventListener("keydown", (e) => this.onKey(e, true));
        document.addEventListener("keyup", (e) => this.onKey(e, false));
        window.addEventListener("blur", () => this.clearMoveInput());
        window.addEventListener("pointerup", () => {
            this.holdDir = 0;
        });
        window.addEventListener("pointercancel", () => {
            this.holdDir = 0;
        });

        $("play-btn").addEventListener("click", () => this.startRegistration());
        $("title-board-btn")?.addEventListener("click", () => {
            this.stopAttractRotation();
            this.renderBoards();
            this.showScreen("leaderboard");
        });
        $("board-back-btn")?.addEventListener("click", () => this.showScreen("title"));
        $("details-back-btn").addEventListener("click", () => this.showScreen("title"));
        $("details-continue-btn").addEventListener("click", () => this.requestPlay("details"));
        $("tnc-open-link")?.addEventListener("click", () => this.openTncOverlay());
        $("tnc-continue-btn")?.addEventListener("click", () => this.acceptTnc());
        $("tnc-close-btn")?.addEventListener("click", () => this.closeTncOverlay());
        $("tnc-agree")?.addEventListener("change", (e) => this.onTncTick(e.target.checked));
        const scrollBox = $("tnc-scroll-box");
        if (scrollBox) {
            scrollBox.addEventListener("scroll", () => this.checkTncScroll());
        }
        $("message-back-btn")?.addEventListener("click", () => this.showScreen("details"));
        $("message-go-btn").addEventListener("click", () => this.requestPlay("message"));
        $("howto-back-btn").addEventListener("click", () => this.showScreen("message"));
        $("howto-play-btn").addEventListener("click", () => this.requestPlay("howto"));
        this.bindHold($("move-left"), -1);
        this.bindHold($("move-right"), 1);
        $("replay-btn").addEventListener("click", () => {
            this.saveScore();
            this.beginCountdown();
        });
        $("results-home-btn").addEventListener("click", () => {
            this.saveScore();
            this.goHome();
        });
        $("player-name").addEventListener("keydown", (e) => {
            if (e.key === "Enter") $("player-phone").focus();
        });
        $("player-phone").addEventListener("keydown", (e) => {
            if (e.key === "Enter") this.requestPlay("details");
        });
        $("player-name").value = "";
        $("player-phone").value = "";
        this.resetTnc();

        const persistIfPlaying = () => {
            if (this.mode === "play" || this.mode === "results") this.saveScore();
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

    isTypingTarget(el) {
        const tag = String(el?.tagName || "").toLowerCase();
        return tag === "input" || tag === "textarea" || tag === "select" || Boolean(el?.isContentEditable);
    }

    clearMoveInput() {
        this.keys = {};
        this.holdDir = 0;
        this.moveLeft = false;
        this.moveRight = false;
    }

    onKey(event, down) {
        if (this.isTypingTarget(event.target)) return;
        if (event.code === "ArrowLeft" || event.code === "KeyA") this.moveLeft = down;
        if (event.code === "ArrowRight" || event.code === "KeyD") this.moveRight = down;
        if (!down) return;
        if (["ArrowLeft", "ArrowRight", "Space"].includes(event.code) && this.mode === "play") {
            event.preventDefault();
        }
        if (event.key === "Escape" && this.mode === "play") event.preventDefault();
    }

    nudgeFromPointer(event) {
        if (this.mode !== "play") return;
        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const travel = this.basketTravel();
        this.basketX = clamp(x, travel.min, travel.max);
    }

    startRegistration() {
        this.stopAttractRotation();
        this.showScreen("details");
    }

    ensureName() {
        const field = $("player-name");
        const phoneField = $("player-phone");
        const error = $("name-error");
        const name = field.value.trim();
        const phone = phoneField.value.trim();
        const invalid = (msg, el) => {
            this.showScreen("details");
            error.textContent = msg;
            error.classList.remove("hidden");
            el.classList.add("invalid");
            el.focus();
            return false;
        };
        field.classList.remove("invalid");
        phoneField.classList.remove("invalid");
        if (!name) return invalid("Enter your name to continue.", field);
        if (!phone || !isValidPhone(phone)) {
            return invalid("Enter a valid 10-digit phone number.", phoneField);
        }
        this.playerName = name.slice(0, 16);
        this.playerPhone = normalizePhone(phone);
        const existing = this.loadScores().find((row) => normalizePhone(row.phone) === this.playerPhone || row.id === this.playerPhone);
        this.playerId = existing?.id || this.playerPhone;
        error.textContent = "";
        error.classList.add("hidden");
        return true;
    }

    releasePlayer() {
        this.playerName = "";
        this.playerPhone = "";
        this.playerId = "";
        const field = $("player-name");
        if (field) {
            field.value = "";
            field.classList.remove("invalid");
        }
        const phoneField = $("player-phone");
        if (phoneField) {
            phoneField.value = "";
            phoneField.classList.remove("invalid");
        }
        const error = $("name-error");
        if (error) {
            error.textContent = "";
            error.classList.add("hidden");
        }
        storageRemoveRaw("coinCatcherPlayerName");
        this.resetTnc();
    }

    resetTnc() {
        this.tncAccepted = false;
        this.tncReadFull = false;
        const box = $("tnc-agree");
        if (box) {
            box.checked = false;
            box.disabled = true;
        }
        this.syncTncUi();
    }

    tncScrolledToEnd() {
        const el = $("tnc-scroll-box");
        if (!el) return false;
        const overflow = el.scrollHeight - el.clientHeight;
        if (overflow <= 8) return true;
        return el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    }

    checkTncScroll() {
        if (this.tncScrolledToEnd()) this.markTncRead();
        else this.syncTncUi();
    }

    markTncRead() {
        this.tncReadFull = true;
        const box = $("tnc-agree");
        if (box) box.disabled = false;
        this.syncTncUi();
    }

    onTncTick(checked) {
        if (checked && !this.tncReadFull) {
            const box = $("tnc-agree");
            if (box) box.checked = false;
            return;
        }
        this.tncAccepted = Boolean(checked);
        if (this.tncAccepted) {
            const error = $("name-error");
            if (error?.textContent.includes("Terms")) {
                error.textContent = "";
                error.classList.add("hidden");
            }
        }
        this.syncTncUi();
    }

    syncTncUi() {
        const box = $("tnc-agree");
        if (box) {
            box.disabled = !this.tncReadFull;
            box.checked = this.tncAccepted;
        }
        $("tnc-footer")?.classList.toggle("hidden", !this.tncAccepted);
        const detailsBtn = $("details-continue-btn");
        if (detailsBtn) {
            detailsBtn.disabled = !this.tncAccepted;
            detailsBtn.classList.toggle("hidden", !this.tncAccepted);
        }
        const status = $("tnc-status");
        if (status) status.classList.toggle("hidden", !this.tncAccepted);
        const link = $("tnc-open-link");
        if (link) link.classList.toggle("accepted", this.tncAccepted);
    }

    openTncOverlay() {
        $("tnc-overlay")?.classList.remove("hidden");
        const scrollBox = $("tnc-scroll-box");
        if (scrollBox && !this.tncReadFull) scrollBox.scrollTop = 0;
        this.syncTncUi();
        requestAnimationFrame(() => {
            this.checkTncScroll();
            scrollBox?.focus();
        });
    }

    closeTncOverlay() {
        $("tnc-overlay")?.classList.add("hidden");
        this.syncTncUi();
    }

    acceptTnc() {
        if (!this.tncAccepted) return;
        this.closeTncOverlay();
        this.showScreen("message");
    }

    goHome() {
        this.releasePlayer();
        this.mode = "attract";
        this.sessionLevel = 0;
        this.resetRoundState();
        this.attractPhase = "hero";
        this.attractElapsed = 0;
        this.attractRotating = false;
        this.showScreen("title");
    }

    stopAttractRotation() {
        this.attractRotating = false;
        this.attractElapsed = 0;
    }

    setAttractPane(phase) {
        this.attractPhase = phase || "hero";
        $("title-hero-pane")?.classList.remove("hidden");
    }

    tickAttractRotation() {
        return;
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
        btn.addEventListener("lostpointercapture", release);
    }

    requestPlay(from) {
        if (from === "details" && !this.ensureName()) return;
        if ((from === "message" || from === "howto") && !this.playerName && !this.ensureName()) return;
        if (from === "title") {
            this.showScreen("details");
            return;
        }
        if (from === "details") {
            if (!this.tncAccepted) {
                const error = $("name-error");
                if (error) {
                    error.textContent = "Please read and accept the Terms & Conditions.";
                    error.classList.remove("hidden");
                }
                $("tnc-open-link")?.focus();
                return;
            }
            this.showScreen("message");
            return;
        }
        if (from === "message") {
            this.showScreen("howto");
            return;
        }
        this.beginCountdown();
    }

    showScreen(name, opts = {}) {
        this.currentScreen = name;
        document.querySelectorAll(".screen").forEach((el) => el.classList.add("hidden"));
        const screen = $(`screen-${name}`);
        if (screen) screen.classList.remove("hidden");

        const mode = name === "pause" ? "paused" : name;
        document.body.dataset.mode = mode;

        if (name === "title" || name === "howto" || name === "message" || name === "details" || name === "leaderboard") {
            this.mode = "attract";
        }
        if (name === "title") {
            this.setAttractPane("hero");
            this.attractRotating = false;
        }
        if (name === "details" || name === "message" || name === "howto" || name === "leaderboard") {
            this.stopAttractRotation();
        }
        if (name === "howto") storageSetRaw("coinCatcherHowToSeen", "1");
    }

    beginCountdown() {
        if (this.mode === "countdown") return;
        this.resetRoundState();
        this.roundStartBest = this.bestForPlayer(this.playerPhone);
        this.mode = "countdown";
        this.renderBoards();
        this.showScreenPlayChrome();
        $("start-overlay")?.classList.add("hidden");
        const overlay = $("countdown-overlay");
        const text = $("countdown-text");
        if (!overlay || !text) {
            this.showStartCue();
            return;
        }
        overlay.classList.remove("hidden");
        const beats = ["3", "2", "1", "0"];
        let i = 0;
        const tick = () => {
            if (this.mode !== "countdown") return;
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
            this.clearMoveInput();
            this.mode = "play";
            this.lastTs = performance.now();
            return;
        }
        start.classList.remove("hidden");
        setTimeout(() => {
            start.classList.add("hidden");
            this.clearMoveInput();
            this.mode = "play";
            this.lastTs = performance.now();
        }, 1600);
    }

    showScreenPlayChrome() {
        document.querySelectorAll(".screen").forEach((el) => el.classList.add("hidden"));
        document.body.dataset.mode = "play";
    }

    resize() {
        const field = $("playfield");
        const rect = field.getBoundingClientRect();
        const cssW = Math.max(280, rect.width);
        const cssH = Math.max(220, rect.height);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const maxPx = 3840;
        const fit = Math.min(1, maxPx / (cssW * dpr), maxPx / (cssH * dpr));
        this.scale = dpr * fit;
        this.canvas.width = Math.max(280, Math.floor(cssW * this.scale));
        this.canvas.height = Math.max(220, Math.floor(cssH * this.scale));
        this.w = this.canvas.width;
        this.h = this.canvas.height;
        this.clampBasket();
    }

    spriteScale() {
        const cssW = this.w / (this.scale || 1);
        const cssH = this.h / (this.scale || 1);
        const shorter = Math.min(cssW, cssH);
        return clamp(shorter * 0.1 / 104, 0.34, 3.2);
    }

    spritePx(value) {
        return value * this.scale * this.spriteScale();
    }

    difficulty() {
        const t = clamp(this.roundElapsed, 0, CONFIG.duration);
        let intensity;
        if (t < 8) {
            intensity = lerp(0, 0.18, t / 8);
        } else if (t < 18) {
            intensity = lerp(0.18, 0.58, (t - 8) / 10);
        } else {
            intensity = lerp(0.58, 1, (t - 18) / 12);
        }
        const session = clamp(this.sessionLevel * 0.08, 0, 0.16);
        return clamp(intensity + session, 0, 1);
    }

    spawnInterval() {
        const d = clamp(this.difficulty(), 0, 1);
        return CONFIG.spawnStart + (CONFIG.spawnEnd - CONFIG.spawnStart) * d;
    }

    fallSpeed() {
        const cssH = this.h / (this.scale || 1);
        const d = clamp(this.difficulty(), 0, 1);
        const time = CONFIG.fallTimeStart + (CONFIG.fallTimeEnd - CONFIG.fallTimeStart) * d;
        return cssH / Math.max(0.38, time);
    }

    basketMoveSpeed() {
        const travel = this.basketTravel();
        const span = Math.max(0.28, travel.max - travel.min);
        return span / CONFIG.basketCrossTime;
    }

    maxItemsNow() {
        const d = clamp(this.difficulty(), 0, 1);
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
        const play = this.itemPlayBounds(size);
        const span = Math.max(1, play.max - play.min);
        const laneCount = Math.max(3, Math.floor(span / (size + gap)) + 1);
        const laneW = span / Math.max(1, laneCount - 1);
        const blocked = new Set();
        for (const item of this.items) {
            if (item.y > item.size * 1.8) continue;
            blocked.add(clamp(Math.round((item.x - play.min) / laneW), 0, laneCount - 1));
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
            const x = clamp(play.min + lane * laneW + jitter, play.min, play.max);
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
        const fallMul = (def.fall || 1) * (0.97 + Math.random() * 0.06);
        const terminal = this.fallSpeed() * this.scale * fallMul;
        const spin = (def.spin || 1.2) * (Math.random() < 0.5 ? -1 : 1);
        this.items.push({
            def,
            x,
            y: -size - Math.random() * this.spritePx(28),
            size,
            vx: (Math.random() - 0.5) * this.w * 0.012,
            vy: terminal * 0.72,
            terminal,
            fallMul,
            rot: Math.random() * Math.PI * 2,
            spin,
            sway: Math.random() * Math.PI * 2,
            swaySpeed: 0.7 + Math.random() * 0.8,
            swayAmp: this.w * (0.003 + Math.random() * 0.004),
        });
        return true;
    }

    basketMetrics() {
        const compact = this.spriteScale() < 0.75;
        let width = this.spritePx(compact ? 172 : 248);
        let height = this.spritePx(compact ? 144 : 208);
        const maxW = this.w * 0.3;
        const minW = this.w * 0.16;
        if (width > maxW) {
            const k = maxW / width;
            width *= k;
            height *= k;
        } else if (width < minW) {
            const k = minW / width;
            width *= k;
            height *= k;
        }
        const inset = width * (compact ? 0.16 : 0.12);
        const catchW = width * (compact ? 0.68 : 0.76);
        const margin = Math.max(this.spritePx(compact ? 24 : 32), this.w * 0.03);
        const minX = margin;
        const maxX = Math.max(minX, this.w - width - margin);
        return { compact, width, height, inset, catchW, margin, minX, maxX };
    }

    basketTravel() {
        const m = this.basketMetrics();
        const min = (m.minX + m.width / 2) / this.w;
        const max = (m.maxX + m.width / 2) / this.w;
        return { min, max };
    }

    itemPlayBounds(size) {
        const m = this.basketMetrics();
        const min = m.minX + m.inset;
        const max = m.maxX + m.inset + m.catchW - size;
        return { min, max: Math.max(min, max) };
    }

    clampBasket() {
        const travel = this.basketTravel();
        this.basketX = clamp(this.basketX, travel.min, travel.max);
    }

    basketRect() {
        const m = this.basketMetrics();
        const x = clamp(this.basketX * this.w - m.width / 2, m.minX, m.maxX);
        const y = this.h - m.height - this.spritePx(m.compact ? 10 : 18);
        return { x, y, width: m.width, height: m.height };
    }

    update(dt) {
        if (this.mode === "attract") {
            this.tickAttractRotation(dt);
            this.roundElapsed = (this.roundElapsed + dt) % 20;
            if (this.items.length < 4) this.spawn();
            this.updateItems(dt, false);
            this.basketX = 0.5 + Math.sin(performance.now() / 1400) * 0.28;
            return;
        }

        if (this.mode !== "play") {
            this.updatePopups(dt);
            this.updateMarks(dt);
            return;
        }

        this.roundElapsed += dt;
        this.timeLeft = Math.max(0, CONFIG.duration - this.roundElapsed);
        if (this.timeLeft <= 0) {
            this.endRound();
            return;
        }

        let move = this.holdDir;
        if (this.moveLeft) move -= 1;
        if (this.moveRight) move += 1;
        const travel = this.basketTravel();
        this.basketX = clamp(this.basketX + move * this.basketMoveSpeed() * dt, travel.min, travel.max);

        this.spawnAt -= dt * 1000;
        if (this.spawnAt <= 0) {
            this.spawnAt = this.spawn() ? this.spawnInterval() : 70;
        }

        this.updateItems(dt, true);
        this.updatePopups(dt);
        this.updateParticles(dt);
        this.updateMarks(dt);
        this.syncHud();
    }

    updateItems(dt, collide) {
        const catchZone = this.catchMouth();

        const accelTime = CONFIG.fallAccelTime;
        const baseFall = this.fallSpeed() * this.scale;
        this.items.forEach((item) => {
            item.terminal = baseFall * (item.fallMul || item.def.fall || 1);
            item.sway += item.swaySpeed * dt;
            item.vy = Math.min(item.terminal, item.vy + (item.terminal / accelTime) * dt);
            item.vx += Math.sin(item.sway) * item.swayAmp * dt;
            item.vx *= Math.pow(0.86, dt * 60);
            item.x += item.vx * dt;
            item.y += item.vy * dt;
            item.rot += item.spin * dt;
            const play = this.itemPlayBounds(item.size);
            item.x = clamp(item.x, play.min, play.max);
            if (item.x === play.min || item.x === play.max) item.vx = 0;
        });
        this.separateItems();
        this.items = this.items.filter((item) => {
            if (collide && this.fallsIntoBasket(item, catchZone)) {
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
                    a.vx -= dir * 8 * this.scale;
                    b.vx += dir * 8 * this.scale;
                } else if (dy !== 0) {
                    const lower = dy > 0 ? b : a;
                    const upper = dy > 0 ? a : b;
                    const push = overlapY;
                    upper.y -= push;
                    if (upper.vy > lower.vy * 0.85) upper.vy = lower.vy * 0.85;
                }
                const aPlay = this.itemPlayBounds(a.size);
                const bPlay = this.itemPlayBounds(b.size);
                a.x = clamp(a.x, aPlay.min, aPlay.max);
                b.x = clamp(b.x, bPlay.min, bPlay.max);
            }
        }
    }

    catchMouth() {
        const basket = this.basketRect();
        const mouthInset = basket.width * 0.18;
        return {
            x: basket.x + mouthInset,
            y: basket.y + basket.height * 0.28,
            width: Math.max(8, basket.width - mouthInset * 2),
            height: basket.height * 0.34,
        };
    }

    fallsIntoBasket(item, zone) {
        const cx = item.x + item.size / 2;
        const cy = item.y + item.size * 0.62;
        return cx >= zone.x
            && cx <= zone.x + zone.width
            && cy >= zone.y
            && cy <= zone.y + zone.height;
    }

    comboMultiplier(count) {
        return clamp(count, 1, CONFIG.comboMax || 5);
    }

    comboLabel(count) {
        if (count < CONFIG.comboStart) return "";
        return `COMBO x${this.comboMultiplier(count)}`;
    }

    catchItem(item) {
        this.combo += 1;
        const base = item.def.points || CONFIG.catchPoints;
        const points = roundScore(base * this.comboMultiplier(this.combo));
        this.applyScore(points, item.x + item.size / 2, item.y, item.def.glow, true);
        this.stats[item.def.id] += 1;
        this.basketGlow = 0.55;
        this.showPointToast(item, true, points, this.combo);
    }

    missItem(item) {
        this.combo = 0;
        this.stats.missed += 1;
        const penalty = CONFIG.missPoints;
        const x = item.x + item.size / 2;
        const y = this.h - this.spritePx(28);
        this.applyScore(penalty, x, y, "#ff5d7a", false);
        this.missMarks.push({ x, y, life: 0.7 });
        this.showPointToast(item, false, penalty, 0);
    }

    showPointToast(item, caught, points, combo) {
        const toast = $("point-toast");
        const icon = $("toast-icon");
        const pts = $("toast-pts");
        const comboEl = $("toast-combo");
        if (!toast || !icon || !pts) return;
        icon.src = item.def.src;
        icon.classList.toggle("hidden", !caught);
        pts.textContent = formatDelta(points);
        pts.classList.toggle("miss", !caught);
        const label = caught ? this.comboLabel(combo || 0) : "";
        if (comboEl) {
            comboEl.textContent = label;
            comboEl.classList.toggle("hidden", !label);
            comboEl.classList.toggle("super", (combo || 0) >= CONFIG.comboMax);
        }
        toast.classList.toggle("super", caught && (combo || 0) >= CONFIG.comboMax);
        toast.classList.remove("hidden");
        window.clearTimeout(this.toastTimer);
        this.toastTimer = window.setTimeout(() => this.hidePointToast(), (combo || 0) >= CONFIG.comboMax ? 900 : 650);
    }

    hidePointToast() {
        window.clearTimeout(this.toastTimer);
        const toast = $("point-toast");
        toast?.classList.add("hidden");
        toast?.classList.remove("super");
    }

    applyScore(points, x, y, glow, good) {
        this.score = Math.max(0, roundScore(this.score + points));
        this.burst(x, y, glow, good);
        this.syncHud();
        this.renderBoards();
    }

    currentPlayerName() {
        return (this.playerName || $("player-name")?.value || "").trim();
    }

    boardEntries() {
        const youName = this.currentPlayerName();
        const youPhone = normalizePhone(this.playerPhone);
        const overlayLive = ["countdown", "play", "results"].includes(this.mode);
        const saved = this.loadScores();
        const rows = [];
        let sawYou = false;

        for (const row of saved) {
            const name = String(row.name || "").trim();
            if (!name) continue;
            const phone = normalizePhone(row.phone);
            const id = String(row.id || "").trim() || phone || `legacy-${name.toLowerCase()}`;
            const me = Boolean(youPhone) && (phone === youPhone || id === youPhone);
            const savedScore = Number(row.score) || 0;
            const score = me && overlayLive ? Math.max(savedScore, this.score) : savedScore;
            const missed = me && overlayLive ? this.stats.missed : (Number(row.missed) || 0);
            if (me) sawYou = true;
            rows.push({
                id,
                phone,
                name,
                score,
                missed,
                at: row.at || 0,
                me,
            });
        }

        if (youPhone && youName && overlayLive && !sawYou) {
            rows.push({
                id: youPhone,
                phone: youPhone,
                name: youName,
                score: this.score,
                missed: this.stats.missed,
                at: Date.now(),
                me: true,
            });
        }

        return uniqueScores(rows);
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
                <span class="pts">${formatScore(row.score)}</span>
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
        const html = !rows.length
            ? `<p class="empty-board">No scores yet. Play a round and save your name.</p>`
            : `
            <div class="scores-header"><div>RANK</div><div>PLAYER</div><div>SCORE</div></div>
            ${rows.map((row, i) => `
                <div class="score-entry${row.me ? " me" : ""}">
                    <div class="rank">#${i + 1}</div>
                    <div>${this.boardLabel(row)}</div>
                    <div>${formatScore(row.score)}</div>
                </div>
            `).join("")}
        `;
        for (const list of document.querySelectorAll("#scores-list, #results-scores-list")) {
            list.innerHTML = html;
        }
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

    updateMarks(dt) {
        this.basketGlow = Math.max(0, this.basketGlow - dt);
        this.missMarks = this.missMarks.filter((mark) => {
            mark.life -= dt;
            return mark.life > 0;
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
        const caught = this.stats.gold + this.stats.silver + this.stats.platinum + this.stats.rd + this.stats.sip;
        const personal = this.roundStartBest ?? this.bestForPlayer(this.playerPhone);
        const isBest = this.score > personal && this.score > 0;
        const board = this.boardEntries();
        const me = board.find((row) => row.me);
        const shown = me ? me.score : this.score;
        if ($("final-score")) $("final-score").textContent = formatScore(shown);
        if ($("caught-count")) $("caught-count").textContent = caught;
        if ($("missed-count")) $("missed-count").textContent = this.stats.missed;
        if ($("total-count")) $("total-count").textContent = formatScore(shown);
        if ($("results-note")) {
            $("results-note").textContent = isBest ? `NEW PERSONAL BEST · ${this.playerName}` : "";
        }
    }

    bestScore() {
        const scores = this.loadScores();
        return scores[0]?.score || 0;
    }

    bestForPlayer(phone) {
        const number = normalizePhone(phone);
        if (!number) return 0;
        return this.loadScores().find((row) => normalizePhone(row.phone) === number || row.id === number)?.score || 0;
    }

    uniqueScores(rows) {
        return uniqueScores(rows);
    }

    loadScores() {
        return ScoreStore.load();
    }

    persistBest() {
        const name = (this.playerName || $("player-name")?.value || "").trim();
        const phone = normalizePhone(this.playerPhone || $("player-phone")?.value);
        if (!name || !phone) return false;
        if (this.score <= 0 && this.bestForPlayer(phone) > 0) return true;
        return ScoreStore.upsert(name, this.score, phone, this.stats.missed);
    }

    saveScore() {
        const typed = $("player-name")?.value?.trim();
        const name = (this.playerName || typed || "").trim().slice(0, 16);
        const phone = normalizePhone(this.playerPhone || $("player-phone")?.value);
        if (!name || !phone) return false;
        this.playerName = name;
        this.playerPhone = phone;
        this.playerId = phone;
        const previous = this.roundStartBest ?? this.bestForPlayer(phone);
        ScoreStore.upsert(name, this.score, phone, this.stats.missed);
        this.scoreSaved = true;
        const stored = this.bestForPlayer(phone);
        const board = this.loadScores();
        let message = `Saved ${formatScore(stored, board)} for ${name}.`;
        if (this.score > previous) message = `New best for ${name}: ${formatScore(this.score, board)}.`;
        else if (previous > this.score) message = `Best for ${name} stays ${formatScore(previous, board)}.`;
        const status = $("save-status");
        if (status) {
            status.textContent = message;
            status.classList.remove("blocked");
        }
        this.renderBoards();
        return true;
    }

    syncHud() {
        const seconds = Math.max(0, Math.ceil(this.timeLeft));
        const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
        const ss = String(seconds % 60).padStart(2, "0");
        if ($("timer-value")) $("timer-value").textContent = `${mm}:${ss}`;
        const me = this.boardEntries().find((row) => row.me);
        if ($("score-value")) $("score-value").textContent = formatScore(me ? me.score : this.score);
        $("timer-chip")?.classList.toggle("urgent", this.mode === "play" && seconds <= 10);
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
        this.drawMissMarks();
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
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.atan2(Math.max(item.vy, 1), item.vx || 0) - Math.PI / 2);
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
        const ctx = this.ctx;
        if (this.basketGlow > 0) {
            ctx.save();
            ctx.shadowColor = "rgba(240, 193, 77, 0.95)";
            ctx.shadowBlur = (28 + this.basketGlow * 48) * this.scale;
            ctx.drawImage(this.images.basket, x, y, width, height);
            ctx.restore();
        }
        ctx.drawImage(this.images.basket, x, y, width, height);
    }

    drawMissMarks() {
        const ctx = this.ctx;
        this.missMarks.forEach((mark) => {
            const alpha = clamp(mark.life * 1.8, 0, 1);
            const size = this.spritePx(22);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = "#ff5d7a";
            ctx.lineWidth = 5 * this.scale;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(mark.x - size, mark.y - size);
            ctx.lineTo(mark.x + size, mark.y + size);
            ctx.moveTo(mark.x + size, mark.y - size);
            ctx.lineTo(mark.x - size, mark.y + size);
            ctx.stroke();
            ctx.restore();
        });
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
    if ($("brand-logo")) $("brand-logo").src = BRAND.logo;

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
