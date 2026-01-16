import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Game from "./pages/Game.jsx";
import BoardLine from "./pages/BoardLine.jsx";
import InspectView from "./pages/InspectView.jsx";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="container">
            <h1>Welcome to Cinematica</h1>
          </div>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/game" element={<Game />} />
      <Route path="/inspect" element={<InspectView />} />
      <Route path="/board" element={<BoardLine />} />
    </Routes>
  );
}

export default App;
