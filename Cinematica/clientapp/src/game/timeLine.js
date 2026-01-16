export function buildTimelineMarkers(board) {
  if (!board || board.length === 0) return [];

  const markers = [];
  let lastDecade = null;

  board.forEach((card, index) => {
    if (!card?.year) return;

    const decade = Math.floor(card.year / 10) * 10;

    if (decade !== lastDecade) {
      markers.push({
        decade,
        label: formatDecade(decade),
        index,
      });
      lastDecade = decade;
    }
  });

  return markers;
}

function formatDecade(decade) {
  const short = decade % 100;
  return `${short.toString().padStart(2, "0")}s`;
}
