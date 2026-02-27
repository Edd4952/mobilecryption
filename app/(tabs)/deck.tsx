import { cards, type Card } from "../cards";
import { trinkets, type Trinket } from "../trinkets";

export const deck: Card[] = cards.slice(6);

export const trinketDeck: Trinket[] = [...trinkets];

export const startingTrinketSlots: (Trinket | null)[] = [
  trinkets[0],
  trinkets[1],
  null,
];
