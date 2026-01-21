import React from "react";
import { useGameStore } from "../game/gameStore";
import MovieCard from "../components/MovieCard";
import "./inspectView.css";

export default function InspectView() {
  const activeCard = useGameStore((s) => s.activeCard);
  const startPlacing = useGameStore((s) => s.startPlacing);

  if (!activeCard) return null;

  return (
    <div className="inspect-overlay">
      <div className="inspect-card">
        <MovieCard movie={activeCard} />

        <button onClick={startPlacing}>Place</button>
      </div>
    </div>
  );
}
