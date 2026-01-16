import { create } from "zustand";

export const useGameStore = create((set, get) => ({
  phase: "idle",
  deck: [],
  board: [],
  activeCard: null,
  chosenIndex: null,

  showCardInfoFor: null,
  openCardInfo: (movie) => set({ showCardInfoFor: movie }),
  closeCardInfo: () => set({ showCardInfoFor: null }),

  startGame: (initialDeck) => {
    set({
      deck: [...initialDeck],
      board: [],
      activeCard: null,
      chosenIndex: null,
      phase: "idle",
    });

    setTimeout(() => get().drawCard(true), 0);
  },

  drawCard: (autoPlace = false) => {
    const { deck, board } = get();

    if (!deck || deck.length === 0) return;

    const deckCopy = [...deck];
    const [card] = deckCopy.splice(0, 1);

    console.log(
      "drawCard called, autoPlace=",
      autoPlace,
      "deckLen=",
      deck.length,
      "card=",
      card
    );

    if (autoPlace) {
      set({
        deck: deckCopy,
        board: [...board, card],
        activeCard: null,
        phase: "idle",
      });
    } else {
      set({
        deck: deckCopy,
        activeCard: card,
        phase: "inspect",
      });
    }
  },

  startPlacing: () => {
    const { board } = get();
    set({
      phase: "place",
      chosenIndex: board.length,
    });
  },

  choosePosition: (index) => set({ chosenIndex: index }),

  confirmPlacement: () => {
    const { board, activeCard, chosenIndex, deck } = get();
    if (!activeCard || chosenIndex == null) return;

    const tentative = [...board];
    tentative.splice(chosenIndex, 0, activeCard);

    const left = tentative[chosenIndex - 1];
    const right = tentative[chosenIndex + 1];
    let correct = true;
    if (left && activeCard.year < left.year) correct = false;
    if (right && activeCard.year > right.year) correct = false;

    if (correct) {
      set({
        board: tentative,
        activeCard: null,
        chosenIndex: null,
        phase: "resolve",
      });
    } else {
      set({
        activeCard: null,
        chosenIndex: null,
        phase: "resolve",
        showCardInfoFor: activeCard,
      });
    }

    setTimeout(() => {
      if (deck.length > 0) {
        set({ phase: "idle" });
      } else {
        set({ phase: "finished" });
      }
    }, 500);
  },
}));
