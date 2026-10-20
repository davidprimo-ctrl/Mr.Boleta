import { Link, Route, Routes } from "react-router";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import DetalleEvento from "./pages/DetalleEvento";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/eventos/:id" element={<DetalleEvento />} />
        <Route
          path="*"
          element={
            <main className="max-w-4xl mx-auto px-4 py-12">
              <p className="mb-4">Página no encontrada.</p>
              <Link to="/" className="text-brand-400 hover:underline">← Ir al inicio</Link>
            </main>
          }
        />
      </Routes>
    </>
  );
}