import { initSourceViewer } from './sourceViewer.js';

const $ = (sel) => document.querySelector(sel);
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const TOKEN_KEY = 'poker.token';
const NAME_KEY = 'poker.name';
const ENDED_KEY = 'poker.ended';

// Equivalencias orientativas (sprint de 2 semanas).
const CARD_MEANINGS = {
    0: 'Trivial (menos de 1 hora)',
    1: 'Media jornada',
    2: 'Una jornada',
    3: '2 días',
    5: '3-4 días',
    8: 'Medio sprint',
    13: 'El sprint entero',
    21: 'Más de un sprint: hay que dividirla',
    '?': 'No lo sé o falta información',
    '☕': 'Necesito un descanso',
};

const CONSENSUS_SYMBOLS = ['🃏', '♠️', '♥️', '♦️', '♣️', '🪙'];
const REACTION_DURATION_MS = 3000;

// ==== Chat: espectadores simulados que se mezclan con los mensajes reales ====
const SPECTATORS = [
    { name: 'scrum_master_zen', color: '#4ade80' },
    { name: 'PO_optimista', color: '#ffb347' },
    { name: 'dev_backend_99', color: '#5eaaff' },
    { name: 'la_tester_implacable', color: '#f472b6' },
    { name: 'arquitecto_depende', color: '#c77dff' },
    { name: 'becario_feliz', color: '#a3e635' },
    { name: 'deuda_tecnica', color: '#f87171' },
    { name: 'velocity_hunter', color: '#22d3ee' },
    { name: 'jira_lover', color: '#60a5fa' },
    { name: 'refinamiento_eterno', color: '#fbbf24' },
    { name: 'story_points_fan', color: '#2dd4bf' },
    { name: 'devops_en_llamas', color: '#fb7185' },
];

const SPECTATOR_MESSAGES = [
    'eso es un 3 como una casa',
    'yo he visto historias de 13 que eran cambiar el color de un botón',
    'quién ha puesto el café, que se identifique',
    'el PO dice que es fácil, así que mínimo un 8',
    'si toca backend es un 13, no hay más que hablar',
    'esto en mi anterior empresa era un 1',
    'ya estamos estimando en horas otra vez...',
    'divide la historia, DIVÍDELA',
    '¿alguien se ha leído los criterios de aceptación?',
    'apuesto 5 a que sale un 5',
    'el sprint ya está lleno y aún no hemos empezado',
    'eso lo hace el becario en una tarde',
    'depende... (dijo el arquitecto)',
    'esto tiene pinta de spike',
    'acordaos de los tests, eh',
    'quien vote 21 que la haga él',
    'dos horas de refinamiento y vamos por la primera historia',
    'yo voto lo mismo que el senior',
    '¿esto no estaba ya hecho?',
    'si hay que tocar el legacy, multiplicad por dos',
    '¿definición de hecho, alguien?',
    'la velocity este sprint por los suelos',
    'en producción funciona, en local no',
    'otro refinamiento sin el PO, clásico',
    'esto huele a deuda técnica',
    'me apuesto el café a que alguien saca un ?',
    'eso es un cambio de una línea... y 40 de tests',
    'no estiméis por mí que estoy en la daily de otro equipo',
    'puntos de historia, no horas, ¡PUNTOS!',
    'el ticket no tiene descripción, pero vamos a ello',
];

const NEW_TASK_REACTIONS = [
    'a ver esta...',
    'uff, esta tiene miga',
    'esta la conozco, un 8 fijo',
    'otra tarea sin descripción, genial',
    'esta es la que nadie quiere coger',
    'abrid el link antes de votar, que nos conocemos',
];

const CONSENSUS_REACTIONS = [
    '¡CONSENSO! esto no pasaba desde 2019',
    'qué equipo más alineado, me emociono',
    'todos iguales... sospechoso',
    'el scrum master llorando de alegría',
    'así da gusto refinar',
];

const DEBATE_REACTIONS = [
    'aquí hay debate para media hora',
    'el del número más alto sabe algo que no sabemos',
    'que explique su magia el del número bajo',
    'esto no lo cerráis hoy',
    'a discutir se ha dicho',
    'cada uno ha leído una historia distinta',
];

// Plantillas que mencionan a participantes reales: {name}, {max}/{maxVote}, {min}/{minVote}.
const NAME_MESSAGES = [
    '{name} tiene cara de 13, lo estoy viendo',
    'a {name} le toca hacer esta, fijo',
    '{name} siempre vota 8, apuntadlo',
    'yo voto lo mismo que {name}',
    'si {name} dice que es fácil, desconfiad',
    '¿{name} se ha leído la historia? lo dudo',
    'saludos a {name} desde el equipo de QA',
    '{name} MVP del refinamiento',
    'que alguien le traiga un café a {name}',
    '{name} ya está pensando en el próximo sprint',
    'ojo, que {name} sabe algo de esta tarea',
    '{name} lleva tres refinamientos sin pestañear',
];

const PENDING_VOTE_MESSAGES = [
    'venga {name}, que no tenemos todo el día',
    '{name} se lo está pensando mucho... sospechoso',
    'a {name} se le ha colgado el Jira',
    '{name}, ¿sigues ahí?',
    'esperando a {name} como quien espera el autobús',
];

const NEW_TASK_NAME_REACTIONS = [
    'esta tiene nombre y apellidos: {name}',
    '{name} ha puesto cara rara al ver el link',
    'a ver qué opina {name} de esta',
];

const CONSENSUS_NAME_REACTIONS = [
    '{name} y compañía, qué alineados',
    'hasta {name} está de acuerdo, histórico',
];

const DEBATE_NAME_REACTIONS = [
    '{max} con un {maxVote}... que lo explique',
    '{min} con un {minVote}, ¿lo haces tú en una tarde?',
    '{max} ha visto dragones en esa tarea',
    '{min} vive en otro proyecto, seguro',
];

const NAME_MESSAGE_CHANCE = 0.4;
const SPECTATOR_MIN_DELAY_MS = 12_000;
const SPECTATOR_MAX_DELAY_MS = 20_000;

const fill = (template, vars) => template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

function randomParticipantName(filter = () => true) {
    const list = state.room?.participants.filter(filter) ?? [];
    return list.length ? pickRandom(list).name : null;
}

// Mensaje espontáneo de un espectador; a veces menciona a un participante real.
function spectatorLine() {
    const room = state.room;
    if (room && Math.random() < NAME_MESSAGE_CHANCE) {
        const pending = room.phase === 'voting' ? randomParticipantName((p) => !p.voted) : null;
        if (pending && Math.random() < 0.5) return fill(pickRandom(PENDING_VOTE_MESSAGES), { name: pending });
        const name = randomParticipantName();
        if (name) return fill(pickRandom(NAME_MESSAGES), { name });
    }
    return pickRandom(SPECTATOR_MESSAGES);
}

function newTaskLine() {
    const name = randomParticipantName();
    return name && Math.random() < 0.5
        ? fill(pickRandom(NEW_TASK_NAME_REACTIONS), { name })
        : pickRandom(NEW_TASK_REACTIONS);
}

function revealLines(room, consensus) {
    const name = randomParticipantName((p) => p.vote !== null);
    if (consensus) {
        return [pickRandom(CONSENSUS_REACTIONS), fill(pickRandom(CONSENSUS_NAME_REACTIONS), { name })];
    }
    const numeric = room.participants
        .filter((p) => p.vote !== null && !Number.isNaN(Number(p.vote)))
        .sort((a, b) => Number(a.vote) - Number(b.vote));
    const min = numeric[0];
    const max = numeric.at(-1);
    if (!min || min.vote === max.vote) return [pickRandom(DEBATE_REACTIONS), pickRandom(DEBATE_REACTIONS)];
    const vars = { min: min.name, minVote: min.vote, max: max.name, maxVote: max.vote };
    return [pickRandom(DEBATE_REACTIONS), fill(pickRandom(DEBATE_NAME_REACTIONS), vars)];
}

const state = {
    token: sessionStorage.getItem(TOKEN_KEY),
    room: null,
    source: null,
    lastChatId: 0,
    handBuilt: false,
    reactionsBuilt: false,
    clockOffset: 0,
};

const chat = setupChat();

function init() {
    $('#join-name').value = localStorage.getItem(NAME_KEY) || '';
    $('#join-form').addEventListener('submit', onJoin);
    $('#leave-btn').addEventListener('click', onLeave);
    $('#invite-btn').addEventListener('click', onInvite);
    $('#start-btn').addEventListener('click', () => act('start'));
    $('#task-form').addEventListener('submit', onTaskSubmit);
    $('#reveal-btn').addEventListener('click', () => act('reveal'));
    $('#revote-btn').addEventListener('click', () => act('revote'));
    $('#chat-form').addEventListener('submit', onChatSubmit);
    $('#legend-btn').addEventListener('click', onToggleLegend);
    $('#back-link').addEventListener('click', onBackToRoulette);
    initSourceViewer();

    if (state.token) connect();
    render();
    setInterval(renderTimer, 500);
}

// ==== API ====
async function api(path, body) {
    const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) forgetSession('Tu sesión ha caducado, vuelve a entrar.');
    if (!res.ok) throw new Error(data.error || 'Error inesperado.');
    return data;
}

function act(type, extra = {}) {
    setRoomError('');
    return api('/api/poker/action', { token: state.token, type, ...extra }).catch(
        (err) => {
            setRoomError(err.message);
            throw err;
        },
    );
}

function connect() {
    state.source?.close();
    const source = new EventSource(
        `/api/poker/events?token=${encodeURIComponent(state.token)}`,
    );
    state.source = source;
    source.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'state') onState(msg);
        else if (msg.type === 'history') msg.messages.forEach(onChatMessage);
        else if (msg.type === 'chat') onChatMessage(msg);
        else if (msg.type === 'reaction') showReaction(msg);
        else if (msg.type === 'closed') endSession(msg.reason);
    };
    source.onopen = () => setRoomError('');
    source.onerror = () => {
        if (source.readyState === EventSource.CLOSED) {
            forgetSession('Tu sesión ha caducado, vuelve a entrar.');
        } else {
            setRoomError('Conexión perdida, reconectando…');
        }
    };
}

// Los participantes solo ven el mensaje de fin (sin opción de crear otra sesión),
// también si recargan la pestaña. El moderador vuelve a la pantalla de entrada.
function endSession(reason) {
    if (isModerator()) {
        forgetSession('Has cerrado la sesión para todos.');
        return;
    }
    sessionStorage.setItem(ENDED_KEY, reason);
    forgetSession();
}

function forgetSession(message = '') {
    state.source?.close();
    state.source = null;
    state.token = null;
    state.room = null;
    state.lastChatId = 0;
    sessionStorage.removeItem(TOKEN_KEY);
    chat.clearReal();
    $('#join-error').textContent = message;
    render();
}

// ==== Eventos de la sala ====
function onState(next) {
    const prev = state.room;
    state.room = next;
    state.clockOffset = Date.now() - next.timer.now;
    const justRevealed = prev?.phase === 'voting' && next.phase === 'revealed';
    render({ justRevealed });

    if (prev && next.task && next.task.url !== prev.task?.url) {
        chat.react([newTaskLine()]);
    }
    if (justRevealed) {
        const consensus = getConsensus(next) !== null;
        if (consensus) celebrateConsensus();
        chat.react(revealLines(next, consensus));
    }
}

// Consenso: al menos 2 votos y todos exactamente iguales (incluidos ? y ☕).
function getConsensus(room) {
    if (room.phase !== 'revealed') return null;
    const votes = room.participants.map((p) => p.vote).filter((v) => v !== null);
    return votes.length > 1 && votes.every((v) => v === votes[0]) ? votes[0] : null;
}

function celebrateConsensus() {
    document.body.classList.remove('shake');
    void document.body.offsetWidth;
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 400);
    showCardShower();
}

// Lluvia de cartas (reutiliza los estilos .money-shower/.money-bill de la ruleta).
function showCardShower() {
    document.querySelector('.money-shower')?.remove();
    const container = document.createElement('div');
    container.className = 'money-shower';
    container.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 40; i++) {
        const item = document.createElement('span');
        item.className = 'money-bill';
        item.textContent = pickRandom(CONSENSUS_SYMBOLS);
        item.style.left = `${Math.random() * 100}%`;
        item.style.fontSize = `${22 + Math.random() * 22}px`;
        item.style.animationDuration = `${2 + Math.random() * 2.4}s`;
        item.style.animationDelay = `${Math.random() * 0.6}s`;
        item.style.setProperty('--drift', `${(Math.random() * 2 - 1) * 80}px`);
        item.style.setProperty('--rot', `${(Math.random() * 2 - 1) * 720}deg`);
        container.appendChild(item);
    }
    document.body.appendChild(container);
    setTimeout(() => container.remove(), 5500);
}

function showReaction({ id, emoji }) {
    const sel = CSS.escape(id);
    const anchor =
        document.querySelector(`#table-cards .seat[data-id="${sel}"] .poker-card`) ||
        document.querySelector(`#poker-participants li[data-id="${sel}"]`);
    const rect = anchor?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;

    const el = document.createElement('span');
    el.className = 'reaction-float';
    el.setAttribute('aria-hidden', 'true');
    el.textContent = emoji;
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top}px`;
    el.style.setProperty('--drift', `${(Math.random() * 2 - 1) * 24}px`);
    el.style.animationDuration = `${REACTION_DURATION_MS}ms`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), REACTION_DURATION_MS);
}

function onToggleLegend() {
    const legend = $('#card-legend');
    legend.hidden = !legend.hidden;
    $('#legend-btn').setAttribute('aria-expanded', String(!legend.hidden));
}

function onChatMessage(msg) {
    if (msg.id <= state.lastChatId) return;
    state.lastChatId = msg.id;
    if (msg.system) chat.add(msg.text, { kind: 'system' });
    else chat.add(msg.text, { user: { name: msg.name, color: msg.color }, kind: 'real' });
}

// ==== Handlers de UI ====
async function onJoin(event) {
    event.preventDefault();
    const input = $('#join-name');
    const err = $('#join-error');
    const name = input.value.trim();
    err.textContent = '';
    if (!name) return;
    const btn = event.submitter;
    if (btn) btn.disabled = true;
    try {
        const { token } = await api('/api/poker/join', { name });
        localStorage.setItem(NAME_KEY, name);
        sessionStorage.setItem(TOKEN_KEY, token);
        state.token = token;
        connect();
    } catch (e) {
        err.textContent = e.message;
    } finally {
        if (btn) btn.disabled = false;
    }
}

const isModerator = () => !!state.room && state.room.moderatorId === state.room.me.id;
const MODERATOR_EXIT_WARNING = 'Eres el moderador: si sales, la sesión terminará para todos.';

async function onLeave() {
    const isMod = isModerator();
    const question = isMod
        ? `${MODERATOR_EXIT_WARNING} ¿Salir de la sala?`
        : '¿Salir de la sala de Planning Poker?';
    if (!window.confirm(question)) return;
    await act('leave').catch(() => {});
    forgetSession(isMod ? 'Has cerrado la sesión para todos.' : '');
}

function onBackToRoulette(event) {
    if (!isModerator()) return;
    if (!window.confirm(`${MODERATOR_EXIT_WARNING} ¿Ir a la ruleta?`)) event.preventDefault();
}

const inviteUrl = () => `${location.origin}/poker.html`;
const isLocalHost = () => ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

async function onInvite() {
    const btn = $('#invite-btn');
    const url = inviteUrl();
    try {
        await navigator.clipboard.writeText(url);
    } catch {
        // El portapapeles solo está disponible en HTTPS o localhost (p.ej. falla en http://IP-LAN).
        window.prompt('Copia este enlace y compártelo con el equipo:', url);
        return;
    }
    btn.textContent = '¡Enlace copiado!';
    clearTimeout(onInvite.timer);
    onInvite.timer = setTimeout(() => {
        btn.textContent = 'Copiar enlace de invitación';
    }, 2000);
}

async function onTaskSubmit(event) {
    event.preventDefault();
    const input = $('#task-input');
    const url = input.value.trim();
    if (!url) return;
    await act('task', { url })
        .then(() => {
            input.value = '';
        })
        .catch(() => {});
}

async function onChatSubmit(event) {
    event.preventDefault();
    const input = $('#chat-input');
    const text = input.value.trim();
    if (!text || !state.token) return;
    input.value = '';
    await act('chat', { text }).catch(() => {
        input.value = text;
    });
}

function onVote(value) {
    const room = state.room;
    if (!room || room.phase !== 'voting') return;
    const next = room.me.vote === value ? null : value;
    room.me.vote = next;
    renderHand(room);
    act('vote', { value: next }).catch(() => {});
}

function setRoomError(message) {
    $('#room-error').textContent = message;
}

// ==== Render ====
function render({ justRevealed = false } = {}) {
    const room = state.room;
    const endedReason = room ? null : sessionStorage.getItem(ENDED_KEY);
    $('#end-screen').hidden = endedReason === null;
    $('#end-message').textContent = endedReason ?? '';
    $('#join-screen').hidden = !!room || endedReason !== null;
    $('#room').hidden = !room;
    const chatInput = $('#chat-input');
    chatInput.disabled = !room;
    chatInput.placeholder = room
        ? 'Escribe un mensaje…'
        : endedReason !== null
            ? 'Sesión finalizada'
            : 'Entra en la sala para escribir';
    $('#chat-form button').disabled = !room;
    $('#back-nav').hidden = !isModerator();
    if (!room) return;

    const isMod = isModerator();
    $('#invite-btn').hidden = !isMod;
    const hint = $('#invite-hint');
    hint.hidden = !(isMod && isLocalHost());
    hint.textContent =
        'Estás en localhost: este enlace solo funciona en tu equipo. Usa la URL pública (Render) o tu IP con HOST=0.0.0.0.';
    renderParticipants(room);
    renderTable(room, isMod, justRevealed);
    renderReactionBar(room);
    renderHand(room);
}

function formatElapsed(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return h ? `${h}:${m}:${s}` : `${m}:${s}`;
}

// Cronómetro: corre desde que se puede votar hasta que se revelan las cartas.
function renderTimer() {
    const room = state.room;
    const el = $('#voting-timer');
    const { startedAt, endedAt } = room?.timer ?? {};
    const visible = !!startedAt && (room.phase === 'voting' || room.phase === 'revealed');
    el.hidden = !visible;
    if (!visible) return;
    const serverNow = Date.now() - state.clockOffset;
    const running = room.phase === 'voting';
    el.classList.toggle('running', running);
    $('#voting-timer-label').textContent = running ? 'Tiempo de votacion' : 'Votación cerrada en';
    $('#voting-timer-value').textContent = formatElapsed((running ? serverNow : endedAt) - startedAt);
}

function renderReactionBar(room) {
    if (state.reactionsBuilt) return;
    const bar = $('#reaction-bar');
    for (const emoji of room.reactions) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'reaction-btn';
        btn.textContent = emoji;
        btn.setAttribute('aria-label', `Reaccionar con ${emoji}`);
        btn.addEventListener('click', () => act('react', { emoji }).catch(() => {}));
        bar.appendChild(btn);
    }
    state.reactionsBuilt = true;
}

function renderParticipants(room) {
    $('#participants-count').textContent = room.participants.length;
    const list = $('#poker-participants');
    list.replaceChildren();
    for (const p of room.participants) {
        const li = document.createElement('li');
        li.dataset.id = p.id;
        if (!p.online) li.classList.add('offline');

        const dot = document.createElement('span');
        dot.className = 'participant-dot';
        dot.style.background = p.color;

        const name = document.createElement('span');
        name.className = 'participant-name';
        name.textContent = p.id === room.me.id ? `${p.name} (tú)` : p.name;
        li.append(dot, name);

        if (p.id === room.moderatorId) {
            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.textContent = 'Moderador';
            li.appendChild(badge);
        }

        const status = document.createElement('span');
        status.className = 'participant-status';
        if (room.phase === 'voting') {
            status.textContent = p.voted ? 'Ha votado' : 'Pensando…';
            status.classList.toggle('voted', p.voted);
        } else if (room.phase === 'revealed') {
            status.textContent = p.vote ?? '—';
            status.classList.add('value');
        }
        li.appendChild(status);
        list.appendChild(li);
    }
}

function renderTable(room, isMod, justRevealed) {
    const { phase, participants } = room;
    const votedCount = participants.filter((p) => p.voted).length;
    const allVoted = votedCount === participants.length;

    const statusText = {
        lobby: isMod
            ? 'Cuando esté todo el equipo, pulsa Comenzar.'
            : 'Esperando a que el moderador comience la sesión…',
        idle: isMod
            ? 'Pega el link de la primera tarea para empezar a votar.'
            : 'Esperando a que el moderador elija la tarea…',
        voting:
            `${votedCount}/${participants.length} han votado` +
            (isMod && allVoted ? ' — ¡ya puedes revelar!' : ''),
        revealed: 'Cartas reveladas',
    };
    $('#phase-status').textContent = statusText[phase];
    renderTimer();

    const taskDisplay = $('#task-display');
    taskDisplay.hidden = !room.task;
    if (room.task) {
        const link = $('#task-link');
        link.href = room.task.url;
        link.textContent = room.task.url;
        link.title = room.task.url;
    }

    $('#start-btn').hidden = !(isMod && phase === 'lobby');
    $('#task-form').hidden = !(isMod && phase !== 'lobby');
    $('#task-submit').textContent = room.task ? 'Nueva tarea' : 'Puntuar';

    const revealBtn = $('#reveal-btn');
    revealBtn.hidden = !(isMod && phase === 'voting');
    revealBtn.disabled = votedCount === 0;
    revealBtn.classList.toggle('ready', allVoted);
    $('#revote-btn').hidden = !(isMod && phase === 'revealed');

    const consensus = getConsensus(room);
    const banner = $('#consensus-banner');
    banner.hidden = consensus === null;
    if (consensus !== null) {
        const strong = document.createElement('strong');
        strong.textContent = consensus;
        banner.replaceChildren('¡CONSENSO! Todos han votado ', strong);
    }

    const cards = $('#table-cards');
    cards.replaceChildren();
    if (phase !== 'voting' && phase !== 'revealed') return;
    for (const p of participants) {
        const seat = document.createElement('div');
        seat.className = 'seat';
        seat.dataset.id = p.id;
        const card = document.createElement('div');
        card.className = 'poker-card';
        if (phase === 'revealed' && p.vote !== null) {
            card.classList.add('face');
            if (justRevealed) card.classList.add('flip');
            card.dataset.value = p.vote;
            card.textContent = p.vote;
        } else {
            card.classList.add(p.voted ? 'back' : 'empty');
        }
        const name = document.createElement('span');
        name.className = 'seat-name';
        name.textContent = p.name;
        name.style.color = p.color;
        seat.append(card, name);
        cards.appendChild(seat);
    }
}

function renderHand(room) {
    $('#hand-area').hidden = room.phase === 'lobby';
    const hand = $('#hand');
    if (!state.handBuilt) {
        const legend = $('#card-legend');
        for (const value of room.deck) {
            const meaning = CARD_MEANINGS[value];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'poker-card face';
            btn.dataset.value = value;
            btn.textContent = value;
            btn.title = meaning ? `${value}: ${meaning}` : value;
            btn.setAttribute('aria-label', meaning ? `Votar ${value} (${meaning})` : `Votar ${value}`);
            btn.addEventListener('click', () => onVote(value));
            hand.appendChild(btn);

            if (!meaning) continue;
            const item = document.createElement('div');
            const dt = document.createElement('dt');
            dt.textContent = value;
            const dd = document.createElement('dd');
            dd.textContent = meaning;
            item.append(dt, dd);
            legend.appendChild(item);
        }
        state.handBuilt = true;
    }
    for (const btn of hand.children) {
        const selected = btn.dataset.value === room.me.vote;
        btn.classList.toggle('selected', selected);
        btn.setAttribute('aria-pressed', String(selected));
        btn.disabled = room.phase !== 'voting';
    }
}

// ==== Chat widget ====
function setupChat() {
    const widget = $('.chat-widget');
    const messagesEl = $('#chat-messages');
    const toggleBtn = widget.querySelector('.chat-toggle');
    const viewersEl = widget.querySelector('.chat-viewers');
    const MAX_MSGS = 120;

    toggleBtn.addEventListener('click', () => {
        const collapsed = widget.classList.toggle('collapsed');
        toggleBtn.textContent = collapsed ? '+' : '−';
        toggleBtn.setAttribute('aria-expanded', String(!collapsed));
    });

    function add(text, { user, kind } = {}) {
        const msg = document.createElement('div');
        msg.className = 'chat-msg';
        if (kind) msg.classList.add(kind);

        if (kind !== 'system') {
            const author = user || pickRandom(SPECTATORS);
            const nameEl = document.createElement('span');
            nameEl.className = 'chat-name';
            nameEl.style.color = author.color;
            nameEl.textContent = author.name + ':';
            msg.appendChild(nameEl);
        }
        const textEl = document.createElement('span');
        textEl.className = 'chat-text';
        textEl.textContent = kind === 'system' ? text : ' ' + text;
        msg.appendChild(textEl);

        const atBottom =
            messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 40;
        messagesEl.appendChild(msg);
        if (atBottom || kind === 'real') messagesEl.scrollTop = messagesEl.scrollHeight;
        while (messagesEl.children.length > MAX_MSGS) {
            messagesEl.removeChild(messagesEl.firstChild);
        }
    }

    function react(lines) {
        lines.forEach((line, i) => {
            setTimeout(() => add(line), 800 + i * 1800 + Math.random() * 600);
        });
    }

    function clearReal() {
        messagesEl.querySelectorAll('.chat-msg.real, .chat-msg.system').forEach((el) => el.remove());
    }

    for (let i = 0; i < 3; i++) add(pickRandom(SPECTATOR_MESSAGES));
    (function schedule() {
        const delay =
            SPECTATOR_MIN_DELAY_MS + Math.random() * (SPECTATOR_MAX_DELAY_MS - SPECTATOR_MIN_DELAY_MS);
        setTimeout(() => {
            add(spectatorLine());
            schedule();
        }, delay);
    })();

    let viewers = 40 + Math.floor(Math.random() * 40);
    viewersEl.textContent = viewers;
    setInterval(() => {
        viewers = Math.max(12, viewers + Math.floor(Math.random() * 7) - 3);
        viewersEl.textContent = viewers;
    }, 6000);

    return { add, react, clearReal };
}

init();