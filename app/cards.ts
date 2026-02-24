import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Icon } from "react-native-screens";

export type Sigil = {
  name: string;
  description: string;
  icon: string;
};

export type Card = {
  name: string;
  class: "Avian" | "Canine" | "Insect" | "Reptile" | "Hooved" | "Miscellaneous";
  image: string;
  damage: number;
  health: number;
  sigils: Sigil[];
  cost: number;
  costType?: "Blood" | "Bone";
};

export const sigils: Sigil[] = [
    {
        name: "Flying",
        description: "A card bearing this sigil leaps over the opposing card and attacks the enemy directly.",
        icon: "feather",
    },
    {
        name: "Mighty Leap",
        description: "A card bearing this sigil blocks flying cards.",
        icon: "shield-airplane",
    },
    {
        name: "Leader",
        description: "Creatures adjacent to a card bearing this sigil gain 1 Power.",
        icon: "arrows-h",
    },
    {
        name: "Fledgling",
        description: "A card bearing this sigil will grow into a more powerful form after 1 turn on the board.",
        icon: "clock",
    },
    {
        name: "Sprinter",
        description: "A card bearing this sigil will move in the direction inscribed.",
        icon: "arrow-right",
    },
    {
        name: "Sprint left",
        description: "A card bearing this sigil will move in the direction inscribed.",
        icon: "arrow-left",
    },
    {
        name: "Bifurcated Strike",
        description: "A card bearing this sigil will strike in the slots next to the opposing slot.",
        icon: "call-split",
    }

    

];

export const sigilsByName = Object.fromEntries(
  sigils.map((sigil) => [sigil.name, sigil]),
) as Record<string, Sigil>;

export const cards: Card[] = [
  {
    name: "Sparrow",
    class: "Avian",
    image:
      "https://static.wikia.nocookie.net/duelyst/images/5/5b/Sparrow_card.png/revision/latest?cb=20151109004244",
    damage: 1,
    health: 2,
    sigils: [sigilsByName["Flying"]],
    cost: 1,
    costType: "Blood",
  },
  {
    name: "Magpie",
    class: "Avian",
    image:
      "https://static.wikia.nocookie.net/duelyst/images/4/4b/Raven_card.png/revision/latest?cb=20151109004244",
    damage: 1,
    health: 1,
    sigils: [sigilsByName["Flying"]],
    cost: 2,
    costType: "Blood",
  },
  {
    name: "Raven",
    class: "Avian",
    image:
      "https://static.wikia.nocookie.net/duelyst/images/7/7c/Hawk_card.png/revision/latest?cb=20151109004244",
    damage: 2,
    health: 3,
    sigils: [sigilsByName["Flying"]],
    cost: 2,
    costType: "Blood",
  },
  {
    name: "Bullfrog",
    class: "Reptile",
    image:
      "https://static.wikia.nocookie.net/duelyst/images/7/7c/Hawk_card.png/revision/latest?cb=20151109004244",
    damage: 1,
    health: 2,
    sigils: [sigilsByName["Mighty Leap"]],
    cost: 1,
    costType: "Blood",

  },
  {
    name: "Squirrel",
    class: "Miscellaneous",
    image:
      "https://static.wikia.nocookie.net/duelyst/images/7/7c/Hawk_card.png/revision/latest?cb=20151109004244",
    damage: 0,
    health: 1,
    sigils: [],
    cost: 0,
    costType: "Blood",
  },
  {
    name: "Wolf",
    class: "Canine",
    image:
      "https://static.wikia.nocookie.net/duelyst/images/7/7c/Hawk_card.png/revision/latest?cb=20151109004244",
    damage: 3,
    health: 2,
    sigils: [],
    cost: 2,
    costType: "Blood",
  },
  {
    name: "Coyote",
    class: "Canine",
    image:
      "https://static.wikia.nocookie.net/duelyst/images/7/7c/Hawk_card.png/revision/latest?cb=20151109004244",
    damage: 2,
    health: 1,
    sigils: [],
    cost: 4,
    costType: "Bone",
  },
  {
    name: "Alpha",
    class: "Canine",
    image:
      "https://static.wikia.nocookie.net/duelyst/images/7/7c/Hawk_card.png/revision/latest?cb=20151109004244",
    damage: 1,
    health: 2,
    sigils: [sigilsByName["Leader"]],
    cost: 4,
    costType: "Bone",
  },
  {
    name: "Wolf Cub",
    class: "Canine",
    image:
      "https://static.wikia.nocookie.net/duelyst/images/7/7c/Hawk_card.png/revision/latest?cb=20151109004244",
    damage: 1,
    health: 1,
    sigils: [sigilsByName["Fledgling"]],
    cost: 1,
    costType: "Blood",
  },
  {
    name: "Elk",
    class: "Hooved",
    image:
      "https://static.wikia.nocookie.net/duelyst/images/7/7c/Hawk_card.png/revision/latest?cb=20151109004244",
    damage: 2,
    health: 4,
    sigils: [sigilsByName["Sprinter"]],
    cost: 2,
    costType: "Blood",
  },
  {
    name: "Fawn",
    class: "Hooved",
    image:
      "https://static.wikia.nocookie.net/duelyst/images/7/7c/Hawk_card.png/revision/latest?cb=20151109004244",
    damage: 1,
    health: 1,
    sigils: [sigilsByName["Sprinter"], sigilsByName["Fledgling"]],
    cost: 1,
    costType: "Blood",
  },
  {
    name: "Mantis",
    class: "Insect",
    image:
      "https://static.wikia.nocookie.net/duelyst/images/7/7c/Hawk_card.png/revision/latest?cb=20151109004244",
    damage: 1,
    health: 1,
    sigils: [sigilsByName["Bifurcated Strike"]],
    cost: 1,
    costType: "Blood",
  },

  
  

  
];
