export async function fetchDeck() {
  const res = await fetch("/api/tmdb/deck", {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Deck fetch failed: ${res.status} ${txt}`);
  }
  return res.json();
}
