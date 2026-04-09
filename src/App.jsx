import { BrowserRouter, Routes, Route } from "react-router-dom";
import Hub from "./Hub";
import CarreraVeredaJesusRosa from "./games/CarreraVeredaJesusRosa";
import DivisionAnimales from "./games/DivisionAnimales";
import CapitalesDelMundo from "./games/CapitalesDelMundo";
import TrivialGame from "./games/TrivialGame";
import ReaccionEnCadena from "./games/ReaccionEnCadena";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/carrera-vereda" element={<CarreraVeredaJesusRosa />} />
        <Route path="/division-animales" element={<DivisionAnimales />} />
        <Route path="/capitales-del-mundo" element={<CapitalesDelMundo />} />
        <Route path="/trivial-game" element={<TrivialGame />} />
        <Route path="/reaccion-en-cadena" element={<ReaccionEnCadena />} />
      </Routes>
    </BrowserRouter>
  );
}
