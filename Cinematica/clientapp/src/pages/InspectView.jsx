import React from "react";
import { useGameStore } from "../game/gameStore";
import MovieCard from "../components/MovieCard"; // your existing card component
import "./inspectView.css";

export default function InspectView() {
  const activeCard = useGameStore((s) => s.activeCard);
  const startPlacing = useGameStore((s) => s.startPlacing);

  if (!activeCard) return null; // nothing to inspect

  return (
    <div className="inspect-overlay">
      <div className="inspect-card">
        <h3>Inspect Card</h3>

        {/* Reuse your MovieCard component */}
        <MovieCard movie={activeCard} />

        <button onClick={startPlacing}>Place</button>
      </div>
    </div>
  );
}
