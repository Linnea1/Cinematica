import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    console.log("BoardLine mounted / board length:", board.length, board);
    return () => console.log("BoardLine unmounted");
  }, [board]);

  useEffect(() => {
    if (activeCard) {
      setChosenIndex(board.length);
    }
  }, [activeCard, board.length]);

  const dedupedBoard = board.filter(
    (c, i, a) => c?.id == null || a.findIndex((x) => x.id === c.id) === i
  );

  const isPlacing = phase === "place" && activeCard;

  const handleMouseMove = (e) => {
    if (!isPlacing) return;
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleSlotClick = (index) => {
    setChosenIndex(index);
    choosePosition(index);
    confirmPlacementStore();
  };

  return (
    <div className="board-wrapper" onMouseMove={handleMouseMove}>
      <TimelineRow
        board={dedupedBoard}
        isPlacing={isPlacing}
        chosenIndex={chosenIndex}
      />

      <div className="board-line">
        {dedupedBoard.map((card, index) => (
          <React.Fragment key={card.id ?? index}>
            {isPlacing && (
              <Slot
                index={index}
                active={chosenIndex === index}
                onClick={handleSlotClick}
                onMouseEnter={() => setChosenIndex(index)}
              />
            )}

            <MovieCard movie={card} onClick={onCardClick} />
          </React.Fragment>
        ))}

        {isPlacing && (
          <Slot
            index={dedupedBoard.length}
            active={chosenIndex === dedupedBoard.length}
            onClick={handleSlotClick}
            onMouseEnter={() => setChosenIndex(dedupedBoard.length)}
          />
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
  return (
    <div
      className={`slot ${active ? "active" : ""}`}
      onClick={() => onClick && onClick(index)}
      onMouseEnter={() => onMouseEnter && onMouseEnter(index)}
    />
  );
}
