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
        description: "A card with this sigil attacks the enemy directly.",
        icon: "feather",
    },
    {
        name: "Mighty Leap",
        description: "A card with this sigil blocks flying cards.",
        icon: "shield-airplane",
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
    cost: 2,
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
  }
];
