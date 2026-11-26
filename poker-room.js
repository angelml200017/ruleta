import { randomUUID } from 'node:crypto';

// Sala única de Planning Poker, en memoria. Sincronización en tiempo real
// con Server-Sent Events (nativo, sin dependencias) + POST para acciones.

const DECK = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];
const COLORS = [
    '#ff6b6b', '#5eaaff', '#c77dff', '#ffb347', '#4ade80', '#f472b6',
    '#fbbf24', '#22d3ee', '#a3e635', '#fb7185', '#818cf8', '#2dd4bf',
];

const MAX_PARTICIPANTS = 30;
const MAX_NAME = 30;
const MAX_CHAT = 300;
const MAX_URL = 500;
const MAX_BODY = 4096;
const CHAT_HISTORY = 50;
// Margen para recargas de página / cortes breves antes de sacar a alguien.
const LEAVE_GRACE_MS = 15_000;
const HEARTBEAT_MS = 20_000;

const REACTIONS = ['👍', '👏', '😂', '😮', '🤔', '🔥', '🎉'];
const REACTION_COOLDOWN_MS = 400;

const MODERATOR_ACTIONS = new Set(['start', 'task', 'reveal', 'revote']);

const room = {
    phase: 'lobby', // lobby | idle | voting | revealed
    task: null,
    votingStartedAt: null,
    votingEndedAt: null,
    moderatorId: null,
    participants: new Map(), // id -> participante (orden de entrada)
    chat: [],
};
const byToken = new Map();
let colorIdx = 0;
let chatSeq = 0;

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const cleanText = (value, max) =>
    String(value ?? '')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .trim()
        .slice(0, max);

function json(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
}

function sendEvent(res, data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function stateFor(viewer) {
    const revealed = room.phase === 'revealed';
    return {
        type: 'state',
        phase: room.phase,
        task: room.task,
        // `now` permite al cliente compensar la diferencia de reloj con el servidor.
        timer: { startedAt: room.votingStartedAt, endedAt: room.votingEndedAt, now: Date.now() },
        deck: DECK,
        reactions: REACTIONS,
        moderatorId: room.moderatorId,
        me: { id: viewer.id, vote: viewer.vote },
        participants: [...room.participants.values()].map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            online: p.conns.size > 0,
            voted: p.vote !== null,
            vote: revealed ? p.vote : null,
        })),
    };
}

function broadcastState() {
    for (const p of room.participants.values()) {
        if (!p.conns.size) continue;
        const payload = stateFor(p);
        for (const res of p.conns) sendEvent(res, payload);
    }
}

function broadcast(data) {
    for (const p of room.participants.values()) {
        for (const res of p.conns) sendEvent(res, data);
    }
}

function pushChat(msg) {
    const full = { type: 'chat', id: ++chatSeq, ts: Date.now(), ...msg };
    room.chat.push(full);
    if (room.chat.length > CHAT_HISTORY) room.chat.shift();
    broadcast(full);
}

const systemMsg = (text) => pushChat({ system: true, text });

function startVoting() {
    room.phase = 'voting';
    room.votingStartedAt = Date.now();
    room.votingEndedAt = null;
    for (const p of room.participants.values()) p.vote = null;
}

function resetRoom() {
    room.phase = 'lobby';
    room.task = null;
    room.votingStartedAt = null;
    room.votingEndedAt = null;
    room.moderatorId = null;
    room.chat = [];
}

// La sesión pertenece al moderador: si sale, se cierra para todos.
function closeRoom(reason) {
    for (const p of room.participants.values()) {
        clearTimeout(p.leaveTimer);
        for (const res of p.conns) {
            sendEvent(res, { type: 'closed', reason });
            res.end();
        }
    }
    room.participants.clear();
    byToken.clear();
    resetRoom();
}

function removeParticipant(p) {
    if (room.moderatorId === p.id) {
        closeRoom('La sesión ha terminado: el moderador ha salido de la sala.');
        return;
    }
    clearTimeout(p.leaveTimer);
    room.participants.delete(p.id);
    byToken.delete(p.token);
    for (const res of p.conns) res.end();
    systemMsg(`${p.name} ha salido de la sala`);
    broadcastState();
}

function scheduleLeave(p) {
    clearTimeout(p.leaveTimer);
    p.leaveTimer = setTimeout(() => removeParticipant(p), LEAVE_GRACE_MS);
}

async function readJson(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY) throw new HttpError(413, 'Petición demasiado grande.');
        chunks.push(chunk);
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    } catch {
        throw new HttpError(400, 'JSON inválido.');
    }
}

function parseTaskUrl(value) {
    const raw = cleanText(value, MAX_URL);
    let url;
    try {
        url = new URL(raw);
    } catch {
        throw new HttpError(400, 'El link de la tarea no es una URL válida.');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new HttpError(400, 'El link debe empezar por http:// o https://');
    }
    return url.href;
}

function join(body) {
    const name = cleanText(body.name, MAX_NAME);
    if (!name) throw new HttpError(400, 'Escribe tu nombre.');
    const taken = [...room.participants.values()].some(
        (p) => p.name.toLowerCase() === name.toLowerCase(),
    );
    if (taken) throw new HttpError(409, 'Ya hay alguien con ese nombre en la sala.');
    if (room.participants.size >= MAX_PARTICIPANTS) {
        throw new HttpError(409, 'La sala está llena.');
    }

    const p = {
        id: randomUUID(),
        token: randomUUID(),
        name,
        color: COLORS[colorIdx++ % COLORS.length],
        vote: null,
        lastReactAt: 0,
        conns: new Set(),
        leaveTimer: null,
    };
    room.participants.set(p.id, p);
    byToken.set(p.token, p);
    if (!room.moderatorId) room.moderatorId = p.id;
    // Si nunca llega a abrir el stream de eventos, se le saca de la sala.
    scheduleLeave(p);
    systemMsg(`${name} se ha unido a la sala`);
    broadcastState();
    return { token: p.token, id: p.id };
}

function action(p, body) {
    if (MODERATOR_ACTIONS.has(body.type) && room.moderatorId !== p.id) {
        throw new HttpError(403, 'Solo el moderador puede hacer eso.');
    }
    switch (body.type) {
        case 'start':
            if (room.phase !== 'lobby') throw new HttpError(409, 'La sesión ya ha comenzado.');
            room.phase = 'idle';
            systemMsg('¡Comienza la sesión de Planning Poker!');
            break;
        case 'task': {
            if (room.phase === 'lobby') throw new HttpError(409, 'La sesión aún no ha comenzado.');
            const url = parseTaskUrl(body.url);
            room.task = { url };
            startVoting();
            systemMsg(`Nueva tarea a puntuar: ${url}`);
            break;
        }
        case 'vote': {
            if (room.phase !== 'voting') throw new HttpError(409, 'Ahora mismo no se puede votar.');
            const value = body.value === null ? null : String(body.value);
            if (value !== null && !DECK.includes(value)) {
                throw new HttpError(400, 'Carta no válida.');
            }
            p.vote = value;
            break;
        }
        case 'reveal':
            if (room.phase !== 'voting') throw new HttpError(409, 'No hay votación en curso.');
            if (![...room.participants.values()].some((x) => x.vote !== null)) {
                throw new HttpError(409, 'Nadie ha votado todavía.');
            }
            room.phase = 'revealed';
            room.votingEndedAt = Date.now();
            systemMsg('¡Cartas reveladas!');
            break;
        case 'revote':
            if (!room.task) throw new HttpError(409, 'No hay ninguna tarea.');
            startVoting();
            systemMsg('Se repite la votación de la tarea');
            break;
        case 'chat': {
            const text = cleanText(body.text, MAX_CHAT);
            if (!text) throw new HttpError(400, 'El mensaje está vacío.');
            pushChat({ name: p.name, color: p.color, text });
            return;
        }
        case 'react': {
            if (!REACTIONS.includes(body.emoji)) throw new HttpError(400, 'Reacción no válida.');
            const now = Date.now();
            // Anti-spam: se ignoran en silencio las reacciones demasiado seguidas.
            if (now - p.lastReactAt < REACTION_COOLDOWN_MS) return;
            p.lastReactAt = now;
            broadcast({ type: 'reaction', id: p.id, emoji: body.emoji });
            return;
        }
        case 'leave':
            removeParticipant(p);
            return;
        default:
            throw new HttpError(400, 'Acción desconocida.');
    }
    broadcastState();
}

function openEvents(req, res, url) {
    const p = byToken.get(url.searchParams.get('token'));
    if (!p) {
        json(res, 401, { error: 'Sesión no válida.' });
        return;
    }
    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.write('retry: 3000\n\n');

    clearTimeout(p.leaveTimer);
    p.conns.add(res);
    sendEvent(res, { type: 'history', messages: room.chat });
    broadcastState();

    const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
    req.on('close', () => {
        clearInterval(heartbeat);
        p.conns.delete(res);
        if (!p.conns.size && room.participants.get(p.id) === p) {
            scheduleLeave(p);
            broadcastState();
        }
    });
}

export async function handlePoker(req, res, url) {
    if (!url.pathname.startsWith('/api/poker/')) return false;
    try {
        const route = `${req.method} ${url.pathname}`;
        if (route === 'GET /api/poker/events') {
            openEvents(req, res, url);
        } else if (route === 'POST /api/poker/join') {
            json(res, 200, join(await readJson(req)));
        } else if (route === 'POST /api/poker/action') {
            const body = await readJson(req);
            const p = byToken.get(body.token);
            if (!p) throw new HttpError(401, 'Sesión no válida.');
            action(p, body);
            json(res, 200, { ok: true });
        } else {
            json(res, 404, { error: 'Not found' });
        }
    } catch (err) {
        if (!(err instanceof HttpError)) throw err;
        json(res, err.status, { error: err.message });
    }
    return true;
}