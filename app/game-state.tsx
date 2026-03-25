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
import { generateRandomMapState, type MapState } from "./map-generation";
import { trinkets, type Trinket } from "./trinkets";

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
  setDeck: React.Dispatch<React.SetStateAction<Card[]>>;
  setTrinkets: React.Dispatch<React.SetStateAction<(Trinket | null)[]>>;
  appendCardToDeck: (card: Card) => void;
  replaceDeckCardAt: (index: number, card: Card) => void;
};

const GAME_RUN_STORAGE_KEY = "@mobilecryption_game_run_v1";

const createInitialRunState = (): GameRunState => ({
  map: generateRandomMapState(),
  deck: cards.slice(0, 3).map((card) => ({ ...card })),
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

  const setDeck: React.Dispatch<React.SetStateAction<Card[]>> = (updater) => {
    setGameRun((current) => ({
      ...current,
      deck: typeof updater === "function" ? updater(current.deck) : updater,
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
      setDeck,
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
