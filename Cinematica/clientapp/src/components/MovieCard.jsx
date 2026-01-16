import React, { useEffect, useState, useRef } from "react";
import { useGameStore } from "../game/gameStore";
import { FastAverageColor } from "fast-average-color";
import "./MovieCard.css";

export default function MovieCard({ movie, onClick }) {
  const phase = useGameStore((s) => s.phase);
  const ref = useRef(null);
  const [inMini, setInMini] = useState(false);
  const [bgGradient, setBgGradient] = useState(
    "linear-gradient(135deg, #222, #111)"
  );

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    setInMini(Boolean(node.closest && node.closest(".mini-preview")));
  }, []);

  const yearDisplay = phase === "inspect" || inMini ? "?" : movie.year;

  useEffect(() => {
    if (!movie.poster) return;

    const fac = new FastAverageColor();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = movie.poster;

    img.onload = () => {
      const mainColor = fac.getColor(img);

      const [r, g, b] = mainColor.value;
      const dark1 = `rgb(${Math.floor(r * 0.7)}, ${Math.floor(
        g * 0.7
      )}, ${Math.floor(b * 0.7)})`;
      const dark2 = `rgb(${Math.floor(r * 0.4)}, ${Math.floor(
        g * 0.4
      )}, ${Math.floor(b * 0.4)})`;

      const gradient = `linear-gradient(135deg, rgba(${r},${g},${b},0.8), ${dark1}, ${dark2})`;

      setBgGradient(gradient);
    };

    return () => fac.destroy();
  }, [movie.poster]);

  return (
    <div
      className="cardContainer"
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={() => onClick && onClick(movie)}
      style={{
        background: bgGradient,
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: `0 12px 32px rgba(0,0,0,0.25)`,
        transition: "background 0.3s ease",
      }}
    >
      <div className="cardYear">{yearDisplay}</div>
      {movie.poster && (
        <img
          src={movie.poster}
          alt=""
          style={{
            width: 180,
            borderRadius: "12px 12px 0 0",
            display: "block",
            margin: "0 auto",
          }}
        />
      )}
      <div className="cardInfoBox">
        <strong>{movie.title}</strong>
        <div>{movie.director ?? "Unknown"}</div>
      </div>
    </div>
  );
}
