export type Trinket = {
  name: string;
  description: string;
  icon: string;
  iconLibrary?: "MaterialCommunityIcons" | "FontAwesome6";
};

export const trinkets: Trinket[] = [
  {
    name: "Pliers",
    description: "Deal 1 direct damage to the opponent scale. One-time use.",
    icon: "pliers",
  },
  {
    name: "Scissors",
    description: "Cut an enemy card in front of your lane. One-time use.",
    icon: "content-cut",
  },
  {
    name: "Hoggy Bank",
    description: "Gain 4 bones instantly. One-time use.",
    icon: "piggy-bank",
  },
  {
    name: "Hourglass",
    description: "Skip the opponent attack phase this turn. One-time use.",
    icon: "hourglass-half",
    iconLibrary: "FontAwesome6",
  },
  {
    name: "Fan",
    description: "Your cards gain Flying for this turn. One-time use.",
    icon: "fan",
    iconLibrary: "FontAwesome6",
  },
  {
    name: "Bottle Squirrel",
    description: "Add a Squirrel to your hand. One-time use.",
    icon: "squirrel",
    iconLibrary: "FontAwesome6",
  },
];

export const trinketsByName = Object.fromEntries(
  trinkets.map((trinket) => [trinket.name, trinket]),
) as Record<string, Trinket>;
