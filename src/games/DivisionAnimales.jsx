import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Star, Lock, RefreshCw, ChevronRight, Volume2, VolumeX } from "lucide-react";

/* ══════════════════════════════════════════
   SONIDOS — Web Audio API (sin archivos)
══════════════════════════════════════════ */

let _ac = null;
function getAC() {
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  // Reanudar si el navegador lo suspendió
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
  } catch (_) { /* silencioso si el navegador bloquea */ }
}

const SFX = {
  digit:   () => tone(700, 0.055, "triangle", 0.14),
  del:     () => tone(350, 0.055, "triangle", 0.10),
  correct: () => {
    tone(523,  0.08, "sine", 0.22, 0.00);   // C5
    tone(659,  0.08, "sine", 0.22, 0.09);   // E5
    tone(784,  0.08, "sine", 0.22, 0.18);   // G5
    tone(1047, 0.22, "sine", 0.18, 0.27);   // C6
  },
  wrong: () => {
    tone(220, 0.10, "sawtooth", 0.22, 0.00);
    tone(165, 0.16, "sawtooth", 0.16, 0.11);
  },
  worldComplete: () => {
    [523, 659, 784, 880, 1047].forEach((f, i) =>
      tone(f, 0.11, "sine", 0.20, i * 0.09)
    );
    tone(1319, 0.38, "sine", 0.16, 0.50);
  },
  gameOver: () => {
    [440, 330, 220, 165].forEach((f, i) =>
      tone(f, 0.18, "sawtooth", 0.18, i * 0.14)
    );
  },
};

/* ══════════════════════════════════════════
   DATOS DE LOS MUNDOS
══════════════════════════════════════════ */

const WORLDS = [
  {
    id: 0,
    name: "Gran Océano",
    type: "Peces",
    icon: "🐠",
    animals: ["🐠", "🐟", "🐡", "🦈"],
    story: "¡Divide los peces en bancos iguales para que naden juntos!",
    fact: "¿Sabías que los peces viajan en grupos llamados 'bancos'? ¡Pueden ser miles juntos para protegerse de los depredadores!",
    bg: ["#071e3d", "#0e3f6e"],
    divisors: [2, 5, 10],
    maxProduct: 20,
    requiredStars: 0,
  },
  {
    id: 1,
    name: "Selva Tropical",
    type: "Reptiles",
    icon: "🦎",
    animals: ["🦎", "🐊", "🐢", "🐍"],
    story: "¡Organiza los reptiles en grupos iguales para que tomen el sol!",
    fact: "¿Sabías que los reptiles son de sangre fría? Necesitan el calor del sol para moverse y cazar. ¡Sin sol no pueden funcionar!",
    bg: ["#0a2a0a", "#0f3d1a"],
    divisors: [2, 3, 4, 5],
    maxProduct: 40,
    requiredStars: 3,
  },
  {
    id: 2,
    name: "Gran Sabana",
    type: "Mamíferos",
    icon: "🦁",
    animals: ["🦁", "🐘", "🦒", "🦓", "🐆"],
    story: "¡Forma manadas iguales de mamíferos por toda la sabana!",
    fact: "¿Sabías que los mamíferos tienen pelo y dan leche a sus crías? ¡Los elefantes tienen la gestación más larga: casi 2 años!",
    bg: ["#3d1a00", "#5c2800"],
    divisors: [3, 4, 6],
    maxProduct: 48,
    requiredStars: 7,
  },
  {
    id: 3,
    name: "Alto Cielo",
    type: "Aves",
    icon: "🦅",
    animals: ["🦅", "🦜", "🦩", "🦆", "🐦"],
    story: "¡Forma bandadas iguales de aves para migrar juntas!",
    fact: "¿Sabías que las aves son los únicos animales con plumas? ¡El albatros puede volar más de 70.000 km al año sin casi descansar!",
    bg: ["#0a1545", "#16085e"],
    divisors: [4, 6, 7],
    maxProduct: 63,
    requiredStars: 12,
  },
  {
    id: 4,
    name: "Jardín Secreto",
    type: "Invertebrados",
    icon: "🦋",
    animals: ["🐝", "🦋", "🐞", "🐛", "🕷️"],
    story: "¡Divide los invertebrados en colonias iguales por el jardín!",
    fact: "¿Sabías que los invertebrados no tienen columna vertebral? ¡Son el 97% de todas las especies animales del planeta!",
    bg: ["#2a0a4a", "#3a0830"],
    divisors: [6, 7, 8, 9],
    maxProduct: 81,
    requiredStars: 18,
  },
];

const N_PROBLEMS = 5;

/* ══════════════════════════════════════════
   LÓGICA DE PROBLEMAS
══════════════════════════════════════════ */

function makeProblem(world, usedSet) {
  const { divisors, maxProduct } = world;
  let tries = 0;
  let d, a, dd;
  do {
    d = divisors[Math.floor(Math.random() * divisors.length)];
    const maxA = Math.floor(maxProduct / d);
    a = 2 + Math.floor(Math.random() * Math.max(1, maxA - 1));
    dd = d * a;
    tries++;
  } while (usedSet.has(`${dd}/${d}`) && tries < 40);
  return { divisor: d, answer: a, dividend: dd };
}

function pickAnimal(world) {
  return world.animals[Math.floor(Math.random() * world.animals.length)];
}

function calcStars(totalWrong) {
  if (totalWrong === 0) return 3;
  if (totalWrong <= 2) return 2;
  return 1;
}

/* ══════════════════════════════════════════
   SUBCOMPONENTES
══════════════════════════════════════════ */

function Hearts({ count, max = 3 }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <Heart
          key={i}
          size={20}
          className={i < count ? "text-red-400 fill-red-400" : "text-white/20"}
        />
      ))}
    </div>
  );
}

function StarRow({ count, max = 3, size = 20 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={i < count ? "text-yellow-400 fill-yellow-400" : "text-white/20"}
        />
      ))}
    </div>
  );
}

/* Visual que muestra animales divididos en grupos */
function VisualAid({ dividend, divisor, answer, animal, solved }) {
  const showEmojis = dividend <= 20 && divisor <= 6;

  // Tamaño de cajas según número de grupos
  const boxCls =
    divisor <= 4
      ? "min-w-14 min-h-14 p-2"
      : divisor <= 6
      ? "min-w-12 min-h-12 p-1.5"
      : "min-w-10 min-h-10 p-1";
  const emojiCls =
    divisor <= 4 ? "text-lg" : divisor <= 6 ? "text-base" : "text-sm";

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Fuente: todos los animales juntos */}
      <div className="bg-white/10 rounded-2xl p-3 flex flex-wrap justify-center gap-1 max-w-[280px]">
        {showEmojis ? (
          Array(dividend)
            .fill(animal)
            .map((a, i) => (
              <span key={i} className="text-2xl leading-none">
                {a}
              </span>
            ))
        ) : (
          <div className="flex items-center gap-2 px-2">
            <span className="text-3xl">{animal}</span>
            <span className="text-2xl font-bold text-white">× {dividend}</span>
          </div>
        )}
      </div>

      {/* Flecha */}
      <div className="text-white/40 text-sm">▼ dividir en grupos iguales ▼</div>

      {/* Grupos destino */}
      <div className="flex gap-2 flex-wrap justify-center max-w-[300px]">
        {Array.from({ length: divisor }, (_, gi) => (
          <div
            key={gi}
            className={`rounded-xl border-2 flex flex-col items-center justify-center transition-all
              ${boxCls}
              ${
                solved
                  ? "border-green-400 bg-green-500/20"
                  : "border-white/20 bg-white/10"
              }`}
          >
            {solved ? (
              showEmojis ? (
                <div className="flex flex-wrap justify-center gap-0.5 max-w-[56px]">
                  {Array(answer)
                    .fill(animal)
                    .map((a, i) => (
                      <span key={i} className={emojiCls}>
                        {a}
                      </span>
                    ))}
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-base">{animal}</div>
                  <div className="text-xs font-bold text-green-300">
                    ×{answer}
                  </div>
                </div>
              )
            ) : (
              <span className="text-white/25 text-2xl">?</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* Teclado numérico táctil */
function NumPad({ onDigit, onDel, onCheck, disabled }) {
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, "⌫", 0, "✓"];
  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mx-auto">
      {keys.map((k, i) => {
        const isCheck = k === "✓";
        const isDel = k === "⌫";
        return (
          <button
            key={i}
            disabled={disabled}
            onPointerDown={(e) => {
              e.preventDefault();
              if (disabled) return;
              if (isCheck) onCheck();
              else if (isDel) onDel();
              else onDigit(k);
            }}
            className={`h-16 rounded-2xl text-2xl font-bold select-none
              transition-transform active:scale-90
              ${
                isCheck
                  ? "bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-900/40"
                  : isDel
                  ? "bg-white/10 hover:bg-white/20 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }
              ${disabled ? "opacity-30 pointer-events-none" : "cursor-pointer"}`}
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════ */

export default function DivisionAnimales() {
  /* Progreso persistente */
  const loadProgress = () => {
    try {
      return (
        JSON.parse(localStorage.getItem("divAnimales_v1")) || {
          stars: [0, 0, 0, 0, 0],
        }
      );
    } catch {
      return { stars: [0, 0, 0, 0, 0] };
    }
  };

  const [progress, setProgress] = useState(loadProgress);
  const [muted, setMuted] = useState(
    () => localStorage.getItem("divAnimales_muted") === "1"
  );
  const mutedRef = useRef(muted);
  const toggleMute = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    localStorage.setItem("divAnimales_muted", next ? "1" : "0");
  };
  const play = (sfx) => { if (!mutedRef.current) sfx(); };

  const [screen, setScreen] = useState("home"); // home | game | complete | over
  const [wIdx, setWIdx] = useState(0);
  const [problem, setProblem] = useState(null);
  const [animal, setAnimal] = useState("🐠");
  const [input, setInput] = useState("");
  const [lives, setLives] = useState(3);
  const [probIdx, setProbIdx] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);
  const [wrongThis, setWrongThis] = useState(0);
  const [feedback, setFeedback] = useState(null); // null | "correct" | "wrong"
  const [solved, setSolved] = useState(false);
  const [usedProblems, setUsedProblems] = useState(new Set());

  const world = WORLDS[wIdx];
  const totalStars = progress.stars.reduce((s, n) => s + n, 0);

  const saveProgress = (newStars) => {
    const p = { stars: newStars };
    setProgress(p);
    localStorage.setItem("divAnimales_v1", JSON.stringify(p));
  };

  /* Iniciar un mundo */
  const startWorld = (idx) => {
    const w = WORLDS[idx];
    const used = new Set();
    const p = makeProblem(w, used);
    setWIdx(idx);
    setUsedProblems(used);
    setProblem(p);
    setAnimal(pickAnimal(w));
    setInput("");
    setLives(3);
    setProbIdx(0);
    setTotalWrong(0);
    setWrongThis(0);
    setFeedback(null);
    setSolved(false);
    setScreen("game");
  };

  /* Avanzar al siguiente problema o completar el mundo */
  const advance = () => {
    const nextIdx = probIdx + 1;
    if (nextIdx >= N_PROBLEMS) {
      play(SFX.worldComplete);
      const stars = calcStars(totalWrong);
      const newStars = [...progress.stars];
      newStars[wIdx] = Math.max(newStars[wIdx], stars);
      saveProgress(newStars);
      setScreen("complete");
    } else {
      const newUsed = new Set(usedProblems);
      newUsed.add(`${problem.dividend}/${problem.divisor}`);
      setUsedProblems(newUsed);
      const w = WORLDS[wIdx];
      const p = makeProblem(w, newUsed);
      setProblem(p);
      setAnimal(pickAnimal(w));
      setProbIdx(nextIdx);
      setInput("");
      setFeedback(null);
      setSolved(false);
      setWrongThis(0);
    }
  };

  const handleCheck = () => {
    if (!input || feedback) return;
    const val = parseInt(input, 10);
    if (val === problem.answer) {
      play(SFX.correct);
      setFeedback("correct");
      setSolved(true);
      setTimeout(advance, 2200);
    } else {
      play(SFX.wrong);
      const nw = wrongThis + 1;
      const nl = lives - 1;
      setWrongThis(nw);
      setTotalWrong((prev) => prev + 1);
      setFeedback("wrong");
      setLives(nl);
      if (nl <= 0) {
        setTimeout(() => { play(SFX.gameOver); setScreen("over"); }, 1500);
      } else {
        setTimeout(() => {
          setFeedback(null);
          setInput("");
        }, 1300);
      }
    }
  };

  const handleDigit = (d) => {
    if (feedback || input.length >= 3) return;
    play(SFX.digit);
    setInput((prev) => prev + String(d));
  };

  const handleDel = () => {
    if (feedback) return;
    play(SFX.del);
    setInput((prev) => prev.slice(0, -1));
  };

  /* ── PANTALLA HOME ─────────────────────────── */
  if (screen === "home") {
    return (
      <div className="min-h-screen bg-stone-950 text-white">
        {/* Cabecera */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <Link
            to="/"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={22} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">División Animal</h1>
            <p className="text-sm text-white/50">
              Aprende divisiones con el reino animal
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              title={muted ? "Activar sonido" : "Silenciar"}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <div className="flex items-center gap-1.5 bg-yellow-500/15 rounded-xl px-3 py-1.5">
              <Star size={15} className="text-yellow-400 fill-yellow-400" />
              <span className="text-yellow-300 font-bold text-sm">{totalStars}</span>
            </div>
          </div>
        </div>

        {/* Mundos */}
        <div className="p-4 space-y-3 max-w-md mx-auto">
          {WORLDS.map((w, i) => {
            const unlocked = totalStars >= w.requiredStars;
            const stars = progress.stars[i];
            return (
              <button
                key={w.id}
                disabled={!unlocked}
                onPointerDown={() => unlocked && startWorld(i)}
                className={`w-full rounded-3xl p-4 text-left transition-all
                  ${
                    unlocked
                      ? "active:scale-[0.98] hover:brightness-110"
                      : "opacity-45 cursor-not-allowed"
                  }`}
                style={{
                  background: `linear-gradient(135deg, ${w.bg[0]}, ${w.bg[1]})`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{w.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base">{w.name}</span>
                      {!unlocked && (
                        <Lock size={13} className="text-white/50" />
                      )}
                    </div>
                    <div className="text-xs text-white/60 mt-0.5">{w.type}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StarRow count={stars} size={16} />
                    {!unlocked && (
                      <span className="text-xs text-white/40">
                        {w.requiredStars - totalStars} ⭐ para abrir
                      </span>
                    )}
                    {unlocked && stars === 0 && (
                      <span className="text-xs text-white/50">¡Sin jugar!</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Instrucciones */}
        <div className="mx-4 p-4 bg-white/5 rounded-2xl max-w-md mx-auto">
          <p className="text-center text-sm text-white/40">
            🎯 Resuelve divisiones · 🌟 Gana estrellas · 🔓 Desbloquea mundos
          </p>
        </div>
      </div>
    );
  }

  /* ── GAME OVER ─────────────────────────────── */
  if (screen === "over") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-white text-center"
        style={{
          background: `linear-gradient(180deg, ${world.bg[0]}, ${world.bg[1]})`,
        }}
      >
        <div className="text-7xl mb-4">😢</div>
        <h2 className="text-3xl font-bold mb-2">¡Sin vidas!</h2>
        <p className="text-white/60 mb-8">
          No pasa nada, ¡la práctica hace al maestro!
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => startWorld(wIdx)}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 rounded-2xl font-bold transition-colors"
          >
            <RefreshCw size={18} /> Reintentar
          </button>
          <button
            onClick={() => setScreen("home")}
            className="px-6 py-3 bg-white/15 hover:bg-white/25 rounded-2xl font-bold transition-colors"
          >
            Mundos
          </button>
        </div>
      </div>
    );
  }

  /* ── MUNDO COMPLETADO ──────────────────────── */
  if (screen === "complete") {
    const earned = calcStars(totalWrong);
    const nextWorld = WORLDS[wIdx + 1];
    const canGoNext = nextWorld && totalStars >= nextWorld.requiredStars;

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-white text-center"
        style={{
          background: `linear-gradient(180deg, ${world.bg[0]}, ${world.bg[1]})`,
        }}
      >
        <div className="text-7xl mb-3">🎉</div>
        <h2 className="text-3xl font-bold mb-1">¡Mundo completado!</h2>
        <p className="text-lg text-white/70 mb-4">
          {world.name} · {world.type}
        </p>
        <div className="flex gap-2 mb-6">
          <StarRow count={earned} size={40} />
        </div>
        {totalWrong === 0 && (
          <div className="mb-4 px-4 py-2 bg-yellow-500/20 rounded-2xl text-yellow-300 font-bold text-sm">
            🏆 ¡Perfecto! ¡Ningún fallo!
          </div>
        )}
        <div className="bg-white/10 rounded-2xl p-4 max-w-sm mb-6 text-left">
          <p className="text-sm text-yellow-300 font-bold mb-1">
            💡 Dato curioso sobre {world.type.toLowerCase()}:
          </p>
          <p className="text-sm text-white/80">{world.fact}</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={() => startWorld(wIdx)}
            className="flex items-center gap-2 px-5 py-3 bg-white/15 rounded-2xl font-bold"
          >
            <RefreshCw size={18} /> Repetir
          </button>
          {nextWorld ? (
            <button
              onClick={() => startWorld(wIdx + 1)}
              disabled={!canGoNext}
              className="flex items-center gap-2 px-5 py-3 bg-green-500 disabled:bg-white/15 disabled:opacity-50 rounded-2xl font-bold"
            >
              Siguiente <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={() => setScreen("home")}
              className="flex items-center gap-2 px-5 py-3 bg-yellow-500 rounded-2xl font-bold"
            >
              🏆 ¡Todo completado!
            </button>
          )}
          <button
            onClick={() => setScreen("home")}
            className="px-5 py-3 bg-white/15 rounded-2xl font-bold"
          >
            Mundos
          </button>
        </div>
      </div>
    );
  }

  /* ── PANTALLA DE JUEGO ─────────────────────── */
  if (!problem) return null;

  const hint1 = wrongThis >= 1;
  const hint2 = wrongThis >= 2;

  return (
    <div
      className="min-h-screen flex flex-col text-white"
      style={{
        background: `linear-gradient(180deg, ${world.bg[0]}, ${world.bg[1]})`,
      }}
    >
      {/* Cabecera */}
      <div className="flex items-center gap-3 p-4 flex-shrink-0">
        <button
          onClick={() => setScreen("home")}
          className="p-2 rounded-xl bg-white/10"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1">
          <p className="text-sm font-bold text-white/70">
            {world.icon} {world.name}
          </p>
          <div className="flex gap-1 mt-1.5">
            {Array.from({ length: N_PROBLEMS }, (_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-all
                  ${
                    i < probIdx
                      ? "bg-green-400"
                      : i === probIdx
                      ? "bg-white"
                      : "bg-white/20"
                  }`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-white/10"
            title={muted ? "Activar sonido" : "Silenciar"}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <Hearts count={lives} />
        </div>
      </div>

      {/* Cuerpo */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Historia */}
        <div className="bg-white/10 rounded-2xl p-3 text-center text-sm text-white/80">
          {world.story}
        </div>

        {/* Ayuda visual */}
        <div className="bg-black/20 rounded-3xl p-4">
          <VisualAid
            dividend={problem.dividend}
            divisor={problem.divisor}
            answer={problem.answer}
            animal={animal}
            solved={solved}
          />
        </div>

        {/* Ecuación */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <div className="bg-white/15 rounded-2xl px-4 py-3 text-center min-w-[72px]">
            <p className="text-xs text-white/50 mb-0.5">Total</p>
            <p className="text-4xl font-bold">{problem.dividend}</p>
          </div>
          <p className="text-3xl text-white/40 font-light">÷</p>
          <div className="bg-white/15 rounded-2xl px-4 py-3 text-center min-w-[72px]">
            <p className="text-xs text-white/50 mb-0.5">Grupos</p>
            <p className="text-4xl font-bold">{problem.divisor}</p>
          </div>
          <p className="text-3xl text-white/40 font-light">=</p>
          <div
            className={`rounded-2xl px-4 py-3 text-center min-w-[72px] border-2 transition-all
              ${
                feedback === "correct"
                  ? "bg-green-500/40 border-green-400"
                  : feedback === "wrong"
                  ? "bg-red-500/40 border-red-400 animate-shake"
                  : input
                  ? "bg-white/15 border-white/40"
                  : "bg-white/10 border-white/15"
              }`}
          >
            <p className="text-xs text-white/50 mb-0.5">
              {feedback === "correct" ? "✓" : "?"}
            </p>
            <p className="text-4xl font-bold min-w-[2ch] text-center">
              {feedback === "correct" ? problem.answer : input || "—"}
            </p>
          </div>
        </div>

        {/* Feedback */}
        {feedback === "correct" && (
          <p className="text-center text-green-300 font-bold text-lg">
            🎉 ¡Correcto! ¡Genial!
          </p>
        )}
        {feedback === "wrong" && (
          <p className="text-center text-red-300 font-bold text-lg">
            ❌ ¡Ese no es! Prueba otra vez
          </p>
        )}

        {/* Pistas */}
        {hint1 && !feedback && (
          <div className="bg-yellow-500/15 border border-yellow-500/30 rounded-2xl p-3 text-center text-sm text-yellow-200">
            {hint2
              ? `💡 La respuesta es: ${problem.dividend} ÷ ${problem.divisor} = ${problem.answer}`
              : `💡 Pista: ${problem.divisor} × ? = ${problem.dividend} · ¿Qué número falta?`}
          </div>
        )}

        {/* Pregunta */}
        <p className="text-center text-base text-white/75">
          ¿Cuántos{" "}
          <span className="text-2xl" role="img">
            {animal}
          </span>{" "}
          hay en cada grupo?
        </p>

        {/* Teclado */}
        <NumPad
          onDigit={handleDigit}
          onDel={handleDel}
          onCheck={handleCheck}
          disabled={!!feedback}
        />

        {/* Contador */}
        <p className="text-center text-xs text-white/30 pb-2">
          Problema {probIdx + 1} de {N_PROBLEMS}
        </p>
      </div>
    </div>
  );
}
