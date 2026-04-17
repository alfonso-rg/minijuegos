import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  Star,
  Lock,
  RefreshCw,
  ChevronRight,
  Volume2,
  VolumeX,
  Trophy,
} from "lucide-react";

/* ══════════════════════════════════════════
   SONIDOS — Web Audio API (sin archivos)
══════════════════════════════════════════ */

let _ac = null;
function getAC() {
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  if (_ac.state === "suspended") _ac.resume();
  return _ac;
}

function tone(freq, dur, type = "sine", vol = 0.25, delay = 0) {
  try {
    const ctx = getAC();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    const t = ctx.currentTime + delay;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch (_) {
    /* silencioso */
  }
}

const SFX = {
  tap: () => tone(520, 0.05, "triangle", 0.12),
  cannon: () => {
    tone(90, 0.18, "sawtooth", 0.28, 0);
    tone(60, 0.22, "square", 0.2, 0.04);
    tone(784, 0.12, "sine", 0.18, 0.18);
    tone(1047, 0.18, "sine", 0.16, 0.28);
  },
  splash: () => {
    tone(180, 0.12, "sawtooth", 0.22, 0);
    tone(110, 0.18, "sawtooth", 0.16, 0.1);
  },
  islandComplete: () => {
    [523, 659, 784, 880, 1047].forEach((f, i) =>
      tone(f, 0.1, "sine", 0.2, i * 0.08)
    );
    tone(1319, 0.36, "sine", 0.16, 0.48);
  },
  gameOver: () => {
    [440, 330, 220, 165].forEach((f, i) =>
      tone(f, 0.18, "sawtooth", 0.18, i * 0.14)
    );
  },
};

/* ══════════════════════════════════════════
   CONTENIDO — ISLAS Y FRASES
══════════════════════════════════════════ */

/* Cada frase: una oración con "{}" para el hueco, la opción correcta y 2 distractores
   que violan la regla ortográfica de la isla. */

const ISLANDS = [
  {
    id: 0,
    name: "Isla de los Barriles",
    emoji: "🛢️",
    rule: "B / V",
    tip: "Llevan B los verbos terminados en -bir (escribir, recibir). Llevan V las palabras que empiezan por vice-, villa- y los pretéritos de estar/andar/tener (estuve, anduvo, tuviera).",
    bg: ["#0f172a", "#1e3a5f"],
    requiredStars: 0,
    phrases: [
      { sentence: "El capitán tenía una {} larga y negra.", correct: "barba", options: ["barba", "varba", "varva"] },
      { sentence: "El loro {} muy alto sobre la cubierta.", correct: "vuela", options: ["buela", "vuela", "vuelaa"] },
      { sentence: "Bebe el agua de la {} de cristal.", correct: "botella", options: ["votella", "botella", "bodella"] },
      { sentence: "Al pirata le dolía el {} después del abordaje.", correct: "brazo", options: ["brazo", "vrazo", "braso"] },
      { sentence: "El barco {} a toda vela hacia la isla.", correct: "iba", options: ["iva", "iba", "hiba"] },
      { sentence: "Los piratas han {} todo el ron del cofre.", correct: "bebido", options: ["vevido", "bevido", "bebido"] },
      { sentence: "Un enorme {} surcaba los mares del sur.", correct: "buque", options: ["vuque", "buque", "buqe"] },
      { sentence: "Tras la batalla, regresó a la {} del puerto.", correct: "villa", options: ["billa", "villa", "viya"] },
    ],
  },
  {
    id: 1,
    name: "Isla Fantasma",
    emoji: "👻",
    rule: "H muda",
    tip: "Se escriben con H las formas de haber (he, has, había) y las palabras que empiezan por hue-, hie-, hia-, hui- (hueso, hielo, hiato, huir).",
    bg: ["#1a1030", "#2b1a4a"],
    requiredStars: 1,
    phrases: [
      { sentence: "{} mucho viento en la cubierta esta noche.", correct: "Hace", options: ["Ace", "Hace", "Hase"] },
      { sentence: "{} una vez un pirata con un solo ojo.", correct: "Había", options: ["Avía", "Abía", "Había"] },
      { sentence: "Encontramos un {} de ballena en la arena.", correct: "hueso", options: ["hueso", "ueso", "weso"] },
      { sentence: "{} llegado por fin a la isla del tesoro.", correct: "Hemos", options: ["Hemos", "Emos", "Hémos"] },
      { sentence: "Desayunamos {} fritos con pan.", correct: "huevos", options: ["uevos", "huevos", "güevos"] },
      { sentence: "{}, capitán, ¡el viento está a favor!", correct: "Hola", options: ["Ola", "Hola", "Olla"] },
      { sentence: "¡{} el loro se ha escapado de la jaula!", correct: "Ahora", options: ["Ahora", "Aora", "Haora"] },
      { sentence: "En la cueva vimos un {} de piedra afilada.", correct: "hacha", options: ["acha", "hacha", "hachá"] },
    ],
  },
  {
    id: 2,
    name: "Isla del Acento Dorado",
    emoji: "✨",
    rule: "Tildes",
    tip: "Las esdrújulas SIEMPRE llevan tilde (música, árboles). Las agudas terminadas en vocal, n o s también (canción, rubí, café).",
    bg: ["#3a2a05", "#5c3a10"],
    requiredStars: 2,
    phrases: [
      { sentence: "El loro canta {} pirata en la cubierta.", correct: "música", options: ["musica", "música", "músicá"] },
      { sentence: "Descifrar el mapa fue muy {}.", correct: "difícil", options: ["dificil", "difícil", "díficil"] },
      { sentence: "El mapa muestra un {} gigante en la isla.", correct: "árbol", options: ["arból", "árbol", "arbol"] },
      { sentence: "Llevo un {} rojo en el dedo meñique.", correct: "rubí", options: ["rubi", "rúbi", "rubí"] },
      { sentence: "¿{} dirección tomamos, capitán?", correct: "Qué", options: ["Que", "Qué", "Qúe"] },
      { sentence: "El {} brilla bajo la luna llena.", correct: "océano", options: ["océano", "oceano", "oceáno"] },
      { sentence: "Hemos llegado por fin a {} del Sur.", correct: "América", options: ["America", "Amèrica", "América"] },
      { sentence: "¡El {} ha encontrado el tesoro!", correct: "capitán", options: ["capitan", "cápitan", "capitán"] },
    ],
  },
  {
    id: 3,
    name: "Isla de las Gaviotas",
    emoji: "🕊️",
    rule: "G / J",
    tip: "Se escriben con G los verbos en -ger, -gir (coger, elegir, dirigir). Con J los que terminan en -jear (cojear, canjear) y las palabras en -aje, -eje (viaje, hereje).",
    bg: ["#1a3d2a", "#285c3a"],
    requiredStars: 4,
    phrases: [
      { sentence: "Ese pirata es un {} de la navegación.", correct: "genio", options: ["jenio", "genio", "guenio"] },
      { sentence: "En la sabana vimos una {} enorme.", correct: "jirafa", options: ["girafa", "jirafa", "jiráfa"] },
      { sentence: "El {} ordenó zarpar al amanecer.", correct: "general", options: ["jeneral", "general", "generál"] },
      { sentence: "Cruzamos la {} en busca del templo.", correct: "jungla", options: ["gungla", "jungla", "junglá"] },
      { sentence: "El {} del barco cuida del mapa.", correct: "jefe", options: ["gefe", "jefe", "jéfe"] },
      { sentence: "El tesoro está oculto en esta {}.", correct: "región", options: ["rejión", "región", "reguión"] },
      { sentence: "Debemos {} bien la ruta del regreso.", correct: "elegir", options: ["elejir", "elegir", "eleguir"] },
      { sentence: "Me duele la {} de tanto gritar órdenes.", correct: "garganta", options: ["jarganta", "garganta", "gargantá"] },
    ],
  },
  {
    id: 4,
    name: "Isla de la Serpiente",
    emoji: "🐍",
    rule: "LL / Y",
    tip: "Se escriben con LL las palabras terminadas en -illo, -illa (cuchillo, rodilla) y los verbos en -illar, -ullir. Con Y van las formas de verbos cuyo infinitivo no tiene ni LL ni Y (oyó, cayeron).",
    bg: ["#2a0a3d", "#3d1a5c"],
    requiredStars: 6,
    phrases: [
      { sentence: "Tengo la {} que abre el cofre del tesoro.", correct: "llave", options: ["yave", "llave", "lláve"] },
      { sentence: "{} llovió tanto que inundó la cubierta.", correct: "Ayer", options: ["Aller", "Ayer", "Alyer"] },
      { sentence: "Por las mañanas desayuno {} con miel.", correct: "yogur", options: ["llogur", "yogur", "yógur"] },
      { sentence: "En esta isla cae mucha {} tropical.", correct: "lluvia", options: ["yuvia", "lluvia", "lluviá"] },
      { sentence: "En el establo del pueblo hay una {} blanca.", correct: "yegua", options: ["llegua", "yegua", "yegüa"] },
      { sentence: "Comimos {} de marisco en el puerto.", correct: "paella", options: ["paeya", "paella", "paellá"] },
      { sentence: "Se rompió el {} de la botella al abrirla.", correct: "cuello", options: ["cueyo", "cuello", "cueillo"] },
      { sentence: "Hay que apretar bien el {} del timón.", correct: "tornillo", options: ["torniyo", "tornillo", "tornílio"] },
    ],
  },
];

/* ══════════════════════════════════════════
   LÓGICA AUX
══════════════════════════════════════════ */

const N_PROBLEMS = 8;
const MAX_LIVES = 3;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function calcStars(wrong) {
  if (wrong === 0) return 3;
  if (wrong <= 2) return 2;
  return 1;
}

/* ══════════════════════════════════════════
   SUBCOMPONENTES
══════════════════════════════════════════ */

function Hearts({ count }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: MAX_LIVES }, (_, i) => (
        <Heart
          key={i}
          size={20}
          className={i < count ? "text-red-400 fill-red-400" : "text-white/20"}
        />
      ))}
    </div>
  );
}

function StarRow({ count, size = 20 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 3 }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={
            i < count ? "text-yellow-400 fill-yellow-400" : "text-white/20"
          }
        />
      ))}
    </div>
  );
}

/* Barco avanzando hacia el tesoro */
function ShipTrack({ progress, total }) {
  const pct = Math.min(100, (progress / total) * 100);
  return (
    <div className="relative h-12 w-full max-w-[320px] mx-auto">
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-2xl transition-all duration-500"
        style={{ left: `${pct}%` }}
      >
        🏴‍☠️
      </div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 text-2xl">
        💰
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════ */

export default function OrtoPirata() {
  /* Progreso persistente */
  const loadProgress = () => {
    try {
      return (
        JSON.parse(localStorage.getItem("ortoPirata_v1")) || {
          stars: [0, 0, 0, 0, 0],
        }
      );
    } catch {
      return { stars: [0, 0, 0, 0, 0] };
    }
  };

  const [progress, setProgress] = useState(loadProgress);
  const [muted, setMuted] = useState(
    () => localStorage.getItem("ortoPirata_muted") === "1"
  );
  const mutedRef = useRef(muted);
  const toggleMute = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    localStorage.setItem("ortoPirata_muted", next ? "1" : "0");
  };
  const play = (sfx) => {
    if (!mutedRef.current) sfx();
  };

  const [screen, setScreen] = useState("home"); // home | game | complete | over
  const [islandIdx, setIslandIdx] = useState(0);
  const [queue, setQueue] = useState([]); // frases restantes
  const [current, setCurrent] = useState(null);
  const [optionOrder, setOptionOrder] = useState([]);
  const [picked, setPicked] = useState(null); // opción seleccionada (texto)
  const [feedback, setFeedback] = useState(null); // "correct" | "wrong" | null
  const [lives, setLives] = useState(MAX_LIVES);
  const [probIdx, setProbIdx] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);
  const [showTip, setShowTip] = useState(false);

  const island = ISLANDS[islandIdx];
  const totalStars = progress.stars.reduce((s, n) => s + n, 0);

  const saveProgress = (newStars) => {
    const p = { stars: newStars };
    setProgress(p);
    localStorage.setItem("ortoPirata_v1", JSON.stringify(p));
  };

  const loadFromQueue = (q) => {
    const next = q[0];
    setCurrent(next);
    setOptionOrder(shuffle(next.options));
    setPicked(null);
    setFeedback(null);
  };

  const startIsland = (idx) => {
    const isl = ISLANDS[idx];
    const q = shuffle(isl.phrases).slice(0, N_PROBLEMS);
    setIslandIdx(idx);
    setQueue(q);
    setLives(MAX_LIVES);
    setProbIdx(0);
    setTotalWrong(0);
    setShowTip(false);
    loadFromQueue(q);
    setScreen("game");
  };

  const handlePick = (option) => {
    if (picked) return;
    play(SFX.tap);
    setPicked(option);
    const isCorrect = option === current.correct;
    if (isCorrect) {
      play(SFX.cannon);
      setFeedback("correct");
    } else {
      play(SFX.splash);
      setFeedback("wrong");
      setLives((l) => l - 1);
      setTotalWrong((w) => w + 1);
    }
  };

  const handleNext = () => {
    const rest = queue.slice(1);
    const nextIdx = probIdx + 1;

    // ¿sin vidas?
    if (lives <= 0) {
      play(SFX.gameOver);
      setScreen("over");
      return;
    }

    if (nextIdx >= N_PROBLEMS || rest.length === 0) {
      play(SFX.islandComplete);
      const stars = calcStars(totalWrong);
      const newStars = [...progress.stars];
      newStars[islandIdx] = Math.max(newStars[islandIdx], stars);
      saveProgress(newStars);
      setScreen("complete");
      return;
    }

    setQueue(rest);
    setProbIdx(nextIdx);
    loadFromQueue(rest);
  };

  /* Auto-avance breve tras el feedback */
  useEffect(() => {
    if (!feedback) return;
    const delay = feedback === "correct" ? 650 : 1400;
    const t = setTimeout(() => {
      // si fallo y quedamos sin vidas, saltar a over
      if (feedback === "wrong" && lives - 0 <= 0) {
        play(SFX.gameOver);
        setScreen("over");
      } else {
        handleNext();
      }
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);

  /* ══════════════════════════════════════════
     PANTALLA HOME — mapa de islas
  ══════════════════════════════════════════ */
  if (screen === "home") {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-sky-950 via-slate-900 to-stone-950 p-4 text-white sm:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
            >
              <ArrowLeft size={18} /> Inicio
            </Link>
            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20"
              aria-label={muted ? "Activar sonido" : "Silenciar"}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>

          <header className="text-center mb-8">
            <div className="text-6xl mb-2">🏴‍☠️</div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Orto-Pirata
            </h1>
            <p className="mt-2 text-white/60 max-w-md mx-auto">
              Surca los mares corrigiendo mensajes en botella. Cada isla
              esconde una regla ortográfica.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-amber-300 text-sm">
              <Trophy size={16} /> {totalStars} / 15 estrellas
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            {ISLANDS.map((isl, i) => {
              const unlocked = totalStars >= isl.requiredStars;
              const stars = progress.stars[i] || 0;
              return (
                <button
                  key={isl.id}
                  disabled={!unlocked}
                  onClick={() => unlocked && startIsland(i)}
                  className={`text-left rounded-3xl border p-5 transition
                    ${
                      unlocked
                        ? "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 cursor-pointer"
                        : "border-white/5 bg-white/5 opacity-60 cursor-not-allowed"
                    }`}
                  style={
                    unlocked
                      ? {
                          background: `linear-gradient(135deg, ${isl.bg[0]}, ${isl.bg[1]})`,
                        }
                      : undefined
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="text-4xl">{isl.emoji}</div>
                    {!unlocked && (
                      <div className="inline-flex items-center gap-1 text-xs text-white/60">
                        <Lock size={14} /> {isl.requiredStars}★
                      </div>
                    )}
                  </div>
                  <h2 className="mt-3 font-bold text-lg">{isl.name}</h2>
                  <p className="text-xs text-white/70">Regla: {isl.rule}</p>
                  <div className="mt-3">
                    <StarRow count={stars} />
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-center text-xs text-white/40 mt-8">
            Elige una isla y pulsa la palabra bien escrita. ¡3 vidas por
            travesía!
          </p>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════
     PANTALLA COMPLETE — isla conquistada
  ══════════════════════════════════════════ */
  if (screen === "complete") {
    const stars = calcStars(totalWrong);
    const nextIdx = islandIdx + 1;
    const hasNext = nextIdx < ISLANDS.length;
    return (
      <div
        className="min-h-screen w-full p-4 text-white sm:p-8 flex items-center justify-center"
        style={{
          background: `linear-gradient(180deg, ${island.bg[0]}, ${island.bg[1]})`,
        }}
      >
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-3">{island.emoji}</div>
          <h2 className="text-3xl font-black">¡Isla conquistada!</h2>
          <p className="text-white/70 mt-1">{island.name}</p>
          <div className="flex justify-center my-6">
            <StarRow count={stars} size={40} />
          </div>
          <div className="rounded-2xl bg-white/10 p-4 text-sm text-white/80">
            <p className="font-semibold text-amber-300 mb-1">
              📜 Truco pirata ({island.rule}):
            </p>
            <p>{island.tip}</p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {hasNext && (
              <button
                onClick={() => startIsland(nextIdx)}
                className="w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 inline-flex items-center justify-center gap-2"
              >
                Siguiente isla <ChevronRight size={18} />
              </button>
            )}
            <button
              onClick={() => startIsland(islandIdx)}
              className="w-full rounded-2xl bg-white/10 hover:bg-white/20 py-3 inline-flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} /> Rejugar
            </button>
            <button
              onClick={() => setScreen("home")}
              className="w-full rounded-2xl bg-white/5 hover:bg-white/10 py-3"
            >
              Volver al mapa
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════
     PANTALLA GAME OVER
  ══════════════════════════════════════════ */
  if (screen === "over") {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-red-950 via-stone-900 to-stone-950 p-4 text-white sm:p-8 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-3">🦈</div>
          <h2 className="text-3xl font-black">¡Los tiburones te alcanzaron!</h2>
          <p className="text-white/70 mt-2">
            Se acabaron las vidas. Refuerza la regla y vuelve a intentarlo.
          </p>
          <div className="rounded-2xl bg-white/10 p-4 text-sm text-white/80 mt-5 text-left">
            <p className="font-semibold text-amber-300 mb-1">
              📜 Truco pirata ({island.rule}):
            </p>
            <p>{island.tip}</p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => startIsland(islandIdx)}
              className="w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 inline-flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} /> Reintentar
            </button>
            <button
              onClick={() => setScreen("home")}
              className="w-full rounded-2xl bg-white/10 hover:bg-white/20 py-3"
            >
              Volver al mapa
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════
     PANTALLA GAME
  ══════════════════════════════════════════ */
  const [before, after] = current
    ? current.sentence.split("{}")
    : ["", ""];

  return (
    <div
      className="min-h-screen w-full p-4 text-white sm:p-6"
      style={{
        background: `linear-gradient(180deg, ${island.bg[0]}, ${island.bg[1]})`,
      }}
    >
      <div className="mx-auto max-w-xl">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setScreen("home")}
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
          >
            <ArrowLeft size={18} /> Mapa
          </button>
          <div className="flex items-center gap-3">
            <Hearts count={lives} />
            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20"
              aria-label={muted ? "Activar sonido" : "Silenciar"}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </div>

        {/* Header isla */}
        <div className="text-center mb-3">
          <div className="text-sm text-white/60 uppercase tracking-wider">
            {island.emoji} {island.name}
          </div>
          <div className="text-xs text-amber-300">Regla: {island.rule}</div>
        </div>

        {/* Barco hacia el tesoro */}
        <ShipTrack progress={probIdx + (feedback === "correct" ? 1 : 0)} total={N_PROBLEMS} />
        <div className="text-center text-xs text-white/50 mt-1 mb-5">
          Mensaje {probIdx + 1} / {N_PROBLEMS}
        </div>

        {/* Pergamino con la frase */}
        <div className="rounded-3xl bg-amber-50/95 text-stone-800 p-5 shadow-xl relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-200 text-stone-700 text-xs px-3 py-1 rounded-full shadow">
            📜 Mensaje en botella
          </div>
          <p className="text-lg sm:text-xl leading-relaxed text-center">
            {before}
            <span
              className={`inline-block mx-1 px-3 py-1 rounded-lg border-2 border-dashed align-baseline min-w-[5rem] text-center transition
                ${
                  feedback === "correct"
                    ? "bg-green-200 border-green-500 text-green-900 font-bold"
                    : feedback === "wrong"
                    ? "bg-red-200 border-red-500 text-red-900 font-bold"
                    : "bg-white border-stone-400 text-stone-400"
                }`}
            >
              {feedback ? current.correct : "____"}
            </span>
            {after}
          </p>
        </div>

        {/* Opciones */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {optionOrder.map((opt) => {
            const isPicked = picked === opt;
            const isCorrect = opt === current.correct;
            let cls =
              "bg-white/10 hover:bg-white/20 text-white border-white/10";
            if (feedback) {
              if (isCorrect) {
                cls = "bg-green-500/90 text-white border-green-300";
              } else if (isPicked) {
                cls = "bg-red-500/90 text-white border-red-300";
              } else {
                cls = "bg-white/5 text-white/50 border-white/10";
              }
            }
            return (
              <button
                key={opt}
                disabled={!!feedback}
                onClick={() => handlePick(opt)}
                className={`rounded-2xl border-2 py-4 px-3 text-lg font-bold select-none transition-transform active:scale-95 ${cls}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Feedback inferior */}
        <div className="mt-5 min-h-[3.5rem] text-center">
          {feedback === "correct" && (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-green-500/20 text-green-200 px-4 py-2">
              💥 ¡Cañonazo certero!
            </div>
          )}
          {feedback === "wrong" && (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-red-500/20 text-red-200 px-4 py-2">
              🦈 Falló el disparo. La correcta era{" "}
              <span className="font-bold">{current.correct}</span>.
            </div>
          )}
          {!feedback && (
            <button
              onClick={() => setShowTip((s) => !s)}
              className="text-xs text-white/50 underline-offset-2 hover:underline"
            >
              {showTip ? "Ocultar truco" : "¿Una pista del capitán?"}
            </button>
          )}
          {showTip && !feedback && (
            <div className="mt-2 text-xs text-white/70 rounded-xl bg-white/10 p-3 text-left">
              📜 {island.tip}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
