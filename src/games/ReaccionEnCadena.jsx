import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Home as HomeIcon, Trophy, Volume2, VolumeX, Shield, Crosshair, Sparkles, Skull } from "lucide-react";

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
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

const GAME_SECS = 45;
const BASE_TTL = 1600;
const MIN_TTL = 550;
const TTL_STEP = 70;

const MODES = [
  {
    id: "clasico",
    title: "Clásico",
    emoji: "⚡",
    desc: "Ronda de 45 segundos con combo y dificultad creciente.",
    icon: Sparkles,
    color: "from-fuchsia-500 to-purple-700",
    hasLives: false,
    zen: false,
    trapChance: 0,
    sizeFactor: 1,
    rankingId: "reaccion_clasico",
  },
  {
    id: "precision",
    title: "Precisión",
    emoji: "🎯",
    desc: "Objetivos más pequeños para probar tu puntería.",
    icon: Crosshair,
    color: "from-sky-500 to-cyan-700",
    hasLives: false,
    zen: false,
    trapChance: 0,
    sizeFactor: 0.72,
    rankingId: "reaccion_precision",
  },
  {
    id: "supervivencia",
    title: "Supervivencia",
    emoji: "🛡️",
    desc: "Solo tienes 3 vidas. Cada fallo duele.",
    icon: Shield,
    color: "from-emerald-500 to-teal-700",
    hasLives: true,
    zen: false,
    trapChance: 0,
    sizeFactor: 1,
    rankingId: "reaccion_supervivencia",
  },
  {
    id: "zen",
    title: "Zen",
    emoji: "🧘",
    desc: "Sin límite de tiempo global. Juega 20 objetivos a tu ritmo.",
    icon: Volume2,
    color: "from-amber-500 to-orange-700",
    hasLives: false,
    zen: true,
    trapChance: 0,
    sizeFactor: 0.92,
    rankingId: "reaccion_zen",
  },
  {
    id: "trampa",
    title: "Objetivos trampa",
    emoji: "💣",
    desc: "Algunos objetivos restan puntos si los tocas.",
    icon: Skull,
    color: "from-rose-500 to-red-700",
    hasLives: false,
    zen: false,
    trapChance: 0.3,
    sizeFactor: 1,
    rankingId: "reaccion_trampa",
  },
];

function randomTarget(ttl, mode, idx, currentScore) {
  const size = Math.round((56 + Math.random() * 44) * mode.sizeFactor);
  const safeX = Math.max(4, 96 - (size / 3));
  const safeY = Math.max(8, 82 - (size / 2.8));
  const x = Math.random() * safeX;
  const y = Math.random() * safeY;
  const trap = mode.trapChance > 0 && Math.random() < mode.trapChance;

  return {
    id: `${Date.now()}-${idx}-${currentScore}`,
    x,
    y,
    size,
    trap,
    ttl,
  };
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ReaccionEnCadena() {
  const [screen, setScreen] = useState("home");
  const [mode, setMode] = useState(MODES[0]);
  const [target, setTarget] = useState(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [fails, setFails] = useState(0);
  const [lives, setLives] = useState(3);
  const [ttl, setTtl] = useState(BASE_TTL);
  const [timeLeft, setTimeLeft] = useState(GAME_SECS);
  const [elapsed, setElapsed] = useState(0);
  const [zenGoalLeft, setZenGoalLeft] = useState(20);
  const [muted, setMuted] = useState(false);

  const [hofMode, setHofMode] = useState(MODES[0]);

  const timerRef = useRef(null);
  const lifeRef = useRef(null);
  const targetCounterRef = useRef(0);
  const startRef = useRef(0);

  const accuracy = useMemo(() => {
    const total = hits + fails;
    return total === 0 ? 0 : Math.round((hits / total) * 100);
  }, [hits, fails]);

  useEffect(() => {
    if (screen !== "game") return;

    if (!mode.zen) {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            endRun();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, mode.id]);

  useEffect(() => {
    return () => {
      clearTimeout(lifeRef.current);
      clearInterval(timerRef.current);
    };
  }, []);

  const spawnTarget = (baseMode, currentScore = score) => {
    const nextTtl = Math.max(MIN_TTL, BASE_TTL - Math.floor(currentScore / 10) * TTL_STEP);
    setTtl(nextTtl);
    targetCounterRef.current += 1;
    setTarget(randomTarget(nextTtl, baseMode, targetCounterRef.current, currentScore));

    clearTimeout(lifeRef.current);
    lifeRef.current = setTimeout(() => {
      setFails((f) => f + 1);
      setCombo(0);

      if (baseMode.hasLives) {
        setLives((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            endRun();
            return 0;
          }
          return next;
        });
      }

      if (baseMode.zen) {
        setZenGoalLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            endRun();
            return 0;
          }
          return next;
        });
      }

      spawnTarget(baseMode, currentScore);
    }, nextTtl);
  };

  const startGame = (selectedMode) => {
    clearTimeout(lifeRef.current);
    clearInterval(timerRef.current);

    setMode(selectedMode);
    setScore(0);
    setCombo(0);
    setHits(0);
    setFails(0);
    setLives(3);
    setTtl(BASE_TTL);
    setTimeLeft(GAME_SECS);
    setElapsed(0);
    setZenGoalLeft(20);
    setScreen("game");
    targetCounterRef.current = 0;
    startRef.current = Date.now();
    spawnTarget(selectedMode, 0);
  };

  const endRun = () => {
    clearTimeout(lifeRef.current);
    clearInterval(timerRef.current);
    setElapsed(Math.round((Date.now() - startRef.current) / 1000));
    setScreen("result");
  };

  const hitTarget = () => {
    if (!target) return;

    if (target.trap) {
      setScore((s) => Math.max(0, s - 8));
      setFails((f) => f + 1);
      setCombo(0);
    } else {
      setHits((h) => h + 1);
      setCombo((c) => {
        const next = c + 1;
        setScore((s) => s + 10 + (next >= 3 ? 6 : 0));
        return next;
      });

      if (mode.zen) {
        setZenGoalLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            endRun();
            return 0;
          }
          return next;
        });
      }
    }

    spawnTarget(mode, target.trap ? Math.max(0, score - 8) : score + 10);
  };

  const openHof = (m) => {
    setHofMode(m);
    setScreen("hof");
  };

  if (screen === "home") {
    return (
      <HomeScreen
        modes={MODES}
        onStart={startGame}
        onHof={openHof}
        hasSupa={HAS_SUPA}
        muted={muted}
        onMute={() => setMuted((m) => !m)}
      />
    );
  }

  if (screen === "hof") {
    return <HofScreen mode={hofMode} onBack={() => setScreen("home")} />;
  }

  if (screen === "result") {
    return (
      <ResultScreen
        mode={mode}
        score={score}
        combo={combo}
        hits={hits}
        fails={fails}
        lives={lives}
        elapsed={elapsed}
        accuracy={accuracy}
        hasSupa={HAS_SUPA}
        onReplay={() => startGame(mode)}
        onHome={() => setScreen("home")}
        onHof={() => openHof(mode)}
      />
    );
  }

  return (
    <GameScreen
      mode={mode}
      target={target}
      score={score}
      combo={combo}
      lives={lives}
      ttl={ttl}
      timeLeft={timeLeft}
      zenGoalLeft={zenGoalLeft}
      muted={muted}
      onMute={() => setMuted((m) => !m)}
      onHit={hitTarget}
    />
  );
}

function HomeScreen({ modes, onStart, onHof, hasSupa, muted, onMute }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-purple-950 to-zinc-950 p-4 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/60 hover:text-white">
            <HomeIcon size={18} /> Inicio
          </Link>
          <button onClick={onMute} className="text-white/60 hover:text-white">
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>

        <div className="mb-8 text-center">
          <div className="text-7xl">🎯</div>
          <h1 className="text-4xl font-black">Reacción en cadena</h1>
          <p className="mt-2 text-white/60">Elige variante y toca el objetivo antes de que desaparezca.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {modes.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <div className={`rounded-xl bg-gradient-to-br ${m.color} p-2`}><Icon size={18} /></div>
                  <h2 className="font-black">{m.emoji} {m.title}</h2>
                </div>
                <p className="mb-4 text-sm text-white/60">{m.desc}</p>
                <button
                  onClick={() => onStart(m)}
                  className={`mb-2 w-full rounded-xl bg-gradient-to-r ${m.color} px-4 py-2 font-bold`}
                >
                  Jugar
                </button>
                {hasSupa && (
                  <button
                    onClick={() => onHof(m)}
                    className="w-full text-xs text-yellow-400/80 hover:text-yellow-300"
                  >
                    🏆 Ver ranking
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GameScreen({ mode, target, score, combo, lives, ttl, timeLeft, zenGoalLeft, muted, onMute, onHit }) {
  return (
    <div className={`relative min-h-screen overflow-hidden bg-gradient-to-b ${mode.color} p-4 text-white`}>
      <div className="relative z-10 mx-auto flex max-w-4xl items-center justify-between rounded-xl bg-black/25 px-4 py-2">
        <div className="font-bold">⭐ {score}</div>
        <div className="text-sm opacity-90">{mode.emoji} {mode.title}</div>
        <button onClick={onMute}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
      </div>

      <div className="relative z-10 mx-auto mt-3 flex max-w-4xl flex-wrap items-center justify-center gap-4 text-sm">
        {!mode.zen ? <span>⏳ {timeLeft}s</span> : <span>🧘 Objetivos restantes: {zenGoalLeft}</span>}
        <span>🔥 Combo: {combo}</span>
        <span>⚡ Velocidad: {Math.round(2200 - ttl)} pts</span>
        {mode.hasLives && <span>❤️ {lives}</span>}
      </div>

      <div className="absolute inset-0">
        {target && (
          <button
            onClick={onHit}
            className={`absolute rounded-full border-4 text-2xl transition-transform active:scale-90
              ${target.trap ? "border-red-300 bg-red-500/80" : "border-white/80 bg-white/20 backdrop-blur"}`}
            style={{
              width: `${target.size}px`,
              height: `${target.size}px`,
              left: `${target.x}%`,
              top: `${target.y}%`,
            }}
          >
            {target.trap ? "☠️" : "🎯"}
          </button>
        )}
      </div>
    </div>
  );
}

function ResultScreen({ mode, score, combo, hits, fails, lives, elapsed, accuracy, hasSupa, onReplay, onHome, onHof }) {
  const [nameInput, setNameInput] = useState("");
  const [submitState, setSubmitState] = useState("idle");
  const [rows, setRows] = useState([]);

  const handleSave = async () => {
    const name = nameInput.trim();
    if (!name) return;
    setSubmitState("saving");
    try {
      await saveScore(mode.rankingId, name, score, elapsed);
      const data = await fetchRankings(mode.rankingId);
      setRows(data);
      setSubmitState("done");
    } catch {
      setSubmitState("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-4 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <div className="text-6xl">🏁</div>
          <h1 className="mt-2 text-3xl font-black">Fin de la partida</h1>
          <p className="text-white/60">{mode.emoji} {mode.title}</p>
        </div>

        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <div className="text-5xl font-black text-yellow-400">⭐ {score}</div>
          <div className="mt-2 text-sm text-white/70">Aciertos: {hits} · Fallos: {fails}</div>
          <div className="mt-1 text-sm text-white/60">Precisión: {accuracy}% · Tiempo: {formatTime(elapsed)}</div>
          {mode.hasLives && <div className="mt-1 text-sm text-white/60">Vidas restantes: {lives}</div>}
          <div className="mt-1 text-sm text-white/60">Combo final: x{combo}</div>
        </div>

        {hasSupa && (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            {submitState === "idle" && (
              <>
                <p className="mb-2 text-center text-sm text-white/80">Guarda tu puntuación</p>
                <input
                  type="text"
                  maxLength={20}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  className="mb-2 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-center"
                  placeholder="Tu nombre"
                />
                <button
                  onClick={handleSave}
                  disabled={!nameInput.trim()}
                  className={`w-full rounded-xl bg-gradient-to-r ${mode.color} py-2 font-bold disabled:opacity-40`}
                >
                  Guardar en ranking
                </button>
              </>
            )}
            {submitState === "saving" && <p className="text-center text-white/60">Guardando...</p>}
            {submitState === "error" && <p className="text-center text-red-300">No se pudo guardar.</p>}
            {submitState === "done" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40">
                    <th className="pb-2 text-left">#</th>
                    <th className="pb-2 text-left">Jugador</th>
                    <th className="pb-2 text-right">⭐</th>
                    <th className="pb-2 text-right">⏱</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={`${row.player_name}-${i}`} className="border-t border-white/10">
                      <td className="py-2">{i + 1}</td>
                      <td className="py-2 truncate max-w-[120px]">{row.player_name}</td>
                      <td className="py-2 text-right">{row.score}</td>
                      <td className="py-2 text-right">{formatTime(row.time_seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button onClick={onReplay} className={`rounded-xl bg-gradient-to-r ${mode.color} py-3 font-bold`}>
            🔄 Jugar otra vez
          </button>
          <button onClick={onHof} className="rounded-xl border border-white/20 bg-white/5 py-3 font-bold">
            🏆 Ver ranking
          </button>
          <button onClick={onHome} className="rounded-xl border border-white/20 bg-white/5 py-3">
            Volver al selector
          </button>
        </div>
      </div>
    </div>
  );
}

function HofScreen({ mode, onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchRankings(mode.rankingId)
      .then((data) => {
        if (!active) return;
        setRows(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
        setError(true);
      });
    return () => {
      active = false;
    };
  }, [mode.rankingId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-4 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={onBack} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm">← Volver</button>
          <h2 className="font-black">🏆 Ranking · {mode.title}</h2>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          {loading && <p className="py-8 text-center text-white/50">Cargando...</p>}
          {error && <p className="py-8 text-center text-red-300">No se pudo cargar el ranking.</p>}
          {!loading && !error && rows.length === 0 && <p className="py-8 text-center text-white/50">Aún no hay puntuaciones.</p>}

          {!loading && !error && rows.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40">
                  <th className="pb-2 text-left">#</th>
                  <th className="pb-2 text-left">Jugador</th>
                  <th className="pb-2 text-right">⭐</th>
                  <th className="pb-2 text-right">⏱</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`${row.player_name}-${i}`} className="border-t border-white/10">
                    <td className="py-2">{i + 1}</td>
                    <td className="py-2 truncate max-w-[120px]">{row.player_name}</td>
                    <td className="py-2 text-right">{row.score}</td>
                    <td className="py-2 text-right">{formatTime(row.time_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
