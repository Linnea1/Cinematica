import React, { useEffect, useState, useRef, useMemo } from "react";
import MovieCard from "../components/MovieCard";
import { useGameStore } from "../game/gameStore";
import TimelineRow from "../components/Timeline";
import "./BoardLine.css";

export default function BoardLine({ onCardClick }) {
  const board = useGameStore((s) => s.board);
  const phase = useGameStore((s) => s.phase);
  const activeCard = useGameStore((s) => s.activeCard);
  const choosePosition = useGameStore((s) => s.choosePosition);
  const confirmPlacementStore = useGameStore((s) => s.confirmPlacement);

  const [chosenIndex, setChosenIndex] = useState(board.length);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const wrapperRef = useRef(null);
  const rafRef = useRef(null);
  const boardLineRef = useRef(null);

  useEffect(() => {
    if (activeCard) {
      setChosenIndex(board.length);
    }
  }, [activeCard, board.length]);

  const dedupedBoard = useMemo(
    () =>
      board.filter(
        (c, i, a) => c?.id == null || a.findIndex((x) => x.id === c.id) === i,
      ),
    [board],
  );

  const isPlacing = phase === "place" && activeCard;

  const handleMouseMove = (e) => {
    if (!isPlacing) return;
    setMousePos({ x: e.clientX, y: e.clientY });
    updateChosenFromX(e.clientX);
  };

  const updateChosenFromX = (clientX) => {
    const boardLine = boardLineRef.current;
    if (!boardLine) return;

    const cards = boardLine.querySelectorAll(".cardContainer");
    let index = cards.length;

    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      if (clientX < r.left + r.width / 2) {
        index = i;
        break;
      }
    }

    setChosenIndex(index);

    const slots = boardLine.querySelectorAll(".slot");
    const slotEl = slots[index];
    if (slotEl) {
      const wrap = wrapperRef.current;
      if (wrap) {
        const wrapRect = wrap.getBoundingClientRect();
        const elRect = slotEl.getBoundingClientRect();
        const MARGIN = 48;
        if (elRect.left < wrapRect.left + MARGIN) {
          wrap.scrollLeft += elRect.left - (wrapRect.left + MARGIN);
        } else if (elRect.right > wrapRect.right - MARGIN) {
          wrap.scrollLeft += elRect.right - (wrapRect.right - MARGIN);
        }
      }
    }
  };

  useEffect(() => {
    const THRESHOLD = 100;
    const MAX_SPEED_PX_PER_SEC = 280;
    const lastTimeRef = { current: null };

    const step = (ts) => {
      const wrap = wrapperRef.current;
      if (!wrap || !isPlacing) return;

      if (!lastTimeRef.current) lastTimeRef.current = ts;
      const dt = Math.min(0.1, (ts - lastTimeRef.current) / 1000);
      lastTimeRef.current = ts;

      const rect = wrap.getBoundingClientRect();
      const x = mousePos.x;

      if (x < rect.left - 200 || x > rect.right + 200) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      let delta = 0;

      if (x > rect.right - THRESHOLD) {
        const t = Math.min(1, (x - (rect.right - THRESHOLD)) / THRESHOLD);
        const speed = t * t * MAX_SPEED_PX_PER_SEC;
        delta = speed * dt;
      } else if (x < rect.left + THRESHOLD) {
        const t = Math.min(1, (rect.left + THRESHOLD - x) / THRESHOLD);
        const speed = t * t * MAX_SPEED_PX_PER_SEC;
        delta = -speed * dt;
      }

      if (Math.abs(delta) >= 0.5) {
        wrap.scrollLeft += delta;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    if (isPlacing) {
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [isPlacing, mousePos]);

  const handleSlotClick = (index) => {
    setChosenIndex(index);
    choosePosition(index);
    confirmPlacementStore();
  };

  const handleSlotHover = (index, el) => {
    setChosenIndex(index);
    const wrap = wrapperRef.current;
    if (!wrap || !el) return;

    const wrapRect = wrap.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const MARGIN = 24;

    const leftOverflow = elRect.left - wrapRect.left;
    if (leftOverflow < MARGIN) {
      wrap.scrollLeft += leftOverflow - MARGIN;
      return;
    }

    const rightOverflow = elRect.right - wrapRect.right;
    if (rightOverflow > -MARGIN) {
      wrap.scrollLeft += rightOverflow + MARGIN;
    }
  };

  useEffect(() => {
    if (!isPlacing) return;

    const wrap = wrapperRef.current;
    const boardLine = boardLineRef.current;
    if (!wrap || !boardLine) return;

    const alignSlot = () => {
      const slots = boardLine.querySelectorAll(".slot");
      const slotEl = slots[chosenIndex];
      if (!slotEl) return;

      const wrapRect = wrap.getBoundingClientRect();
      const slotRect = slotEl.getBoundingClientRect();
      const MARGIN = 48;
      if (slotRect.left < wrapRect.left + MARGIN) {
        const target =
          wrap.scrollLeft + (slotRect.left - (wrapRect.left + MARGIN));
        try {
          wrap.scrollTo({ left: target, behavior: "smooth" });
        } catch (err) {
          wrap.scrollLeft = target;
        }
      } else if (slotRect.right > wrapRect.right - MARGIN) {
        const target =
          wrap.scrollLeft + (slotRect.right - (wrapRect.right - MARGIN));
        try {
          wrap.scrollTo({ left: target, behavior: "smooth" });
        } catch (err) {
          wrap.scrollLeft = target;
        }
      }
    };

    // ensure layout settled
    const id = requestAnimationFrame(alignSlot);
    return () => cancelAnimationFrame(id);
  }, [isPlacing, chosenIndex]);

  return (
    <div
      className="board-wrapper"
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
    >
      <TimelineRow
        board={dedupedBoard}
        isPlacing={isPlacing}
        chosenIndex={chosenIndex}
        wrapperRef={wrapperRef}
        boardLineRef={boardLineRef}
      />

      <div className="board-line" ref={boardLineRef}>
        {isPlacing && <div className="edge-spacer" aria-hidden="true" />}

        {dedupedBoard.map((card, index) => (
          <React.Fragment key={card.id ?? index}>
            {isPlacing && (
              <Slot
                index={index}
                active={chosenIndex === index}
                onClick={handleSlotClick}
                onMouseEnter={(el) => handleSlotHover(index, el)}
              />
            )}

            <MovieCard movie={card} onClick={onCardClick} />
          </React.Fragment>
        ))}

        {isPlacing && (
          <>
            <Slot
              index={dedupedBoard.length}
              active={chosenIndex === dedupedBoard.length}
              onClick={handleSlotClick}
              onMouseEnter={(el) => handleSlotHover(dedupedBoard.length, el)}
            />
            <div className="edge-spacer" aria-hidden="true" />
          </>
        )}
      </div>

      {isPlacing && activeCard && (
        <div
          className="mini-preview"
          style={{ left: mousePos.x + "px", top: mousePos.y + "px" }}
        >
          <MovieCard movie={activeCard} onClick={onCardClick} />
        </div>
      )}
    </div>
  );
}

function Slot({ index, active, onClick, onMouseEnter }) {
  const ref = useRef(null);
  return (
    <div
      ref={ref}
      className={`slot ${active ? "active" : ""}`}
      onClick={() => onClick && onClick(index)}
      onMouseEnter={() => onMouseEnter && onMouseEnter(index, ref.current)}
    />
  );
}
