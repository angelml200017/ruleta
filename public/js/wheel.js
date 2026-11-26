// Paleta casino: alternancia rojo/negro al estilo ruleta
const CASINO_RED = '#c41e3a';
const CASINO_BLACK = '#1a1a1a';
const CASINO_GOLD = '#d4af37';
const CASINO_GOLD_DARK = '#8b6914';
const CASINO_GREEN = '#0e6e3a';
const TEXT_GOLD = '#ffd700';

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Desaceleración más dramática: "parece que no va a parar nunca"
function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

function colorForIndex(i, n) {
  // Si n es impar, el último sector se pinta del verde clásico de la ruleta
  // (como el 0/00) para romper la simetría sin dos rojos adyacentes
  if (n % 2 === 1 && i === n - 1) return CASINO_GREEN;
  return i % 2 === 0 ? CASINO_RED : CASINO_BLACK;
}

const TAU = Math.PI * 2;
const IDLE_PERIOD_MS = 25000; // 1 vuelta cada 25s en estado idle

export class Wheel {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.participants = [];
    this.rotation = 0;
    this.isSpinning = false;
    this._idleRaf = null;
    this._highlightIndex = null;
    this._highlightIntensity = 0;
    this._setupHiDPI();
  }

  _setupHiDPI() {
    const dpr = window.devicePixelRatio || 1;
    this.size = this.canvas.width;
    this.canvas.width = this.size * dpr;
    this.canvas.height = this.size * dpr;
    this.ctx.scale(dpr, dpr);
  }

  setParticipants(list) {
    this.participants = list.slice();
    this.rotation = ((this.rotation % TAU) + TAU) % TAU;
    this._highlightIndex = null;
    this._highlightIntensity = 0;
    this._stopIdle();
    this.draw();
    this._maybeStartIdle();
  }

  clearHighlight() {
    this._highlightIndex = null;
    this._highlightIntensity = 0;
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const size = this.size;
    const cx = size / 2;
    const cy = size / 2;
    // Radio más pequeño para dejar hueco al anillo de luces exterior
    const radius = size / 2 - 36;
    const n = this.participants.length;

    ctx.clearRect(0, 0, size, size);

    // Placeholder cuando no hay participantes
    if (n === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TAU);
      ctx.fillStyle = '#0a2917';
      ctx.fill();
      ctx.strokeStyle = CASINO_GOLD;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.fillStyle = CASINO_GOLD;
      ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Añade participantes', cx, cy);
      return;
    }

    const sectorAngle = TAU / n;

    for (let i = 0; i < n; i++) {
      const start = this.rotation + i * sectorAngle;
      const end = start + sectorAngle;

      // Sector
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = colorForIndex(i, n);
      ctx.fill();
      if (n > 1) {
        ctx.strokeStyle = CASINO_GOLD_DARK;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Etiqueta al borde del sector
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + sectorAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = TEXT_GOLD;
      const fontSize = n === 1 ? 22 : Math.max(11, Math.min(20, 220 / n));
      ctx.font = `700 ${fontSize}px 'Georgia', 'Times New Roman', serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = 4;
      const maxTextWidth = radius - 32;
      const text = this._truncate(this.participants[i], maxTextWidth);
      ctx.fillText(text, radius - 14, 0);
      ctx.restore();
    }

    // Anillo exterior dorado que enmarca toda la ruleta
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.strokeStyle = CASINO_GOLD;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, TAU);
    ctx.strokeStyle = CASINO_GOLD_DARK;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 4, 0, TAU);
    ctx.strokeStyle = CASINO_GOLD_DARK;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Glow sobre el sector ganador durante la fase de revelación
    if (this._highlightIndex !== null && this._highlightIntensity > 0 && n > 0) {
      const i = this._highlightIndex;
      const start = this.rotation + i * sectorAngle;
      const end = start + sectorAngle;
      const intensity = this._highlightIntensity;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 6, start + 0.01, end - 0.01);
      ctx.strokeStyle = `rgba(255, 215, 0, ${intensity})`;
      ctx.lineWidth = 10 * intensity;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 28 * intensity;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 2, start + 0.01, end - 0.01);
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 * intensity})`;
      ctx.lineWidth = 4 * intensity;
      ctx.stroke();
      ctx.restore();
    }

    if (n > 1) {
      this._drawHub(cx, cy);
    }
  }

  _drawHub(cx, cy) {
    const ctx = this.ctx;
    // Disco dorado exterior
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, TAU);
    ctx.fillStyle = CASINO_GOLD;
    ctx.fill();
    ctx.strokeStyle = CASINO_GOLD_DARK;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Disco negro intermedio
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, TAU);
    ctx.fillStyle = CASINO_BLACK;
    ctx.fill();
    ctx.strokeStyle = CASINO_GOLD_DARK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Punto central de oro
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, TAU);
    ctx.fillStyle = TEXT_GOLD;
    ctx.fill();
  }

  _truncate(text, maxWidth) {
    const ctx = this.ctx;
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 1 && ctx.measureText(truncated + '…').width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '…';
  }

  /**
   * Anima la ruleta y devuelve el ganador cuando termina.
   * @param {number} durationMs duración del giro en milisegundos
   * @param {{onTick?: () => void}} [callbacks] callbacks opcionales
   * @returns {Promise<{index: number, name: string}>}
   */
  spin(durationMs, callbacks = {}) {
    if (this.isSpinning) return Promise.reject(new Error('already spinning'));
    if (this.participants.length < 1) {
      return Promise.reject(new Error('not enough participants'));
    }

    this._stopIdle();
    this._highlightIndex = null;
    this._highlightIntensity = 0;
    const { onTick } = callbacks;

    return new Promise((resolve) => {
      this.isSpinning = true;
      const startRotation = this.rotation;
      const minTurns = 5;
      const extraAngle = Math.random() * TAU;
      const targetRotation = startRotation + minTurns * TAU + extraAngle;
      const startTime = performance.now();

      // Clavijas imaginarias para el sonido de tic-tic: más clavijas
      // que sectores para que suene continuo aunque haya pocos participantes
      const n = this.participants.length;
      const pegCount = Math.max(24, n * 2);
      const pegAngle = TAU / pegCount;
      let lastPegIndex = Math.floor(this.rotation / pegAngle);

      const step = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / durationMs);
        const eased = easeOutQuint(t);
        this.rotation = startRotation + (targetRotation - startRotation) * eased;
        this.draw();

        if (onTick) {
          const currentPegIndex = Math.floor(this.rotation / pegAngle);
          if (currentPegIndex !== lastPegIndex) {
            lastPegIndex = currentPegIndex;
            onTick();
          }
        }

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          this.isSpinning = false;
          const index = this._winnerIndex();
          resolve({ index, name: this.participants[index] });
        }
      };
      requestAnimationFrame(step);
    });
  }

  /**
   * Pausa de suspense tras el giro con glow creciente sobre el sector ganador.
   * Deja el highlight activo al terminar (se limpia con clearHighlight()).
   */
  pauseAndHighlight(index, durationMs = 500) {
    this._stopIdle();
    this._highlightIndex = index;
    this._highlightIntensity = 0;
    const start = performance.now();
    return new Promise((resolve) => {
      const step = (now) => {
        const t = Math.min(1, (now - start) / durationMs);
        this._highlightIntensity = t;
        this.draw();
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  _maybeStartIdle() {
    if (this.isSpinning) return;
    if (this.participants.length < 1) return;
    if (this._idleRaf != null) return;

    const IDLE_SPEED = TAU / IDLE_PERIOD_MS; // rad/ms
    let lastTime = performance.now();

    const step = (now) => {
      // Cap delta para evitar saltos cuando la pestaña vuelve del background
      const delta = Math.min(now - lastTime, 50);
      lastTime = now;
      this.rotation = (this.rotation + delta * IDLE_SPEED) % TAU;
      this.draw();
      this._idleRaf = requestAnimationFrame(step);
    };
    this._idleRaf = requestAnimationFrame(step);
  }

  _stopIdle() {
    if (this._idleRaf != null) {
      cancelAnimationFrame(this._idleRaf);
      this._idleRaf = null;
    }
  }

  _winnerIndex() {
    const n = this.participants.length;
    if (n === 0) return -1;
    if (n === 1) return 0;
    const sectorAngle = TAU / n;
    // El puntero está arriba del canvas (12 en punto) = ángulo 3π/2 en coords canvas.
    const POINTER = (3 * Math.PI) / 2;
    let pointerInWheel = POINTER - this.rotation;
    pointerInWheel = ((pointerInWheel % TAU) + TAU) % TAU;
    return Math.floor(pointerInWheel / sectorAngle) % n;
  }
}