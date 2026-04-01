import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bike,
  Trophy,
  Trees,
  RotateCcw,
  MapPin,
  Play,
  Pause,
} from "lucide-react";

const LANES = [18, 50, 82];
const TRACK_HEIGHT = 520;
const PLAYER_Y = 400;
const GAME_DURATION_HINT = "Endless runner";

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function createObstacle(id, speedBoost = 0) {
  const types = [
    { kind: "caja", emoji: "📦" },
    { kind: "naranjas", emoji: "🍊" },
    { kind: "cono", emoji: "🚧" },
    { kind: "ramas", emoji: "🌿" },
  ];
  const picked = types[rand(0, types.length - 1)];
  return {
    id,
    lane: rand(0, 2),
    y: -60,
    size: rand(34, 44),
    speed: rand(4, 6) + speedBoost,
    ...picked,
  };
}

function createBoost(id) {
  const types = [
    { kind: "limonada", emoji: "🥤" },
    { kind: "campana", emoji: "🔔" },
    { kind: "estrella", emoji: "⭐" },
  ];
  const picked = types[rand(0, types.length - 1)];
  return {
    id,
    lane: rand(0, 2),
    y: -60,
    size: 32,
    speed: rand(4, 6),
    ...picked,
  };
}

function SantaCruzBackdrop({ offset }) {
  const stripes = useMemo(() => new Array(12).fill(0), []);
  return (
    <div className="absolute inset-0 overflow-hidden rounded-3xl bg-sky-300">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-200 to-sky-300" />
      <div className="absolute inset-x-0 top-16 h-24 bg-green-500/80" />
      <div className="absolute inset-x-0 bottom-0 h-[76%] bg-orange-300" />

      <div className="absolute inset-x-0 top-24 flex justify-between px-4 text-white/90 text-xs sm:text-sm font-semibold">
        <span className="rounded-full bg-black/20 px-3 py-1">
          Santa Cruz · Murcia
        </span>
        <span className="rounded-full bg-black/20 px-3 py-1">
          Vereda Jesús Rosa
        </span>
      </div>

      {stripes.map((_, i) => {
        const y = ((i * 90 + offset) % (TRACK_HEIGHT + 90)) - 60;
        return (
          <div key={i} className="absolute inset-x-0" style={{ top: y }}>
            <div className="mx-auto flex w-[92%] items-center justify-between text-xl opacity-80">
              <span>🌴</span>
              <span>🪻</span>
              <span>🌾</span>
              <span>🏡</span>
              <span>🌴</span>
            </div>
          </div>
        );
      })}

      <div className="absolute inset-y-0 left-[10%] w-1 bg-white/60" />
      <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-white/60" />
      <div className="absolute inset-y-0 right-[10%] w-1 bg-white/60" />

      <div className="absolute bottom-20 left-3 rounded-2xl bg-emerald-900/80 px-3 py-2 text-white shadow-lg">
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <MapPin size={16} /> Acequia de Santa Cruz
        </div>
      </div>
      <div className="absolute top-36 right-3 rounded-2xl bg-emerald-900/80 px-3 py-2 text-white shadow-lg">
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <Trees size={16} /> Huerta murciana
        </div>
      </div>
    </div>
  );
}

export default function CarreraVeredaJesusRosa() {
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lane, setLane] = useState(1);
  const [jumping, setJumping] = useState(false);
  const [obstacles, setObstacles] = useState([]);
  const [boosts, setBoosts] = useState([]);
  const [distance, setDistance] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [backdropOffset, setBackdropOffset] = useState(0);
  const [flash, setFlash] = useState(false);

  const nextId = useRef(1);
  const frameRef = useRef(null);
  const obstacleSpawnRef = useRef(0);
  const boostSpawnRef = useRef(0);
  const invincibleRef = useRef(0);
  const jumpTimeoutRef = useRef(null);
  const distanceRef = useRef(0);
  const livesRef = useRef(3);

  useEffect(() => {
    const stored = window.localStorage.getItem("carrera-vereda-best");
    if (stored) setBest(Number(stored));
  }, []);

  useEffect(() => {
    distanceRef.current = distance;
  }, [distance]);

  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  const resetGame = () => {
    setLane(1);
    setJumping(false);
    setObstacles([]);
    setBoosts([]);
    setDistance(0);
    setLives(3);
    setGameOver(false);
    setFlash(false);
    setBackdropOffset(0);
    obstacleSpawnRef.current = 0;
    boostSpawnRef.current = 0;
    invincibleRef.current = 0;
    distanceRef.current = 0;
    livesRef.current = 3;
  };

  const startGame = () => {
    resetGame();
    setStarted(true);
    setPaused(false);
  };

  const endGame = () => {
    setGameOver(true);
    setStarted(false);
    setPaused(false);
    setBest((prev) => {
      const next = Math.max(prev, Math.floor(distanceRef.current));
      window.localStorage.setItem("carrera-vereda-best", String(next));
      return next;
    });
  };

  const moveLeft = () => setLane((prev) => clamp(prev - 1, 0, 2));
  const moveRight = () => setLane((prev) => clamp(prev + 1, 0, 2));
  const jump = () => {
    if (jumping || gameOver) return;
    setJumping(true);
    window.clearTimeout(jumpTimeoutRef.current);
    jumpTimeoutRef.current = window.setTimeout(
      () => setJumping(false),
      650
    );
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") moveLeft();
      if (e.key === "ArrowRight") moveRight();
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        jump();
      }
      if (e.key.toLowerCase() === "p" && started) setPaused((p) => !p);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [jumping, started, gameOver]);

  useEffect(() => {
    if (!started || paused || gameOver) {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      return;
    }

    let lastTime = performance.now();

    const loop = (time) => {
      const delta = Math.min(32, time - lastTime);
      lastTime = time;
      const diff = delta / 16.67;
      const difficulty = Math.min(4.2, 1 + distanceRef.current / 450);

      obstacleSpawnRef.current += delta;
      boostSpawnRef.current += delta;
      invincibleRef.current = Math.max(0, invincibleRef.current - delta);

      if (
        obstacleSpawnRef.current >
        Math.max(340, 900 - distanceRef.current)
      ) {
        obstacleSpawnRef.current = 0;
        setObstacles((prev) => [
          ...prev,
          createObstacle(nextId.current++, difficulty),
        ]);
      }

      if (boostSpawnRef.current > 2400) {
        boostSpawnRef.current = 0;
        setBoosts((prev) => [...prev, createBoost(nextId.current++)]);
      }

      setBackdropOffset((prev) => (prev + 10 * diff * difficulty) % 90);
      setDistance((prev) => prev + 0.9 * diff * difficulty);

      setObstacles((prev) =>
        prev
          .map((o) => ({ ...o, y: o.y + o.speed * diff * difficulty }))
          .filter((o) => o.y < TRACK_HEIGHT + 60)
      );

      setBoosts((prev) =>
        prev
          .map((b) => ({ ...b, y: b.y + b.speed * diff * difficulty }))
          .filter((b) => b.y < TRACK_HEIGHT + 60)
      );

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [started, paused, gameOver]);

  useEffect(() => {
    if (!started || paused || gameOver) return;

    const playerLane = lane;
    const collisionBandTop = PLAYER_Y - (jumping ? 45 : 10);
    const collisionBandBottom = PLAYER_Y + 45;

    obstacles.forEach((o) => {
      const sameLane = o.lane === playerLane;
      const overlaps =
        o.y + o.size > collisionBandTop && o.y < collisionBandBottom;
      if (sameLane && overlaps && !jumping && invincibleRef.current <= 0) {
        invincibleRef.current = 1100;
        setFlash(true);
        window.setTimeout(() => setFlash(false), 180);
        setLives((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            window.setTimeout(() => endGame(), 50);
            return 0;
          }
          return next;
        });
        setObstacles((prev) => prev.filter((item) => item.id !== o.id));
      }
    });

    boosts.forEach((b) => {
      const sameLane = b.lane === playerLane;
      const overlaps =
        b.y + b.size > collisionBandTop && b.y < collisionBandBottom;
      if (sameLane && overlaps) {
        setDistance((prev) => prev + 35);
        setBoosts((prev) => prev.filter((item) => item.id !== b.id));
      }
    });
  }, [obstacles, boosts, lane, jumping, started, paused, gameOver]);

  const playerLeft = `${LANES[lane]}%`;
  const playerJumpOffset = jumping ? -58 : 0;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-stone-950 via-stone-900 to-emerald-950 p-4 text-white sm:p-6">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Carrera Vereda Jesús Rosa
              </h1>
              <p className="mt-1 text-sm text-white/70">
                Carrera arcade ambientada en Santa Cruz, Murcia.
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-200">
              <Bike size={28} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs sm:text-sm">
            <div className="rounded-2xl bg-black/25 p-2">
              <div className="text-white/60">Distancia</div>
              <div className="text-lg font-bold">
                {Math.floor(distance)} m
              </div>
            </div>
            <div className="rounded-2xl bg-black/25 p-2">
              <div className="text-white/60">Récord</div>
              <div className="text-lg font-bold">{best} m</div>
            </div>
            <div className="rounded-2xl bg-black/25 p-2">
              <div className="text-white/60">Vidas</div>
              <div className="text-lg font-bold">
                {"❤".repeat(lives)}
                {lives === 0 ? "0" : ""}
              </div>
            </div>
            <div className="rounded-2xl bg-black/25 p-2">
              <div className="text-white/60">Modo</div>
              <div className="text-lg font-bold">{GAME_DURATION_HINT}</div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl">
          <div className="relative h-[520px] w-full select-none touch-manipulation overflow-hidden">
            <SantaCruzBackdrop offset={backdropOffset} />

            <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-black/30 px-4 py-3 backdrop-blur-sm">
              <div className="text-sm font-semibold">
                Meta: aguanta y suma metros
              </div>
              <div className="text-sm text-white/80">
                Dificultad:{" "}
                {distance < 250
                  ? "Huertano"
                  : distance < 600
                    ? "Acequia"
                    : "Vereda turbo"}
              </div>
            </div>

            {obstacles.map((o) => (
              <div
                key={o.id}
                className="absolute z-20 flex -translate-x-1/2 items-center justify-center rounded-2xl bg-black/20 text-2xl shadow-lg"
                style={{
                  left: `${LANES[o.lane]}%`,
                  top: o.y,
                  width: o.size,
                  height: o.size,
                }}
                title={o.kind}
              >
                {o.emoji}
              </div>
            ))}

            {boosts.map((b) => (
              <div
                key={b.id}
                className="absolute z-20 flex -translate-x-1/2 items-center justify-center rounded-full bg-yellow-300/85 text-xl shadow-lg"
                style={{
                  left: `${LANES[b.lane]}%`,
                  top: b.y,
                  width: b.size,
                  height: b.size,
                }}
                title={b.kind}
              >
                {b.emoji}
              </div>
            ))}

            <div
              className={`absolute z-30 -translate-x-1/2 transition-all duration-150 ${flash ? "scale-110" : ""}`}
              style={{
                left: playerLeft,
                top: PLAYER_Y + playerJumpOffset,
              }}
            >
              <div className="relative flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-x-2 bottom-0 h-3 rounded-full bg-black/25 blur-md" />
                <div className="text-5xl">🚴</div>
              </div>
            </div>

            {jumping && (
              <div className="absolute left-1/2 top-[320px] z-30 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                Saltando sobre la vereda
              </div>
            )}

            {(!started || gameOver) && (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/65 p-6 text-center backdrop-blur-sm">
                <div className="max-w-xs rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/20 text-emerald-200">
                    {gameOver ? <Trophy size={28} /> : <Bike size={28} />}
                  </div>
                  <h2 className="text-2xl font-black">
                    {gameOver
                      ? "Fin de la carrera"
                      : "Bienvenido a Santa Cruz"}
                  </h2>
                  <p className="mt-2 text-sm text-white/75">
                    Esquiva obstáculos de huerta, recoge impulsos y aguanta
                    todo lo posible por la Vereda Jesús Rosa.
                  </p>
                  {gameOver && (
                    <div className="mt-3 rounded-2xl bg-black/20 p-3 text-sm">
                      Has recorrido{" "}
                      <span className="font-bold">
                        {Math.floor(distance)} m
                      </span>
                      .
                    </div>
                  )}
                  <button
                    onClick={startGame}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Play size={18} />{" "}
                    {gameOver ? "Jugar otra vez" : "Empezar carrera"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onTouchStart={moveLeft}
            onClick={moveLeft}
            className="rounded-3xl bg-white/10 px-4 py-4 text-lg font-bold shadow-lg backdrop-blur transition active:scale-95"
          >
            ⬅️ Izquierda
          </button>
          <button
            onTouchStart={jump}
            onClick={jump}
            className="rounded-3xl bg-emerald-500 px-4 py-4 text-lg font-black text-white shadow-lg transition active:scale-95"
          >
            ⬆️ Saltar
          </button>
          <button
            onTouchStart={moveRight}
            onClick={moveRight}
            className="rounded-3xl bg-white/10 px-4 py-4 text-lg font-bold shadow-lg backdrop-blur transition active:scale-95"
          >
            Derecha ➡️
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => started && setPaused((p) => !p)}
            className="rounded-3xl bg-white/10 px-4 py-3 text-sm font-bold shadow-lg transition active:scale-95"
          >
            <span className="inline-flex items-center gap-2">
              {paused ? <Play size={18} /> : <Pause size={18} />}
              {paused ? "Reanudar" : "Pausar"}
            </span>
          </button>
          <button
            onClick={startGame}
            className="rounded-3xl bg-white/10 px-4 py-3 text-sm font-bold shadow-lg transition active:scale-95"
          >
            <span className="inline-flex items-center gap-2">
              <RotateCcw size={18} /> Reiniciar
            </span>
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/75 shadow-xl">
          <p className="font-semibold text-white">Cómo jugar</p>
          <p className="mt-1">
            Usa los botones táctiles para moverte entre carriles y saltar.
            También funcionan las flechas del teclado en escritorio.
          </p>
        </div>
      </div>
    </div>
  );
}
