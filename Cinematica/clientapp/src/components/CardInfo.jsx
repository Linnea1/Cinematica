import React, { useEffect, useState, useRef } from "react";
import { FastAverageColor } from "fast-average-color";
import "./CardInfo.css";

export default function CardInfo({ movie, onClose, animateWrong = false }) {
  const [bgGradient, setBgGradient] = useState(
    "linear-gradient(135deg, #222, #111)"
  );

  const panelRef = useRef(null);
  const [panelSize, setPanelSize] = useState({ w: 0, h: 0, perim: 0 });

  useEffect(() => {
    if (!movie) return;
    const onKey = (e) => e.key === "Escape" && onClose && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [movie, onClose]);

  useEffect(() => {
    if (!movie?.poster) return;

    const fac = new FastAverageColor();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = movie.poster;

    img.onload = () => {
      try {
        const color = fac.getColor(img);

        const r = color.value[0];
        const g = color.value[1];
        const b = color.value[2];

        const dark = `rgb(${Math.floor(r * 0.5)}, ${Math.floor(
          g * 0.5
        )}, ${Math.floor(b * 0.5)})`;

        setBgGradient(
          `linear-gradient(135deg, rgba(${r},${g},${b},0.8), ${dark})`
        );
      } catch (err) {
        console.warn("FAC failed", err);
      }
    };

    img.onerror = () => {
      console.warn("Could not load image for color extraction");
    };

    return () => fac.destroy();
  }, [movie.poster]);

  useEffect(() => {
    if (!animateWrong) {
      setPanelSize({ w: 0, h: 0, perim: 0 });
      return;
    }

    const measure = () => {
      const el = panelRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = Math.max(0, Math.round(r.width));
      const h = Math.max(0, Math.round(r.height));
      setPanelSize({ w, h, perim: 2 * (w + h) });
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (panelRef.current) ro.observe(panelRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [movie, animateWrong]);

  if (!movie) return null;

  return (
    <div
      className="cardinfo-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose && onClose()}
    >
      <div
        className="cardinfo-panel"
        ref={panelRef}
        style={{
          background: bgGradient,
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.12)",
          display: "flex",
          transition: "background 0.3s ease",
        }}
      >
        <button className="cardinfo-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div
          className="cardinfo-left"
          style={{
            "--poster-url": movie.poster ? `url(${movie.poster})` : "none",
          }}
        >
          {movie.poster ? (
            <img src={movie.poster} alt={movie.title} />
          ) : (
            <div className="cardinfo-no-poster">No image</div>
          )}
        </div>

        <div
          className="cardinfo-right"
          style={{
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            backgroundColor: "rgba(0,0,0,0.3)",
          }}
        >
          <h2 className="cardinfo-title">{movie.title}</h2>
          <div className="cardinfo-meta">
            <span className="cardinfo-director">
              {movie.director ?? "Unknown"}
            </span>
            {movie.year && (
              <span className="cardinfo-year">· {movie.year}</span>
            )}
            {movie.rating != null && (
              <span className="cardinfo-rating">· {movie.rating}/10</span>
            )}
          </div>

          {movie.description && (
            <p className="cardinfo-desc">{movie.description}</p>
          )}
        </div>
        {animateWrong && panelSize.perim > 0 && (
          <svg
            key={panelSize.perim}
            className="wrong-anim"
            width="100%"
            height="100%"
            viewBox={`0 0 ${panelSize.w} ${panelSize.h}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{
              // expose perimeter to CSS for dash animation
              "--perim": panelSize.perim,
            }}
          >
            <defs>
              <linearGradient id="cardGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ff3b3b" />
                <stop offset="55%" stopColor="#ff6b6b" />
                <stop offset="100%" stopColor="#ff3b3b" />
              </linearGradient>
            </defs>
            <rect
              className="wrong-rect"
              x="2"
              y="2"
              rx="12"
              ry="12"
              width={Math.max(0, panelSize.w - 4)}
              height={Math.max(0, panelSize.h - 4)}
              fill="none"
              stroke="url(#cardGlow)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
