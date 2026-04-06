import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Home as HomeIcon, Star, Volume2, VolumeX } from "lucide-react";

// ─── DATOS ────────────────────────────────────────────────────────────────────
const WORLDS = [
  {
    id: "europa",
    name: "Europa",
    emoji: "🌍",
    unlockNeeded: 0,
    color: "from-blue-500 to-indigo-600",
    gameBg: "from-blue-950 via-indigo-950 to-blue-950",
    questions: [
      { country: "España",       flag: "🇪🇸", capital: "Madrid",      wrong: ["Barcelona", "Sevilla", "Valencia"] },
      { country: "Francia",      flag: "🇫🇷", capital: "París",       wrong: ["Lyon", "Marsella", "Niza"] },
      { country: "Italia",       flag: "🇮🇹", capital: "Roma",        wrong: ["Milán", "Nápoles", "Venecia"] },
      { country: "Alemania",     flag: "🇩🇪", capital: "Berlín",      wrong: ["Múnich", "Hamburgo", "Colonia"] },
      { country: "Reino Unido",  flag: "🇬🇧", capital: "Londres",     wrong: ["Manchester", "Birmingham", "Liverpool"] },
      { country: "Portugal",     flag: "🇵🇹", capital: "Lisboa",      wrong: ["Oporto", "Braga", "Faro"] },
      { country: "Países Bajos", flag: "🇳🇱", capital: "Ámsterdam",  wrong: ["Rotterdam", "La Haya", "Utrecht"] },
      { country: "Bélgica",      flag: "🇧🇪", capital: "Bruselas",    wrong: ["Amberes", "Gante", "Brujas"] },
      { country: "Suecia",       flag: "🇸🇪", capital: "Estocolmo",  wrong: ["Gotemburgo", "Malmö", "Uppsala"] },
      { country: "Noruega",      flag: "🇳🇴", capital: "Oslo",        wrong: ["Bergen", "Trondheim", "Stavanger"] },
      { country: "Dinamarca",    flag: "🇩🇰", capital: "Copenhague", wrong: ["Aarhus", "Odense", "Aalborg"] },
      { country: "Suiza",        flag: "🇨🇭", capital: "Berna",       wrong: ["Zúrich", "Ginebra", "Basilea"] },
      { country: "Austria",      flag: "🇦🇹", capital: "Viena",       wrong: ["Graz", "Linz", "Salzburgo"] },
      { country: "Polonia",      flag: "🇵🇱", capital: "Varsovia",   wrong: ["Cracovia", "Gdansk", "Lodz"] },
      { country: "Grecia",       flag: "🇬🇷", capital: "Atenas",     wrong: ["Tesalónica", "Pátras", "Iraklion"] },
    ],
  },
  {
    id: "americas",
    name: "Américas",
    emoji: "🌎",
    unlockNeeded: 2,
    color: "from-emerald-500 to-teal-600",
    gameBg: "from-emerald-950 via-teal-950 to-emerald-950",
    questions: [
      { country: "Estados Unidos", flag: "🇺🇸", capital: "Washington D.C.",  wrong: ["Nueva York", "Los Ángeles", "Chicago"] },
      { country: "México",         flag: "🇲🇽", capital: "Ciudad de México", wrong: ["Guadalajara", "Monterrey", "Tijuana"] },
      { country: "Brasil",         flag: "🇧🇷", capital: "Brasilia",         wrong: ["São Paulo", "Río de Janeiro", "Salvador"] },
      { country: "Argentina",      flag: "🇦🇷", capital: "Buenos Aires",     wrong: ["Córdoba", "Rosario", "Mendoza"] },
      { country: "Chile",          flag: "🇨🇱", capital: "Santiago",         wrong: ["Valparaíso", "Concepción", "Temuco"] },
      { country: "Colombia",       flag: "🇨🇴", capital: "Bogotá",           wrong: ["Medellín", "Cali", "Barranquilla"] },
      { country: "Perú",           flag: "🇵🇪", capital: "Lima",             wrong: ["Arequipa", "Cusco", "Trujillo"] },
      { country: "Venezuela",      flag: "🇻🇪", capital: "Caracas",          wrong: ["Maracaibo", "Valencia", "Barquisimeto"] },
      { country: "Ecuador",        flag: "🇪🇨", capital: "Quito",            wrong: ["Guayaquil", "Cuenca", "Manta"] },
      { country: "Canadá",         flag: "🇨🇦", capital: "Ottawa",           wrong: ["Toronto", "Vancouver", "Montreal"] },
      { country: "Cuba",           flag: "🇨🇺", capital: "La Habana",        wrong: ["Santiago de Cuba", "Camagüey", "Holguín"] },
      { country: "Australia",      flag: "🇦🇺", capital: "Canberra",         wrong: ["Sídney", "Melbourne", "Brisbane"] },
      { country: "Bolivia",        flag: "🇧🇴", capital: "Sucre",            wrong: ["La Paz", "Santa Cruz", "Cochabamba"] },
      { country: "Uruguay",        flag: "🇺🇾", capital: "Montevideo",       wrong: ["Salto", "Paysandú", "Las Piedras"] },
      { country: "Paraguay",       flag: "🇵🇾", capital: "Asunción",         wrong: ["Ciudad del Este", "San Lorenzo", "Luque"] },
    ],
  },
  {
    id: "mundo",
    name: "Mundo",
    emoji: "🌏",
    unlockNeeded: 2,
    color: "from-orange-500 to-rose-600",
    gameBg: "from-orange-950 via-rose-950 to-orange-950",
    questions: [
      { country: "Japón",        flag: "🇯🇵", capital: "Tokio",       wrong: ["Osaka", "Kioto", "Hiroshima"] },
      { country: "China",        flag: "🇨🇳", capital: "Pekín",       wrong: ["Shanghái", "Cantón", "Nankín"] },
      { country: "India",        flag: "🇮🇳", capital: "Nueva Delhi", wrong: ["Bombay", "Calcuta", "Bangalore"] },
      { country: "Corea del Sur",flag: "🇰🇷", capital: "Seúl",        wrong: ["Busan", "Incheon", "Daegu"] },
      { country: "Tailandia",    flag: "🇹🇭", capital: "Bangkok",     wrong: ["Chiang Mai", "Pattaya", "Phuket"] },
      { country: "Egipto",       flag: "🇪🇬", capital: "El Cairo",    wrong: ["Alejandría", "Luxor", "Asuán"] },
      { country: "Nigeria",      flag: "🇳🇬", capital: "Abuya",       wrong: ["Lagos", "Kano", "Ibadán"] },
      { country: "Sudáfrica",    flag: "🇿🇦", capital: "Pretoria",    wrong: ["Ciudad del Cabo", "Johannesburgo", "Durban"] },
      { country: "Kenia",        flag: "🇰🇪", capital: "Nairobi",     wrong: ["Mombasa", "Kisumu", "Nakuru"] },
      { country: "Marruecos",    flag: "🇲🇦", capital: "Rabat",       wrong: ["Casablanca", "Marrakech", "Fez"] },
      { country: "Arabia Saudí", flag: "🇸🇦", capital: "Riad",        wrong: ["Yeda", "La Meca", "Medina"] },
      { country: "Turquía",      flag: "🇹🇷", capital: "Ankara",      wrong: ["Estambul", "Izmir", "Bursa"] },
      { country: "Rusia",        flag: "🇷🇺", capital: "Moscú",       wrong: ["San Petersburgo", "Kazán", "Novosibirsk"] },
      { country: "Indonesia",    flag: "🇮🇩", capital: "Yakarta",     wrong: ["Surabaya", "Bandung", "Medan"] },
      { country: "Filipinas",    flag: "🇵🇭", capital: "Manila",      wrong: ["Cebú", "Davao", "Quezon"] },
    ],
  },
];

const QPR        = 10;   // preguntas por ronda
const MAX_LIVES  = 3;
const TIMER_SECS = 15;

// ─── UTILIDADES ───────────────────────────────────────────────────────────────
function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function buildOptions(q) {
  return shuffle([q.capital, ...shuffle(q.wrong).slice(0, 3)]);
}

function calcStars(correct, total) {
  const pct = correct / total;
  if (pct >= 0.9) return 3;
  if (pct >= 0.6) return 2;
  return 1;
}

// ─── AUDIO (Web Audio API) ────────────────────────────────────────────────────
let _actx = null;
function getCtx() {
  if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
  if (_actx.state === "suspended") _actx.resume();
  return _actx;
}
function tone(freq, delay, dur, type = "sine", vol = 0.26) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    g.gain.setValueAtTime(vol, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + dur);
  } catch (_) {}
}

const SFX = {
  correct: () => { tone(523,0,.12); tone(659,.1,.12); tone(784,.2,.18); },
  wrong:   () => { tone(280,0,.08,"sawtooth",.2); tone(220,.09,.12,"sawtooth",.2); tone(160,.2,.22,"sawtooth",.18); },
  streak:  () => [784,988,1175,1568].forEach((f,i) => tone(f,i*.08,.1)),
  finish:  () => [523,659,784,659,784,1047].forEach((f,i) => tone(f,i*.13,.18)),
  over:    () => [380,300,240,180].forEach((f,i) => tone(f,i*.17,.22,"triangle",.22)),
  tick:    () => tone(660,0,.04,"sine",.07),
  unlock:  () => [523,659,784,1047,1568].forEach((f,i) => tone(f,i*.1,.15)),
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function CapitalesDelMundo() {
  const [screen,   setScreen]   = useState("home"); // home | game | result
  const [worldIdx, setWorldIdx] = useState(0);
  const [questions,setQuestions]= useState([]);
  const [qIdx,     setQIdx]     = useState(0);
  const [opts,     setOpts]     = useState([]);
  const [lives,    setLives]    = useState(MAX_LIVES);
  const [score,    setScore]    = useState(0);
  const [streak,   setStreak]   = useState(0);
  const [hits,     setHits]     = useState(0);
  const [fb,       setFb]       = useState(null);   // null|"ok"|"ko"|"time"
  const [chosen,   setChosen]   = useState(null);
  const [timer,    setTimer]    = useState(TIMER_SECS);
  const [muted,    setMuted]    = useState(false);
  const [saved,    setSaved]    = useState(() => {
    try { return JSON.parse(localStorage.getItem("cap_v1") || "{}"); } catch { return {}; }
  });

  const timerRef = useRef(null);
  const fbtRef   = useRef(null);
  const mutedRef = useRef(false);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const play = useCallback((sfx) => { if (!mutedRef.current) SFX[sfx]?.(); }, []);

  const persist = useCallback((worldId, stars) => {
    setSaved(prev => {
      const next = { ...prev };
      if ((next[worldId] || 0) < stars) next[worldId] = stars;
      try { localStorage.setItem("cap_v1", JSON.stringify(next)); } catch (_) {}
      return next;
    });
  }, []);

  // Cuenta regresiva
  useEffect(() => {
    if (screen !== "game" || fb !== null) { clearInterval(timerRef.current); return; }
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timerRef.current);
  }, [screen, qIdx, fb]);

  // Pitido de advertencia
  useEffect(() => {
    if (screen === "game" && fb === null && timer > 0 && timer <= 5) play("tick");
  }, [timer, screen, fb, play]);

  // Tiempo agotado → fallo
  useEffect(() => {
    if (screen !== "game" || timer !== 0 || fb !== null) return;
    clearInterval(timerRef.current);
    play("wrong");
    const nl = lives - 1;
    setLives(nl); setStreak(0); setFb("time");
    fbtRef.current = setTimeout(() => {
      if (nl <= 0) { play("over"); setScreen("result"); return; }
      const ni = qIdx + 1;
      if (ni >= questions.length) {
        play("finish");
        persist(WORLDS[worldIdx].id, calcStars(hits, QPR));
        setScreen("result");
      } else {
        setQIdx(ni); setOpts(buildOptions(questions[ni]));
        setFb(null); setChosen(null); setTimer(TIMER_SECS);
      }
    }, 1400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, timer, fb]);

  useEffect(() => () => { clearInterval(timerRef.current); clearTimeout(fbtRef.current); }, []);

  // ── Iniciar partida ──────────────────────────────────────────────────────────
  const startGame = (idx) => {
    clearTimeout(fbtRef.current); clearInterval(timerRef.current);
    const qs = shuffle(WORLDS[idx].questions).slice(0, QPR);
    setWorldIdx(idx); setQuestions(qs); setQIdx(0);
    setOpts(buildOptions(qs[0])); setLives(MAX_LIVES);
    setScore(0); setStreak(0); setHits(0);
    setFb(null); setChosen(null); setTimer(TIMER_SECS);
    setScreen("game");
  };

  // ── Responder ────────────────────────────────────────────────────────────────
  const answer = (opt) => {
    if (fb !== null) return;
    clearInterval(timerRef.current);
    setChosen(opt);
    const q  = questions[qIdx];
    const ok = opt === q.capital;

    if (ok) {
      const ns = streak + 1;
      setScore(s => s + (ns >= 3 ? 20 : 10));
      setStreak(ns); setHits(h => h + 1);
      play(ns >= 3 ? "streak" : "correct");
      setFb("ok");
    } else {
      setLives(l => l - 1); setStreak(0);
      play("wrong"); setFb("ko");
    }

    // Capturamos los valores actuales para el timeout
    const currentLives   = ok ? lives : lives - 1;
    const currentHits    = ok ? hits + 1 : hits;

    fbtRef.current = setTimeout(() => {
      const ni = qIdx + 1;
      if (!ok && currentLives <= 0) { play("over"); setScreen("result"); return; }
      if (ni >= questions.length) {
        play("finish");
        persist(WORLDS[worldIdx].id, calcStars(currentHits, QPR));
        setScreen("result");
      } else {
        setQIdx(ni); setOpts(buildOptions(questions[ni]));
        setFb(null); setChosen(null); setTimer(TIMER_SECS);
      }
    }, 1300);
  };

  const world = WORLDS[worldIdx];
  const q     = questions[qIdx];

  if (screen === "home")
    return <HomeScreen saved={saved} onStart={startGame} muted={muted} onMute={() => setMuted(m => !m)} />;
  if (screen === "result")
    return (
      <ResultScreen
        world={world} score={score} hits={hits}
        total={questions.length} lives={lives} saved={saved}
        onReplay={() => startGame(worldIdx)} onHome={() => setScreen("home")}
      />
    );
  if (!q) return null;
  return (
    <GameScreen
      world={world} q={q} opts={opts}
      lives={lives} score={score} streak={streak}
      fb={fb} chosen={chosen} timer={timer}
      qIdx={qIdx} total={questions.length}
      onAnswer={answer} muted={muted} onMute={() => setMuted(m => !m)}
    />
  );
}

// ─── PANTALLA INICIO ──────────────────────────────────────────────────────────
function HomeScreen({ saved, onStart, muted, onMute }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white">
      {/* Estrellas decorativas */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width:  `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              top:    `${Math.random() * 100}%`,
              left:   `${Math.random() * 100}%`,
              opacity: Math.random() * 0.6 + 0.2,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-md px-4 py-8">
        {/* Nav superior */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/50 transition hover:text-white">
            <HomeIcon size={18} />
            <span className="text-sm">Inicio</span>
          </Link>
          <button onClick={onMute} className="text-white/50 transition hover:text-white">
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>

        {/* Cabecera */}
        <div className="mb-10 text-center">
          <div className="mb-3 text-7xl">🚀</div>
          <h1 className="text-4xl font-black tracking-tight">Capitales del Mundo</h1>
          <p className="mt-3 text-white/60">¡Viaja por el planeta y descubre las capitales!</p>
        </div>

        {/* Mundos */}
        <div className="flex flex-col gap-4">
          {WORLDS.map((w, idx) => {
            const prev    = idx > 0 ? WORLDS[idx - 1] : null;
            const myStars = saved[w.id] || 0;
            const prevSt  = prev ? (saved[prev.id] || 0) : 99;
            const locked  = prevSt < w.unlockNeeded;
            return (
              <button
                key={w.id}
                onClick={() => !locked && onStart(idx)}
                disabled={locked}
                className={`relative rounded-2xl border p-5 text-left transition-all
                  ${locked
                    ? "cursor-not-allowed border-white/5 bg-white/3 opacity-50"
                    : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10 active:scale-95"
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${w.color} text-3xl shadow-lg`}>
                    {w.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg">{w.name}</span>
                      {locked && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
                          🔒 Necesitas ⭐⭐ en {prev?.name}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex gap-1">
                      {[1, 2, 3].map(s => (
                        <Star
                          key={s}
                          size={16}
                          className={s <= myStars ? "fill-yellow-400 text-yellow-400" : "text-white/20"}
                        />
                      ))}
                    </div>
                  </div>
                  {!locked && <span className="text-white/40 text-xl">›</span>}
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-white/30">
          10 preguntas · 3 vidas · 15 segundos por pregunta
        </p>
      </div>
    </div>
  );
}

// ─── PANTALLA JUEGO ───────────────────────────────────────────────────────────
function GameScreen({ world, q, opts, lives, score, streak, fb, chosen, timer, qIdx, total, onAnswer, muted, onMute }) {
  const timerPct   = (timer / TIMER_SECS) * 100;
  const timerColor = timer <= 5 ? "bg-red-500" : timer <= 9 ? "bg-yellow-400" : "bg-emerald-400";

  function optClass(opt) {
    const base = "w-full rounded-2xl border px-4 py-5 text-center font-bold text-base transition-all active:scale-95 select-none";
    if (fb === null)
      return `${base} border-white/15 bg-white/8 hover:bg-white/15 hover:border-white/25`;
    const isCorrect = opt === q.capital;
    const isChosen  = opt === chosen;
    if (isCorrect) return `${base} border-green-400/70 bg-green-500/25 text-green-200`;
    if (isChosen && (fb === "ko")) return `${base} border-red-400/70 bg-red/25 text-red-300`;
    return `${base} border-white/5 bg-white/3 opacity-30`;
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b ${world.gameBg} p-4 text-white`}>
      <div className="mx-auto flex max-w-md flex-col gap-4">

        {/* Barra superior */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-1">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <span key={i} className={`text-2xl transition-all duration-300 ${i < lives ? "" : "opacity-15 grayscale"}`}>
                ❤️
              </span>
            ))}
          </div>
          <div className="text-center">
            <div className="text-xs text-white/50">Pregunta</div>
            <div className="font-black text-lg">{qIdx + 1} / {total}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-black text-yellow-400">⭐ {score}</span>
            <button onClick={onMute} className="text-white/40 hover:text-white transition">
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>

        {/* Barra de tiempo */}
        <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full ${timerColor} transition-all duration-1000 ease-linear ${timer <= 5 ? "animate-pulse" : ""}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
        <div className="text-center text-xs text-white/40">
          {timer <= 5 && fb === null ? `⏰ ¡Rápido! ${timer}s` : `${timer}s`}
        </div>

        {/* Racha */}
        {streak >= 3 && (
          <div className="text-center">
            <span className="animate-bounce inline-block rounded-full bg-orange-500/20 px-4 py-1 text-sm font-bold text-orange-300">
              🔥 ¡Racha x{streak}! +20 pts
            </span>
          </div>
        )}

        {/* Tarjeta del país */}
        <div
          className={`rounded-3xl border p-8 text-center transition-all duration-300
            ${fb === "ok"   ? "border-green-400/50 bg-green-500/10"  : ""}
            ${fb === "ko" || fb === "time" ? "border-red-400/50 bg-red-500/10" : ""}
            ${fb === null   ? "border-white/10 bg-white/5"           : ""}
          `}
        >
          <div className="mb-2 text-8xl leading-none">{q.flag}</div>
          <h2 className="text-2xl font-black">{q.country}</h2>
          <p className="mt-2 text-sm text-white/50">¿Cuál es su capital?</p>

          {fb === "ok" && (
            <div className="mt-4 animate-bounce text-green-400 font-bold text-lg">
              ✅ ¡Correcto! {streak >= 3 ? "🔥" : ""}
            </div>
          )}
          {(fb === "ko" || fb === "time") && (
            <div className="mt-4">
              <div className="font-bold text-red-400 text-lg">
                {fb === "time" ? "⏰ ¡Tiempo!" : "❌ ¡Fallo!"}
              </div>
              <div className="mt-1 text-sm text-white/60">
                La capital es{" "}
                <span className="font-black text-white">{q.capital}</span>
              </div>
            </div>
          )}
        </div>

        {/* Opciones */}
        <div className="grid grid-cols-2 gap-3">
          {opts.map(opt => (
            <button
              key={opt}
              onClick={() => onAnswer(opt)}
              disabled={fb !== null}
              className={optClass(opt)}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Rocket decorativo */}
        <div className="py-2 text-center text-2xl opacity-20 select-none">🚀</div>
      </div>
    </div>
  );
}

// ─── PANTALLA RESULTADO ───────────────────────────────────────────────────────
function ResultScreen({ world, score, hits, total, lives, saved, onReplay, onHome }) {
  const stars    = calcStars(hits, total);
  const won      = lives > 0;
  const wIdx     = WORLDS.findIndex(w => w.id === world.id);
  const nextW    = WORLDS[wIdx + 1];
  const unlocked = nextW && (saved[world.id] || 0) >= 2 && stars >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-4 text-white flex items-center justify-center">
      <div className="mx-auto w-full max-w-md text-center">
        <div className="mb-4 text-7xl">{won ? "🎉" : "😢"}</div>
        <h1 className="text-3xl font-black">
          {won ? "¡Completado!" : "¡Se acabaron las vidas!"}
        </h1>

        {/* Estrellas ganadas */}
        <div className="my-8 flex justify-center gap-4">
          {[1, 2, 3].map(s => (
            <Star
              key={s}
              size={52}
              className={`transition-all ${s <= stars
                ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]"
                : "text-white/15"
              }`}
              style={{ animationDelay: `${s * 150}ms` }}
            />
          ))}
        </div>

        {/* Estadísticas */}
        <div className="mb-6 rounded-2xl bg-white/5 p-5 border border-white/10">
          <div className="text-5xl font-black text-yellow-400">⭐ {score}</div>
          <div className="mt-2 text-white/60 text-lg">
            {hits} de {total} capitales correctas
          </div>
          <div className="mt-1 text-white/40 text-sm">
            {Math.round((hits / total) * 100)}% de aciertos
          </div>
        </div>

        {/* Desbloqueo */}
        {unlocked && nextW && (
          <div className="mb-5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <div className="text-2xl mb-1">🔓</div>
            <p className="font-bold text-yellow-300">
              ¡Has desbloqueado {nextW.emoji} {nextW.name}!
            </p>
          </div>
        )}

        {/* Mensajes motivadores */}
        {stars === 3 && <p className="mb-4 text-emerald-400 font-bold">¡Eres un genio de la geografía! 🌟</p>}
        {stars === 2 && <p className="mb-4 text-blue-300 font-bold">¡Muy bien! Sigue practicando 💪</p>}
        {stars === 1 && <p className="mb-4 text-orange-300 font-bold">¡Buena idea repasar y volver a intentarlo! 📚</p>}

        {/* Botones */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onReplay}
            className={`rounded-2xl bg-gradient-to-r ${world.color} p-4 text-lg font-bold shadow-lg active:scale-95 transition-transform`}
          >
            🔄 Jugar otra vez
          </button>
          <button
            onClick={onHome}
            className="rounded-2xl border border-white/20 bg-white/5 p-4 font-bold active:scale-95 transition-transform"
          >
            🌍 Elegir mundo
          </button>
        </div>
      </div>
    </div>
  );
}
