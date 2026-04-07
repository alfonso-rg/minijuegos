import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Home as HomeIcon, Trophy, Volume2, VolumeX, Star, ChevronLeft } from "lucide-react";

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const HAS_SUPA = !!(SUPA_URL && SUPA_KEY);
const SUPA_HEADERS = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" };

async function fetchRankings(gameId) {
  const url = `${SUPA_URL}/rest/v1/trivia_scores?game_id=eq.${gameId}&select=player_name,score,time_seconds,created_at&order=score.desc,time_seconds.asc&limit=10`;
  const res = await fetch(url, { headers: SUPA_HEADERS });
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}
async function saveScore(gameId, playerName, score, timeSecs) {
  const res = await fetch(`${SUPA_URL}/rest/v1/trivia_scores`, {
    method: "POST",
    headers: { ...SUPA_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify({ game_id: gameId, player_name: playerName.trim().slice(0, 20), score, time_seconds: timeSecs }),
  });
  return res.ok;
}

// ── AUDIO ─────────────────────────────────────────────────────────────────────
let _actx = null;
function getCtx() {
  if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
  if (_actx.state === "suspended") _actx.resume();
  return _actx;
}
function tone(freq, delay, dur, type = "sine", vol = 0.26) {
  try {
    const ctx = getCtx(), osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t); osc.stop(t + dur + 0.01);
  } catch (_) {}
}
const SFX = {
  correct: () => [523,659,784].forEach((f,i) => tone(f,i*.1,.12)),
  wrong:   () => [280,220,160].forEach((f,i) => tone(f,i*.09,.12,"sawtooth")),
  streak:  () => [784,988,1175,1568].forEach((f,i) => tone(f,i*.08,.1)),
  finish:  () => [523,659,784,659,784,1047].forEach((f,i) => tone(f,i*.13,.18)),
  over:    () => [380,300,240,180].forEach((f,i) => tone(f,i*.17,.22,"triangle")),
  tick:    () => tone(660,0,.04,"sine",.07),
};

// ── CATEGORÍAS Y DIFICULTADES ─────────────────────────────────────────────────
const CATEGORIES = [
  { id:"todas",        name:"Todas las categorías", emoji:"🎯", color:"from-purple-500 to-indigo-600",  gameBg:"from-purple-950 via-indigo-950 to-purple-950" },
  { id:"geografia",    name:"Geografía",             emoji:"🌍", color:"from-emerald-500 to-teal-600",   gameBg:"from-emerald-950 via-teal-950 to-emerald-950" },
  { id:"historia",     name:"Historia",              emoji:"📜", color:"from-amber-500 to-orange-600",   gameBg:"from-amber-950 via-orange-950 to-amber-950" },
  { id:"espectaculos", name:"Espectáculos",          emoji:"🎬", color:"from-pink-500 to-rose-600",      gameBg:"from-pink-950 via-rose-950 to-pink-950" },
  { id:"deportes",     name:"Deportes",              emoji:"⚽", color:"from-blue-500 to-cyan-600",      gameBg:"from-blue-950 via-cyan-950 to-blue-950" },
  { id:"lengua",       name:"Lengua y Literatura",   emoji:"📚", color:"from-violet-500 to-purple-600",  gameBg:"from-violet-950 via-purple-950 to-violet-950" },
  { id:"ciencias",     name:"Ciencias Naturales",    emoji:"🔬", color:"from-green-500 to-lime-600",     gameBg:"from-green-950 via-lime-950 to-green-950" },
];
const DIFFICULTIES = [
  { id:"basico",   name:"Básico",   desc:"Nivel 6 años",  badge:"🟢", color:"from-green-400 to-emerald-500" },
  { id:"medio",    name:"Medio",    desc:"Nivel 16 años", badge:"🟡", color:"from-yellow-400 to-orange-500" },
  { id:"avanzado", name:"Avanzado", desc:"Nivel adulto",  badge:"🔴", color:"from-red-400 to-rose-600" },
];
const TIMER_SECS = 20;
const MAX_LIVES = 3;

// ── PREGUNTAS (25 por categoría × dificultad = 450 total) ───────────────────
const QUESTIONS = {
  geografia: {
    basico: [
      {q:"¿Cuál es la capital de España?",                         a:"Madrid",          opts:["Madrid","Barcelona","Sevilla","Valencia"]},
      {q:"¿Qué país tiene forma de bota?",                         a:"Italia",          opts:["Italia","Francia","Portugal","Grecia"]},
      {q:"¿Cuál es el océano más grande del mundo?",               a:"Pacífico",        opts:["Pacífico","Atlántico","Índico","Ártico"]},
      {q:"¿En qué país está la Torre Eiffel?",                     a:"Francia",         opts:["Francia","Italia","España","Alemania"]},
      {q:"¿Cuál es el desierto más grande del mundo?",             a:"Sahara",          opts:["Sahara","Atacama","Gobi","Kalahari"]},
      {q:"¿En qué país están las pirámides más famosas?",          a:"Egipto",          opts:["Egipto","México","Perú","Grecia"]},
      {q:"¿Dónde viven los pingüinos en estado salvaje?",          a:"Polo Sur",        opts:["Polo Sur","Polo Norte","África","Australia"]},
      {q:"¿Cuál es la montaña más alta de España?",                a:"El Teide",        opts:["El Teide","La Mulhacén","Mont Blanc","El Aneto"]},
      {q:"¿En qué continente está Brasil?",                        a:"América del Sur", opts:["América del Sur","Europa","Asia","África"]},
      {q:"¿Qué mar baña las costas del este de España?",           a:"Mar Mediterráneo",opts:["Mar Mediterráneo","Mar del Norte","Mar Rojo","Mar Caribe"]},
      {q:"¿En qué país está Tokio?",                               a:"Japón",           opts:["Japón","China","Corea del Sur","India"]},
      {q:"¿Cuál es el país más grande del mundo?",                 a:"Rusia",           opts:["Rusia","China","Estados Unidos","Brasil"]},
      {q:"¿Cuál es la capital de Francia?",                        a:"París",           opts:["París","Lyon","Marsella","Burdeos"]},
      {q:"¿Qué océano separa Europa de América?",                  a:"Atlántico",       opts:["Atlántico","Pacífico","Índico","Ártico"]},
      {q:"¿En qué país está la Gran Muralla?",                     a:"China",           opts:["China","India","Rusia","Mongolia"]},
      {q:"¿Cuál es la capital de Italia?",                         a:"Roma",            opts:["Roma","Milán","Nápoles","Venecia"]},
      {q:"¿Cuál es el país más pequeño del mundo?",                a:"Vaticano",        opts:["Vaticano","Mónaco","Andorra","San Marino"]},
      {q:"¿Dónde está el río Amazonas?",                           a:"América del Sur", opts:["América del Sur","Asia","África","Europa"]},
      {q:"¿Cuál es la capital de Alemania?",                       a:"Berlín",          opts:["Berlín","Múnich","Hamburgo","Colonia"]},
      {q:"¿En qué continente está China?",                         a:"Asia",            opts:["Asia","Europa","América","África"]},
      {q:"¿Cuál es la capital de Portugal?",                       a:"Lisboa",          opts:["Lisboa","Oporto","Braga","Faro"]},
      {q:"¿Qué continente rodea el Polo Sur?",                     a:"Antártida",       opts:["Antártida","No hay continente","Australia","África"]},
      {q:"¿En qué país está el Big Ben?",                          a:"Reino Unido",     opts:["Reino Unido","Francia","Alemania","Italia"]},
      {q:"¿Qué río pasa por Sevilla?",                             a:"Guadalquivir",    opts:["Guadalquivir","Tajo","Ebro","Duero"]},
      {q:"¿Cuál es la capital de Argentina?",                      a:"Buenos Aires",    opts:["Buenos Aires","Córdoba","Rosario","Mendoza"]},
    ],
    medio: [
      {q:"¿Cuál es la capital de Australia?",                      a:"Canberra",        opts:["Canberra","Sídney","Melbourne","Brisbane"]},
      {q:"¿Qué país tiene más habitantes en el mundo (2023)?",     a:"India",           opts:["India","China","Estados Unidos","Indonesia"]},
      {q:"¿Cuál es la capital de Canadá?",                         a:"Ottawa",          opts:["Ottawa","Toronto","Vancouver","Montreal"]},
      {q:"¿Cuál es el lago más profundo del mundo?",               a:"Baikal",          opts:["Baikal","Titicaca","Victoria","Superior"]},
      {q:"¿En qué país está el monte Kilimanjaro?",                a:"Tanzania",        opts:["Tanzania","Kenia","Sudáfrica","Etiopía"]},
      {q:"¿Cuál es la capital de Turquía?",                        a:"Ankara",          opts:["Ankara","Estambul","Esmirna","Bursa"]},
      {q:"¿En qué océano está Madagascar?",                        a:"Índico",          opts:["Índico","Atlántico","Pacífico","Ártico"]},
      {q:"¿Cuál es la cordillera más larga del mundo?",            a:"Los Andes",       opts:["Los Andes","El Himalaya","Las Rocosas","Los Alpes"]},
      {q:"¿Cuál es el país más poblado de África?",                a:"Nigeria",         opts:["Nigeria","Etiopía","Egipto","Sudáfrica"]},
      {q:"¿Qué estrecho separa Europa de África?",                 a:"Gibraltar",       opts:["Gibraltar","Bósforo","Magallanes","Ormuz"]},
      {q:"¿Cuál es la capital de Brasil?",                         a:"Brasilia",        opts:["Brasilia","São Paulo","Río de Janeiro","Salvador"]},
      {q:"¿En qué país está Angkor Wat?",                          a:"Camboya",         opts:["Camboya","Tailandia","Vietnam","Indonesia"]},
      {q:"¿Cuál es el río más largo de Europa?",                   a:"Volga",           opts:["Volga","Danubio","Rin","Elba"]},
      {q:"¿En qué continente está Marruecos?",                     a:"África",          opts:["África","Europa","Asia","América"]},
      {q:"¿En qué país está Estocolmo?",                           a:"Suecia",          opts:["Suecia","Noruega","Finlandia","Dinamarca"]},
      {q:"¿Cuál es la cascada más alta del mundo?",                a:"Salto Ángel",     opts:["Salto Ángel","Cataratas del Niágara","Victoria","Iguazú"]},
      {q:"¿Qué isla es la más grande del mundo?",                  a:"Groenlandia",     opts:["Groenlandia","Nueva Guinea","Borneo","Madagascar"]},
      {q:"¿Cuál es la capital de México?",                         a:"Ciudad de México",opts:["Ciudad de México","Guadalajara","Monterrey","Tijuana"]},
      {q:"¿En qué país está el Coliseo Romano?",                   a:"Italia",          opts:["Italia","Grecia","España","Turquía"]},
      {q:"¿Cuál es el punto más alto de África?",                  a:"Kilimanjaro",     opts:["Kilimanjaro","Monte Kenia","Ras Dashen","Mont Cameroun"]},
      {q:"¿En qué país está el Machu Picchu?",                     a:"Perú",            opts:["Perú","Bolivia","Ecuador","Colombia"]},
      {q:"¿Cuál es el mar interior más salado del mundo?",         a:"Mar Muerto",      opts:["Mar Muerto","Mar Caspio","Mar Rojo","Mar Aral"]},
      {q:"¿Qué país ocupa la península arábiga en su mayor parte?",a:"Arabia Saudí",    opts:["Arabia Saudí","Yemen","Omán","Emiratos Árabes"]},
      {q:"¿Cuál es la capital de Japón?",                          a:"Tokio",           opts:["Tokio","Osaka","Kioto","Hiroshima"]},
      {q:"¿En qué continente está Nueva Zelanda?",                 a:"Oceanía",         opts:["Oceanía","Asia","Australia (continente)","Pacífico"]},
    ],
    avanzado: [
      {q:"¿Cuál es la capital de Kazajistán?",                     a:"Astana",          opts:["Astana","Almaty","Shymkent","Aktobe"]},
      {q:"¿Qué país tiene mayor extensión en África?",             a:"Argelia",         opts:["Argelia","Congo","Sudán","Libia"]},
      {q:"¿Cuál es el país con mayor densidad de población?",      a:"Mónaco",          opts:["Mónaco","Singapur","Bahréin","Bangladesh"]},
      {q:"¿En qué país está el desierto de Atacama?",              a:"Chile",           opts:["Chile","Perú","Bolivia","Argentina"]},
      {q:"¿Qué río tiene el mayor caudal del mundo?",              a:"Amazonas",        opts:["Amazonas","Nilo","Congo","Yangtsé"]},
      {q:"¿En qué país está el volcán Etna?",                      a:"Italia (Sicilia)",opts:["Italia","Grecia","Islandia","España"]},
      {q:"¿Cuál es la capital de Namibia?",                        a:"Windhoek",        opts:["Windhoek","Luanda","Harare","Lusaka"]},
      {q:"¿Dónde está la fosa de las Marianas?",                   a:"Océano Pacífico", opts:["Océano Pacífico","Atlántico","Índico","Mediterráneo"]},
      {q:"¿Cuál es el punto más bajo de la Tierra en tierra firme?",a:"Orillas del Mar Muerto",opts:["Orillas del Mar Muerto","Valle de la Muerte","Lago Assal","Delta del Nilo"]},
      {q:"¿Qué cordillera separa Europa de Asia?",                 a:"Los Urales",      opts:["Los Urales","Los Cárpatos","El Cáucaso","Los Balcanes"]},
      {q:"¿Cuál es la capital de Mongolia?",                       a:"Ulán Bator",      opts:["Ulán Bator","Astana","Bishkek","Taskent"]},
      {q:"¿En qué país está la ciudad de Tombuctú?",               a:"Malí",            opts:["Malí","Mauritania","Níger","Senegal"]},
      {q:"¿Cuál es el único continente sin países independientes?", a:"Antártida",       opts:["Antártida","Ártico","Groenlandia","Islandia"]},
      {q:"¿Qué países de América del Sur no tienen salida al mar?", a:"Bolivia y Paraguay",opts:["Bolivia y Paraguay","Solo Bolivia","Solo Paraguay","Ecuador"]},
      {q:"¿Cuál es la capital de Bielorrusia?",                    a:"Minsk",           opts:["Minsk","Kiev","Riga","Vilna"]},
      {q:"¿En qué país está el lago Titicaca a mayor altitud?",    a:"Bolivia y Perú",  opts:["Bolivia y Perú (frontera)","Solo Bolivia","Solo Perú","Chile"]},
      {q:"¿Cuál es el país hispanohablante con mayor superficie?",  a:"Argentina",       opts:["Argentina","México","Perú","Bolivia"]},
      {q:"¿En qué ciudad está la mezquita Masjid al-Haram?",       a:"La Meca",         opts:["La Meca","Medina","Estambul","El Cairo"]},
      {q:"¿Qué país tiene más fronteras terrestres?",              a:"China y Rusia (14 c/u)",opts:["China y Rusia, ambos con 14","Rusia con 16","Brasil con 10","China con 18"]},
      {q:"¿Cuál es la capital de Uzbekistán?",                     a:"Taskent",         opts:["Taskent","Samarcanda","Bujara","Namangan"]},
      {q:"¿En qué océano están las islas Galápagos?",              a:"Pacífico",        opts:["Pacífico","Atlántico","Índico","Caribe"]},
      {q:"¿Qué ciudad fue capital del Imperio Otomano?",           a:"Constantinopla (actual Estambul)",opts:["Constantinopla","Ankara","Bagdad","El Cairo"]},
      {q:"¿Cuál es el río más largo de España?",                   a:"Tajo",            opts:["Tajo","Ebro","Guadalquivir","Duero"]},
      {q:"¿En qué país está el monte Fuji?",                       a:"Japón",           opts:["Japón","China","Corea del Sur","Vietnam"]},
      {q:"¿Cuál es la capital de Islandia?",                       a:"Reikiavik",       opts:["Reikiavik","Bergen","Helsinki","Tallin"]},
    ],
  },
  historia: {
    basico: [
      {q:"¿En qué año llegó Cristóbal Colón a América?",            a:"1492",            opts:["1492","1519","1620","1776"]},
      {q:"¿Quién fue el primer hombre en pisar la Luna?",           a:"Neil Armstrong",  opts:["Neil Armstrong","Buzz Aldrin","Yuri Gagarin","John Glenn"]},
      {q:"¿En qué país están las pirámides de Guiza?",              a:"Egipto",          opts:["Egipto","México","Perú","Sudán"]},
      {q:"¿Quién inventó el teléfono?",                             a:"Alexander Graham Bell",opts:["Alexander Graham Bell","Thomas Edison","Nikola Tesla","Samuel Morse"]},
      {q:"¿Qué rey legendario sacó una espada de una piedra?",      a:"El Rey Arturo",   opts:["El Rey Arturo","El Rey Salomón","Carlomagno","El Rey Leonidas"]},
      {q:"¿Quién fue el primer presidente de Estados Unidos?",      a:"George Washington",opts:["George Washington","Abraham Lincoln","Thomas Jefferson","Benjamin Franklin"]},
      {q:"¿Quién circunnavegó la Tierra por primera vez?",          a:"Magallanes y Elcano",opts:["Magallanes y Elcano","Cristóbal Colón","Vasco de Gama","Francis Drake"]},
      {q:"¿Cuándo empezó la Segunda Guerra Mundial?",               a:"1939",            opts:["1939","1941","1914","1945"]},
      {q:"¿Quién inventó la bombilla eléctrica?",                   a:"Thomas Edison",   opts:["Thomas Edison","Nikola Tesla","Albert Einstein","Benjamin Franklin"]},
      {q:"¿En qué año terminó la Segunda Guerra Mundial?",          a:"1945",            opts:["1945","1918","1950","1939"]},
      {q:"¿Quién descubrió la penicilina?",                         a:"Alexander Fleming",opts:["Alexander Fleming","Louis Pasteur","Marie Curie","Isaac Newton"]},
      {q:"¿Cómo se llamaba el caballo del Cid Campeador?",          a:"Babieca",         opts:["Babieca","Rocinante","Bucéfalo","Tornado"]},
      {q:"¿Qué ciudad fue destruida por el Vesubio en el año 79?",  a:"Pompeya",         opts:["Pompeya","Roma","Atenas","Cartago"]},
      {q:"¿Quién fue la primera mujer en ganar el Nobel?",          a:"Marie Curie",     opts:["Marie Curie","Ada Lovelace","Florence Nightingale","Amelia Earhart"]},
      {q:"¿En qué año llegó el hombre a la Luna?",                  a:"1969",            opts:["1969","1961","1975","1957"]},
      {q:"¿Cómo se llamaba la famosa reina de Egipto?",             a:"Cleopatra",       opts:["Cleopatra","Nefertiti","Hatshepsut","Isis"]},
      {q:"¿Qué civilización construyó el Coliseo de Roma?",         a:"Los romanos",     opts:["Los romanos","Los griegos","Los egipcios","Los etruscos"]},
      {q:"¿En qué año fue la Revolución Francesa?",                 a:"1789",            opts:["1789","1776","1815","1848"]},
      {q:"¿Cómo se llamaba el primer satélite artificial?",         a:"Sputnik",         opts:["Sputnik","Apollo","Vostok","Explorer"]},
      {q:"¿En qué año se independizó Estados Unidos?",              a:"1776",            opts:["1776","1783","1765","1789"]},
      {q:"¿Quién pintó la Mona Lisa?",                              a:"Leonardo da Vinci",opts:["Leonardo da Vinci","Miguel Ángel","Rafael","Botticelli"]},
      {q:"¿Qué cataclismo hundió el Titanic?",                      a:"Un iceberg",      opts:["Un iceberg","Una tormenta","Una bomba","Un arrecife"]},
      {q:"¿En qué año cayó el Imperio Romano de Occidente?",        a:"476 d.C.",        opts:["476 d.C.","395 d.C.","1453 d.C.","312 d.C."]},
      {q:"¿Quién fue Galileo Galilei?",                             a:"Astrónomo y científico italiano",opts:["Astrónomo y científico italiano","Pintor renacentista","Explorador español","Filósofo griego"]},
      {q:"¿Qué animal simbolizaba el poder en el Antiguo Egipto?",  a:"El gato",         opts:["El gato","El perro","El caballo","El cocodrilo"]},
    ],
    medio: [
      {q:"¿En qué año se descubrió la tumba de Tutankamón?",        a:"1922",            opts:["1922","1898","1945","1910"]},
      {q:"¿Quién fue el líder de la Revolución Cubana?",            a:"Fidel Castro",    opts:["Fidel Castro","Che Guevara","Camilo Cienfuegos","Raúl Castro"]},
      {q:"¿En qué año cayó el Muro de Berlín?",                     a:"1989",            opts:["1989","1991","1985","1975"]},
      {q:"¿En qué batalla fue derrotado Napoleón definitivamente?",  a:"Waterloo",        opts:["Waterloo","Trafalgar","Austerlitz","Borodino"]},
      {q:"¿Quién fue el líder de la India en su independencia?",    a:"Mahatma Gandhi",  opts:["Mahatma Gandhi","Jawaharlal Nehru","Subhas Chandra Bose","Indira Gandhi"]},
      {q:"¿En qué año comenzó la Primera Guerra Mundial?",          a:"1914",            opts:["1914","1917","1912","1939"]},
      {q:"¿Cuál fue el primer país en conceder el voto a la mujer?",a:"Nueva Zelanda",   opts:["Nueva Zelanda","Estados Unidos","Reino Unido","Suecia"]},
      {q:"¿En qué año fue la Revolución Rusa?",                     a:"1917",            opts:["1917","1905","1922","1914"]},
      {q:"¿Quién fue el último zar de Rusia?",                      a:"Nicolás II",      opts:["Nicolás II","Alejandro III","Alejandro II","Pablo I"]},
      {q:"¿Qué tratado puso fin a la Primera Guerra Mundial?",      a:"Tratado de Versalles",opts:["Tratado de Versalles","Tratado de París","Tratado de Utrecht","Paz de Westfalia"]},
      {q:"¿Quién diseñó la cúpula de la catedral de Florencia?",    a:"Brunelleschi",    opts:["Brunelleschi","Leonardo da Vinci","Miguel Ángel","Rafael"]},
      {q:"¿Cuándo comenzó aproximadamente la Guerra Fría?",         a:"1947",            opts:["1947","1945","1950","1953"]},
      {q:"¿Cuál fue la primera civilización en desarrollar escritura?",a:"Los sumerios", opts:["Los sumerios","Los egipcios","Los chinos","Los fenicios"]},
      {q:"¿En qué año se firmó la Constitución española vigente?",  a:"1978",            opts:["1978","1975","1981","1982"]},
      {q:"¿Quién fue el general que conquistó México para España?",  a:"Hernán Cortés",  opts:["Hernán Cortés","Francisco Pizarro","Vasco Núñez de Balboa","Diego de Almagro"]},
      {q:"¿En qué año ocurrió la batalla de Lepanto?",              a:"1571",            opts:["1571","1492","1588","1648"]},
      {q:"¿Quién fundó el Imperio Mongol?",                         a:"Gengis Kan",      opts:["Gengis Kan","Tamerlán","Kublai Kan","Atila"]},
      {q:"¿En qué año se proclamó la Segunda República española?",  a:"1931",            opts:["1931","1923","1936","1939"]},
      {q:"¿Quién fue el dictador de España en el siglo XX?",        a:"Francisco Franco",opts:["Francisco Franco","Miguel Primo de Rivera","Emilio Mola","José Millán-Astray"]},
      {q:"¿Qué explorador llegó primero al Polo Sur?",              a:"Roald Amundsen",  opts:["Roald Amundsen","Robert Scott","Ernest Shackleton","Richard Byrd"]},
      {q:"¿En qué año se abolió la esclavitud en EEUU?",            a:"1865",            opts:["1865","1848","1877","1860"]},
      {q:"¿Qué evento marcó el inicio de la Gran Depresión?",       a:"Crack bursátil de 1929",opts:["Crack bursátil de 1929","Crisis del petróleo 1973","Guerra de Corea 1950","Huelgas de 1919"]},
      {q:"¿Cuándo se fundó la ONU?",                                a:"1945",            opts:["1945","1919","1939","1948"]},
      {q:"¿En qué año se reunificó Alemania?",                      a:"1990",            opts:["1990","1989","1991","1988"]},
      {q:"¿Quién fue el primer hombre en orbitar la Tierra?",       a:"Yuri Gagarin",    opts:["Yuri Gagarin","Neil Armstrong","Alan Shepard","John Glenn"]},
    ],
    avanzado: [
      {q:"¿En qué año comenzó la Guerra del Peloponeso?",           a:"431 a.C.",        opts:["431 a.C.","480 a.C.","404 a.C.","500 a.C."]},
      {q:"¿En qué año fue asesinado Julio César?",                  a:"44 a.C.",         opts:["44 a.C.","63 a.C.","27 a.C.","30 a.C."]},
      {q:"¿Quién fue el primer rey Borbón en España?",              a:"Felipe V",        opts:["Felipe V","Carlos II","Luis I","Fernando VI"]},
      {q:"¿En qué año comenzó la Guerra de los Treinta Años?",      a:"1618",            opts:["1618","1648","1598","1625"]},
      {q:"¿Quién escribió 'El Arte de la Guerra'?",                 a:"Sun Tzu",         opts:["Sun Tzu","Maquiavelo","Clausewitz","Tucídides"]},
      {q:"¿Cuál fue el tratado que terminó la Guerra de los 30 años?",a:"Paz de Westfalia",opts:["Paz de Westfalia","Tratado de Utrecht","Paz de Augsburgo","Tratado de Verdún"]},
      {q:"¿En qué año murió Alejandro Magno?",                      a:"323 a.C.",        opts:["323 a.C.","356 a.C.","330 a.C.","315 a.C."]},
      {q:"¿En qué año cayó Constantinopla ante los otomanos?",      a:"1453",            opts:["1453","1389","1402","1571"]},
      {q:"¿Quién fundó el primer Imperio Persa?",                   a:"Ciro el Grande",  opts:["Ciro el Grande","Darío I","Jerjes I","Artajerjes I"]},
      {q:"¿En qué año fue la Revolución Gloriosa inglesa?",         a:"1688",            opts:["1688","1649","1660","1707"]},
      {q:"¿Quién fue el primer Califa del Islam?",                  a:"Abu Bakr",        opts:["Abu Bakr","Umar ibn al-Jattab","Alí ibn Abi Talib","Uthman ibn Affan"]},
      {q:"¿Qué batalla marcó el fin del dominio cartaginés?",       a:"Batalla de Zama (202 a.C.)",opts:["Zama (202 a.C.)","Cannae","Trebia","Metauro"]},
      {q:"¿En qué año se proclamó el II Reich alemán?",             a:"1871",            opts:["1871","1866","1848","1890"]},
      {q:"¿En qué año la batalla de Poitiers detuvo a los árabes?", a:"732",             opts:["732","711","622","800"]},
      {q:"¿Cuánto duró el reinado de Luis XIV de Francia?",         a:"72 años (1643-1715)",opts:["72 años","55 años","45 años","63 años"]},
      {q:"¿Qué evento inició la Reforma protestante en 1517?",      a:"Lutero publicó sus 95 tesis",opts:["Lutero publicó sus 95 tesis","Creación del anglicanismo","La Dieta de Worms","La Paz de Augsburgo"]},
      {q:"¿Quién fue el primer emperador chino unificador?",        a:"Qin Shi Huang",   opts:["Qin Shi Huang","Han Wudi","Tang Taizong","Kublai Kan"]},
      {q:"¿En qué año comenzó la Reconquista (batalla de Covadonga)?",a:"722",           opts:["722","711","756","801"]},
      {q:"¿En qué año se firmó la Magna Carta?",                    a:"1215",            opts:["1215","1066","1265","1300"]},
      {q:"¿Qué filósofo fue maestro de Alejandro Magno?",           a:"Aristóteles",     opts:["Aristóteles","Platón","Sócrates","Diógenes"]},
      {q:"¿Cuál fue la primera capital del Imperio Romano?",        a:"Roma",            opts:["Roma","Cartago","Atenas","Alejandría"]},
      {q:"¿En qué año se fundó Constantinopla?",                    a:"330 d.C.",        opts:["330 d.C.","476 d.C.","284 d.C.","395 d.C."]},
      {q:"¿Qué dinastía construyó el Taj Mahal?",                   a:"Imperio mogol",   opts:["Imperio mogol","Imperio Gupta","Imperio Maurya","Sultanato de Delhi"]},
      {q:"¿En qué año Napoleón fue coronado emperador?",            a:"1804",            opts:["1804","1799","1810","1815"]},
      {q:"¿Quién lideró la Revolución Americana frente a los británicos?",a:"George Washington",opts:["George Washington","Benjamin Franklin","Thomas Jefferson","John Adams"]},
    ],
  },
  espectaculos: {
    basico: [
      {q:"¿Quién es el protagonista de 'El Rey León'?",             a:"Simba",           opts:["Simba","Mufasa","Nala","Timón"]},
      {q:"¿De qué color es el traje de Superman?",                  a:"Azul y rojo",     opts:["Azul y rojo","Verde y negro","Amarillo y azul","Rojo y verde"]},
      {q:"¿Cómo se llama la princesa de 'Frozen' que tiene poderes?",a:"Elsa",           opts:["Elsa","Ana","Bella","Ariel"]},
      {q:"¿Qué animal es Dumbo?",                                   a:"Un elefante",     opts:["Un elefante","Un burro","Un cerdo","Un caballo"]},
      {q:"¿En qué película aparece la canción 'Hakuna Matata'?",    a:"El Rey León",     opts:["El Rey León","La Sirenita","Aladdin","El Libro de la Selva"]},
      {q:"¿Cómo se llama el cowboy de Toy Story?",                  a:"Woody",           opts:["Woody","Buzz","Jessie","Rex"]},
      {q:"¿Quién es el villano de La Bella y la Bestia?",           a:"Gastón",          opts:["Gastón","Maléfica","Úrsula","Jafar"]},
      {q:"¿Cómo se llama el pez payaso de 'Buscando a Nemo'?",      a:"Nemo",            opts:["Nemo","Dory","Marlin","Gill"]},
      {q:"¿Qué superpoder tiene Spider-Man?",                       a:"Trepar paredes y lanzar telarañas",opts:["Trepar paredes y lanzar telarañas","Volar","Ser invisible","Controlar el fuego"]},
      {q:"¿Cómo se llama la bruja de 'La Bella Durmiente'?",        a:"Maléfica",        opts:["Maléfica","La Reina Malvada","Úrsula","Cruella de Vil"]},
      {q:"¿En qué ciudad vive Batman?",                             a:"Ciudad Gótica",   opts:["Ciudad Gótica","Metrópolis","Nueva York","Chicago"]},
      {q:"¿Cuántos enanitos hay en Blancanieves?",                  a:"7",               opts:["7","5","8","6"]},
      {q:"¿Qué personaje dice '¡Al infinito y más allá!'?",         a:"Buzz Lightyear",  opts:["Buzz Lightyear","Woody","Nemo","Shrek"]},
      {q:"¿Cómo se llama la princesa de 'La Sirenita'?",            a:"Ariel",           opts:["Ariel","Bella","Rapunzel","Cenicienta"]},
      {q:"¿Cómo se llama el ogro verde famoso del cine animado?",   a:"Shrek",           opts:["Shrek","Fiona","Burro","Gato con Botas"]},
      {q:"¿Quién es el enemigo principal de Mario Bros?",           a:"Bowser",          opts:["Bowser","Donkey Kong","Yoshi","Wario"]},
      {q:"¿De qué color es Pikachu?",                               a:"Amarillo",        opts:["Amarillo","Rojo","Azul","Verde"]},
      {q:"¿Qué busca el Hombre de Hojalata en El Mago de Oz?",      a:"Un corazón",      opts:["Un corazón","Un cerebro","Valor","Un hogar"]},
      {q:"¿Cómo se llama el dinosaurio de Toy Story?",              a:"Rex",             opts:["Rex","Dino","Spike","T-Rex"]},
      {q:"¿Quién tiene la varita mágica en 'Cenicienta'?",          a:"El Hada Madrina", opts:["El Hada Madrina","El Príncipe","El Gato","La Reina"]},
      {q:"¿Qué personaje de Disney tiene una nariz que crece al mentir?",a:"Pinocho",    opts:["Pinocho","Geppetto","Pepito Grillo","El Zorro"]},
      {q:"¿Cómo se llama el genio de la lámpara de Aladdin?",       a:"Genio",           opts:["Genio","Aladdín","Jafar","Abu"]},
      {q:"¿En qué océano navega el Capitán Garfio?",                a:"Los Mares de Nunca Jamás",opts:["Los Mares de Nunca Jamás","El Caribe","El Pacífico","El Atlántico"]},
      {q:"¿Cómo se llama la niña protagonista de 'Brave' (Indomable)?",a:"Mérida",       opts:["Mérida","Moana","Rapunzel","Tiana"]},
      {q:"¿De qué están hechos los personajes de Inside Out (Del Revés)?",a:"Son las emociones",opts:["Son las emociones de una niña","Son robots","Son seres mágicos","Son alienígenas"]},
    ],
    medio: [
      {q:"¿Quién interpretó a Iron Man en el UCM?",                 a:"Robert Downey Jr.",opts:["Robert Downey Jr.","Chris Evans","Chris Hemsworth","Mark Ruffalo"]},
      {q:"¿En qué año se estrenó la primera película de Star Wars?",a:"1977",            opts:["1977","1980","1983","1999"]},
      {q:"¿Quién cantó 'Thriller'?",                                a:"Michael Jackson", opts:["Michael Jackson","Prince","Elvis Presley","David Bowie"]},
      {q:"¿Quién creó los personajes de Los Simpson?",              a:"Matt Groening",   opts:["Matt Groening","Seth MacFarlane","Mike Judge","John Kricfalusi"]},
      {q:"¿En qué año se lanzó el primer iPhone?",                  a:"2007",            opts:["2007","2005","2009","2010"]},
      {q:"¿Qué grupo musical cantó 'Bohemian Rhapsody'?",           a:"Queen",           opts:["Queen","The Beatles","Led Zeppelin","Pink Floyd"]},
      {q:"¿Cuántas temporadas tiene 'Juego de Tronos'?",            a:"8",               opts:["8","6","7","10"]},
      {q:"¿Quién es el director de 'El Padrino'?",                  a:"Francis Ford Coppola",opts:["Francis Ford Coppola","Martin Scorsese","Steven Spielberg","Brian De Palma"]},
      {q:"¿En qué ciudad transcurre 'Stranger Things'?",            a:"Hawkins, Indiana",opts:["Hawkins, Indiana","Springfield","Castle Rock","Riverdale"]},
      {q:"¿Qué película ganó el Oscar a Mejor Película en 2020?",   a:"Parasite",        opts:["Parasite","1917","Joker","Once Upon a Time in Hollywood"]},
      {q:"¿Quién compuso la banda sonora de 'Star Wars'?",          a:"John Williams",   opts:["John Williams","Hans Zimmer","Ennio Morricone","Danny Elfman"]},
      {q:"¿En qué año se fundó Netflix?",                           a:"1997",            opts:["1997","2000","2007","2010"]},
      {q:"¿Quién interpretó a Hannibal Lecter en 'El Silencio de los Corderos'?",a:"Anthony Hopkins",opts:["Anthony Hopkins","Brian Cox","Mads Mikkelsen","Kevin Spacey"]},
      {q:"¿De qué país es la cantante Shakira?",                    a:"Colombia",        opts:["Colombia","Venezuela","Argentina","Brasil"]},
      {q:"¿Qué serie tiene como personaje principal a Link?",       a:"The Legend of Zelda",opts:["The Legend of Zelda","Final Fantasy","Kingdom Hearts","Dark Souls"]},
      {q:"¿Quién escribió 'El Señor de los Anillos'?",              a:"J.R.R. Tolkien",  opts:["J.R.R. Tolkien","C.S. Lewis","George R.R. Martin","J.K. Rowling"]},
      {q:"¿Qué actor dio vida a Batman en 'El Caballero Oscuro'?",  a:"Christian Bale",  opts:["Christian Bale","Ben Affleck","Val Kilmer","George Clooney"]},
      {q:"¿En qué año se estrenó 'Titanic' de James Cameron?",      a:"1997",            opts:["1997","1995","1999","2001"]},
      {q:"¿Quién es el director de 'El Señor de los Anillos'?",     a:"Peter Jackson",   opts:["Peter Jackson","Steven Spielberg","James Cameron","Ridley Scott"]},
      {q:"¿De qué país son los BTS?",                               a:"Corea del Sur",   opts:["Corea del Sur","Japón","China","Corea del Norte"]},
      {q:"¿Qué personaje principal interpreta Keanu Reeves en 'Matrix'?",a:"Neo",        opts:["Neo","Morpheus","El Agente Smith","Tank"]},
      {q:"¿En qué película aparece el personaje de Hermione Granger?",a:"Harry Potter",  opts:["Harry Potter","El Señor de los Anillos","Narnia","La Brújula Dorada"]},
      {q:"¿Quién canta 'Bad Guy'?",                                 a:"Billie Eilish",   opts:["Billie Eilish","Olivia Rodrigo","Ariana Grande","Dua Lipa"]},
      {q:"¿Cuántas Infinity Stones hay en el UCM?",                 a:"6",               opts:["6","5","7","4"]},
      {q:"¿Qué actriz interpreta a Katniss en 'Los Juegos del Hambre'?",a:"Jennifer Lawrence",opts:["Jennifer Lawrence","Emma Watson","Kristen Stewart","Shailene Woodley"]},
    ],
    avanzado: [
      {q:"¿Quién dirigió '2001: Una Odisea del Espacio'?",           a:"Stanley Kubrick", opts:["Stanley Kubrick","Ridley Scott","Steven Spielberg","Orson Welles"]},
      {q:"¿En qué año se grabó 'Sgt. Pepper's Lonely Hearts Club Band'?",a:"1967",       opts:["1967","1965","1969","1966"]},
      {q:"¿Quién compuso la ópera 'La Traviata'?",                   a:"Giuseppe Verdi", opts:["Giuseppe Verdi","Wolfgang Amadeus Mozart","Giacomo Puccini","Gaetano Donizetti"]},
      {q:"¿Qué película ganó la Palma de Oro en Cannes 2019?",       a:"Parasite (Bong Joon-ho)",opts:["Parasite","Once Upon a Time in Hollywood","Portrait of a Lady on Fire","The Irishman"]},
      {q:"¿Qué compositor es conocido por la 'Sinfonía Inconclusa' (N.º 8)?",a:"Franz Schubert",opts:["Franz Schubert","Beethoven","Brahms","Dvorák"]},
      {q:"¿En qué año debutó David Bowie con 'Space Oddity'?",       a:"1969",           opts:["1969","1972","1967","1971"]},
      {q:"¿Quién dirigió 'Rashomon' (1950)?",                        a:"Akira Kurosawa", opts:["Akira Kurosawa","Yasujiro Ozu","Kenji Mizoguchi","Nagisa Oshima"]},
      {q:"¿Qué músico compuso 'La consagración de la primavera'?",   a:"Igor Stravinsky",opts:["Igor Stravinsky","Prokofiev","Shostakovich","Debussy"]},
      {q:"¿Quién escribió la obra 'Esperando a Godot'?",             a:"Samuel Beckett", opts:["Samuel Beckett","Eugene Ionesco","Harold Pinter","Jean-Paul Sartre"]},
      {q:"¿Quién pintó 'Las Meninas'?",                              a:"Diego Velázquez",opts:["Diego Velázquez","Francisco Goya","Murillo","El Greco"]},
      {q:"¿Qué película muda dirigió Fritz Lang en 1927?",           a:"Metrópolis",     opts:["Metrópolis","El gabinete del Dr. Caligari","Nosferatu","El acorazado Potemkin"]},
      {q:"¿Qué artista es conocida por sus arañas gigantes 'Maman'?",a:"Louise Bourgeois",opts:["Louise Bourgeois","Yayoi Kusama","Marina Abramovic","Cindy Sherman"]},
      {q:"¿Quién dirige la trilogía 'Before Sunrise, Sunset, Midnight'?",a:"Richard Linklater",opts:["Richard Linklater","Jim Jarmusch","Wim Wenders","Wong Kar-wai"]},
      {q:"¿Qué cantante de jazz es conocida como 'Lady Day'?",       a:"Billie Holiday", opts:["Billie Holiday","Ella Fitzgerald","Nina Simone","Sarah Vaughan"]},
      {q:"¿Quién compuso 'Las Cuatro Estaciones'?",                  a:"Antonio Vivaldi",opts:["Antonio Vivaldi","Bach","Händel","Corelli"]},
      {q:"¿Quién fue el primer músico de rock en ganar el Nobel de Literatura?",a:"Bob Dylan",opts:["Bob Dylan","Paul McCartney","Bruce Springsteen","Leonard Cohen"]},
      {q:"¿Qué arquitecto diseñó el Museo Guggenheim de Bilbao?",    a:"Frank Gehry",    opts:["Frank Gehry","Zaha Hadid","Norman Foster","Renzo Piano"]},
      {q:"¿En qué año se estrenó la ópera 'Carmen' de Bizet?",       a:"1875",           opts:["1875","1861","1890","1882"]},
      {q:"¿Quién pintó 'La Persistencia de la Memoria' (relojes derretidos)?",a:"Salvador Dalí",opts:["Salvador Dalí","René Magritte","Max Ernst","Joan Miró"]},
      {q:"¿En qué año nació Mozart?",                                a:"1756",           opts:["1756","1750","1770","1732"]},
      {q:"¿Quién dirigió 'Schindler's List'?",                       a:"Steven Spielberg",opts:["Steven Spielberg","Martin Scorsese","Clint Eastwood","Roman Polanski"]},
      {q:"¿Qué novela inspiró la ópera 'Madama Butterfly'?",         a:"Historia de David Belasco basada en John Luther Long",opts:["Una obra de David Belasco","Una novela de Flaubert","Una obra de Shakespeare","Una historia japonesa anónima"]},
      {q:"¿En qué año publicó Tolkien 'El Señor de los Anillos'?",   a:"1954-1955",      opts:["1954-1955","1937","1965","1948"]},
      {q:"¿Quién fue el director de 'Ciudadano Kane'?",              a:"Orson Welles",   opts:["Orson Welles","Billy Wilder","Howard Hawks","John Huston"]},
      {q:"¿Qué movimiento artístico lideró Andy Warhol?",            a:"Pop Art",        opts:["Pop Art","Arte Abstracto","Expresionismo","Dadaísmo"]},
    ],
  },
  deportes: {
    basico: [
      {q:"¿Cuántos jugadores hay en un equipo de fútbol?",          a:"11",              opts:["11","10","9","12"]},
      {q:"¿En qué deporte se usa una raqueta y pelota amarilla?",   a:"Tenis",           opts:["Tenis","Bádminton","Pádel","Squash"]},
      {q:"¿Cuántos aros tiene el símbolo olímpico?",                a:"5",               opts:["5","4","6","3"]},
      {q:"¿Cuántos jugadores hay en un equipo de baloncesto?",      a:"5",               opts:["5","6","4","7"]},
      {q:"¿Cómo se llama la copa más importante del fútbol mundial?",a:"Copa del Mundo", opts:["Copa del Mundo","Copa América","Eurocopa","Copa Confederaciones"]},
      {q:"¿Cuántos metros mide una piscina olímpica?",              a:"50 metros",       opts:["50 metros","25 metros","100 metros","75 metros"]},
      {q:"¿Qué color es el cinturón más alto en artes marciales?",  a:"Negro",           opts:["Negro","Rojo","Blanco","Azul"]},
      {q:"¿Cuántas personas participan en un relevo de atletismo?", a:"4",               opts:["4","2","6","8"]},
      {q:"¿En qué deporte se divide el partido en 'sets' y 'juegos'?",a:"Tenis",         opts:["Tenis","Volleyball","Bádminton","Pádel"]},
      {q:"¿Cuántos jugadores hay en un equipo de voleibol?",        a:"6",               opts:["6","5","7","9"]},
      {q:"¿Qué deporte practica Rafael Nadal?",                     a:"Tenis",           opts:["Tenis","Pádel","Golf","Squash"]},
      {q:"¿En qué deporte se habla de 'touchdown'?",                a:"Fútbol americano",opts:["Fútbol americano","Rugby","Fútbol","Béisbol"]},
      {q:"¿Qué país ganó el Mundial de fútbol de 2010?",            a:"España",          opts:["España","Alemania","Brasil","Holanda"]},
      {q:"¿Cuántos puntos vale un triple en baloncesto?",           a:"3",               opts:["3","2","1","4"]},
      {q:"¿En qué deporte se usa un puck sobre hielo?",             a:"Hockey sobre hielo",opts:["Hockey sobre hielo","Curling","Patinaje","Bobsled"]},
      {q:"¿Cuántos jugadores participan en total en un partido de fútbol?",a:"22 jugadores",opts:["22 jugadores","18 jugadores","20 jugadores","24 jugadores"]},
      {q:"¿Cómo se llama la vuelta ciclista más famosa de España?", a:"La Vuelta a España",opts:["La Vuelta a España","Tour de Francia","Giro de Italia","Ruta del Sol"]},
      {q:"¿Cuántos sets son al menos necesarios para ganar en tenis?",a:"2 sets (al mejor de 3)",opts:["2 sets","3 sets","1 set","4 sets"]},
      {q:"¿En qué deporte se usa un bate y una pelota blanca?",     a:"Béisbol",         opts:["Béisbol","Cricket","Softball","Polo"]},
      {q:"¿Cuántos goles marcó España en la final del Mundial 2010?",a:"1",              opts:["1","2","3","0"]},
      {q:"¿Cuál es la distancia de un sprint olímpico más corto?",  a:"100 metros",      opts:["100 metros","50 metros","200 metros","400 metros"]},
      {q:"¿De qué material está hecho un balón de fútbol?",         a:"Cuero sintético o natural",opts:["Cuero sintético o natural","Goma","Plástico duro","Tela"]},
      {q:"¿En qué país se crearon los Juegos Olímpicos?",           a:"Grecia",          opts:["Grecia","Italia","Francia","Gran Bretaña"]},
      {q:"¿Qué equipo juega sus partidos en el Camp Nou?",          a:"FC Barcelona",    opts:["FC Barcelona","Real Madrid","Atlético de Madrid","Valencia"]},
      {q:"¿Cuántos periodos hay en un partido de hockey sobre hielo?",a:"3",             opts:["3","2","4","1"]},
    ],
    medio: [
      {q:"¿Cuántos Grand Slams ganó Nadal (hasta 2022)?",           a:"22",              opts:["22","20","21","23"]},
      {q:"¿En qué ciudad se celebraron los JJ.OO. de 1992?",        a:"Barcelona",       opts:["Barcelona","Madrid","Sevilla","Valencia"]},
      {q:"¿Cuál es el récord mundial de los 100 metros lisos (hombres)?",a:"9.58 s (Usain Bolt)",opts:["9.58 s","9.69 s","9.74 s","9.50 s"]},
      {q:"¿Qué equipo ha ganado más Champions League?",             a:"Real Madrid",     opts:["Real Madrid","AC Milan","Bayern Munich","Barcelona"]},
      {q:"¿En qué año fue la primera Eurocopa de fútbol?",          a:"1960",            opts:["1960","1964","1968","1956"]},
      {q:"¿En qué deporte compite Pau Gasol?",                      a:"Baloncesto",      opts:["Baloncesto","Balonmano","Voleibol","Rugby"]},
      {q:"¿Cuántos mundiales de F1 ganó Michael Schumacher?",       a:"7",               opts:["7","5","6","8"]},
      {q:"¿Cuál es la distancia oficial de un maratón?",            a:"42,195 km",       opts:["42,195 km","40 km","45 km","50 km"]},
      {q:"¿Qué equipo ganó el primer Mundial de fútbol en 1930?",   a:"Uruguay",         opts:["Uruguay","Argentina","Brasil","Italia"]},
      {q:"¿Cuántos títulos de Wimbledon ha ganado Roger Federer?",  a:"8",               opts:["8","7","9","6"]},
      {q:"¿Qué piloto de F1 ganó el mundial en 2021?",              a:"Max Verstappen",  opts:["Max Verstappen","Lewis Hamilton","Valtteri Bottas","Charles Leclerc"]},
      {q:"¿Cuántas medallas olímpicas ganó Michael Phelps en total?",a:"28 medallas",    opts:["28 medallas","23 medallas","25 medallas","30 medallas"]},
      {q:"¿Qué selección ganó el Mundial de fútbol de 2014?",       a:"Alemania",        opts:["Alemania","Argentina","Brasil","Francia"]},
      {q:"¿En qué año empezó la NBA?",                              a:"1946",            opts:["1946","1950","1936","1960"]},
      {q:"¿Quién tiene más Balones de Oro en la historia (hasta 2023)?",a:"Lionel Messi (8)",opts:["Lionel Messi","Cristiano Ronaldo","Ronaldo Nazário","Michel Platini"]},
      {q:"¿Qué jugador de baloncesto es conocido como 'Air Jordan'?",a:"Michael Jordan", opts:["Michael Jordan","LeBron James","Kobe Bryant","Scottie Pippen"]},
      {q:"¿Cuántos veces ganó Miguel Induráin el Tour de Francia?", a:"5 veces consecutivas",opts:["5 veces consecutivas","3 veces","7 veces","4 veces"]},
      {q:"¿En qué año debutó Messi en el primer equipo del Barça?", a:"2004",            opts:["2004","2003","2005","2006"]},
      {q:"¿Cuántos Grand Slams tiene Djokovic hasta 2023?",         a:"24",              opts:["24","22","20","21"]},
      {q:"¿Qué país ganó el Mundial de fútbol de 2022?",            a:"Argentina",       opts:["Argentina","Francia","Brasil","Croacia"]},
      {q:"¿En qué año España ganó su segunda Eurocopa consecutiva?",a:"2012",            opts:["2012","2016","2008","2020"]},
      {q:"¿Quién es el máximo goleador de los mundiales (histórico)?",a:"Miroslav Klose (16 goles)",opts:["Miroslav Klose (16)","Ronaldo (15)","Gerd Müller (14)","Messi (13)"]},
      {q:"¿En qué año se introdujo el VAR en los mundiales de fútbol?",a:"2018",         opts:["2018","2014","2022","2016"]},
      {q:"¿Cuál es el récord de velocidad en F1 (km/h)?",           a:"Más de 370 km/h",opts:["Más de 370 km/h","Menos de 350 km/h","Exactamente 400 km/h","Más de 450 km/h"]},
      {q:"¿Quién fue el primer tenista en ganar el Golden Slam?",   a:"Steffi Graf (1988)",opts:["Steffi Graf (1988)","Martina Navratilova","Serena Williams","Andre Agassi"]},
    ],
    avanzado: [
      {q:"¿En qué año se fundó el fútbol moderno (primeras reglas escritas)?",a:"1863",  opts:["1863","1872","1850","1880"]},
      {q:"¿Cuál es la distancia de un triatlón olímpico?",          a:"1.5 km natación + 40 km ciclismo + 10 km carrera",opts:["1.5+40+10 km","3.8+180+42 km (Ironman)","750m+20+5 km","2+50+15 km"]},
      {q:"¿Qué equipo ganó la primera Copa de Europa de fútbol?",   a:"Real Madrid (1956)",opts:["Real Madrid","AC Milan","Benfica","Barcelona"]},
      {q:"¿Cuántas veces ha ganado Brasil el Mundial de fútbol?",   a:"5",               opts:["5","4","6","7"]},
      {q:"¿En qué año ganó España su primera Eurocopa?",            a:"1964",            opts:["1964","1984","2008","1960"]},
      {q:"¿Cuántos puntos se necesitan para ganar un set de tenis?",a:"Al menos 6 juegos con 2 de diferencia",opts:["6 juegos con 2 de ventaja","Exactamente 6 juegos","7 juegos siempre","5 juegos con 2 de ventaja"]},
      {q:"¿En qué año se celebraron los primeros JJ.OO. modernos?", a:"1896",            opts:["1896","1900","1888","1904"]},
      {q:"¿Quién tiene el récord de goles en una temporada de la Champions?",a:"Cristiano Ronaldo (17 goles, 2013-14)",opts:["Cristiano Ronaldo (17)","Messi (14)","Lewandowski (15)","Van Nistelrooy (12)"]},
      {q:"¿En qué año ganó España su primer oro olímpico en fútbol?",a:"1992 (Barcelona)",opts:["1992","2000","2004","1984"]},
      {q:"¿Cuántas medallas olímpicas de verano tiene España históricamente?",a:"Más de 150 medallas",opts:["Más de 150 medallas","Menos de 100 medallas","Más de 200 medallas","Exactamente 50 medallas"]},
      {q:"¿Cuál es la fórmula para calcular el IMC (deporte)?",     a:"Peso (kg) / Altura² (m²)",opts:["Peso/Altura²","Peso×Altura","Peso/Altura","Peso²/Altura"]},
      {q:"¿En qué país se celebraron los JJ.OO. de Invierno 2022?", a:"China (Pekín)",   opts:["China","Japón","Corea del Sur","Rusia"]},
      {q:"¿En qué año se fundó el FC Barcelona?",                   a:"1899",            opts:["1899","1900","1902","1895"]},
      {q:"¿En qué año se fundó el Real Madrid?",                    a:"1902",            opts:["1902","1899","1900","1905"]},
      {q:"¿Quién tiene el récord mundial de los 50 m libres en natación?",a:"César Cielo (21.30 s, 2009)",opts:["César Cielo","Michael Phelps","Caeleb Dressel","Nathan Adrian"]},
      {q:"¿En qué equipo jugó Johan Cruyff la mayor parte de su carrera?",a:"Ajax y Barcelona",opts:["Ajax y Barcelona","Solo Ajax","Barça y Real Madrid","Feyenoord y Ajax"]},
      {q:"¿Cuánto pesa oficialmente un balón de fútbol (reglamento FIFA)?",a:"410-450 gramos",opts:["410-450 gramos","350-400 gramos","500-550 gramos","Exactamente 400 g"]},
      {q:"¿Cuántos Grand Slams ganó Pete Sampras?",                 a:"14",              opts:["14","12","17","10"]},
      {q:"¿Cuántos sets puede durar como máximo un partido de Wimbledon masculino?",a:"5 sets",opts:["5 sets","3 sets","7 sets","4 sets"]},
      {q:"¿Qué país ha ganado más veces la Copa Davis de tenis?",   a:"Estados Unidos",  opts:["Estados Unidos","Australia","España","Suecia"]},
      {q:"¿En qué año Ayrton Senna ganó su primer campeonato de F1?",a:"1988",           opts:["1988","1990","1991","1987"]},
      {q:"¿Cuántos goles necesita un equipo para ganar en penaltis (si va 0-0)?",a:"Más que el rival en la tanda",opts:["Más que el rival en la tanda","5 siempre","3 siempre","El primero que falle"]},
      {q:"¿Cuántos equipos participan en la fase de grupos de la Champions (desde 2024)?",a:"36 equipos",opts:["36 equipos","32 equipos","24 equipos","48 equipos"]},
      {q:"¿En qué año LeBron James llegó a la NBA?",                a:"2003",            opts:["2003","2001","2005","2000"]},
      {q:"¿Cuál es el récord de puntos en un partido de la NBA (individual)?",a:"100 puntos (Wilt Chamberlain, 1962)",opts:["100 puntos (Wilt Chamberlain)","81 puntos (Kobe Bryant)","73 puntos (David Thompson)","92 puntos (Elgin Baylor)"]},
    ],
  },
  lengua: {
    basico: [
      {q:"¿Cuántas letras tiene el abecedario español?",            a:"27",              opts:["27","26","28","29"]},
      {q:"¿Cuál de estas palabras es un sustantivo?",               a:"Casa",            opts:["Casa","Correr","Alto","Rápido"]},
      {q:"¿Cómo se escribe correctamente: vaca o baca (animal)?",   a:"Vaca",            opts:["Vaca","Baca","Baka","Vaka"]},
      {q:"¿Cuál es el antónimo (contrario) de 'feliz'?",            a:"Triste",          opts:["Triste","Alegre","Contento","Emocionado"]},
      {q:"¿Qué signo va al final de una pregunta en español?",      a:"?",               opts:["?","!",".","..."]},
      {q:"¿Cuántas vocales tiene el español?",                      a:"5",               opts:["5","4","6","3"]},
      {q:"¿Cuál es el plural de 'ciudad'?",                         a:"Ciudades",        opts:["Ciudades","Ciudads","Ciudes","Ciudes"]},
      {q:"¿Qué es un adjetivo?",                                    a:"Palabra que describe al sustantivo",opts:["Palabra que describe al sustantivo","Palabra de acción","Palabra que une frases","Nombre de persona"]},
      {q:"¿Cuántas sílabas tiene la palabra 'mariposa'?",           a:"4 (ma-ri-po-sa)", opts:["4","3","5","2"]},
      {q:"¿Cuál es el femenino de 'actor'?",                        a:"Actriz",          opts:["Actriz","Actora","Actrisa","La actor"]},
      {q:"¿Qué letra en español nunca se pronuncia?",               a:"La h",            opts:["La h","La r","La w","La y"]},
      {q:"¿Qué tipo de palabra es 'muy'?",                          a:"Adverbio",        opts:["Adverbio","Adjetivo","Sustantivo","Preposición"]},
      {q:"¿Cuál es el sinónimo de 'bonito'?",                       a:"Hermoso",         opts:["Hermoso","Feo","Oscuro","Pequeño"]},
      {q:"¿Cuántas letras tiene la palabra 'elefante'?",            a:"8",               opts:["8","7","9","6"]},
      {q:"¿Cuál es el femenino de 'niño'?",                         a:"Niña",            opts:["Niña","Niños","Niñas","Niñita"]},
      {q:"¿Cuál de estas palabras tiene tilde?",                    a:"Árbol",           opts:["Árbol","Mesa","Casa","Libro"]},
      {q:"¿Cuántas sílabas tiene 'sol'?",                           a:"1 (sol)",         opts:["1","2","3","4"]},
      {q:"¿Qué signo se usa para separar elementos en una lista?",  a:"La coma (,)",     opts:["La coma","El punto","Los dos puntos","El punto y coma"]},
      {q:"¿Cuál es el plural de 'lápiz'?",                          a:"Lápices",         opts:["Lápices","Lápizs","Lápizes","Lapices"]},
      {q:"¿Qué es un verbo?",                                       a:"Palabra que expresa una acción",opts:["Palabra que expresa una acción","Palabra que nombra cosas","Palabra que describe","Palabra que une"]},
      {q:"¿Cómo se escribe el número 100 en letras?",               a:"Cien",            opts:["Cien","Ciento","Sien","Cientos"]},
      {q:"¿Cuál es el antónimo de 'grande'?",                       a:"Pequeño",         opts:["Pequeño","Enorme","Ancho","Alto"]},
      {q:"¿Qué son las mayúsculas?",                                a:"Letras grandes para inicio de frase y nombres propios",opts:["Letras grandes para inicio de frase y nombres propios","Letras decorativas","Letras que van al final","Lo mismo que las minúsculas"]},
      {q:"¿Cuál es el masculino de 'reina'?",                       a:"Rey",             opts:["Rey","Reino","Reino","Reyes"]},
      {q:"¿Qué es una oración?",                                    a:"Conjunto de palabras con sentido completo",opts:["Conjunto de palabras con sentido completo","Una sola palabra","Un párrafo entero","Un acento gráfico"]},
    ],
    medio: [
      {q:"¿Quién escribió 'Don Quijote de la Mancha'?",             a:"Miguel de Cervantes",opts:["Miguel de Cervantes","Lope de Vega","Francisco de Quevedo","Tirso de Molina"]},
      {q:"¿Qué es un oxímoron?",                                    a:"Figura que combina palabras de significado contrario",opts:["Figura que combina palabras contrarias","Repetición de sonidos","Exageración literaria","Comparación con 'como'"]},
      {q:"¿En qué siglo vivió Cervantes?",                          a:"Siglos XVI-XVII (1547-1616)",opts:["Siglos XVI-XVII","Siglo XV","Siglo XVIII","Siglo XIV"]},
      {q:"¿Qué es una metáfora?",                                   a:"Figura que identifica dos cosas por semejanza",opts:["Figura que identifica dos cosas por semejanza","Una exageración","Una repetición","Una pregunta retórica"]},
      {q:"¿Qué son las palabras esdrújulas?",                       a:"Las que llevan acento en la antepenúltima sílaba",opts:["Acento en la antepenúltima sílaba","Acento en la última","Nunca llevan tilde","Tienen doble consonante"]},
      {q:"¿Quién escribió 'Lazarillo de Tormes'?",                  a:"Anónimo",         opts:["Anónimo","Cervantes","Quevedo","Lope de Vega"]},
      {q:"¿Qué es el gerundio?",                                    a:"Forma del verbo que indica acción en curso (-ando/-iendo)",opts:["Forma del verbo en curso (-ando/-iendo)","El tiempo pasado","Un sustantivo verbal","El subjuntivo"]},
      {q:"¿Qué figura literaria es 'Sus cabellos son de oro'?",     a:"Metáfora",        opts:["Metáfora","Comparación (símil)","Hipérbole","Personificación"]},
      {q:"¿En qué consiste el Romanticismo literario?",             a:"Movimiento del s.XIX con énfasis en emoción e individualismo",opts:["Movimiento del s.XIX con emoción e individualismo","Movimiento del s.XVIII basado en la razón","Corriente medieval religiosa","Estilo barroco del s.XVII"]},
      {q:"¿Quién escribió 'La Celestina'?",                         a:"Fernando de Rojas",opts:["Fernando de Rojas","Jorge Manrique","Íñigo López de Mendoza","Juan de Mena"]},
      {q:"¿Qué es la rima consonante?",                             a:"Coincidencia de todos los sonidos desde la última vocal tónica",opts:["Coincidencia de todos los sonidos desde la vocal tónica","Solo coincidencia de vocales","Rima alterna ABAB","Ausencia de rima"]},
      {q:"¿Qué periodo corresponde al 'Siglo de Oro' español?",     a:"Renacimiento y Barroco (ss. XVI-XVII)",opts:["Renacimiento y Barroco","Solo el Renacimiento","Solo el Barroco","El Romanticismo"]},
      {q:"¿Qué es la anáfora?",                                     a:"Repetición de palabras al inicio de versos o frases",opts:["Repetición al inicio de versos o frases","Repetición al final de verso","Omisión de palabras","Cambio de orden"]},
      {q:"¿Cuál es el nombre real del protagonista de Don Quijote?",a:"Alonso Quijano",  opts:["Alonso Quijano","Sancho Panza","Dulcinea","Rocinante"]},
      {q:"¿Qué es el hipérbaton?",                                  a:"Alteración del orden normal de palabras",opts:["Alteración del orden normal de palabras","Repetición de la misma palabra","Uso de campo semántico","Una pregunta retórica"]},
      {q:"¿En qué consiste el realismo mágico?",                    a:"Mezcla de elementos reales y mágicos tratados como igualmente normales",opts:["Mezcla de real y mágico como igualmente normales","Un tipo de surrealismo","Una novela histórica fantástica","Realismo fotográfico"]},
      {q:"¿Qué es el estilo indirecto?",                            a:"Reproducir las palabras de alguien narradas por otra persona",opts:["Reproducir palabras de alguien narradas por otra persona","Citar textualmente con comillas","Narrador omnisciente","Diálogo teatral"]},
      {q:"¿Qué es la perífrasis verbal?",                           a:"Verbo auxiliar + infinitivo/gerundio/participio",opts:["Verbo auxiliar + infinitivo/gerundio/participio","Redundancia verbal","Tiempo compuesto","Conjugación irregular"]},
      {q:"¿Cuál es la diferencia entre 'haber' y 'a ver'?",         a:"'Haber' es verbo auxiliar; 'a ver' es preposición+verbo",opts:["'Haber' es verbo auxiliar; 'a ver' es prep+verbo","Son sinónimos","'A ver' es más formal","Solo cambia en plural"]},
      {q:"¿Qué es un soliloquio?",                                  a:"Monólogo en que el personaje habla solo, reflexionando",opts:["Monólogo reflexivo en que el personaje habla solo","Diálogo entre dos personas","Una canción dramática","Obra de un solo acto"]},
      {q:"¿Quién escribió 'Rimas y leyendas'?",                     a:"Gustavo Adolfo Bécquer",opts:["Gustavo Adolfo Bécquer","Rosalía de Castro","José de Espronceda","Ramón de Campoamor"]},
      {q:"¿Qué corriente literaria representa la Generación del 98?",a:"Regeneracionismo crítico tras el desastre del 98",opts:["Regeneracionismo crítico tras el desastre del 98","Modernismo optimista","Vanguardismo experimental","Costumbrismo regional"]},
      {q:"¿Cuáles son los tres géneros literarios clásicos?",       a:"Lírico, épico/narrativo y dramático",opts:["Lírico, épico/narrativo y dramático","Cuento, novela y poema","Comedia, tragedia y drama","Prosa, verso y diálogo"]},
      {q:"¿Qué es una hipérbole?",                                  a:"Exageración con fines expresivos",opts:["Exageración con fines expresivos","Descripción detallada","Comparación directa","Personificación de objetos"]},
      {q:"¿Quién escribió 'Platero y yo'?",                         a:"Juan Ramón Jiménez",opts:["Juan Ramón Jiménez","Antonio Machado","Federico García Lorca","Miguel de Unamuno"]},
    ],
    avanzado: [
      {q:"¿Qué es el 'stream of consciousness' en literatura?",     a:"Técnica que reproduce pensamientos sin filtro lógico",opts:["Reproduce pensamientos sin filtro lógico","Monólogo dramático","Voz narrativa omnisciente","Narrador no fiable"]},
      {q:"¿Quién propuso el concepto de 'gramática generativa'?",   a:"Noam Chomsky",    opts:["Noam Chomsky","Ferdinand de Saussure","Leonard Bloomfield","Edward Sapir"]},
      {q:"¿En qué consiste el estructuralismo lingüístico de Saussure?",a:"Estudia la lengua como sistema de signos con significante y significado",opts:["Sistema de signos con significante y significado","Análisis del origen histórico","Gramática generativa","Uso social del lenguaje"]},
      {q:"¿Qué es la deixis en lingüística?",                       a:"Palabras cuyo significado depende del contexto (yo, aquí, ahora)",opts:["Palabras cuyo significado depende del contexto","El análisis fonológico","Los conectores discursivos","La entonación"]},
      {q:"¿Quién propuso la teoría de los 'actos de habla'?",       a:"John Langshaw Austin",opts:["John Langshaw Austin","Noam Chomsky","Ferdinand de Saussure","Roman Jakobson"]},
      {q:"¿Qué es la diégesis en narratología?",                    a:"El universo espaciotemporal en que ocurre la historia narrada",opts:["El universo donde ocurre la historia","El ritmo de la narración","El punto de vista del narrador","El tiempo del discurso"]},
      {q:"¿Quién escribió 'Rayuela'?",                              a:"Julio Cortázar",  opts:["Julio Cortázar","Mario Vargas Llosa","Gabriel García Márquez","Jorge Luis Borges"]},
      {q:"¿Qué es la 'mise en abyme' en literatura?",               a:"Una obra dentro de la obra que duplica la narrativa",opts:["Obra dentro de la obra que duplica la narrativa","Narrador autodiegético","Flashback dentro de otro","La metalepsis"]},
      {q:"¿En qué año publicó García Márquez 'Cien años de soledad'?",a:"1967",          opts:["1967","1962","1972","1955"]},
      {q:"¿Qué es la fonología?",                                   a:"Estudio de los fonemas (sonidos distintivos) de una lengua",opts:["Estudio de los fonemas distintivos","Estudio de sonidos físicos del habla","Estudio del ritmo","Estudio de letras y grafías"]},
      {q:"¿Quién es el autor de 'Ficciones'?",                      a:"Jorge Luis Borges",opts:["Jorge Luis Borges","Adolfo Bioy Casares","Ernesto Sabato","Roberto Arlt"]},
      {q:"¿Qué es el 'narrador homodiegético'?",                    a:"Narrador que participa como personaje en la historia",opts:["Narrador que participa como personaje","Narrador externo omnisciente","Narrador en segunda persona","Narrador limitado"]},
      {q:"¿Quién escribió 'La vida es sueño'?",                     a:"Pedro Calderón de la Barca",opts:["Pedro Calderón de la Barca","Lope de Vega","Francisco de Quevedo","Tirso de Molina"]},
      {q:"¿Qué es la pragmática lingüística?",                      a:"Estudia el lenguaje en contexto e intención comunicativa",opts:["Estudia el lenguaje en contexto e intención comunicativa","Estudia la gramática formal","Analiza el origen de palabras","Estudia significados de palabras"]},
      {q:"¿Quién es el autor de 'Pedro Páramo'?",                   a:"Juan Rulfo",      opts:["Juan Rulfo","Carlos Fuentes","Octavio Paz","Agustín Yáñez"]},
      {q:"¿Qué distingue la novela picaresca de otros géneros?",    a:"Narrador-protagonista de bajo origen que vive de engaños",opts:["Narrador-protagonista de bajo origen que vive de engaños","Narrador omnisciente en tercera persona","Protagonista heroico de alta alcurnia","Trama policial"]},
      {q:"¿Quién fue el primer gramático de la lengua española?",   a:"Antonio de Nebrija (1492)",opts:["Antonio de Nebrija (1492)","Francisco de Aldrete","Gonzalo Correas","Juan de Valdés"]},
      {q:"¿Quién escribió los 'Sonetos del amor oscuro'?",          a:"Federico García Lorca",opts:["Federico García Lorca","Rafael Alberti","Luis Cernuda","Pablo Neruda"]},
      {q:"¿Qué es la intertextualidad?",                            a:"Relación entre un texto y otros textos previos",opts:["Relación entre un texto y otros textos previos","Análisis de las fuentes del autor","Crítica literaria comparada","Plagio literario"]},
      {q:"¿Qué caracteriza el Barroco literario español?",          a:"Conceptismo y culteranismo, complejidad y desengaño",opts:["Conceptismo y culteranismo, complejidad y desengaño","Claridad y naturalidad renacentista","Sentimentalismo romántico","Objetividad realista"]},
      {q:"¿Qué es la rima asonante?",                               a:"Coincidencia solo de vocales desde la última vocal tónica",opts:["Coincidencia solo de vocales desde la última vocal tónica","Coincidencia de todos los sonidos","Ausencia total de rima","Rima cruzada ABAB"]},
      {q:"¿Qué es la elipsis narrativa?",                           a:"Omisión de un periodo de tiempo en la narración",opts:["Omisión de un periodo de tiempo en la narración","Resumen de eventos","Repetición de escenas","Anticipación de eventos futuros"]},
      {q:"¿Quién acuñó el término 'realismo mágico'?",              a:"Franz Roh (1925), luego popularizado por García Márquez",opts:["Franz Roh (1925)","García Márquez directamente","Miguel Ángel Asturias","Alejo Carpentier solamente"]},
      {q:"¿Qué corriente literaria representa la obra de Unamuno?", a:"Generación del 98",opts:["Generación del 98","Modernismo","Vanguardismo","Realismo"]},
      {q:"¿Qué es el monólogo interior?",                           a:"Técnica que reproduce el flujo de pensamientos del personaje",opts:["Técnica que reproduce el flujo de pensamientos","El soliloquio teatral","Narración en primera persona","Diálogo filosófico"]},
    ],
  },
  ciencias: {
    basico: [
      {q:"¿Cuántas patas tiene una araña?",                         a:"8",               opts:["8","6","10","4"]},
      {q:"¿De qué se alimentan los herbívoros?",                    a:"De plantas",      opts:["De plantas","De animales","De plantas y animales","De insectos"]},
      {q:"¿Cuál es el planeta más cercano al Sol?",                 a:"Mercurio",        opts:["Mercurio","Venus","Tierra","Marte"]},
      {q:"¿Cómo se llama el proceso de oruga a mariposa?",          a:"Metamorfosis",    opts:["Metamorfosis","Evolución","Muda","Transformación"]},
      {q:"¿Qué gas necesitan los animales para respirar?",          a:"Oxígeno",         opts:["Oxígeno","Dióxido de carbono","Nitrógeno","Hidrógeno"]},
      {q:"¿Por qué brilla la Luna?",                                a:"Refleja la luz del Sol",opts:["Refleja la luz del Sol","Tiene luz propia","Luz de las estrellas","Su atmósfera brilla"]},
      {q:"¿Cuánto tarda la Tierra en dar la vuelta al Sol?",        a:"Un año (365 días)",opts:["Un año (365 días)","Un mes","Un día","100 días"]},
      {q:"¿Qué es la gravedad?",                                    a:"Fuerza que atrae objetos hacia el centro de la Tierra",opts:["Fuerza que atrae objetos hacia la Tierra","Fuerza que hace flotar","El peso de los objetos","La velocidad de caída"]},
      {q:"¿De qué está hecho el agua?",                             a:"Hidrógeno y oxígeno (H₂O)",opts:["Hidrógeno y oxígeno","Oxígeno y carbono","Hidrógeno y nitrógeno","Solo oxígeno"]},
      {q:"¿Cuál es el mamífero más grande del mundo?",              a:"La ballena azul",  opts:["La ballena azul","El elefante africano","El tiburón ballena","El rinoceronte"]},
      {q:"¿Cuántos planetas tiene nuestro sistema solar?",          a:"8",               opts:["8","9","7","10"]},
      {q:"¿Qué parte de la planta absorbe el agua del suelo?",      a:"Las raíces",      opts:["Las raíces","Las hojas","El tallo","Las flores"]},
      {q:"¿Qué órgano bombea la sangre en nuestro cuerpo?",         a:"El corazón",      opts:["El corazón","Los pulmones","El hígado","El cerebro"]},
      {q:"¿Qué es un volcán?",                                      a:"Abertura en la Tierra por donde sale magma y gases",opts:["Abertura por donde sale magma y gases","Una montaña muy alta","Una roca muy grande","Un terremoto"]},
      {q:"¿Qué es la fotosíntesis?",                                a:"Las plantas fabrican alimento usando luz solar",opts:["Las plantas fabrican alimento con luz solar","La respiración vegetal","Absorción de agua por raíces","Reproducción de las plantas"]},
      {q:"¿Cuánto tarda la Tierra en girar sobre sí misma?",        a:"24 horas (un día)",opts:["24 horas","12 horas","7 días","365 días"]},
      {q:"¿Cuál es el animal terrestre más rápido?",                a:"El guepardo",     opts:["El guepardo","El leopardo","El tigre","El caballo"]},
      {q:"¿Qué es un terremoto?",                                   a:"Movimiento brusco de la corteza terrestre",opts:["Movimiento brusco de la corteza terrestre","Un volcán en erupción","Una gran tormenta","Un maremoto"]},
      {q:"¿Cuántas estaciones tiene el año?",                       a:"4",               opts:["4","2","3","6"]},
      {q:"¿Cuántos huesos tiene el cuerpo humano adulto?",          a:"206",             opts:["206","300","150","250"]},
      {q:"¿De qué se alimentan los carnívoros?",                    a:"De otros animales",opts:["De otros animales","De plantas","De hongos","Solo de insectos"]},
      {q:"¿Qué es un ecosistema?",                                  a:"Conjunto de seres vivos y su entorno natural",opts:["Conjunto de seres vivos y su entorno natural","Solo los animales de una zona","Una reserva natural","El clima de una región"]},
      {q:"¿Cuántas patas tiene un insecto?",                        a:"6",               opts:["6","8","4","10"]},
      {q:"¿Qué hace la piel del ser humano?",                       a:"Protege el cuerpo y regula la temperatura",opts:["Protege el cuerpo y regula temperatura","Solo protege contra golpes","Solo regula temperatura","Produce glóbulos rojos"]},
      {q:"¿De dónde obtiene energía una planta para crecer?",       a:"Del sol, el agua y el CO₂",opts:["Del sol, el agua y el CO₂","Solo del agua","Solo de la tierra","Del oxígeno del aire"]},
    ],
    medio: [
      {q:"¿Cuál es la fórmula química del dióxido de carbono?",     a:"CO₂",             opts:["CO₂","CO","C₂O","CO₃"]},
      {q:"¿Qué es la mitosis?",                                     a:"División celular que produce dos células idénticas",opts:["División celular que produce dos células idénticas","División que produce células sexuales","Fusión de dos células","El crecimiento celular"]},
      {q:"¿Cuál es la velocidad de la luz en el vacío?",            a:"≈ 300.000 km/s",  opts:["≈ 300.000 km/s","≈ 150.000 km/s","≈ 1.000.000 km/s","≈ 30.000 km/s"]},
      {q:"¿Cuántos cromosomas tiene una célula humana normal?",      a:"46 (23 pares)",   opts:["46","23","48","44"]},
      {q:"¿Qué son los genes?",                                     a:"Segmentos de ADN con instrucciones para proteínas",opts:["Segmentos de ADN con instrucciones para proteínas","Proteínas del núcleo celular","Cromosomas completos","Moléculas de ARN"]},
      {q:"¿Cuál es la segunda ley de Newton?",                      a:"F = m × a",       opts:["F = m × a","Acción = Reacción","A mayor masa, menor aceleración","La inercia de los cuerpos"]},
      {q:"¿Cuál es el número atómico del oxígeno?",                 a:"8",               opts:["8","16","6","2"]},
      {q:"¿Qué es la osmosis?",                                     a:"Paso de agua por membrana semipermeable de baja a alta concentración",opts:["Paso de agua de baja a alta concentración de soluto","Movimiento de iones en la célula","Difusión de gases","Transporte activo"]},
      {q:"¿Qué es la fusión nuclear?",                              a:"Unión de núcleos ligeros liberando energía (como el Sol)",opts:["Unión de núcleos ligeros liberando energía","División del núcleo atómico","Combustión química","Desintegración radiactiva"]},
      {q:"¿Cuál es la fórmula del ácido sulfúrico?",                a:"H₂SO₄",           opts:["H₂SO₄","H₂SO₃","HCl","H₂S"]},
      {q:"¿Qué es la homeostasis?",                                 a:"Capacidad del organismo de mantener condiciones internas estables",opts:["Mantener condiciones internas estables","El equilibrio ecológico","Solo la temperatura corporal","El balance hormonal"]},
      {q:"¿Cuántas fuerzas fundamentales existen en la naturaleza?",a:"4",               opts:["4","2","3","5"]},
      {q:"¿Cuál es la diferencia entre masa y peso?",               a:"Masa es cantidad de materia; peso es fuerza gravitacional",opts:["Masa es cantidad de materia; peso es fuerza gravitacional","Son lo mismo","La masa varía con la gravedad","El peso no cambia en diferentes planetas"]},
      {q:"¿Qué científico propuso la teoría de la evolución?",      a:"Charles Darwin",  opts:["Charles Darwin","Gregor Mendel","Jean-Baptiste Lamarck","Louis Pasteur"]},
      {q:"¿Qué es el efecto invernadero?",                          a:"Retención de calor en la atmósfera por gases como CO₂",opts:["Retención de calor por gases como CO₂","La capa de ozono","El calentamiento solar directo","La contaminación del aire"]},
      {q:"¿Cuál es el pH del agua pura?",                           a:"7 (neutro)",      opts:["7","0","14","6"]},
      {q:"¿Cuántas capas principales tiene la atmósfera terrestre?",a:"5 principales",   opts:["5 capas principales","3 capas","7 capas","4 capas"]},
      {q:"¿Qué es la presión atmosférica?",                         a:"El peso del aire sobre la superficie terrestre",opts:["El peso del aire sobre la superficie","La velocidad del viento","La humedad del aire","La temperatura del aire"]},
      {q:"¿Cuál es la función del ADN en la célula?",               a:"Almacenar información genética para construir el organismo",opts:["Almacenar información genética","Producir energía celular","Transportar oxígeno","Regular la temperatura"]},
      {q:"¿Qué es la biodiversidad?",                               a:"Variedad de formas de vida en un ecosistema o en la Tierra",opts:["Variedad de formas de vida","Número total de animales","Solo diversidad vegetal","Las especies en peligro"]},
      {q:"¿Qué es un átomo?",                                       a:"Unidad más pequeña de un elemento con sus propiedades químicas",opts:["Unidad más pequeña de un elemento","La partícula subatómica más pequeña","Un grupo de moléculas","El núcleo de una célula"]},
      {q:"¿Qué es la fotosíntesis a nivel químico simplificado?",   a:"CO₂ + H₂O + luz → glucosa + O₂",opts:["CO₂ + H₂O + luz → glucosa + O₂","H₂O + CO₂ → O₂","C + H₂O → CH₄ + O₂","Glucosa + O₂ → CO₂ + H₂O"]},
      {q:"¿Cuántos elementos hay en la tabla periódica actualmente?",a:"118 elementos",  opts:["118 elementos","100 elementos","92 elementos","126 elementos"]},
      {q:"¿Qué es un neutrino?",                                    a:"Partícula subatómica sin carga y casi sin masa",opts:["Partícula sin carga y casi sin masa","Átomo de nitrógeno ionizado","Protón sin carga","Electrón de alta energía"]},
      {q:"¿Cuál es la unidad básica de la herencia?",               a:"El gen",          opts:["El gen","El cromosoma","La célula","El ADN"]},
    ],
    avanzado: [
      {q:"¿Qué establece el principio de incertidumbre de Heisenberg?",a:"No se puede conocer a la vez posición y momento exactos",opts:["No se puede conocer posición y momento exactos a la vez","La energía no puede ser negativa","Los electrones tienen masa cero","La luz viaja a velocidad constante"]},
      {q:"¿Cuál es la diferencia entre fusión y fisión nuclear?",   a:"Fusión une núcleos; fisión rompe núcleos pesados",opts:["Fusión une núcleos; fisión rompe núcleos pesados","Son el mismo proceso","Fisión une; fusión rompe","Ambas liberan la misma energía"]},
      {q:"¿Qué es el entrelazamiento cuántico?",                    a:"Dos partículas comparten estado cuántico instantáneamente",opts:["Dos partículas comparten estado cuántico instantáneamente","Unión física de dos partículas","Superposición de estados de una partícula","El efecto túnel"]},
      {q:"¿Cuál es la diferencia entre ARNm y ARNt?",               a:"ARNm lleva info génica; ARNt transporta aminoácidos",opts:["ARNm lleva info génica; ARNt transporta aminoácidos","Son idénticos","ARNt es el mensajero; ARNm es el de transferencia","Solo el ARNm está en el citoplasma"]},
      {q:"¿Qué es la constante de Planck?",                         a:"Relaciona energía y frecuencia de un fotón (h ≈ 6.626×10⁻³⁴ J·s)",opts:["Relaciona energía y frecuencia del fotón","La velocidad de la luz","La masa del electrón","La carga del protón"]},
      {q:"¿Qué es el bosón de Higgs?",                              a:"Partícula que da masa a otras partículas fundamentales",opts:["Partícula que da masa a otras partículas fundamentales","Antipartícula del protón","Tipo de quark pesado","Partícula portadora de la gravedad"]},
      {q:"¿Cuántos pares de bases tiene el genoma humano aprox.?",  a:"~3.000 millones de pares de bases",opts:["~3.000 millones","~1.000 millones","~30.000 millones","~300 millones"]},
      {q:"¿Qué es la epigenética?",                                 a:"Cambios en expresión génica sin alterar la secuencia de ADN",opts:["Cambios en expresión génica sin alterar el ADN","Las mutaciones del ADN","Herencia de genes recesivos","Transcripción del ARN"]},
      {q:"¿Cuál es la segunda ley de la termodinámica?",            a:"La entropía de un sistema aislado siempre tiende a aumentar",opts:["La entropía de un sistema aislado tiende a aumentar","Energía ni se crea ni se destruye","A mayor temperatura, mayor presión","Los gases perfectos cumplen PV=nRT"]},
      {q:"¿Qué es la superconductividad?",                          a:"Conducción de electricidad sin resistencia a bajas temperaturas",opts:["Conducción sin resistencia a bajas temperaturas","Conductividad máxima a temperatura ambiente","Magnetismo extremo","Superfluido sin viscosidad"]},
      {q:"¿Cuál fue la contribución de Rosalind Franklin al ADN?",  a:"Sus fotografías de rayos X fueron clave para determinar la estructura del ADN",opts:["Sus fotografías de rayos X fueron clave","Propuso el modelo de doble hélice directamente","Descubrió la existencia del ADN","Determinó la secuencia de bases"]},
      {q:"¿Qué es la radiación de Hawking?",                        a:"Radiación que emiten los agujeros negros, haciéndolos perder masa",opts:["Radiación que emiten los agujeros negros","La radiación del Big Bang","Radiación de estrellas de neutrones","La energía oscura"]},
      {q:"¿Cuántas dimensiones predice la teoría de cuerdas (M-teoría)?",a:"10 u 11 dimensiones",opts:["10 u 11 dimensiones","4 dimensiones","26 (teoría bosónica)","Exactamente 10 siempre"]},
      {q:"¿Cuál es la diferencia entre virus y bacteria?",          a:"El virus no tiene célula propia ni metabolismo, necesita huésped",opts:["Virus no tiene célula propia ni metabolismo","Los virus son más grandes","Las bacterias necesitan huésped","Son el mismo tipo de microorganismo"]},
      {q:"¿Qué es el efecto fotoeléctrico?",                        a:"Emisión de electrones de un metal al incidir luz con suficiente frecuencia",opts:["Emisión de electrones al incidir luz con suficiente frecuencia","Absorción de fotones por los átomos","El brillo de los metales","Conducción en semiconductores"]},
      {q:"¿Cuál es la diferencia entre células procariotas y eucariotas?",a:"Las eucariotas tienen núcleo membranoso; las procariotas no",opts:["Eucariotas tienen núcleo membranoso; procariotas no","Las procariotas son más complejas","Solo las eucariotas tienen ADN","Las procariotas son fotosintéticas"]},
      {q:"¿Qué establece la relatividad general de Einstein?",      a:"La gravedad es la curvatura del espacio-tiempo por masa y energía",opts:["La gravedad es curvatura del espacio-tiempo","E = mc²","El tiempo es constante para todos","La velocidad de la luz varía con la gravedad"]},
      {q:"¿Qué es la cromatografía?",                               a:"Técnica de separación de mezclas por afinidad con una fase estacionaria",opts:["Separación de mezclas por afinidad con fase estacionaria","Tipo de destilación","Separación por centrifugación","Análisis de color de compuestos"]},
      {q:"¿Qué son los quarks?",                                    a:"Partículas fundamentales que forman protones y neutrones",opts:["Partículas fundamentales que forman protones y neutrones","Partículas más pequeñas que el electrón","Tipos de electrones de alta energía","Partículas del núcleo sin carga"]},
      {q:"¿Cuánto tarda la luz en llegar del Sol a la Tierra?",     a:"Aproximadamente 8 minutos y 20 segundos",opts:["Aproximadamente 8 minutos y 20 segundos","1 segundo","3 minutos","30 minutos"]},
      {q:"¿Qué es el principio de exclusión de Pauli?",             a:"No pueden existir dos fermiones idénticos en el mismo estado cuántico",opts:["No pueden existir dos fermiones en el mismo estado cuántico","Los electrones se repelen siempre","Dos fotones no coexisten","La masa no puede ser negativa"]},
      {q:"¿Qué es la transcripción en biología molecular?",         a:"Síntesis de ARN a partir del ADN por la ARN polimerasa",opts:["Síntesis de ARN a partir del ADN","Traducción del ARN a proteínas","Replicación del ADN","Proceso de splicing del ARNm"]},
      {q:"¿Cuánto tiempo lleva la luz de Alfa Centauri en llegarnos?",a:"Aproximadamente 4,2 años luz",opts:["Aproximadamente 4,2 años","8 minutos","100 años","2 años"]},
      {q:"¿Qué es la materia oscura?",                              a:"Masa no visible que se infiere por efectos gravitacionales",opts:["Masa no visible inferida por efectos gravitacionales","Gas interestelar negro","Agujeros negros pequeños","La antimateria del universo"]},
      {q:"¿Qué es la mecánica cuántica de campo (QFT)?",            a:"Marco teórico que combina mecánica cuántica con relatividad especial",opts:["Combina mecánica cuántica con relatividad especial","La mecánica cuántica aplicada solo a átomos","La teoría de relatividad general","Estudio de campos gravitacionales"]},
    ],
  },
};

// ── UTILIDADES ───────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestions(catId, diffId, n) {
  let pool = [];
  if (catId === "todas") {
    const catIds = Object.keys(QUESTIONS);
    const perCat = Math.ceil(n / catIds.length) + 2;
    catIds.forEach(c => {
      const qs = QUESTIONS[c]?.[diffId] || [];
      shuffle(qs).slice(0, perCat).forEach(q => pool.push({ ...q, catId: c }));
    });
  } else {
    pool = (QUESTIONS[catId]?.[diffId] || []).map(q => ({ ...q, catId }));
  }
  return shuffle(pool).slice(0, n).map(q => ({ ...q, shuffledOpts: shuffle(q.opts) }));
}

function calcStars(correct, total) {
  const p = correct / total;
  return p >= 0.9 ? 3 : p >= 0.6 ? 2 : 1;
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${s}s`;
}

function getCatInfo(id)  { return CATEGORIES.find(c => c.id === id) || CATEGORIES[0]; }
function getDiffInfo(id) { return DIFFICULTIES.find(d => d.id === id) || DIFFICULTIES[0]; }

// ── PANTALLA: HOME ────────────────────────────────────────────────────────────
function HomeScreen({ onStart, onHof }) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-violet-950 via-purple-950 to-indigo-950 flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="text-7xl animate-bounce">🧠</div>
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
            Trivial Mania
          </h1>
          <p className="mt-2 text-white/60 text-sm">Geografía · Historia · Espectáculos · Deportes · Lengua · Ciencias</p>
        </div>

        <div className="w-full flex flex-col gap-3 mt-4">
          <button
            onClick={onStart}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-xl shadow-lg active:scale-95 transition"
          >
            ¡Jugar!
          </button>
          <button
            onClick={onHof}
            className="w-full py-3 rounded-2xl bg-white/10 border border-white/20 font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Trophy size={20} /> Ranking
          </button>
        </div>

        <Link
          to="/"
          className="flex items-center gap-1 text-white/40 text-sm hover:text-white/70 transition mt-2"
        >
          <HomeIcon size={16} /> Menú principal
        </Link>
      </div>
    </div>
  );
}

// ── PANTALLA: CONFIGURACIÓN ───────────────────────────────────────────────────
function ConfigScreen({ onBack, onStart }) {
  const [catId,   setCatId]   = useState("todas");
  const [diffId,  setDiffId]  = useState("basico");
  const [numQ,    setNumQ]    = useState(10);

  const cat  = getCatInfo(catId);
  const diff = getDiffInfo(diffId);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4 overflow-y-auto">
      <div className="max-w-sm mx-auto pb-8">
        <div className="flex items-center gap-3 py-4 mb-2">
          <button onClick={onBack} className="p-2 rounded-xl bg-white/10 active:scale-95 transition">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-black">Configurar partida</h2>
        </div>

        {/* DIFICULTAD */}
        <section className="mb-6">
          <h3 className="text-xs uppercase tracking-widest text-white/40 mb-3">Dificultad</h3>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map(d => (
              <button
                key={d.id}
                onClick={() => setDiffId(d.id)}
                className={`rounded-2xl p-3 border transition active:scale-95 flex flex-col items-center gap-1 ${
                  diffId === d.id
                    ? `bg-gradient-to-b ${d.color} border-white/40 text-white shadow-lg`
                    : "bg-white/5 border-white/10 text-white/60"
                }`}
              >
                <span className="text-2xl">{d.badge}</span>
                <span className="font-bold text-sm">{d.name}</span>
                <span className="text-xs opacity-70">{d.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* CATEGORÍA */}
        <section className="mb-6">
          <h3 className="text-xs uppercase tracking-widest text-white/40 mb-3">Categoría</h3>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCatId(c.id)}
                className={`rounded-2xl p-3 border transition active:scale-95 flex items-center gap-2 ${
                  catId === c.id
                    ? `bg-gradient-to-r ${c.color} border-white/30 text-white shadow-md`
                    : "bg-white/5 border-white/10 text-white/60"
                }`}
              >
                <span className="text-xl">{c.emoji}</span>
                <span className="font-semibold text-sm text-left leading-tight">{c.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Nº DE PREGUNTAS */}
        <section className="mb-8">
          <h3 className="text-xs uppercase tracking-widest text-white/40 mb-3">Preguntas por partida</h3>
          <div className="grid grid-cols-2 gap-3">
            {[10, 20].map(n => (
              <button
                key={n}
                onClick={() => setNumQ(n)}
                className={`rounded-2xl py-4 border text-2xl font-black transition active:scale-95 ${
                  numQ === n
                    ? "bg-gradient-to-b from-purple-500 to-indigo-600 border-white/30 text-white shadow-lg"
                    : "bg-white/5 border-white/10 text-white/50"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* RESUMEN + BOTÓN */}
        <div className={`rounded-2xl p-4 bg-gradient-to-r ${cat.color} mb-4`}>
          <p className="font-bold text-sm">
            {cat.emoji} {cat.name} · {diff.badge} {diff.name} · {numQ} preguntas
          </p>
        </div>
        <button
          onClick={() => onStart({ catId, diffId, numQ })}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-xl shadow-lg active:scale-95 transition"
        >
          ¡Empezar!
        </button>
      </div>
    </div>
  );
}

// ── PANTALLA: JUEGO ───────────────────────────────────────────────────────────
function GameScreen({ config, onEnd }) {
  const { catId, diffId, numQ } = config;
  const cat = getCatInfo(catId);

  const [questions] = useState(() => pickQuestions(catId, diffId, numQ));
  const [gs, setGs]  = useState({ qIdx:0, score:0, lives:MAX_LIVES, streak:0, phase:"asking", selected:null, timeLeft:TIMER_SECS, correct:0 });
  const gsRef = useRef(gs);
  const update = useCallback(patch => { const n = {...gsRef.current,...patch}; gsRef.current=n; setGs(n); }, []);

  const [muted, setMuted]   = useState(false);
  const mutedRef            = useRef(false);
  const timerRef            = useRef(null);
  const advRef              = useRef(null);
  const startTimeRef        = useRef(Date.now());

  const play = useCallback(name => { if (!mutedRef.current) SFX[name]?.(); }, []);
  const toggleMute = () => { mutedRef.current = !mutedRef.current; setMuted(m => !m); };

  const scheduleAdvance = useCallback((newLives, newScore, newCorrect) => {
    clearTimeout(advRef.current);
    advRef.current = setTimeout(() => {
      const g = gsRef.current;
      const next = g.qIdx + 1;
      if (next >= questions.length || newLives <= 0) {
        const timeSecs = Math.round((Date.now() - startTimeRef.current) / 1000);
        const stars    = calcStars(newCorrect, questions.length);
        onEnd({ score: newScore, correct: newCorrect, total: questions.length, timeSecs, stars, config });
      } else {
        update({ qIdx: next, phase: "asking", selected: null, timeLeft: TIMER_SECS });
      }
    }, 1300);
  }, [questions.length, onEnd, config, update]);

  const handleAnswer = useCallback(opt => {
    const g = gsRef.current;
    if (g.phase !== "asking") return;
    clearInterval(timerRef.current);
    const q  = questions[g.qIdx];
    const ok = opt !== null && opt === q.a;
    let newLives  = g.lives;
    let newStreak = g.streak;
    let newScore  = g.score;
    let newCorrect= g.correct;
    if (ok) {
      newStreak  = g.streak + 1;
      const pts  = (newStreak >= 3 ? 20 : 10) + (g.timeLeft >= TIMER_SECS - 5 ? 5 : 0);
      newScore   = g.score + pts;
      newCorrect = g.correct + 1;
      play(newStreak >= 3 ? "streak" : "correct");
    } else {
      newLives  = g.lives - 1;
      newStreak = 0;
      play(newLives <= 0 ? "over" : "wrong");
    }
    update({ phase:"feedback", selected: opt, lives: newLives, streak: newStreak, score: newScore, correct: newCorrect });
    scheduleAdvance(newLives, newScore, newCorrect);
  }, [questions, play, scheduleAdvance, update]);

  // Timer
  useEffect(() => {
    clearInterval(timerRef.current);
    if (gs.phase !== "asking") return;
    timerRef.current = setInterval(() => {
      const g = gsRef.current;
      if (g.phase !== "asking") { clearInterval(timerRef.current); return; }
      if (g.timeLeft <= 1) {
        clearInterval(timerRef.current);
        handleAnswer(null);
      } else {
        if (g.timeLeft === 6) play("tick");
        update({ timeLeft: g.timeLeft - 1 });
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gs.qIdx, gs.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { clearInterval(timerRef.current); clearTimeout(advRef.current); }, []);

  const q   = questions[gs.qIdx];
  const qCat= getCatInfo(q?.catId || catId);
  const pct = (gs.timeLeft / TIMER_SECS) * 100;
  const timerColor = gs.timeLeft > 10 ? "bg-emerald-400" : gs.timeLeft > 5 ? "bg-yellow-400" : "bg-red-400 animate-pulse";

  return (
    <div className={`min-h-screen w-full bg-gradient-to-b ${cat.gameBg} text-white flex flex-col`}>
      {/* CABECERA */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 gap-3">
        <div className="flex items-center gap-2">
          {Array.from({length: MAX_LIVES}).map((_, i) => (
            <span key={i} className={`text-xl transition ${i < gs.lives ? "opacity-100" : "opacity-20 grayscale"}`}>❤️</span>
          ))}
        </div>
        <div className="font-black text-lg">⭐ {gs.score}</div>
        <button onClick={toggleMute} className="p-2 rounded-xl bg-white/10 active:scale-95 transition">
          {muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
        </button>
      </div>

      {/* BARRA DE TIEMPO */}
      <div className="h-2 bg-white/10 mx-4 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${timerColor}`} style={{width:`${pct}%`}}/>
      </div>

      {/* PROGRESO + CATEGORÍA */}
      <div className="flex items-center justify-between px-4 py-2 text-sm text-white/50">
        <span>{qCat.emoji} {qCat.name}</span>
        <span>{gs.qIdx + 1} / {questions.length}</span>
        <span className="font-mono font-bold text-white/70">{gs.timeLeft}s</span>
      </div>

      {/* PREGUNTA */}
      <div className="flex-1 flex flex-col px-4 gap-4">
        <div className="rounded-3xl bg-white/10 border border-white/15 p-5 mt-2">
          <p className="text-lg font-bold leading-snug text-center">{q?.q}</p>
        </div>

        {/* RACHA */}
        {gs.streak >= 3 && gs.phase === "asking" && (
          <div className="text-center text-sm font-bold text-yellow-300 animate-bounce">
            🔥 ¡Racha ×{gs.streak}! +20 pts
          </div>
        )}

        {/* OPCIONES */}
        <div className="grid grid-cols-1 gap-3 pb-6">
          {q?.shuffledOpts.map((opt, i) => {
            let cls = "rounded-2xl p-4 border text-left font-semibold text-sm transition active:scale-95 ";
            if (gs.phase === "feedback") {
              if (opt === q.a)
                cls += "bg-emerald-500 border-emerald-400 text-white shadow-lg";
              else if (opt === gs.selected)
                cls += "bg-red-500 border-red-400 text-white";
              else
                cls += "bg-white/5 border-white/10 text-white/40";
            } else {
              cls += "bg-white/10 border-white/20 text-white hover:bg-white/20";
            }
            return (
              <button key={i} className={cls} onClick={() => handleAnswer(opt)} disabled={gs.phase === "feedback"}>
                <span className="mr-2 opacity-50">{String.fromCharCode(65+i)}.</span> {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── PANTALLA: RESULTADO ──────────────────────────────────────────────────────
function ResultScreen({ result, onReplay, onHof, onHome }) {
  const { score, correct, total, timeSecs, stars, config } = result;
  const cat  = getCatInfo(config.catId);
  const diff = getDiffInfo(config.diffId);
  const gameId = `trivial_${config.catId}_${config.diffId}_${config.numQ}q`;

  const [name,    setName]    = useState("");
  const [saved,   setSaved]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState(false);

  useEffect(() => { SFX[stars >= 2 ? "finish" : "over"]?.(); }, []); // eslint-disable-line

  const handleSave = async () => {
    if (!name.trim() || saving || saved) return;
    setSaving(true);
    const ok = await saveScore(gameId, name, score, timeSecs);
    setSaving(false);
    if (ok) { setSaved(true); } else { setSaveErr(true); }
  };

  const pct = Math.round((correct / total) * 100);

  return (
    <div className={`min-h-screen w-full bg-gradient-to-b ${cat.gameBg} text-white flex flex-col items-center justify-center p-4`}>
      <div className="w-full max-w-sm flex flex-col items-center gap-5">
        {/* ESTRELLAS */}
        <div className="flex gap-2 text-5xl">
          {Array.from({length:3}).map((_,i)=>(
            <span key={i} className={`transition-transform ${i < stars ? "scale-125" : "opacity-20 grayscale"}`}>⭐</span>
          ))}
        </div>

        {/* STATS */}
        <div className={`w-full rounded-3xl bg-gradient-to-r ${cat.color} p-5 text-center shadow-2xl`}>
          <div className="text-5xl font-black">{score} pts</div>
          <div className="text-sm mt-1 opacity-80">{correct}/{total} correctas · {pct}% · {fmtTime(timeSecs)}</div>
          <div className="text-xs mt-1 opacity-60">{cat.emoji} {cat.name} · {diff.badge} {diff.name} · {config.numQ} preguntas</div>
        </div>

        {/* GUARDAR EN RANKING */}
        {HAS_SUPA && !saved && (
          <div className="w-full rounded-2xl bg-white/10 border border-white/15 p-4 flex flex-col gap-3">
            <p className="text-sm font-bold text-center">💾 Guarda tu puntuación</p>
            <input
              className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/40"
              placeholder="Tu nombre (máx. 20 caracteres)"
              maxLength={20}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
            />
            {saveErr && <p className="text-red-400 text-xs text-center">Error al guardar. Inténtalo de nuevo.</p>}
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold disabled:opacity-40 active:scale-95 transition"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        )}
        {saved && (
          <div className="w-full rounded-2xl bg-emerald-500/20 border border-emerald-400/30 p-3 text-center text-sm text-emerald-300 font-bold">
            ✅ ¡Puntuación guardada!
          </div>
        )}

        {/* BOTONES */}
        <div className="w-full flex flex-col gap-3">
          <button onClick={onReplay} className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-lg active:scale-95 transition">
            🔄 Repetir partida
          </button>
          {HAS_SUPA && (
            <button onClick={() => onHof(gameId)} className="w-full py-3 rounded-2xl bg-white/10 border border-white/15 font-bold flex items-center justify-center gap-2 active:scale-95 transition">
              <Trophy size={18}/> Ver ranking
            </button>
          )}
          <button onClick={onHome} className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 font-semibold text-white/70 active:scale-95 transition">
            Cambiar configuración
          </button>
        </div>
        <Link to="/" className="flex items-center gap-1 text-white/30 text-sm hover:text-white/60 transition">
          <HomeIcon size={14}/> Menú principal
        </Link>
      </div>
    </div>
  );
}

// ── PANTALLA: HALL OF FAME ───────────────────────────────────────────────────
function HofScreen({ gameId, onBack }) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(false);

  useEffect(() => {
    setLoading(true); setErr(false);
    fetchRankings(gameId)
      .then(data => { setRows(data); setLoading(false); })
      .catch(() => { setErr(true); setLoading(false); });
  }, [gameId]);

  // Decode gameId display
  const parts = gameId.replace("trivial_","").split("_");
  const catDisp  = getCatInfo(parts[0]);
  const diffDisp = getDiffInfo(parts[1]);

  const medals = ["🥇","🥈","🥉"];

  return (
    <div className={`min-h-screen w-full bg-gradient-to-b ${catDisp.gameBg} text-white flex flex-col`}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-white/10 active:scale-95 transition">
          <ChevronLeft size={20}/>
        </button>
        <div>
          <h2 className="font-black text-lg">🏆 Ranking</h2>
          <p className="text-xs text-white/50">{catDisp.emoji} {catDisp.name} · {diffDisp.badge} {diffDisp.name}</p>
        </div>
      </div>

      <div className="flex-1 px-4 pb-8">
        {loading && (
          <div className="text-center py-12 text-white/50">Cargando ranking…</div>
        )}
        {err && (
          <div className="text-center py-12 text-red-400">
            <p>Error al cargar el ranking.</p>
            <button onClick={()=>window.location.reload()} className="mt-2 text-sm underline">Reintentar</button>
          </div>
        )}
        {!loading && !err && rows.length === 0 && (
          <div className="text-center py-12 text-white/50">
            <p className="text-4xl mb-3">🎯</p>
            <p>¡Aún no hay puntuaciones!</p>
            <p className="text-sm mt-1">Sé el primero en entrar.</p>
          </div>
        )}
        {!loading && !err && rows.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            {rows.map((r, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-2xl p-3 border ${
                  i === 0 ? "bg-yellow-500/20 border-yellow-500/30" :
                  i === 1 ? "bg-white/10 border-white/20" :
                  i === 2 ? "bg-orange-500/15 border-orange-500/20" :
                  "bg-white/5 border-white/10"
                }`}
              >
                <span className="text-xl w-8 text-center">{medals[i] || `${i+1}.`}</span>
                <span className="flex-1 font-bold truncate">{r.player_name}</span>
                <span className="font-black text-yellow-300">⭐ {r.score}</span>
                <span className="text-xs text-white/40">{fmtTime(r.time_seconds)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function TrivialGame() {
  const [screen,  setScreen]  = useState("home");   // home | config | game | result | hof
  const [config,  setConfig]  = useState(null);
  const [result,  setResult]  = useState(null);
  const [hofId,   setHofId]   = useState("");

  const handleStart = cfg  => { setConfig(cfg); setScreen("game"); };
  const handleEnd   = res  => { setResult(res); setScreen("result"); };
  const handleHof   = gid  => { setHofId(gid); setScreen("hof"); };

  if (screen === "home")
    return <HomeScreen onStart={() => setScreen("config")} onHof={() => { setHofId(`trivial_todas_basico_10q`); setScreen("hof"); }} />;
  if (screen === "config")
    return <ConfigScreen onBack={() => setScreen("home")} onStart={handleStart} />;
  if (screen === "game" && config)
    return <GameScreen config={config} onEnd={handleEnd} />;
  if (screen === "result" && result)
    return <ResultScreen result={result} onReplay={() => handleStart(config)} onHof={handleHof} onHome={() => setScreen("config")} />;
  if (screen === "hof")
    return <HofScreen gameId={hofId} onBack={() => setScreen(result ? "result" : "home")} />;

  return null;
}
