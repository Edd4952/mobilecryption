export type Trinket = {
  name: string;
  description: string;
  icon: string;
  iconLibrary?: "MaterialCommunityIcons" | "FontAwesome6" | "Octicons";
};

export const trinkets: Trinket[] = [
  {
    name: "Bottle Squirrel",
    description: "Add a Squirrel to your hand.",
    icon: "squirrel",
    iconLibrary: "Octicons",

  },
  {
    name: "Pliers",
    description: "Deal 1 direct damage to the opponent scale. ",
    icon: "pliers",
  },
  {
    name: "Scissors",
    description: "Cut an enemy card in front of your lane. ",
    icon: "content-cut",
  },
  {
    name: "Hoggy Bank",
    description: "Gain 4 bones instantly. ",
    icon: "piggy-bank",
  },
  {
    name: "Hourglass",
    description: "Skip the opponent attack phase for one turn. ",
    icon: "hourglass-half",
    iconLibrary: "FontAwesome6",
  },
  {
    name: "Fan",
    description: "Your cards gain Flying for one turn. ",
    icon: "fan",
    iconLibrary: "FontAwesome6",
  },
];

export const trinketsByName = Object.fromEntries(
  trinkets.map((trinket) => [trinket.name, trinket]),
) as Record<string, Trinket>;
