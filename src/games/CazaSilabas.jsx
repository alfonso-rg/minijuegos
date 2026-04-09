import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Home, Trophy, Volume2, VolumeX, RotateCcw, Eraser, Star } from "lucide-react";

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const HAS_SUPA = !!(SUPA_URL && SUPA_KEY);

const SUPA_HEADERS = {
  apikey: SUPA_KEY,
  Authorization: `Bearer ${SUPA_KEY}`,
  "Content-Type": "application/json",
};

const DIFFICULTIES = [
  {
    id: "facil",
    title: "Fácil",
    subtitle: "Palabras de 2 sílabas",
    timeLimit: 90,
    rounds: 8,
    pointsPerWord: 10,
    worldIdVisible: "cazasilabas_facil",
    worldIdHidden: "cazasilabas_facil_oculta",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    id: "medio",
    title: "Medio",
    subtitle: "Palabras de 2-3 sílabas",
    timeLimit: 75,
    rounds: 10,
    pointsPerWord: 12,
    worldIdVisible: "cazasilabas_medio",
    worldIdHidden: "cazasilabas_medio_oculta",
    gradient: "from-indigo-500 to-violet-700",
  },
  {
    id: "dificil",
    title: "Difícil",
    subtitle: "Palabras de 3-4 sílabas",
    timeLimit: 65,
    rounds: 12,
    pointsPerWord: 15,
    worldIdVisible: "cazasilabas_dificil",
    worldIdHidden: "cazasilabas_dificil_oculta",
    gradient: "from-fuchsia-500 to-rose-700",
  },
];

const WORDS = {
  facil: [
    { text: "casa", syllables: ["ca", "sa"], emoji: "🏠" },
    { text: "mesa", syllables: ["me", "sa"], emoji: "🪑" },
    { text: "gato", syllables: ["ga", "to"], emoji: "🐱" },
    { text: "pato", syllables: ["pa", "to"], emoji: "🦆" },
    { text: "luna", syllables: ["lu", "na"], emoji: "🌙" },
    { text: "pera", syllables: ["pe", "ra"], emoji: "🍐" },
    { text: "boca", syllables: ["bo", "ca"], emoji: "👄" },
    { text: "mano", syllables: ["ma", "no"], emoji: "✋" },
    { text: "sopa", syllables: ["so", "pa"], emoji: "🥣" },
    { text: "vaca", syllables: ["va", "ca"], emoji: "🐄" },
    { text: "coco", syllables: ["co", "co"], emoji: "🥥" },
    { text: "nube", syllables: ["nu", "be"], emoji: "☁️" },
    { text: "cama", syllables: ["ca", "ma"], emoji: "🛏️" },
    { text: "ropa", syllables: ["ro", "pa"], emoji: "👕" },
    { text: "taza", syllables: ["ta", "za"], emoji: "☕" },
    { text: "dado", syllables: ["da", "do"], emoji: "🎲" },
    { text: "mono", syllables: ["mo", "no"], emoji: "🐵" },
    { text: "vela", syllables: ["ve", "la"], emoji: "🕯️" },
    { text: "moto", syllables: ["mo", "to"], emoji: "🏍️" },
    { text: "rana", syllables: ["ra", "na"], emoji: "🐸" },
    { text: "queso", syllables: ["que", "so"], emoji: "🧀" },
    { text: "mapa", syllables: ["ma", "pa"], emoji: "🗺️" },
    { text: "lupa", syllables: ["lu", "pa"], emoji: "🔍" },
    { text: "beso", syllables: ["be", "so"], emoji: "💋" },
    { text: "foca", syllables: ["fo", "ca"], emoji: "🦭" },
    { text: "puma", syllables: ["pu", "ma"], emoji: "🐆" },
    { text: "rama", syllables: ["ra", "ma"], emoji: "🌿" },
    { text: "cola", syllables: ["co", "la"], emoji: "🥤" },
    { text: "bola", syllables: ["bo", "la"], emoji: "⚽" },
    { text: "silla", syllables: ["si", "lla"], emoji: "🪑" },
    { text: "llave", syllables: ["lla", "ve"], emoji: "🔑" },
    { text: "cinta", syllables: ["cin", "ta"], emoji: "🎀" },
    { text: "barco", syllables: ["bar", "co"], emoji: "🚢" },
    { text: "tigre", syllables: ["ti", "gre"], emoji: "🐯" },
    { text: "zorro", syllables: ["zor", "ro"], emoji: "🦊" },
    { text: "leche", syllables: ["le", "che"], emoji: "🥛" },
    { text: "fruta", syllables: ["fru", "ta"], emoji: "🍎" },
    { text: "playa", syllables: ["pla", "ya"], emoji: "🏖️" },
    { text: "trapo", syllables: ["tra", "po"], emoji: "🧽" },
    { text: "bruja", syllables: ["bru", "ja"], emoji: "🧙" },
    { text: "globo", syllables: ["glo", "bo"], emoji: "🎈" },
    { text: "plato", syllables: ["pla", "to"], emoji: "🍽️" },
    { text: "perro", syllables: ["pe", "rro"], emoji: "🐶" },
    { text: "raton", syllables: ["ra", "ton"], emoji: "🐭" },
    { text: "hoja", syllables: ["ho", "ja"], emoji: "🍃" },
    { text: "huevo", syllables: ["hue", "vo"], emoji: "🥚" },
    { text: "ducha", syllables: ["du", "cha"], emoji: "🚿" },
    { text: "cueva", syllables: ["cue", "va"], emoji: "🕳️" },
  ],
  medio: [
    { text: "camino", syllables: ["ca", "mi", "no"], emoji: "🛤️" },
    { text: "banana", syllables: ["ba", "na", "na"], emoji: "🍌" },
    { text: "sirena", syllables: ["si", "re", "na"], emoji: "🧜" },
    { text: "maleta", syllables: ["ma", "le", "ta"], emoji: "🧳" },
    { text: "zapato", syllables: ["za", "pa", "to"], emoji: "👟" },
    { text: "pirata", syllables: ["pi", "ra", "ta"], emoji: "🏴‍☠️" },
    { text: "tomate", syllables: ["to", "ma", "te"], emoji: "🍅" },
    { text: "globito", syllables: ["glo", "bi", "to"], emoji: "🎈" },
    { text: "paloma", syllables: ["pa", "lo", "ma"], emoji: "🕊️" },
    { text: "cohete", syllables: ["co", "he", "te"], emoji: "🚀" },
    { text: "estuche", syllables: ["es", "tu", "che"], emoji: "🎒" },
    { text: "galleta", syllables: ["ga", "lle", "ta"], emoji: "🍪" },
    { text: "helado", syllables: ["he", "la", "do"], emoji: "🍦" },
    { text: "camisa", syllables: ["ca", "mi", "sa"], emoji: "👕" },
    { text: "conejo", syllables: ["co", "ne", "jo"], emoji: "🐰" },
    { text: "pelota", syllables: ["pe", "lo", "ta"], emoji: "⚽" },
    { text: "ventana", syllables: ["ven", "ta", "na"], emoji: "🪟" },
    { text: "cuchara", syllables: ["cu", "cha", "ra"], emoji: "🥄" },
    { text: "mochila", syllables: ["mo", "chi", "la"], emoji: "🎒" },
    { text: "zapatero", syllables: ["za", "pa", "te", "ro"], emoji: "👞" },
    { text: "caballo", syllables: ["ca", "ba", "llo"], emoji: "🐴" },
    { text: "sandia", syllables: ["san", "di", "a"], emoji: "🍉" },
    { text: "camello", syllables: ["ca", "me", "llo"], emoji: "🐫" },
    { text: "manzana", syllables: ["man", "za", "na"], emoji: "🍎" },
    { text: "tormenta", syllables: ["tor", "men", "ta"], emoji: "⛈️" },
    { text: "cometa", syllables: ["co", "me", "ta"], emoji: "☄️" },
    { text: "laguna", syllables: ["la", "gu", "na"], emoji: "🏞️" },
    { text: "flauta", syllables: ["flau", "ta"], emoji: "🎶" },
    { text: "camara", syllables: ["ca", "ma", "ra"], emoji: "📷" },
    { text: "tesoro", syllables: ["te", "so", "ro"], emoji: "💎" },
    { text: "mercado", syllables: ["mer", "ca", "do"], emoji: "🛒" },
    { text: "piramide", syllables: ["pi", "ra", "mi", "de"], emoji: "🔺" },
    { text: "jirafa", syllables: ["ji", "ra", "fa"], emoji: "🦒" },
    { text: "payaso", syllables: ["pa", "ya", "so"], emoji: "🤡" },
    { text: "islita", syllables: ["is", "li", "ta"], emoji: "🏝️" },
    { text: "planeta", syllables: ["pla", "ne", "ta"], emoji: "🪐" },
    { text: "avioneta", syllables: ["a", "vio", "ne", "ta"], emoji: "🛩️" },
    { text: "piruleta", syllables: ["pi", "ru", "le", "ta"], emoji: "🍭" },
    { text: "regalo", syllables: ["re", "ga", "lo"], emoji: "🎁" },
    { text: "marino", syllables: ["ma", "ri", "no"], emoji: "⚓" },
    { text: "bufanda", syllables: ["bu", "fan", "da"], emoji: "🧣" },
    { text: "pasillo", syllables: ["pa", "si", "llo"], emoji: "🚪" },
    { text: "guitarra", syllables: ["gui", "ta", "rra"], emoji: "🎸" },
    { text: "futuro", syllables: ["fu", "tu", "ro"], emoji: "🔮" },
    { text: "colina", syllables: ["co", "li", "na"], emoji: "⛰️" },
    { text: "pincel", syllables: ["pin", "cel"], emoji: "🖌️" },
    { text: "corona", syllables: ["co", "ro", "na"], emoji: "👑" },
    { text: "granero", syllables: ["gra", "ne", "ro"], emoji: "🏚️" },
  ],
  dificil: [
    { text: "bicicleta", syllables: ["bi", "ci", "cle", "ta"], emoji: "🚲" },
    { text: "mariposa", syllables: ["ma", "ri", "po", "sa"], emoji: "🦋" },
    { text: "maravilla", syllables: ["ma", "ra", "vi", "lla"], emoji: "✨" },
    { text: "biblioteca", syllables: ["bi", "blio", "te", "ca"], emoji: "📚" },
    { text: "aventura", syllables: ["a", "ven", "tu", "ra"], emoji: "🧭" },
    { text: "laberinto", syllables: ["la", "be", "rin", "to"], emoji: "🧩" },
    { text: "dinosaurio", syllables: ["di", "no", "sau", "rio"], emoji: "🦕" },
    { text: "paraguas", syllables: ["pa", "ra", "guas", ""], emoji: "☔" },
    { text: "chocolate", syllables: ["cho", "co", "la", "te"], emoji: "🍫" },
    { text: "micrófono", syllables: ["mi", "cró", "fo", "no"], emoji: "🎤" },
    { text: "caramelo", syllables: ["ca", "ra", "me", "lo"], emoji: "🍬" },
    { text: "elefante", syllables: ["e", "le", "fan", "te"], emoji: "🐘" },
    { text: "helicoptero", syllables: ["he", "li", "cóp", "te", "ro"], emoji: "🚁" },
    { text: "matematica", syllables: ["ma", "te", "má", "ti", "ca"], emoji: "➕" },
    { text: "laboratorio", syllables: ["la", "bo", "ra", "to", "rio"], emoji: "🧪" },
    { text: "interior", syllables: ["in", "te", "rior"], emoji: "🏠" },
    { text: "fotografia", syllables: ["fo", "to", "gra", "fí", "a"], emoji: "📸" },
    { text: "naturaleza", syllables: ["na", "tu", "ra", "le", "za"], emoji: "🌳" },
    { text: "astronauta", syllables: ["as", "tro", "nau", "ta"], emoji: "👨‍🚀" },
    { text: "superheroe", syllables: ["su", "per", "hé", "ro", "e"], emoji: "🦸" },
    { text: "murcielago", syllables: ["mur", "cié", "la", "go"], emoji: "🦇" },
    { text: "carretera", syllables: ["ca", "rre", "te", "ra"], emoji: "🛣️" },
    { text: "primavera", syllables: ["pri", "ma", "ve", "ra"], emoji: "🌸" },
    { text: "montanita", syllables: ["mon", "ta", "ñi", "ta"], emoji: "⛰️" },
    { text: "escenario", syllables: ["es", "ce", "na", "rio"], emoji: "🎭" },
    { text: "refrigerio", syllables: ["re", "fri", "ge", "rio"], emoji: "🥪" },
    { text: "inventario", syllables: ["in", "ven", "ta", "rio"], emoji: "📋" },
    { text: "cuadernillo", syllables: ["cua", "der", "ni", "llo"], emoji: "📒" },
    { text: "veterinario", syllables: ["ve", "te", "ri", "na", "rio"], emoji: "🩺" },
    { text: "paraguero", syllables: ["pa", "ra", "gue", "ro"], emoji: "☂️" },
    { text: "campanario", syllables: ["cam", "pa", "na", "rio"], emoji: "🔔" },
    { text: "maravilloso", syllables: ["ma", "ra", "vi", "llo", "so"], emoji: "✨" },
    { text: "locomotora", syllables: ["lo", "co", "mo", "to", "ra"], emoji: "🚂" },
    { text: "universo", syllables: ["u", "ni", "ver", "so"], emoji: "🌌" },
    { text: "hormiguero", syllables: ["hor", "mi", "gue", "ro"], emoji: "🐜" },
    { text: "semaforo", syllables: ["se", "má", "fo", "ro"], emoji: "🚦" },
    { text: "termometro", syllables: ["ter", "mó", "me", "tro"], emoji: "🌡️" },
    { text: "aventurero", syllables: ["a", "ven", "tu", "re", "ro"], emoji: "🧭" },
    { text: "panaderia", syllables: ["pa", "na", "de", "rí", "a"], emoji: "🥖" },
    { text: "fontanero", syllables: ["fon", "ta", "ne", "ro"], emoji: "🔧" },
    { text: "acueducto", syllables: ["a", "cue", "duc", "to"], emoji: "🚰" },
    { text: "pasteleria", syllables: ["pas", "te", "le", "rí", "a"], emoji: "🧁" },
    { text: "electrico", syllables: ["e", "léc", "tri", "co"], emoji: "⚡" },
    { text: "diccionario", syllables: ["dic", "cio", "na", "rio"], emoji: "📖" },
    { text: "marioneta", syllables: ["ma", "rio", "ne", "ta"], emoji: "🪆" },
    { text: "microondas", syllables: ["mi", "cro", "on", "das"], emoji: "🍲" },
    { text: "calendario", syllables: ["ca", "len", "da", "rio"], emoji: "📅" },
    { text: "aventurita", syllables: ["a", "ven", "tu", "ri", "ta"], emoji: "🗺️" },
  ],
};

const DISTRACTORS = [
  "la", "li", "lo", "lu", "re", "ri", "ro", "ru", "ta", "te", "ti", "to",
  "na", "ne", "ni", "no", "sa", "se", "si", "su", "co", "ca", "que", "qui",
  "po", "pe", "pi", "pa", "cho", "cha", "lle", "gua", "blio", "lec",
];

function shuffle(arr) {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function createRoundWords(difficultyId, rounds) {
  return shuffle(WORDS[difficultyId]).slice(0, rounds).map((w) => ({
    ...w,
    syllables: w.syllables.filter(Boolean),
  }));
}

function createOptions(word) {
  const base = [...word.syllables];
  const needed = Math.max(8 - base.length, 4);
  const extra = shuffle(DISTRACTORS.filter((s) => !base.includes(s))).slice(0, needed);
  return shuffle([...base, ...extra]);
}

function getWorldId(difficulty, onlyImageMode) {
  return onlyImageMode ? difficulty.worldIdHidden : difficulty.worldIdVisible;
}

async function fetchRankings(worldId) {
  const query = `${SUPA_URL}/rest/v1/scores?world_id=eq.${worldId}&select=player_name,score,time_seconds,created_at&order=score.desc,time_seconds.asc&limit=10`;
  const res = await fetch(query, { headers: SUPA_HEADERS });
  if (!res.ok) throw new Error("ranking fetch failed");
  return res.json();
}

async function saveScore(worldId, playerName, score, timeSeconds) {
  const res = await fetch(`${SUPA_URL}/rest/v1/scores`, {
    method: "POST",
    headers: { ...SUPA_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify({
      world_id: worldId,
      player_name: playerName.trim().slice(0, 20),
      score,
      time_seconds: timeSeconds,
    }),
  });
  return res.ok;
}

let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function beep(freq, delay, duration, type = "sine", gainValue = 0.22) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(gainValue, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch {
    // audio optional
  }
}

const SFX = {
  tap: () => beep(520, 0, 0.05, "square", 0.12),
  ok: () => [640, 780, 980].forEach((f, i) => beep(f, i * 0.08, 0.11)),
  wrong: () => [280, 210].forEach((f, i) => beep(f, i * 0.12, 0.2, "sawtooth", 0.18)),
  clear: () => beep(410, 0, 0.09, "triangle", 0.15),
  finish: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, i * 0.12, 0.15)),
  countdown: () => beep(760, 0, 0.04, "sine", 0.07),
};

export default function CazaSilabas() {
  const [screen, setScreen] = useState("home");
  const [difficultyId, setDifficultyId] = useState("facil");
  const [onlyImageMode, setOnlyImageMode] = useState(false);
  const [roundWords, setRoundWords] = useState([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [picked, setPicked] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [hofDifficultyId, setHofDifficultyId] = useState("facil");
  const [hofOnlyImageMode, setHofOnlyImageMode] = useState(false);

  const mutedRef = useRef(false);
  const timerRef = useRef(null);
  const gameStartRef = useRef(0);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const difficulty = useMemo(
    () => DIFFICULTIES.find((d) => d.id === difficultyId) ?? DIFFICULTIES[0],
    [difficultyId],
  );

  const currentWord = roundWords[roundIndex];

  const play = useCallback((name) => {
    if (!mutedRef.current) SFX[name]?.();
  }, []);

  const resetRound = useCallback((word) => {
    setPicked([]);
    setFeedback(null);
    setOptions(createOptions(word));
  }, []);

  const endGame = useCallback(() => {
    clearInterval(timerRef.current);
    setElapsed(Math.max(0, Math.round((Date.now() - gameStartRef.current) / 1000)));
    setScreen("result");
  }, []);

  const startGame = useCallback((nextDifficultyId) => {
    const nextDifficulty = DIFFICULTIES.find((d) => d.id === nextDifficultyId) ?? DIFFICULTIES[0];
    const words = createRoundWords(nextDifficulty.id, nextDifficulty.rounds);
    gameStartRef.current = Date.now();
    setScreen("game");
    setDifficultyId(nextDifficulty.id);
    setRoundWords(words);
    setRoundIndex(0);
    setScore(0);
    setHits(0);
    setCombo(0);
    setTimeLeft(nextDifficulty.timeLimit);
    setPlayerName("");
    setSaved(false);
    setSaving(false);
    setElapsed(0);
    resetRound(words[0]);
  }, [resetRound]);

  useEffect(() => {
    if (screen !== "game") {
      clearInterval(timerRef.current);
      return;
    }
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen]);

  useEffect(() => {
    if (screen === "game" && timeLeft > 0 && timeLeft <= 5) {
      play("countdown");
    }
    if (screen === "game" && timeLeft === 0) {
      endGame();
    }
  }, [timeLeft, screen, endGame, play]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const moveNextWord = useCallback(() => {
    const nextIndex = roundIndex + 1;
    if (nextIndex >= roundWords.length) {
      endGame();
      return;
    }
    setRoundIndex(nextIndex);
    resetRound(roundWords[nextIndex]);
  }, [roundIndex, roundWords, resetRound, endGame]);

  const onPickSyllable = (syllable) => {
    if (screen !== "game" || feedback || !currentWord) return;
    play("tap");

    const nextPicked = [...picked, syllable];
    setPicked(nextPicked);

    if (nextPicked.length < currentWord.syllables.length) return;

    const ok = nextPicked.join("") === currentWord.syllables.join("");

    if (ok) {
      const nextCombo = combo + 1;
      const bonus = nextCombo >= 3 ? 5 : 0;
      setCombo(nextCombo);
      setHits((v) => v + 1);
      setScore((v) => v + difficulty.pointsPerWord + bonus);
      setFeedback("ok");
      play("ok");
      setTimeout(() => {
        moveNextWord();
      }, 650);
    } else {
      setCombo(0);
      setFeedback("ko");
      play("wrong");
      setTimeout(() => {
        setPicked([]);
        setFeedback(null);
      }, 650);
    }
  };

  const clearAttempt = () => {
    if (feedback) return;
    setPicked([]);
    play("clear");
  };

  const pronounceWord = () => {
    if (!currentWord) return;
    try {
      const utterance = new SpeechSynthesisUtterance(currentWord.text);
      utterance.lang = "es-ES";
      utterance.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {
      play("tap");
    }
  };

  const saveCurrentScore = async () => {
    if (!HAS_SUPA || saving || saved || score <= 0) return;
    const name = playerName.trim();
    if (!name) return;
    setSaving(true);
    const ok = await saveScore(getWorldId(difficulty, onlyImageMode), name, score, elapsed);
    setSaved(ok);
    setSaving(false);
  };

  const openHof = (id, nextOnlyImageMode = onlyImageMode) => {
    setHofDifficultyId(id);
    setHofOnlyImageMode(nextOnlyImageMode);
    setScreen("hof");
  };

  if (screen === "home") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-950 via-indigo-950 to-violet-950 text-white">
        <div className="mx-auto max-w-4xl p-4 pb-10 sm:p-6">
          <header className="mb-8 rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Nuevo minijuego</p>
                <h1 className="mt-2 text-3xl font-black sm:text-5xl">Caza Sílabas</h1>
                <p className="mt-3 max-w-2xl text-sm text-white/80 sm:text-base">
                  Forma palabras tocando sílabas en orden. Con sonidos, modo móvil y ranking online independiente por nivel.
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 text-yellow-300">
                <Star size={34} />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-white/80 sm:text-sm">
              <span className="rounded-full bg-white/15 px-3 py-1">7 años</span>
              <span className="rounded-full bg-white/15 px-3 py-1">Educativo</span>
              <span className="rounded-full bg-white/15 px-3 py-1">Con sonidos</span>
              <span className="rounded-full bg-white/15 px-3 py-1">Optimizado móvil</span>
            </div>
            <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Opción de juego</p>
              <button
                type="button"
                onClick={() => setOnlyImageMode((v) => !v)}
                className="mt-2 inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/20"
              >
                {onlyImageMode ? "🖼️ Solo imagen (ON)" : "🔤 Imagen + palabra (ON)"}
              </button>
              <p className="mt-2 text-xs text-white/70">
                {onlyImageMode
                  ? "En partida no se mostrará la palabra escrita, solo la imagen."
                  : "En partida verás imagen y palabra escrita."}
              </p>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-3">
            {DIFFICULTIES.map((level) => (
              <div
                key={level.id}
                className="rounded-3xl border border-white/15 bg-white/10 p-4 text-left shadow-lg"
              >
                <div className={`inline-flex rounded-xl bg-gradient-to-r px-3 py-1.5 text-sm font-bold ${level.gradient}`}>
                  {level.title}
                </div>
                <p className="mt-3 text-sm text-white/90">{level.subtitle}</p>
                <p className="mt-1 text-xs text-white/70">{level.rounds} palabras · {level.timeLimit}s</p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startGame(level.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-cyan-400/25 px-3 py-1 text-xs font-semibold text-cyan-50 transition active:scale-[0.98]"
                  >
                    Jugar
                  </button>
                  <button
                    type="button"
                    onClick={() => openHof(level.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-amber-200"
                  >
                    <Trophy size={14} /> Ranking
                  </button>
                </div>
              </div>
            ))}
          </section>

          <div className="mt-8 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/20"
            >
              <Home size={16} /> Portada
            </Link>
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/20"
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              {muted ? "Sonido OFF" : "Sonido ON"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (screen === "hof") {
    return (
      <RankingScreen
        difficulty={DIFFICULTIES.find((d) => d.id === hofDifficultyId) ?? DIFFICULTIES[0]}
        onlyImageMode={hofOnlyImageMode}
        onBack={() => setScreen("home")}
      />
    );
  }

  if (screen === "result") {
    return (
      <ResultScreen
        difficulty={difficulty}
        score={score}
        hits={hits}
        total={roundWords.length}
        elapsed={elapsed}
        playerName={playerName}
        setPlayerName={setPlayerName}
        saveCurrentScore={saveCurrentScore}
        saved={saved}
        saving={saving}
        hasSupa={HAS_SUPA}
        onPlayAgain={() => startGame(difficulty.id)}
        onHome={() => setScreen("home")}
        onlyImageMode={onlyImageMode}
        onOpenRanking={() => openHof(difficulty.id, onlyImageMode)}
      />
    );
  }

  const progress = roundWords.length ? ((roundIndex + 1) / roundWords.length) * 100 : 0;

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-indigo-950 via-purple-950 to-fuchsia-950 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-white sm:px-6">
      <div className="pointer-events-none absolute -left-16 top-12 h-36 w-36 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-8 h-40 w-40 rounded-full bg-rose-400/20 blur-3xl" />

      <section className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-3xl border border-white/15 bg-black/20 p-3 shadow-2xl backdrop-blur sm:p-5">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold sm:text-sm">
            <span className={`rounded-full bg-gradient-to-r px-3 py-1 ${difficulty.gradient}`}>{difficulty.title}</span>
            <span className="rounded-full bg-white/15 px-3 py-1">⏱️ {timeLeft}s</span>
            <span className="rounded-full bg-white/15 px-3 py-1">⭐ {score}</span>
            <span className="rounded-full bg-white/15 px-3 py-1">🔥 x{combo}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10">
            <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" style={{ width: `${progress}%` }} />
          </div>
        </header>

        <article className="rounded-3xl border border-white/15 bg-white/10 p-4 text-center sm:p-6">
          <p className="text-4xl sm:text-6xl">{currentWord?.emoji ?? "🔤"}</p>
          {onlyImageMode ? (
            <h2 className="mt-1 text-xl font-black tracking-tight text-cyan-100 sm:text-3xl">
              Adivina la palabra solo con la imagen
            </h2>
          ) : (
            <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">{currentWord?.text ?? "palabra"}</h2>
          )}
          <p className="mt-2 text-sm text-white/85">
            {onlyImageMode ? "Pista visual: toca sílabas en el orden correcto." : "Toca las sílabas en orden correcto."}
          </p>
          <button
            type="button"
            onClick={pronounceWord}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/20"
          >
            <Volume2 size={15} /> Escuchar palabra
          </button>
        </article>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-2 sm:grid-cols-4 sm:gap-3 sm:p-3">
          {options.map((syllable, i) => {
            const used = picked.includes(syllable) && picked.filter((s) => s === syllable).length > options.slice(0, i + 1).filter((s) => s === syllable).length - 1;
            return (
              <button
                key={`${syllable}-${i}`}
                type="button"
                disabled={used}
                onClick={() => onPickSyllable(syllable)}
                className="min-h-[52px] rounded-2xl border border-white/20 bg-white/15 px-2 text-lg font-black uppercase tracking-wide transition enabled:active:scale-[0.97] disabled:opacity-35 sm:min-h-[60px] sm:text-2xl"
              >
                {syllable}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl bg-black/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Construcción</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(currentWord?.syllables ?? []).map((_, idx) => (
              <div key={`slot-${idx}`} className="min-w-[58px] rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-center text-lg font-bold">
                {picked[idx] ?? "__"}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={clearAttempt}
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold"
            >
              <Eraser size={14} /> Borrar
            </button>
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold"
            >
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />} {muted ? "Sin sonido" : "Con sonido"}
            </button>
            {feedback === "ok" && <span className="rounded-full bg-emerald-400/25 px-3 py-1 text-xs font-bold text-emerald-100">¡Perfecto! ✅</span>}
            {feedback === "ko" && <span className="rounded-full bg-rose-400/25 px-3 py-1 text-xs font-bold text-rose-100">Ups, prueba otra vez ❌</span>}
          </div>
        </div>
      </section>
    </main>
  );
}

function ResultScreen({
  difficulty,
  onlyImageMode,
  score,
  hits,
  total,
  elapsed,
  playerName,
  setPlayerName,
  saveCurrentScore,
  saved,
  saving,
  hasSupa,
  onPlayAgain,
  onHome,
  onOpenRanking,
}) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-violet-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-xl rounded-3xl border border-white/15 bg-white/10 p-5 text-center shadow-xl backdrop-blur sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Resultado final</p>
        <h2 className="mt-2 text-4xl font-black">{score} puntos</h2>
        <p className="mt-1 text-white/85">Nivel {difficulty.title} · {hits}/{total} palabras acertadas</p>
        <p className="mt-1 text-sm text-white/75">Tiempo: {elapsed}s</p>

        {hasSupa ? (
          <div className="mt-6 rounded-2xl bg-black/25 p-4 text-left">
            <p className="text-sm font-semibold text-amber-200">
              Guardar en ranking ({difficulty.title} · {onlyImageMode ? "Solo imagen" : "Imagen + palabra"})
            </p>
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              placeholder="Tu nombre"
              className="mt-3 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/50 focus:border-cyan-300"
            />
            <button
              type="button"
              onClick={saveCurrentScore}
              disabled={saving || saved || !playerName.trim() || score <= 0}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar puntuación"}
            </button>
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-amber-400/20 p-3 text-sm text-amber-100">
            Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para activar ranking online.
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onPlayAgain} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/20">
            <RotateCcw size={16} /> Jugar otra vez
          </button>
          <button type="button" onClick={onOpenRanking} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/20">
            <Trophy size={16} /> Ver ranking
          </button>
          <button type="button" onClick={onHome} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/20">
            <Home size={16} /> Inicio
          </button>
        </div>
      </div>
    </main>
  );
}

function RankingScreen({ difficulty, onlyImageMode, onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!HAS_SUPA) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(false);
      try {
        const data = await fetchRankings(getWorldId(difficulty, onlyImageMode));
        if (!cancelled) setRows(data ?? []);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [difficulty, onlyImageMode]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-xl rounded-3xl border border-white/15 bg-white/10 p-5 shadow-xl backdrop-blur sm:p-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm text-cyan-200">Ranking independiente</p>
            <h2 className="text-2xl font-black">
              Caza Sílabas · {difficulty.title} · {onlyImageMode ? "Solo imagen" : "Imagen + palabra"}
            </h2>
          </div>
          <Trophy className="text-amber-300" size={28} />
        </div>

        {!HAS_SUPA && (
          <p className="rounded-xl bg-amber-400/20 p-3 text-sm text-amber-100">
            Sin Supabase configurado. Añade las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
          </p>
        )}

        {HAS_SUPA && loading && <p className="text-sm text-white/75">Cargando ranking...</p>}
        {HAS_SUPA && error && <p className="rounded-xl bg-rose-500/20 p-3 text-sm text-rose-100">No se pudo cargar el ranking.</p>}

        {HAS_SUPA && !loading && !error && (
          <ol className="space-y-2">
            {rows.length === 0 && (
              <li className="rounded-xl border border-white/15 bg-white/10 p-3 text-sm text-white/75">Todavía no hay puntuaciones.</li>
            )}
            {rows.map((row, idx) => (
              <li key={`${row.player_name}-${idx}`} className="flex items-center justify-between rounded-xl border border-white/15 bg-black/20 px-3 py-2">
                <div>
                  <p className="font-bold">#{idx + 1} · {row.player_name}</p>
                  <p className="text-xs text-white/65">{Number(row.time_seconds || 0)}s</p>
                </div>
                <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">{row.score}</span>
              </li>
            ))}
          </ol>
        )}

        <button type="button" onClick={onBack} className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/20">
          <Home size={16} /> Volver
        </button>
      </div>
    </main>
  );
}
