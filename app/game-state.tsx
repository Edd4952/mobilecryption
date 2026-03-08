import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { cards, type Card } from "./cards";
import { trinkets, type Trinket } from "./trinkets";

export type Node = {
  id: string;
  icon?: string;
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

type GameRunState = {
  map: MapState;
  deck: Card[];
  trinkets: (Trinket | null)[];
  canContinue: boolean;
};

type GameRunContextValue = {
  gameRun: GameRunState;
  createNewGame: () => void;
  markRunEnded: () => void;
  setMapState: React.Dispatch<React.SetStateAction<MapState>>;
  setTrinkets: React.Dispatch<React.SetStateAction<(Trinket | null)[]>>;
  appendCardToDeck: (card: Card) => void;
  replaceDeckCardAt: (index: number, card: Card) => void;
};

const GAME_RUN_STORAGE_KEY = "@mobilecryption_game_run_v1";

const NON_BATTLE_NODES: Node[] = [
  { id: "newcard", icon: "cards-playing-outline" },
  { id: "campfire", icon: "fire" },
  { id: "gift", icon: "bag-personal" },
  { id: "sacrifice", icon: "table-furniture" },
];

const START_NODE: Node = { id: "start", icon: "circle-slice-8" };
const BATTLE_NODE: Node = { id: "battle", icon: "skull" };

const makeNodeInstanceId = (depth: number, nodeIndex: number, node?: Node) =>
  `${depth}-${nodeIndex}-${node?.id ?? "empty"}`;

const sample = <T,>(items: T[]) =>
  items[Math.floor(Math.random() * items.length)] ?? items[0];

const pickConnectionType = (fromCount: number, toCount: number): string => {
  if (fromCount === 1 && toCount >= 1) return "1-x";
  if (toCount === 1 && fromCount >= 1) return "x-1";

  if (fromCount === 2 && toCount === 2) {
    return sample(["22straight", "22divergeleft", "22divergeright"]);
  }
  if (fromCount === 3 && toCount === 2) {
    return sample(["32convergeleft", "32convergeright"]);
  }
  if (fromCount === 2 && toCount === 3) {
    return sample(["23divergeleft", "23divergeright"]);
  }
  if (fromCount === 3 && toCount === 3) {
    return sample(["33straight", "33divergeleft", "33divergeright"]);
  }

  return "1-x";
};

const generateMap = (): MapState => {
  const totalDepth = 15;

  const depthRows: {
    depth: number;
    numOfNodes: number;
    isBattle: boolean;
    nodes: Node[];
  }[] = [];

  for (let depth = 1; depth <= totalDepth; depth += 1) {
    if (depth === 1) {
      depthRows.push({
        depth,
        numOfNodes: 1,
        isBattle: false,
        nodes: [{ ...START_NODE }],
      });
      continue;
    }

    const isBattle = depth % 3 === 0;
    const numOfNodes = isBattle ? 1 : sample([2, 2, 3]);
    const nodes = Array.from({ length: numOfNodes }, () => {
      if (isBattle) {
        return { ...BATTLE_NODE };
      }
      return { ...sample(NON_BATTLE_NODES) };
    });

    depthRows.push({
      depth,
      numOfNodes,
      isBattle,
      nodes,
    });
  }

  const breaks: Break[] = depthRows.map((row, idx) => {
    const next = depthRows[idx + 1];
    const connection = next
      ? pickConnectionType(row.numOfNodes, next.numOfNodes)
      : "1-x";

    return {
      depth: row.depth,
      numOfNodes: row.numOfNodes,
      connectiontype: [connection],
      isBattle: row.isBattle,
      nodes: row.nodes,
    };
  });

  const firstNode = breaks[0]?.nodes[0];
  const firstNodeInstanceId = makeNodeInstanceId(1, 0, firstNode);

  return {
    currentDepth: 1,
    selectedNodeId: firstNodeInstanceId,
    playerPosition: {
      depth: 1,
      nodeIndex: 0,
      nodeInstanceId: firstNodeInstanceId,
    },
    breaks,
  };
};

const createInitialRunState = (): GameRunState => ({
  map: generateMap(),
  deck: cards.slice(1, 4).map((card) => ({ ...card })),
  trinkets: [trinkets[0], trinkets[1], null].map((item) =>
    item ? { ...item } : null,
  ),
  canContinue: true,
});

const GameRunContext = createContext<GameRunContextValue | undefined>(
  undefined,
);

export const GameRunProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const hasHydratedFromStorage = useRef(false);
  const [gameRun, setGameRun] = useState<GameRunState>(() =>
    createInitialRunState(),
  );

  useEffect(() => {
    let isMounted = true;

    const hydrateGameRun = async () => {
      try {
        const raw = await AsyncStorage.getItem(GAME_RUN_STORAGE_KEY);
        if (!raw) {
          return;
        }

        const parsed = JSON.parse(raw) as GameRunState;
        if (isMounted) {
          setGameRun({
            ...parsed,
            canContinue: parsed.canContinue ?? true,
          });
        }
      } catch (error) {
        console.warn("Failed to load saved game run:", error);
      } finally {
        if (isMounted) {
          hasHydratedFromStorage.current = true;
        }
      }
    };

    hydrateGameRun();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedFromStorage.current) {
      return;
    }

    AsyncStorage.setItem(GAME_RUN_STORAGE_KEY, JSON.stringify(gameRun)).catch(
      (error) => {
        console.warn("Failed to persist game run:", error);
      },
    );
  }, [gameRun]);

  const createNewGame = () => {
    setGameRun(createInitialRunState());
  };

  const markRunEnded = () => {
    setGameRun((current) => ({
      ...current,
      canContinue: false,
    }));
  };

  const setMapState: React.Dispatch<React.SetStateAction<MapState>> = (
    updater,
  ) => {
    setGameRun((current) => ({
      ...current,
      map: typeof updater === "function" ? updater(current.map) : updater,
    }));
  };

  const setTrinkets: React.Dispatch<
    React.SetStateAction<(Trinket | null)[]>
  > = (updater) => {
    setGameRun((current) => ({
      ...current,
      trinkets:
        typeof updater === "function" ? updater(current.trinkets) : updater,
    }));
  };

  const appendCardToDeck = (card: Card) => {
    setGameRun((current) => ({
      ...current,
      deck: [...current.deck, { ...card }],
    }));
  };

  const replaceDeckCardAt = (index: number, card: Card) => {
    setGameRun((current) => {
      if (index < 0 || index >= current.deck.length) {
        return current;
      }

      const nextDeck = [...current.deck];
      nextDeck[index] = {
        ...card,
        sigils: card.sigils.map((sigil) => ({ ...sigil })),
      };

      return {
        ...current,
        deck: nextDeck,
      };
    });
  };

  const value = useMemo(
    () => ({
      gameRun,
      createNewGame,
      markRunEnded,
      setMapState,
      setTrinkets,
      appendCardToDeck,
      replaceDeckCardAt,
    }),
    [gameRun],
  );

  return (
    <GameRunContext.Provider value={value}>{children}</GameRunContext.Provider>
  );
};

export const useGameRun = () => {
  const context = useContext(GameRunContext);
  if (!context) {
    throw new Error("useGameRun must be used within a GameRunProvider");
  }
  return context;
};
