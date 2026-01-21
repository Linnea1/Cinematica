import mainDeckImg from "/images/decks/mainDeck.jpg";
import jamesBondDeckImg from "/images/decks/jamesBondDeck.jpg";
import horrorDeckImg from "/images/decks/horrorDeck.jpg";
import oscarsDeckImg from "/images/decks/oscarsDeck.jpg";
import womenDirectorsDeckDeckImg from "/images/decks/womenDirectorsDeck.jpg";

export const LIST_IDS = {
  mainDeck: { id: 8605209, img: mainDeckImg, label: "Starter Deck" },
  academyAwardWinnersDeck: {
    id: 8597868,
    img: oscarsDeckImg,
    label: "Academy Award Winners",
  },
  horrorDeck: { id: 8597671, img: horrorDeckImg, label: "Horror" },
  womenDirectorsDeck: {
    id: 8627695,
    img: womenDirectorsDeckDeckImg,
    label: "Women Directors",
  },
  jamesBondDeck: { id: 8604933, img: jamesBondDeckImg, label: "James Bond" },
};

export default LIST_IDS;
