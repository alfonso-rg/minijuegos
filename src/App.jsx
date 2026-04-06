import { BrowserRouter, Routes, Route } from "react-router-dom";
import Hub from "./Hub";
import CarreraVeredaJesusRosa from "./games/CarreraVeredaJesusRosa";
import DivisionAnimales from "./games/DivisionAnimales";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/carrera-vereda" element={<CarreraVeredaJesusRosa />} />
        <Route path="/division-animales" element={<DivisionAnimales />} />
      </Routes>
    </BrowserRouter>
  );
}
