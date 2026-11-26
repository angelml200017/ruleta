import { Wheel } from './wheel.js';

const $ = (sel) => document.querySelector(sel);

const PRIZE_POOL = [
  500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000, 500_000, 1_000_000,
];
const MONEY_SYMBOLS = ['💵', '💰', '💸', '🪙', '💴', '🤑'];

const JACKPOT_CHANCE = 0.05; // 1 de cada 20 giros, aprox.
const JACKPOT_PRIZE = 10_000_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ==== Chat en vivo: pools de usuarios y mensajes ====
const CHAT_USERS = [
  { name: 'DegenJorge_84', color: '#ff6b6b' },
  { name: 'ruletero_manolo', color: '#5eaaff' },
  { name: 'la_casa_gana', color: '#c77dff' },
  { name: 'abuelita_apuestas', color: '#ffb347' },
  { name: 'MartingalaOK', color: '#4ade80' },
  { name: 'pleno_al_0', color: '#f472b6' },
  { name: 'cristian_ruina', color: '#fbbf24' },
  { name: 'fondoABI', color: '#60a5fa' },
  { name: 'yovi_tequiero', color: '#34d399' },
  { name: 'PACO_LAS_FICHAS', color: '#a78bfa' },
  { name: 'elultimoduro', color: '#f87171' },
  { name: 'mami_perdoname', color: '#ec4899' },
  { name: 'croupier_hater', color: '#facc15' },
  { name: 'sistema_infalible', color: '#22d3ee' },
  { name: 'vendo_rinones', color: '#a3e635' },
  { name: 'elena_tilt', color: '#fb7185' },
  { name: 'ludo_paticas', color: '#818cf8' },
  { name: 'divorced_gambler', color: '#fdba74' },
  { name: 'toma_caliente', color: '#2dd4bf' },
  { name: 'charly_sin_cash', color: '#e879f9' },
];

const CHAT_MESSAGES = [
  'rojo por favor rojo que me quedo sin casa',
  'si sale negro me tiro por el balcón',
  'al 17 todo, me lo dijo mi abuela en sueños',
  'me he gastado la nómina otra vez',
  'mi mujer cree que estoy en el gimnasio',
  'acabo de hipotecar el coche, va a salir LO SÉ',
  'siempre que voy al baño sale mi número',
  'pleno al 0, LO VEO VENIR',
  'otra vez negro, esta ruleta está amañada',
  'que alguien me pare por favor',
  'llevo 14 horas seguidas, el café ya no me hace nada',
  'crack crack crack que venga el rojo crack',
  'hoy me caso o me arruino, no hay término medio',
  'esta es la última, de verdad de la buena',
  'he empeñado el anillo de mi madre',
  'el croupier me odia personalmente',
  'COMPRO ORO quién vende oro',
  'si gano esta me voy a Ibiza, si pierdo a la mili',
  'llevo 27 giros sin ganar, estadísticamente ya toca',
  'mi psicóloga me dijo que no viniera pero qué sabrá ella',
  'rojo 32 rojo 32 rojo 32',
  'el Excel dice que toca rojo',
  'hoy le pago el instituto al niño o no',
  'vendo riñón módico precio',
  'la martingala NUNCA FALLA',
  'acabo de vender el sofá por wallapop',
  'un día de estos me quito, pero no hoy',
  'salí de casa diciendo que iba a comprar pan',
  'mi banco me ha llamado 7 veces esta tarde',
  'cada vez que apuesto al negro sale rojo, no es casualidad',
  'le he prometido al niño que si gano le compro la play',
  'esta ruleta es mi terapia',
  'OS DIJE QUE SALÍA EL 21',
  'me tiemblan las manos pero sigo',
  'un amigo me pasó un sistema infalible',
  'si gano esta te pago el café, lo juro',
  'acabo de ver una señal: iba un señor con camisa roja',
  'me voy... ME QUEDO UNA MÁS',
  'dios si existes, rojo',
  'esto es una señal del universo',
  'el gato se ha sentado en el cojín rojo, SEÑAL',
  'cash cash cash',
  'me están temblando los párpados',
  'hoy cobro o pido el divorcio',
  'la luna está en cáncer, TOCA GANAR',
  'ya no siento las manos pero sigo',
  'le debo dinero a mi suegra, a mi cuñado y al lechero',
  'como salga negro le prendo fuego al portátil',
  'CÓMO QUE HA SALIDO EL 0',
  'todo al 3, el 3 en raya',
  'hoy desayuno con el oro que gane',
  'acabo de vender los tupper de mi madre',
  'si esto no sale rojo no me caso',
  'me duele la espalda de estar sentado',
  'mi abuela decia que el 7 era de la suerte, PUES NO',
  'alguien tiene 20 pavos para prestarme',
  'la cena de navidad la pago yo, si gano',
  'tengo un presentimiento con este giro',
  'me estoy jugando la herencia de mi tía',
  'el reloj se paró a las 17:00, SEÑAL ROJO',
  'en la siguiente seguro que sí',
  'le voy a echar un sorbo al whisky antes, por suerte',
  'acabo de ver un mirlo, eso es señal de suerte',
  'si pierdo esta me convierto en monje',
  'llevo 3 cafes y un red bull, I’M READY',
  'el hijo de mi vecina se llama Rojo, SEGURO QUE SALE',
  'me pica la mano izquierda, eso es dinero entrando',
  'JOPE otra vez',
  'podéis parar un poco de ganarle al rojo?',
  'acabo de pedir un préstamo rápido en la app',
];

const CHAT_REACTIONS = [
  'QUE SUERTE MADRE MÍA',
  'otro que se lleva la pasta y yo aquí mirando',
  'no puede ser, NO PUEDE SER',
  'ya lo decía yo, ya lo decía',
  'ME CAGO EN TO',
  'suerte de principiante fijo',
  'jajajaja el tipo este cómo gana',
  'yo apostando al mismo y perdiendo',
  'qué envidia joder',
  'tramposos',
  'LO SABÍA LO SABÍA LO SABÍA',
  'esto está amañado confirmadísimo',
  'me estás vacilando no',
  'paso de esta mesa',
  'INJUSTO',
  'y yo sin un duro',
  'vaya chorrada',
  'otra vez el mismo, esto huele',
];

const CHAT_JACKPOT_REACTIONS = [
  'JACKPOTTT MADRE DEL AMOR HERMOSO',
  'NO PUEDE SER, NO PUEDE SERRRR',
  'ESTO ES UN ESCÁNDALO',
  'ME VOY DE ESTA MESA, ESTO ESTÁ AMAÑADO',
  'ESE TÍO VIVE EN MI CALLE SEGURO QUE ES UN BOT',
  'Y YO SIN UN DURO',
  'MENUDA PASTA DIOS MÍO',
  'GENTE LLAMANDO A HACIENDA',
  'LO HA AMAÑADO EL CROUPIER SEGURO',
  'QUÉ PUTA ENVIDIA MADRE MÍA',
  'PASÁME 1000€ HERMANO POR FAVOR',
  'YO SIGO JUGANDO PORQUE TOCA, LO VEO',
];

const chat = {
  addMessage: null,
  reactToWin: null,
};

// Motor de sonido con Web Audio API (sin dependencias externas).
// Cada sonido se sintetiza al vuelo con osciladores + envolvente.
const audio = {
  ctx: null,
  muted: false,
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    } catch (_e) {
      /* audio no disponible, seguimos silenciosos */
    }
  },
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  _tone(freq, opts = {}, offset = 0) {
    if (this.muted || !this.ctx) return;
    const { type = 'triangle', dur = 0.1, vol = 0.1, attack = 0.005 } = opts;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + offset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  },
  click() {
    this.init();
    this.resume();
    this._tone(900, { type: 'square', dur: 0.035, vol: 0.06 });
  },
  tick() {
    this.init();
    this.resume();
    this._tone(1250, { type: 'square', dur: 0.022, vol: 0.05 });
  },
  coin() {
    this.init();
    this.resume();
    this._tone(1100, { type: 'triangle', dur: 0.08, vol: 0.1 }, 0);
    this._tone(1650, { type: 'triangle', dur: 0.09, vol: 0.1 }, 0.05);
  },
  jingle() {
    this.init();
    this.resume();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) =>
      this._tone(f, { type: 'triangle', dur: 0.25, vol: 0.13 }, i * 0.1),
    );
  },
  jackpot() {
    this.init();
    this.resume();
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093, 2637];
    notes.forEach((f, i) =>
      this._tone(f, { type: 'triangle', dur: 0.28, vol: 0.15 }, i * 0.09),
    );
    // Bombo grave para darle cuerpo
    this._tone(130, { type: 'square', dur: 0.5, vol: 0.18, attack: 0.02 }, 0);
  },
};

const state = {
  participants: [],
  winners: [],
  config: {
    spinDurationMs: 5000,
    removeWinner: true,
  },
  wheel: null,
};

function init() {
  const canvas = document.getElementById('wheel');
  state.wheel = new Wheel(canvas);

  setupLights();
  setupSoundHooks();
  setupChat();

  $('#add-form').addEventListener('submit', onAdd);
  $('#duration-input').addEventListener('input', onDurationChange);
  $('#remove-winner-toggle').addEventListener('change', onToggleRemove);
  $('#spin-btn').addEventListener('click', onSpin);
  $('#reset-btn').addEventListener('click', onReset);

  renderAll();
}

function setupChat() {
  const widget = document.querySelector('.chat-widget');
  const messagesEl = document.getElementById('chat-messages');
  const toggleBtn = widget && widget.querySelector('.chat-toggle');
  const viewersEl = widget && widget.querySelector('.chat-viewers');
  if (!widget || !messagesEl || !toggleBtn) return;

  const MAX_MSGS = 80;

  toggleBtn.addEventListener('click', () => {
    const collapsed = widget.classList.toggle('collapsed');
    toggleBtn.textContent = collapsed ? '+' : '−';
    toggleBtn.setAttribute('aria-expanded', String(!collapsed));
  });

  function addMessage(text, opts = {}) {
    const user = opts.user || pickRandom(CHAT_USERS);
    const msg = document.createElement('div');
    msg.className = 'chat-msg';
    if (opts.reaction) msg.classList.add('reaction');
    if (opts.big) msg.classList.add('big');

    const nameEl = document.createElement('span');
    nameEl.className = 'chat-name';
    nameEl.style.color = user.color;
    nameEl.textContent = user.name + ':';

    const textEl = document.createElement('span');
    textEl.className = 'chat-text';
    textEl.textContent = ' ' + text;

    msg.appendChild(nameEl);
    msg.appendChild(textEl);
    messagesEl.appendChild(msg);

    // Auto-scroll al final
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Cap de mensajes para no crecer sin límite
    while (messagesEl.children.length > MAX_MSGS) {
      messagesEl.removeChild(messagesEl.firstChild);
    }
  }

  function addRandom() {
    addMessage(pickRandom(CHAT_MESSAGES));
  }

  // Burst inicial para que no abra vacío
  for (let i = 0; i < 5; i++) addRandom();

  // Scheduler cada 4-7s con jitter para que no sea mecánico
  function schedule() {
    const delay = 4000 + Math.random() * 3000;
    setTimeout(() => {
      addRandom();
      schedule();
    }, delay);
  }
  schedule();

  // Viewers falsos que se mueven un poquito
  if (viewersEl) {
    let viewers = 1200 + Math.floor(Math.random() * 200);
    viewersEl.textContent = viewers.toLocaleString('es-ES');
    setInterval(() => {
      viewers += Math.floor(Math.random() * 11) - 3; // -3..+7
      if (viewers < 800) viewers = 800;
      viewersEl.textContent = viewers.toLocaleString('es-ES');
    }, 6000);
  }

  chat.addMessage = addMessage;
  chat.reactToWin = (isJackpot) => {
    const pool = isJackpot ? CHAT_JACKPOT_REACTIONS : CHAT_REACTIONS;
    const count = isJackpot ? 5 : 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      setTimeout(
        () =>
          addMessage(pickRandom(pool), {
            reaction: true,
            big: isJackpot,
          }),
        250 + i * 400 + Math.random() * 200,
      );
    }
  };
}

function setupSoundHooks() {
  // Desbloquear AudioContext en el primer gesto del usuario
  document.addEventListener('pointerdown', () => audio.init(), { once: true });
  // Click sonido en botones/checkboxes/labels (delegación global)
  document.addEventListener(
    'mousedown',
    (e) => {
      const el = e.target.closest(
        'button, input[type="checkbox"], .config-row.toggle span',
      );
      if (el && !el.disabled) audio.click();
    },
    { capture: true },
  );
}

function setupLights() {
  const ring = document.querySelector('.lights-ring');
  if (!ring) return;
  const COUNT = 24;
  for (let i = 0; i < COUNT; i++) {
    const slot = document.createElement('div');
    slot.className = 'light-slot';
    slot.style.setProperty('--angle', `${(i / COUNT) * 360}deg`);
    const dot = document.createElement('div');
    dot.className = 'light';
    slot.appendChild(dot);
    ring.appendChild(slot);
  }
}

function onAdd(event) {
  event.preventDefault();
  const input = $('#participant-input');
  const err = $('#add-error');
  err.textContent = '';
  const name = input.value.trim();
  if (!name) return;
  if (name.length > 40) {
    err.textContent = 'Máximo 40 caracteres.';
    return;
  }
  const exists = state.participants.some(
    (p) => p.toLowerCase() === name.toLowerCase(),
  );
  if (exists) {
    err.textContent = 'Ya hay un participante con ese nombre.';
    return;
  }
  state.participants.push(name);
  input.value = '';
  input.focus();
  renderAll();
}

function onRemoveAt(index) {
  if (state.wheel.isSpinning) return;
  state.participants.splice(index, 1);
  renderAll();
}

function onDurationChange(event) {
  let value = parseInt(event.target.value, 10);
  if (Number.isNaN(value)) value = 5;
  value = Math.max(1, Math.min(15, value));
  state.config.spinDurationMs = value * 1000;
}

function onToggleRemove(event) {
  state.config.removeWinner = event.target.checked;
}

async function onSpin() {
  if (state.wheel.isSpinning) return;
  if (state.participants.length < 1) return;

  // Limpiar restos del giro anterior
  state.wheel.clearHighlight();
  document.body.classList.remove('shake', 'shake-hard');

  const banner = $('#winner-banner');
  banner.classList.remove('celebrate', 'jackpot');
  banner.textContent = 'Girando…';
  setControlsDisabled(true);

  try {
    // Tic-tic durante el giro, con throttle para no saturar cuando va rápido
    let lastTick = 0;
    const onTick = () => {
      const now = performance.now();
      if (now - lastTick < 25) return;
      lastTick = now;
      audio.tick();
    };

    const { index, name } = await state.wheel.spin(
      state.config.spinDurationMs,
      { onTick },
    );

    // Detectar "casi ganador": el puntero cae cerca de un borde de sector
    const n = state.participants.length;
    if (n > 1) {
      const sectorAngle = (Math.PI * 2) / n;
      const POINTER = (3 * Math.PI) / 2;
      const pointerInWheel =
        (((POINTER - state.wheel.rotation) % (Math.PI * 2)) + Math.PI * 2) %
        (Math.PI * 2);
      const pos = pointerInWheel % sectorAngle;
      const nearMiss =
        pos < sectorAngle * 0.08 || pos > sectorAngle * 0.92;
      if (nearMiss) {
        const pointerEl = document.querySelector('.pointer');
        pointerEl.classList.remove('wobble');
        // Forzar reflow para reiniciar la animación si ya estaba aplicada
        void pointerEl.offsetWidth;
        pointerEl.classList.add('wobble');
        setTimeout(() => pointerEl.classList.remove('wobble'), 600);
      }
    }

    // ¿JACKPOT? Raro (5%): premio enorme, celebración triple
    const isJackpot = Math.random() < JACKPOT_CHANCE;
    const prize = isJackpot ? JACKPOT_PRIZE : pickPrize();

    // Suspense: el sector ganador se ilumina progresivamente
    await state.wheel.pauseAndHighlight(index, 500);

    // Revelación: banner, sonido, lluvia, screen shake
    renderWinnerBanner(banner, name, prize, isJackpot);
    banner.classList.add('celebrate');
    if (isJackpot) banner.classList.add('jackpot');

    const shakeClass = isJackpot ? 'shake-hard' : 'shake';
    document.body.classList.add(shakeClass);
    setTimeout(
      () => document.body.classList.remove(shakeClass),
      isJackpot ? 700 : 400,
    );

    if (isJackpot) audio.jackpot();
    else audio.jingle();

    showMoneyShower({ intense: isJackpot });

    // Reacciones del chat en cascada
    if (chat.reactToWin) chat.reactToWin(isJackpot);

    // Dejar el glow visible durante la celebración
    await sleep(isJackpot ? 1800 : 1200);

    // Actualizar estado (quitar ganador si procede) y redibujar
    state.winners.push(name);
    if (state.config.removeWinner) {
      state.participants.splice(index, 1);
    }
    renderAll();
  } catch (err) {
    console.error(err);
    banner.textContent = '';
  } finally {
    setControlsDisabled(false);
  }
}

function onReset() {
  if (state.wheel.isSpinning) return;
  if (state.participants.length === 0 && state.winners.length === 0) return;
  const ok = window.confirm(
    '¿Reiniciar todo? Se perderán los participantes y los ganadores actuales.',
  );
  if (!ok) return;
  state.participants = [];
  state.winners = [];
  state.wheel.rotation = 0;
  state.wheel.clearHighlight();
  state.wheel.setParticipants([]);
  document.body.classList.remove('shake', 'shake-hard');
  const banner = $('#winner-banner');
  banner.textContent = '';
  banner.classList.remove('celebrate', 'jackpot');
  renderAll();
}

function setControlsDisabled(disabled) {
  $('#participant-input').disabled = disabled;
  $('#add-form').querySelector('button[type="submit"]').disabled = disabled;
  $('#duration-input').disabled = disabled;
  $('#remove-winner-toggle').disabled = disabled;
  $('#reset-btn').disabled = disabled;
  $('#spin-btn').disabled = disabled || state.participants.length < 1;
  document
    .querySelectorAll('.participants-list .remove-btn')
    .forEach((btn) => {
      btn.disabled = disabled;
    });
}

function renderAll() {
  renderParticipants();
  renderWinners();
  state.wheel.setParticipants(state.participants);
  $('#spin-btn').disabled =
    state.wheel.isSpinning || state.participants.length < 1;
}

function renderParticipants() {
  const list = $('#participants-list');
  list.innerHTML = '';
  state.participants.forEach((name, index) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = name;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'remove-btn';
    btn.textContent = '✕';
    btn.setAttribute('aria-label', `Eliminar ${name}`);
    btn.addEventListener('click', () => onRemoveAt(index));
    li.appendChild(span);
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function pickPrize() {
  return PRIZE_POOL[Math.floor(Math.random() * PRIZE_POOL.length)];
}

function formatMoney(amount) {
  return amount.toLocaleString('es-ES') + ' €';
}

function renderWinnerBanner(banner, name, prize, isJackpot = false) {
  banner.replaceChildren();
  if (isJackpot) {
    const prefix = document.createTextNode('🎰 ¡JACKPOT! ');
    const strong = document.createElement('strong');
    strong.textContent = name;
    const middle = document.createTextNode(' arrasa con ');
    const prizeEl = document.createElement('span');
    prizeEl.className = 'prize prize-jackpot';
    prizeEl.textContent = formatMoney(prize);
    const suffix = document.createTextNode(' 🎰');
    banner.append(prefix, strong, middle, prizeEl, suffix);
    return;
  }
  const prefix = document.createTextNode('🎉 ');
  const strong = document.createElement('strong');
  strong.textContent = name;
  const middle = document.createTextNode(' se lleva ');
  const prizeEl = document.createElement('span');
  prizeEl.className = 'prize';
  prizeEl.textContent = formatMoney(prize);
  const suffix = document.createTextNode(' 🎉');
  banner.append(prefix, strong, middle, prizeEl, suffix);
}

function showMoneyShower(options = {}) {
  const existing = document.querySelector('.money-shower');
  if (existing) existing.remove();

  const intense = options.intense === true;
  const container = document.createElement('div');
  container.className = 'money-shower' + (intense ? ' intense' : '');
  container.setAttribute('aria-hidden', 'true');

  const COUNT = intense ? 120 : 40;
  const maxDelay = intense ? 1.5 : 0.6;
  for (let i = 0; i < COUNT; i++) {
    const bill = document.createElement('span');
    bill.className = 'money-bill';
    bill.textContent = MONEY_SYMBOLS[Math.floor(Math.random() * MONEY_SYMBOLS.length)];
    bill.style.left = `${Math.random() * 100}%`;
    bill.style.fontSize = `${22 + Math.random() * 22}px`;
    bill.style.animationDuration = `${2 + Math.random() * 2.4}s`;
    bill.style.animationDelay = `${Math.random() * maxDelay}s`;
    bill.style.setProperty('--drift', `${(Math.random() * 2 - 1) * 80}px`);
    bill.style.setProperty('--rot', `${(Math.random() * 2 - 1) * 720}deg`);
    container.appendChild(bill);
  }

  document.body.appendChild(container);

  // Sonido de monedas cayendo escalonado
  const coinCount = intense ? 10 : 5;
  for (let i = 0; i < coinCount; i++) {
    setTimeout(() => audio.coin(), 350 + i * 180 + Math.random() * 120);
  }

  setTimeout(() => container.remove(), intense ? 7000 : 5500);
}

function renderWinners() {
  const list = $('#winners-list');
  const empty = $('#winners-empty');
  list.innerHTML = '';
  for (const name of state.winners) {
    const li = document.createElement('li');
    li.textContent = name;
    list.appendChild(li);
  }
  empty.classList.toggle('hidden', state.winners.length > 0);
}

init();
