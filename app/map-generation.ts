export type Node = {
  id: string;
  icon?: string;
  iconLibrary?: "MaterialCommunityIcons" | "MaterialIcons";
};

export type Break = {
  depth: number;
  numOfNodes: number;
  connectiontype: string[];
  isBattle: boolean;
  nodes: Node[];
};

export type PlayerPosition = {
  depth: number;
  nodeIndex: number;
  nodeInstanceId?: string;
};

export type MapState = {
  currentDepth: number;
  selectedNodeId?: string;
  playerPosition: PlayerPosition;
  breaks: Break[];
};

export const nodeList: Node[] = [
  { id: "start", icon: "circle-slice-8" },
  { id: "newcard", icon: "cards-playing-outline" },
  { id: "newcardCost", icon: "bloodtype", iconLibrary: "MaterialIcons" },
  { id: "newcardClass", icon: "shape-outline" },
  { id: "campfire", icon: "fire" },
  { id: "trinket", icon: "bag-personal" },
  { id: "sacrifice", icon: "table-furniture" },
  { id: "totem", icon: "chess-rook" },
  { id: "battle", icon: "skull" },
];

type BreakCategory = "card-collection" | "misc-upgrade";

const BREAK_NODE_POOLS: Record<BreakCategory, Node[]> = {
  "card-collection": nodeList.filter((node) =>
    ["newcard", "newcardCost", "newcardClass"].includes(node.id),
  ),
  "misc-upgrade": nodeList.filter((node) =>
    ["campfire", "sacrifice", "trinket", "totem"].includes(node.id),
  ),
};

export const connectionTypes: string[] = [
  //one to anything
  "1-x",
  //anything to one
  "x-1",
  //two to two
  "22straight",
  "22divergeleft", // the path on the left diverges to the right and forward
  "22divergeright",
  //three to two
  "32convergeleft", // the left and middle paths converge to the left, the right path continues straight
  "32convergeright",
  //two to three
  "23divergeleft", // the right path continues straight, the left path diverges to the left and forward
  "23divergeright",
  //three to three
  "33straight",
  "33divergeleft", //left continues forward, middle diverges left and forward, right diverges left and forward
  "33divergeright", //right continues forward, middle diverges right and forward, left diverges right and forward
];

export const range = (count: number) =>
  Array.from({ length: count }, (_, idx) => idx);

export const connectionResolvers: Record<
  string,
  (fromCount: number, toCount: number) => number[][] | null
> = {
  "1-x": (fromCount, toCount) => {
    if (fromCount !== 1 || toCount < 1) return null;
    return [range(toCount)];
  },
  "x-1": (fromCount, toCount) => {
    if (toCount !== 1) return null;
    return Array.from({ length: fromCount }, () => [0]);
  },
  "22straight": (fromCount, toCount) =>
    fromCount === 2 && toCount === 2 ? [[0], [1]] : null,
  "22divergeleft": (fromCount, toCount) =>
    fromCount === 2 && toCount === 2 ? [[0, 1], [1]] : null,
  "22divergeright": (fromCount, toCount) =>
    fromCount === 2 && toCount === 2 ? [[0], [0, 1]] : null,
  "32convergeleft": (fromCount, toCount) =>
    fromCount === 3 && toCount === 2 ? [[0], [0], [1]] : null,
  "32convergeright": (fromCount, toCount) =>
    fromCount === 3 && toCount === 2 ? [[0], [1], [1]] : null,
  "23divergeleft": (fromCount, toCount) =>
    fromCount === 2 && toCount === 3 ? [[0, 1], [2]] : null,
  "23divergeright": (fromCount, toCount) =>
    fromCount === 2 && toCount === 3 ? [[0], [1, 2]] : null,
  "33straight": (fromCount, toCount) =>
    fromCount === 3 && toCount === 3 ? [[0], [1], [2]] : null,
  "33divergeleft": (fromCount, toCount) =>
    fromCount === 3 && toCount === 3 ? [[0], [0, 1], [1, 2]] : null,
  "33divergeright": (fromCount, toCount) =>
    fromCount === 3 && toCount === 3 ? [[0, 1], [1, 2], [2]] : null,
};

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pickRandom = <T>(items: T[]) =>
  items[randomInt(0, Math.max(items.length - 1, 0))];

const shuffle = <T>(items: T[]) => {
  const cloned = [...items];
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }
  return cloned;
};

const getRandomBreakNodes = (count: number, category: BreakCategory) =>
  shuffle(BREAK_NODE_POOLS[category]).slice(0, count);

const getRandomConnectionType = (fromCount: number, toCount: number) => {
  const compatible = connectionTypes.filter((type) =>
    Boolean(connectionResolvers[type]?.(fromCount, toCount)),
  );

  if (compatible.length === 0) {
    if (fromCount === 1) return "1-x";
    if (toCount === 1) return "x-1";
    return "33straight";
  }

  return pickRandom(compatible);
};

export const makeNodeInstanceId = (
  depth: number,
  nodeIndex: number,
  node?: Node,
) => `${depth}-${nodeIndex}-${node?.id ?? "empty"}`;

export const generateRandomMapState = (): MapState => {
  const breaks: Break[] = [];
  let depth = 1;
  const startNode = nodeList.find((node) => node.id === "start") ?? nodeList[0];
  const newCardNode =
    nodeList.find((node) => node.id === "newcard") ?? nodeList[1];
  const battleNode =
    nodeList.find((node) => node.id === "battle") ?? nodeList[5];

  breaks.push({
    depth,
    numOfNodes: 1,
    connectiontype: [],
    isBattle: false,
    nodes: [startNode],
  });
  depth += 1;

  for (let battleNumber = 1; battleNumber <= 5; battleNumber += 1) {
    for (let breakNumber = 0; breakNumber < 2; breakNumber += 1) {
      const isFirstPlayableBreak = battleNumber === 1 && breakNumber === 0;
      const breakCategory: BreakCategory =
        breakNumber === 0 ? "card-collection" : "misc-upgrade";
      const numOfNodes = isFirstPlayableBreak ? 1 : randomInt(2, 3);
      breaks.push({
        depth,
        numOfNodes,
        connectiontype: [],
        isBattle: false,
        nodes: isFirstPlayableBreak
          ? [newCardNode]
          : getRandomBreakNodes(numOfNodes, breakCategory),
      });
      depth += 1;
    }

    breaks.push({
      depth,
      numOfNodes: 1,
      connectiontype: [],
      isBattle: true,
      nodes: [battleNode],
    });
    depth += 1;
  }

  for (let index = 0; index < breaks.length - 1; index += 1) {
    const currentBreak = breaks[index];
    const nextBreak = breaks[index + 1];
    currentBreak.connectiontype = [
      getRandomConnectionType(currentBreak.numOfNodes, nextBreak.numOfNodes),
    ];
  }

  const firstBreak = breaks[0];
  const firstNode = firstBreak?.nodes[0];
  const firstNodeInstanceId = firstNode
    ? makeNodeInstanceId(firstBreak.depth, 0, firstNode)
    : undefined;

  return {
    currentDepth: firstBreak?.depth ?? 1,
    selectedNodeId: firstNodeInstanceId,
    playerPosition: {
      depth: firstBreak?.depth ?? 1,
      nodeIndex: 0,
      nodeInstanceId: firstNodeInstanceId,
    },
    breaks,
  };
};
