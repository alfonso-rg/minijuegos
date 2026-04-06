import { Link } from "react-router-dom";
import { Bike, Gamepad2, Divide, Globe2 } from "lucide-react";

const games = [
  {
    id: "carrera-vereda",
    title: "Carrera Vereda Jesús Rosa",
    description:
      "Carrera arcade endless runner ambientada en Santa Cruz, Murcia. Esquiva obstáculos de huerta y recoge impulsos.",
    icon: <Bike size={32} />,
    path: "/carrera-vereda",
    color: "from-emerald-500 to-emerald-700",
    tags: ["Arcade", "Endless Runner", "Móvil"],
  },
  {
    id: "division-animales",
    title: "División Animal",
    description:
      "¡Aprende a dividir con el reino animal! Reparte peces, reptiles, mamíferos, aves e invertebrados en grupos iguales. 5 mundos con dificultad progresiva.",
    icon: <Divide size={32} />,
    path: "/division-animales",
    color: "from-cyan-500 to-blue-700",
    tags: ["Matemáticas", "Educativo", "Móvil", "6-10 años"],
  },
  {
    id: "capitales-del-mundo",
    title: "Capitales del Mundo",
    description:
      "¡Sube al cohete y viaja por el planeta! Adivina las capitales de Europa, Américas y el Mundo. 3 mundos desbloqueables, racha de aciertos y sonidos.",
    icon: <Globe2 size={32} />,
    path: "/capitales-del-mundo",
    color: "from-indigo-500 to-purple-700",
    tags: ["Geografía", "Educativo", "Móvil", "7+ años"],
  },
];

export default function Hub() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-300">
            <Gamepad2 size={36} />
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            Minijuegos
          </h1>
          <p className="mt-3 text-lg text-white/60">
            Colección de minijuegos arcade para jugar en el navegador.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          {games.map((game) => (
            <Link
              key={game.id}
              to={game.path}
              className="group rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl transition hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
            >
              <div
                className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${game.color} text-white shadow-lg`}
              >
                {game.icon}
              </div>
              <h2 className="text-xl font-bold">{game.title}</h2>
              <p className="mt-2 text-sm text-white/60">{game.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {game.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 text-sm font-semibold text-purple-400 transition group-hover:text-purple-300">
                Jugar &rarr;
              </div>
            </Link>
          ))}

          <div className="flex items-center justify-center rounded-3xl border border-dashed border-white/10 p-6 text-white/30">
            <div className="text-center">
              <Gamepad2 size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Más juegos próximamente</p>
            </div>
          </div>
        </div>

        <footer className="mt-12 text-center text-sm text-white/30">
          Hecho con React + Vite + Tailwind CSS
        </footer>
      </div>
    </div>
  );
}
