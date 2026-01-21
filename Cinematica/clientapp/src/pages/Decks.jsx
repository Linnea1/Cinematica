import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LIST_IDS } from "../services/listIds";
import { fetchDeck } from "../services/tmdbApi";
import { useGameStore } from "../game/gameStore";
import "./Decks.css";

export default function Decks() {
  const [loadingId, setLoadingId] = useState(null);
  const [err, setErr] = useState(null);
  const navigate = useNavigate();
  const startGame = useGameStore((s) => s.startGame);

  const entries = Object.entries(LIST_IDS);

  const handleOpen = async (deckObj) => {
    setErr(null);
    setLoadingId(deckObj.id);
    try {
      const deck = await fetchDeck(deckObj);
      startGame(deck);
      navigate("/game");
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="deckContainer">
      <div className="container">
        <h2 style={{ marginTop: 0 }}>Choose a deck</h2>
        {err && (
          <div style={{ color: "#c00", marginBottom: 12 }}>Error: {err}</div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 16,
          }}
        >
          {entries.map(([key, v]) => (
            <button
              key={key}
              onClick={() => handleOpen(v)}
              disabled={loadingId !== null}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "2/3",
                  overflow: "hidden",
                  borderRadius: 8,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                  marginBottom: 8,
                  background: "#111",
                }}
              >
                <img
                  src={v.img}
                  alt={v.label || key}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ color: "#eee" }}>{v.label || key}</div>
              {loadingId === v.id && (
                <div style={{ color: "#88f", fontSize: 12 }}>Loading…</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
