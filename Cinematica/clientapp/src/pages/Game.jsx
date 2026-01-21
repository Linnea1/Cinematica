import React, { useEffect, useState } from "react";
import CardInfo from "../components/CardInfo";
import { useGameStore } from "../game/gameStore";
import InspectView from "./InspectView";
import BoardLine from "./BoardLine";
import { fetchDeck } from "../services/tmdbApi";
import Deck from "../components/Deck";
import "./game.css";

export default function Game() {
  const phase = useGameStore((s) => s.phase);
  const startGame = useGameStore((s) => s.startGame);
  const activeCard = useGameStore((s) => s.activeCard);

  const cardInfoMovie = useGameStore((s) => s.showCardInfoFor);
  const cardInfoWrong = useGameStore((s) => s.showCardInfoWrong);
  const openCardInfo = useGameStore((s) => s.openCardInfo);
  const closeCardInfo = useGameStore((s) => s.closeCardInfo);

  const [err, setErr] = useState(null);
  const deckInStore = useGameStore((s) => s.deck);

  useEffect(() => {
    if (deckInStore && deckInStore.length > 0) return;

    fetchDeck()
      .then((deck) => startGame(deck))
      .catch((e) => setErr(e.message));
  }, [startGame, deckInStore]);

  const handleCardClick = (movie) => {
    openCardInfo(movie);
  };

  if (err) return <div>Error: {err}</div>;

  return (
    <>
      <div className="board">
        <p style={{ margin: 0 }}>Phase: {phase}</p>

        <Deck active={phase === "idle"} />

        <BoardLine onCardClick={phase === "place" ? null : handleCardClick} />

        {phase === "inspect" && activeCard && <InspectView />}

        {phase === "finished" && <p>All cards played!</p>}
      </div>

      {cardInfoMovie && (
        <CardInfo
          movie={cardInfoMovie}
          onClose={() => closeCardInfo()}
          animateWrong={cardInfoWrong}
        />
      )}
    </>
  );
}
