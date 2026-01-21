import { LIST_IDS } from "./listIds";

export async function fetchDeck(listId) {
  let id;
  if (!listId) id = LIST_IDS.mainDeck.id;
  else if (typeof listId === "object" && listId.id) id = listId.id;
  else id = listId;

  const res = await fetch(`/api/tmdb/deck?listId=${encodeURIComponent(id)}`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Deck fetch failed: ${res.status} ${txt}`);
  }
  return res.json();
}
