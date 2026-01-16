import React, { useRef } from "react";
import { useGameStore } from "../game/gameStore";
import "./Deck.css";

export default function Deck({ active = true }) {
  const deck = useGameStore((s) => s.deck);
  const drawCard = useGameStore((s) => s.drawCard);
  const containerRef = useRef(null);

  const inspectSelector = ".inspect-view";

  const handleTakeCard = async () => {
    if (!active) return; // ignore clicks when inactive
    const container = containerRef.current;
    if (!container) return;
    const topCard = container.querySelector(".deck-card.top");
    if (!topCard) {
      drawCard(false);
      return;
    }

    topCard.classList.add("pick-pop");
    setTimeout(() => topCard.classList.remove("pick-pop"), 140);

    const inspectEl = document.querySelector(inspectSelector);
    const cardRect = topCard.getBoundingClientRect();
    const targetRect = inspectEl
      ? inspectEl.getBoundingClientRect()
      : {
          left: window.innerWidth * 0.55,
          top: window.innerHeight * 0.2,
          width: 260,
          height: 380,
        };

    const dx =
      targetRect.left +
      targetRect.width / 2 -
      (cardRect.left + cardRect.width / 2);
    const dy =
      targetRect.top +
      targetRect.height / 2 -
      (cardRect.top + cardRect.height / 2);

    const scale = targetRect.width / cardRect.width || 1;

    topCard.style.setProperty("--dx", `${dx}px`);
    topCard.style.setProperty("--dy", `${dy}px`);
    topCard.style.setProperty("--scale", scale.toString());
    topCard.classList.add("animate-to-inspect");

    const revealDelay = 420;
    const hideDelay = 700;

    setTimeout(() => {
      drawCard(false);
    }, revealDelay);

    setTimeout(() => {
      topCard.classList.add("hidden-after");

      topCard.style.removeProperty("--dx");
      topCard.style.removeProperty("--dy");
      topCard.style.removeProperty("--scale");
      topCard.classList.remove("animate-to-inspect");
    }, hideDelay);
  };

  return (
    <div
      className={`deck-container ${active ? "" : "inactive"}`}
      ref={containerRef}
      onClick={handleTakeCard}
      aria-hidden={!active}
    >
      <div className="deck-stack">
        {deck.map((c, i) => (
          <div
            key={c.id ?? i}
            className={`deck-card ${i === 0 ? "top" : "stacked"}`}
            style={{ ["--i"]: i }}
          >
            <div className="card-face">{/* Kort baksida */}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
