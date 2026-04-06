import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Home as HomeIcon, Star, Volume2, VolumeX, Trophy } from "lucide-react";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL  ?? "";
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const HAS_SUPA = !!(SUPA_URL && SUPA_KEY);

const SUPA_HEADERS = {
  apikey: SUPA_KEY,
  Authorization: `Bearer ${SUPA_KEY}`,
  "Content-Type": "application/json",
};

async function fetchRankings(worldId) {
  const url =
    `${SUPA_URL}/rest/v1/scores` +
    `?world_id=eq.${worldId}` +
    `&select=player_name,score,time_seconds,created_at` +
    `&order=score.desc,time_seconds.asc` +
    `&limit=10`;
  const res = await fetch(url, { headers: SUPA_HEADERS });
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

async function saveScore(worldId, playerName, score, timeSecs) {
  const res = await fetch(`${SUPA_URL}/rest/v1/scores`, {
    method: "POST",
    headers: { ...SUPA_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify({
      world_id: worldId,
      player_name: playerName.trim().slice(0, 20),
      score,
      time_seconds: timeSecs,
    }),
  });
  return res.ok;
}

// ─── DATOS ────────────────────────────────────────────────────────────────────
const WORLDS = [
  {
    id: "europa", name: "Europa", emoji: "🌍", unlockNeeded: 0,
    color: "from-blue-500 to-indigo-600",
    gameBg: "from-blue-950 via-indigo-950 to-blue-950",
    questions: [
      { country:"España",       flag:"🇪🇸", capital:"Madrid",           wrong:["Barcelona","Sevilla","Valencia"] },
      { country:"Francia",      flag:"🇫🇷", capital:"París",            wrong:["Lyon","Marsella","Niza"] },
      { country:"Italia",       flag:"🇮🇹", capital:"Roma",             wrong:["Milán","Nápoles","Venecia"] },
      { country:"Alemania",     flag:"🇩🇪", capital:"Berlín",           wrong:["Múnich","Hamburgo","Colonia"] },
      { country:"Reino Unido",  flag:"🇬🇧", capital:"Londres",          wrong:["Manchester","Birmingham","Liverpool"] },
      { country:"Portugal",     flag:"🇵🇹", capital:"Lisboa",           wrong:["Oporto","Braga","Faro"] },
      { country:"Países Bajos", flag:"🇳🇱", capital:"Ámsterdam",       wrong:["Rotterdam","La Haya","Utrecht"] },
      { country:"Bélgica",      flag:"🇧🇪", capital:"Bruselas",         wrong:["Amberes","Gante","Brujas"] },
      { country:"Suecia",       flag:"🇸🇪", capital:"Estocolmo",       wrong:["Gotemburgo","Malmö","Uppsala"] },
      { country:"Noruega",      flag:"🇳🇴", capital:"Oslo",             wrong:["Bergen","Trondheim","Stavanger"] },
      { country:"Dinamarca",    flag:"🇩🇰", capital:"Copenhague",      wrong:["Aarhus","Odense","Aalborg"] },
      { country:"Suiza",        flag:"🇨🇭", capital:"Berna",            wrong:["Zúrich","Ginebra","Basilea"] },
      { country:"Austria",      flag:"🇦🇹", capital:"Viena",            wrong:["Graz","Linz","Salzburgo"] },
      { country:"Polonia",      flag:"🇵🇱", capital:"Varsovia",         wrong:["Cracovia","Gdansk","Lodz"] },
      { country:"Grecia",       flag:"🇬🇷", capital:"Atenas",           wrong:["Tesalónica","Pátras","Iraklion"] },
    ],
  },
  {
    id: "americas", name: "Américas", emoji: "🌎", unlockNeeded: 2,
    color: "from-emerald-500 to-teal-600",
    gameBg: "from-emerald-950 via-teal-950 to-emerald-950",
    questions: [
      { country:"Estados Unidos", flag:"🇺🇸", capital:"Washington D.C.",  wrong:["Nueva York","Los Ángeles","Chicago"] },
      { country:"México",         flag:"🇲🇽", capital:"Ciudad de México", wrong:["Guadalajara","Monterrey","Tijuana"] },
      { country:"Brasil",         flag:"🇧🇷", capital:"Brasilia",         wrong:["São Paulo","Río de Janeiro","Salvador"] },
      { country:"Argentina",      flag:"🇦🇷", capital:"Buenos Aires",     wrong:["Córdoba","Rosario","Mendoza"] },
      { country:"Chile",          flag:"🇨🇱", capital:"Santiago",         wrong:["Valparaíso","Concepción","Temuco"] },
      { country:"Colombia",       flag:"🇨🇴", capital:"Bogotá",           wrong:["Medellín","Cali","Barranquilla"] },
      { country:"Perú",           flag:"🇵🇪", capital:"Lima",             wrong:["Arequipa","Cusco","Trujillo"] },
      { country:"Venezuela",      flag:"🇻🇪", capital:"Caracas",          wrong:["Maracaibo","Valencia","Barquisimeto"] },
      { country:"Ecuador",        flag:"🇪🇨", capital:"Quito",            wrong:["Guayaquil","Cuenca","Manta"] },
      { country:"Canadá",         flag:"🇨🇦", capital:"Ottawa",           wrong:["Toronto","Vancouver","Montreal"] },
      { country:"Cuba",           flag:"🇨🇺", capital:"La Habana",        wrong:["Santiago de Cuba","Camagüey","Holguín"] },
      { country:"Australia",      flag:"🇦🇺", capital:"Canberra",         wrong:["Sídney","Melbourne","Brisbane"] },
      { country:"Bolivia",        flag:"🇧🇴", capital:"Sucre",            wrong:["La Paz","Santa Cruz","Cochabamba"] },
      { country:"Uruguay",        flag:"🇺🇾", capital:"Montevideo",       wrong:["Salto","Paysandú","Las Piedras"] },
      { country:"Paraguay",       flag:"🇵🇾", capital:"Asunción",         wrong:["Ciudad del Este","San Lorenzo","Luque"] },
    ],
  },
  {
    id: "mundo", name: "Mundo", emoji: "🌏", unlockNeeded: 2,
    color: "from-orange-500 to-rose-600",
    gameBg: "from-orange-950 via-rose-950 to-orange-950",
    questions: [
      { country:"Japón",         flag:"🇯🇵", capital:"Tokio",        wrong:["Osaka","Kioto","Hiroshima"] },
      { country:"China",         flag:"🇨🇳", capital:"Pekín",        wrong:["Shanghái","Cantón","Nankín"] },
      { country:"India",         flag:"🇮🇳", capital:"Nueva Delhi",  wrong:["Bombay","Calcuta","Bangalore"] },
      { country:"Corea del Sur", flag:"🇰🇷", capital:"Seúl",         wrong:["Busan","Incheon","Daegu"] },
      { country:"Tailandia",     flag:"🇹🇭", capital:"Bangkok",      wrong:["Chiang Mai","Pattaya","Phuket"] },
      { country:"Egipto",        flag:"🇪🇬", capital:"El Cairo",     wrong:["Alejandría","Luxor","Asuán"] },
      { country:"Nigeria",       flag:"🇳🇬", capital:"Abuya",        wrong:["Lagos","Kano","Ibadán"] },
      { country:"Sudáfrica",     flag:"🇿🇦", capital:"Pretoria",     wrong:["Ciudad del Cabo","Johannesburgo","Durban"] },
      { country:"Kenia",         flag:"🇰🇪", capital:"Nairobi",      wrong:["Mombasa","Kisumu","Nakuru"] },
      { country:"Marruecos",     flag:"🇲🇦", capital:"Rabat",        wrong:["Casablanca","Marrakech","Fez"] },
      { country:"Arabia Saudí",  flag:"🇸🇦", capital:"Riad",         wrong:["Yeda","La Meca","Medina"] },
      { country:"Turquía",       flag:"🇹🇷", capital:"Ankara",       wrong:["Estambul","Izmir","Bursa"] },
      { country:"Rusia",         flag:"🇷🇺", capital:"Moscú",        wrong:["San Petersburgo","Kazán","Novosibirsk"] },
      { country:"Indonesia",     flag:"🇮🇩", capital:"Yakarta",      wrong:["Surabaya","Bandung","Medan"] },
      { country:"Filipinas",     flag:"🇵🇭", capital:"Manila",       wrong:["Cebú","Davao","Quezon"] },
    ],
  },
];

const QPR = 10;
const MAX_LIVES = 3;
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
function buildOptions(q) { return shuffle([q.capital, ...shuffle(q.wrong).slice(0, 3)]); }
function calcStars(correct, total) {
  const p = correct / total;
  return p >= 0.9 ? 3 : p >= 0.6 ? 2 : 1;
}
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── AUDIO ────────────────────────────────────────────────────────────────────
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
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function CapitalesDelMundo() {
  const [screen,      setScreen]      = useState("home");
  const [worldIdx,    setWorldIdx]    = useState(0);
  const [hofWorldIdx, setHofWorldIdx] = useState(0);
  const [questions,   setQuestions]   = useState([]);
  const [qIdx,        setQIdx]        = useState(0);
  const [opts,        setOpts]        = useState([]);
  const [lives,       setLives]       = useState(MAX_LIVES);
  const [score,       setScore]       = useState(0);
  const [streak,      setStreak]      = useState(0);
  const [hits,        setHits]        = useState(0);
  const [fb,          setFb]          = useState(null);
  const [chosen,      setChosen]      = useState(null);
  const [timer,       setTimer]       = useState(TIMER_SECS);
  const [muted,       setMuted]       = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [saved,       setSaved]       = useState(() => {
    try { return JSON.parse(localStorage.getItem("cap_v1") || "{}"); } catch { return {}; }
  });

  const timerRef    = useRef(null);
  const fbtRef      = useRef(null);
  const mutedRef    = useRef(false);
  const gameStartRef= useRef(null);
  // ref espejo del estado para evitar closures stale en el useEffect del timeout
  const stRef       = useRef({});
  stRef.current = { lives, qIdx, questions, hits, worldIdx, score, streak };

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

  const endGame = useCallback(() => {
    setElapsedTime(Math.round((Date.now() - gameStartRef.current) / 1000));
    setScreen("result");
  }, []);

  // Cuenta regresiva
  useEffect(() => {
    if (screen !== "game" || fb !== null) { clearInterval(timerRef.current); return; }
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timerRef.current);
  }, [screen, qIdx, fb]);

  // Pitido de urgencia
  useEffect(() => {
    if (screen === "game" && fb === null && timer > 0 && timer <= 5) play("tick");
  }, [timer, screen, fb, play]);

  // Tiempo agotado → fallo (usa stRef para evitar closures stale)
  useEffect(() => {
    if (screen !== "game" || timer !== 0 || fb !== null) return;
    clearInterval(timerRef.current);
    const { lives: l, qIdx: qi, questions: qs, hits: h, worldIdx: wi } = stRef.current;
    play("wrong");
    const nl = l - 1;
    setLives(nl); setStreak(0); setFb("time");
    fbtRef.current = setTimeout(() => {
      if (nl <= 0) { play("over"); endGame(); return; }
      const ni = qi + 1;
      if (ni >= qs.length) {
        play("finish");
        persist(WORLDS[wi].id, calcStars(h, QPR));
        endGame();
      } else {
        setQIdx(ni); setOpts(buildOptions(qs[ni]));
        setFb(null); setChosen(null); setTimer(TIMER_SECS);
      }
    }, 1400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, timer, fb]);

  useEffect(() => () => { clearInterval(timerRef.current); clearTimeout(fbtRef.current); }, []);

  // Iniciar partida
  const startGame = (idx) => {
    clearTimeout(fbtRef.current); clearInterval(timerRef.current);
    const qs = shuffle(WORLDS[idx].questions).slice(0, QPR);
    gameStartRef.current = Date.now();
    setWorldIdx(idx); setQuestions(qs); setQIdx(0);
    setOpts(buildOptions(qs[0])); setLives(MAX_LIVES);
    setScore(0); setStreak(0); setHits(0); setElapsedTime(0);
    setFb(null); setChosen(null); setTimer(TIMER_SECS);
    setScreen("game");
  };

  // Responder
  const answer = (opt) => {
    if (fb !== null) return;
    clearInterval(timerRef.current);
    setChosen(opt);
    const q  = questions[qIdx];
    const ok = opt === q.capital;
    const currentLives = ok ? lives       : lives - 1;
    const currentHits  = ok ? hits + 1   : hits;

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

    fbtRef.current = setTimeout(() => {
      if (!ok && currentLives <= 0) { play("over"); endGame(); return; }
      const ni = qIdx + 1;
      if (ni >= questions.length) {
        play("finish");
        persist(WORLDS[worldIdx].id, calcStars(currentHits, QPR));
        endGame();
      } else {
        setQIdx(ni); setOpts(buildOptions(questions[ni]));
        setFb(null); setChosen(null); setTimer(TIMER_SECS);
      }
    }, 1300);
  };

  const openHof = (idx) => { setHofWorldIdx(idx); setScreen("hof"); };

  const world = WORLDS[worldIdx];
  const q     = questions[qIdx];

  if (screen === "home")
    return <HomeScreen saved={saved} onStart={startGame} onHof={openHof}
                       muted={muted} onMute={() => setMuted(m => !m)} />;
  if (screen === "hof")
    return <HofScreen world={WORLDS[hofWorldIdx]} onBack={() => setScreen("home")} />;
  if (screen === "result")
    return (
      <ResultScreen
        world={world} score={score} hits={hits} total={questions.length}
        lives={lives} elapsedTime={elapsedTime} saved={saved}
        onReplay={() => startGame(worldIdx)}
        onHome={() => setScreen("home")}
        onHof={() => openHof(worldIdx)}
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
function HomeScreen({ saved, onStart, onHof, muted, onMute }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white">
      {/* Estrellas decorativas */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              width:   `${Math.random() * 2 + 1}px`,
              height:  `${Math.random() * 2 + 1}px`,
              top:     `${Math.random() * 100}%`,
              left:    `${Math.random() * 100}%`,
              opacity: Math.random() * 0.6 + 0.15,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-md px-4 py-8">
        {/* Nav superior */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/50 transition hover:text-white">
            <HomeIcon size={18} /><span className="text-sm">Inicio</span>
          </Link>
          <button onClick={onMute} className="text-white/50 transition hover:text-white">
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>

        {/* Cabecera */}
        <div className="mb-10 text-center">
          <div className="mb-3 text-7xl select-none">🚀</div>
          <h1 className="text-4xl font-black tracking-tight">Capitales del Mundo</h1>
          <p className="mt-3 text-white/60">¡Viaja por el planeta y descubre las capitales!</p>
        </div>

        {/* Mundos */}
        <div className="flex flex-col gap-4">
          {WORLDS.map((w, idx) => {
            const prev    = idx > 0 ? WORLDS[idx - 1] : null;
            const myStars = saved[w.id] || 0;
            const locked  = prev && (saved[prev.id] || 0) < w.unlockNeeded;
            return (
              <div key={w.id} className={`rounded-2xl border transition-all
                ${locked ? "border-white/5 bg-white/3 opacity-50" : "border-white/15 bg-white/5"}`}>
                <button
                  onClick={() => !locked && onStart(idx)}
                  disabled={!!locked}
                  className="flex w-full items-center gap-4 p-5 text-left"
                >
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl
                    bg-gradient-to-br ${w.color} text-3xl shadow-lg select-none`}>
                    {w.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-lg">{w.name}</span>
                      {locked && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
                          🔒 Necesitas ⭐⭐ en {prev?.name}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex gap-1">
                      {[1,2,3].map(s => (
                        <Star key={s} size={16}
                          className={s <= myStars ? "fill-yellow-400 text-yellow-400" : "text-white/20"} />
                      ))}
                    </div>
                  </div>
                  {!locked && <span className="text-white/40 text-xl">›</span>}
                </button>

                {/* Ver ranking */}
                {HAS_SUPA && !locked && (
                  <div className="border-t border-white/10 px-5 pb-3">
                    <button
                      onClick={() => onHof(idx)}
                      className="flex items-center gap-1.5 text-xs text-yellow-400/80 hover:text-yellow-300 transition"
                    >
                      <Trophy size={13} /> Ver ranking
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-white/30">
          10 preguntas · 3 vidas · 15 s por pregunta
        </p>
      </div>
    </div>
  );
}

// ─── PANTALLA JUEGO ───────────────────────────────────────────────────────────
function GameScreen({ world, q, opts, lives, score, streak, fb, chosen, timer, qIdx, total, onAnswer, muted, onMute }) {
  const pct   = (timer / TIMER_SECS) * 100;
  const tColor = timer <= 5 ? "bg-red-500" : timer <= 9 ? "bg-yellow-400" : "bg-emerald-400";

  function optClass(opt) {
    const base = "w-full rounded-2xl border px-4 py-5 text-center font-bold text-base transition-all active:scale-95 select-none";
    if (fb === null)
      return `${base} border-white/15 bg-white/8 hover:bg-white/15 hover:border-white/25`;
    if (opt === q.capital)
      return `${base} border-green-400/70 bg-green-500/25 text-green-200`;
    if (opt === chosen && fb === "ko")
      return `${base} border-red-400/70 bg-red-500/25 text-red-300`;
    return `${base} border-white/5 bg-white/3 opacity-30`;
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b ${world.gameBg} p-4 text-white`}>
      <div className="mx-auto flex max-w-md flex-col gap-4">

        {/* Barra superior */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-1">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <span key={i} className={`text-2xl transition-all ${i < lives ? "" : "opacity-15 grayscale"}`}>❤️</span>
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
          <div className={`h-full ${tColor} transition-all duration-1000 ease-linear ${timer <= 5 ? "animate-pulse" : ""}`}
            style={{ width: `${pct}%` }} />
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
        <div className={`rounded-3xl border p-8 text-center transition-all duration-300
          ${fb === "ok"               ? "border-green-400/50 bg-green-500/10"  : ""}
          ${fb === "ko" || fb==="time"? "border-red-400/50   bg-red-500/10"    : ""}
          ${fb === null               ? "border-white/10     bg-white/5"        : ""}`}>
          <div className="mb-2 text-8xl leading-none select-none">{q.flag}</div>
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
                La capital es <span className="font-black text-white">{q.capital}</span>
              </div>
            </div>
          )}
        </div>

        {/* Opciones */}
        <div className="grid grid-cols-2 gap-3">
          {opts.map(opt => (
            <button key={opt} onClick={() => onAnswer(opt)} disabled={fb !== null} className={optClass(opt)}>
              {opt}
            </button>
          ))}
        </div>

        <div className="py-2 text-center text-2xl opacity-20 select-none">🚀</div>
      </div>
    </div>
  );
}

// ─── PANTALLA RESULTADO ───────────────────────────────────────────────────────
function ResultScreen({ world, score, hits, total, lives, elapsedTime, saved, onReplay, onHome, onHof }) {
  const stars  = calcStars(hits, total);
  const won    = lives > 0;
  const wIdx   = WORLDS.findIndex(w => w.id === world.id);
  const nextW  = WORLDS[wIdx + 1];
  const justUnlocked = nextW && stars >= 2 && (saved[world.id] || 0) >= 2;

  const [nameInput,   setNameInput]   = useState("");
  const [submitState, setSubmitState] = useState("idle"); // idle|submitting|done|error
  const [rankings,    setRankings]    = useState([]);
  const [myScore,     setMyScore]     = useState(null);

  const handleSave = async () => {
    const name = nameInput.trim();
    if (!name) return;
    setSubmitState("submitting");
    try {
      await saveScore(world.id, name, score, elapsedTime);
      const data = await fetchRankings(world.id);
      setRankings(data);
      setMyScore({ name, score, time_seconds: elapsedTime });
      setSubmitState("done");
    } catch (_) {
      setSubmitState("error");
    }
  };

  const MEDAL = ["🥇","🥈","🥉"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-4 text-white">
      <div className="mx-auto w-full max-w-md">
        {/* Cabecera resultado */}
        <div className="mb-6 pt-4 text-center">
          <div className="text-7xl">{won ? "🎉" : "😢"}</div>
          <h1 className="mt-3 text-3xl font-black">{won ? "¡Completado!" : "¡Sin vidas!"}</h1>
        </div>

        {/* Estrellas */}
        <div className="mb-6 flex justify-center gap-4">
          {[1,2,3].map(s => (
            <Star key={s} size={52}
              className={s <= stars
                ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]"
                : "text-white/15"}
            />
          ))}
        </div>

        {/* Stats */}
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <div className="text-5xl font-black text-yellow-400">⭐ {score}</div>
          <div className="mt-2 text-white/70 text-lg">{hits} de {total} capitales correctas</div>
          <div className="mt-1 flex items-center justify-center gap-3 text-sm text-white/40">
            <span>{Math.round((hits/total)*100)}% aciertos</span>
            <span>·</span>
            <span>⏱ {formatTime(elapsedTime)}</span>
          </div>
        </div>

        {/* Desbloqueo */}
        {justUnlocked && nextW && (
          <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
            <div className="text-2xl">🔓</div>
            <p className="mt-1 font-bold text-yellow-300">¡Has desbloqueado {nextW.emoji} {nextW.name}!</p>
          </div>
        )}

        {/* Mensaje motivador */}
        <p className="mb-5 text-center font-semibold text-sm
          {stars===3?'text-emerald-400':stars===2?'text-blue-300':'text-orange-300'}">
          {stars===3 && "¡Eres un genio de la geografía! 🌟"}
          {stars===2 && "¡Muy bien! Sigue practicando 💪"}
          {stars===1 && "¡Vuelve a intentarlo y mejorarás! 📚"}
        </p>

        {/* ── Ranking section ── */}
        {HAS_SUPA && (
          <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-5">
            {submitState === "idle" && (
              <>
                <p className="mb-3 text-center font-bold text-white/80">¿Cómo te llamas?</p>
                <input
                  type="text"
                  maxLength={20}
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSave()}
                  placeholder="Tu nombre..."
                  className="mb-3 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3
                    text-center text-white placeholder-white/30 outline-none
                    focus:border-yellow-400/60 focus:bg-white/15"
                />
                <button
                  onClick={handleSave}
                  disabled={!nameInput.trim()}
                  className={`w-full rounded-xl py-3 font-bold transition-all active:scale-95
                    ${nameInput.trim()
                      ? `bg-gradient-to-r ${world.color} shadow-lg`
                      : "bg-white/10 text-white/30 cursor-not-allowed"}`}
                >
                  🏆 Guardar en el ranking
                </button>
                <button onClick={onHof}
                  className="mt-2 w-full py-2 text-sm text-white/40 hover:text-white/70 transition">
                  Ver ranking sin guardar →
                </button>
              </>
            )}

            {submitState === "submitting" && (
              <div className="py-4 text-center text-white/60 animate-pulse">Guardando…</div>
            )}

            {submitState === "error" && (
              <div className="py-4 text-center text-red-400">
                Error al guardar. ¿Tienes conexión?
                <button onClick={() => setSubmitState("idle")}
                  className="ml-2 underline text-white/60">Reintentar</button>
              </div>
            )}

            {submitState === "done" && (
              <>
                <h3 className="mb-3 text-center font-black text-yellow-400">
                  🏆 Top {world.name}
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/40 text-xs">
                      <th className="pb-2 text-left">#</th>
                      <th className="pb-2 text-left">Jugador</th>
                      <th className="pb-2 text-right">⭐</th>
                      <th className="pb-2 text-right">⏱</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((r, i) => {
                      const isMe = myScore &&
                        r.player_name === myScore.name &&
                        r.score === myScore.score &&
                        r.time_seconds === myScore.time_seconds;
                      return (
                        <tr key={i}
                          className={`border-t border-white/5 ${isMe ? "text-yellow-300 font-bold" : "text-white/80"}`}>
                          <td className="py-2 pr-2">{MEDAL[i] ?? `${i+1}.`}</td>
                          <td className="py-2 truncate max-w-[120px]">{r.player_name}</td>
                          <td className="py-2 text-right">{r.score}</td>
                          <td className="py-2 text-right">{formatTime(r.time_seconds)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <button onClick={onHof}
                  className="mt-4 flex items-center justify-center gap-1.5 w-full text-xs text-yellow-400/70 hover:text-yellow-300 transition">
                  <Trophy size={13}/> Ver ranking completo
                </button>
              </>
            )}
          </div>
        )}

        {/* Botones */}
        <div className="flex flex-col gap-3">
          <button onClick={onReplay}
            className={`rounded-2xl bg-gradient-to-r ${world.color} p-4 text-lg font-bold shadow-lg active:scale-95 transition-transform`}>
            🔄 Jugar otra vez
          </button>
          <button onClick={onHome}
            className="rounded-2xl border border-white/20 bg-white/5 p-4 font-bold active:scale-95 transition-transform">
            🌍 Elegir mundo
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HALL OF FAME ─────────────────────────────────────────────────────────────
function HofScreen({ world, onBack }) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    setLoading(true); setError(false);
    fetchRankings(world.id)
      .then(data => { setRows(data); setLoading(false); })
      .catch(()  => { setError(true); setLoading(false); });
  }, [world.id]);

  const MEDAL = ["🥇","🥈","🥉"];

  return (
    <div className={`min-h-screen bg-gradient-to-b ${world.gameBg} p-4 text-white`}>
      <div className="mx-auto max-w-md">
        {/* Cabecera */}
        <div className="mb-6 flex items-center gap-3 pt-2">
          <button onClick={onBack}
            className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold
              hover:bg-white/20 active:scale-95 transition-all">
            ← Volver
          </button>
          <div className="flex-1 text-center">
            <span className="text-2xl">{world.emoji}</span>
            <span className="ml-2 font-black text-xl">{world.name}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Trophy size={22} className="text-yellow-400" />
            <h2 className="font-black text-xl text-yellow-400">Hall of Fame</h2>
            <Trophy size={22} className="text-yellow-400" />
          </div>

          {loading && (
            <div className="py-10 text-center text-white/50 animate-pulse">Cargando ranking…</div>
          )}

          {error && (
            <div className="py-10 text-center text-red-400">
              Error al cargar el ranking.<br />
              <span className="text-white/40 text-sm">Comprueba tu conexión</span>
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div className="py-10 text-center text-white/50">
              <div className="text-4xl mb-3">🏜️</div>
              Aún no hay puntuaciones.<br />
              <span className="text-sm text-white/40">¡Sé el primero en entrar!</span>
            </div>
          )}

          {!loading && !error && rows.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-white/40">
                  <th className="pb-3 text-left">#</th>
                  <th className="pb-3 text-left">Jugador</th>
                  <th className="pb-3 text-right">Puntos</th>
                  <th className="pb-3 text-right">Tiempo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}
                    className={`border-t border-white/10 text-sm
                      ${i === 0 ? "text-yellow-300" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-300" : "text-white/75"}`}>
                    <td className="py-3 pr-3 text-lg">{MEDAL[i] ?? `${i+1}.`}</td>
                    <td className="py-3 font-bold truncate max-w-[140px]">{r.player_name}</td>
                    <td className="py-3 text-right font-bold">⭐ {r.score}</td>
                    <td className="py-3 text-right text-white/60">⏱ {formatTime(r.time_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/30">
          Ordenado por puntos · desempate por tiempo más corto
        </p>
      </div>
    </div>
  );
}
