import { CardView } from "@/components/card-view";
import { ThemedText } from "@/components/themed-text";
import {
  FontAwesome,
  FontAwesome6,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import Octicons from "@expo/vector-icons/Octicons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Card, cards, sigils, sigilsByName } from "../cards";
import { type Trinket } from "../trinkets";
import { deck, startingTrinketSlots } from "./deck";

type BattleCard = Card & {
  turnsOnBoard?: number;
  fledglingUsed?: boolean;
};

type LevelTypeName =
  | "hooved"
  | "just bees"
  | "ants"
  | "canine"
  | "birds"
  | "reptiles"
  | "one bear";

type LevelDifficulty = 1 | 2 | 3;

const LEVEL_POOLS: Record<LevelTypeName, string[]> = {
  hooved: ["Elk", "Fawn", "Porcupine"],
  "just bees": ["Bee"],
  ants: ["Ant", "Alate", "Bee"],
  canine: ["Wolf", "Coyote", "Cub"],
  birds: ["Sparrow", "Raven"],
  reptiles: ["Skink", "Snapper", "Adder"],
  "one bear": ["Bear"],
};

const ANT_RULE_KEY = "Ant Power";

export default function Battle() {
  const slots = Array.from({ length: 12 }, (_, idx) => idx);
  const trinketSlots = Array.from({ length: 3 }, (_, idx) => idx);
  const [hand, setHand] = useState<BattleCard[]>([]);
  const [drawPile, setDrawPile] = useState<BattleCard[]>([]);
  const [score, setScore] = useState(5);
  const [bones, setBones] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mustDrawCard, setMustDrawCard] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<"win" | "lose" | null>(null);
  const [isTrinketModalVisible, setIsTrinketModalVisible] = useState(false);
  const [isRulebookVisible, setIsRulebookVisible] = useState(false);
  const [rulebookTargetKey, setRulebookTargetKey] = useState<string | null>(
    null,
  );
  const [selectedTrinketSlot, setSelectedTrinketSlot] = useState<number | null>(
    null,
  );
  const [heldTrinkets, setHeldTrinkets] = useState<(Trinket | null)[]>(() =>
    startingTrinketSlots.map((trinket) => (trinket ? { ...trinket } : null)),
  );
  const [pendingScissorsTarget, setPendingScissorsTarget] = useState(false);
  const [skipOpponentAttackPhase, setSkipOpponentAttackPhase] = useState(false);
  const [fanActive, setFanActive] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sacrificeSlots, setSacrificeSlots] = useState<number[]>([]);
  const [sacrificeRequired, setSacrificeRequired] = useState(0);
  const [slotSize, setSlotSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [slotCards, setSlotCards] = useState<(BattleCard | null)[]>(
    Array.from({ length: 12 }, () => null),
  );
  const slotY = useRef<Animated.Value[]>(
    Array.from({ length: 12 }, () => new Animated.Value(0)),
  ).current;
  const rulebookScrollRef = useRef<ScrollView | null>(null);
  const rulebookOffsetsRef = useRef<Record<string, number>>({});
  const drawButtonOpacity = useRef(new Animated.Value(1)).current;
  const placeableSlots = useMemo(() => new Set([8, 9, 10, 11]), []);
  ////////////////////////////////////////////////////////////
  const [levelType] = useState<LevelTypeName>("hooved");
  const [levelDifficulty] = useState<LevelDifficulty>(2);
  ////////////////////////////////////////////////////////////
  const squirrelCard = useMemo(
    () => cards.find((card) => card.name === "Squirrel") ?? null,
    [],
  );
  const enemySpawnPool = useMemo(() => {
    const names = LEVEL_POOLS[levelType];
    return names
      .map((name) => cards.find((card) => card.name === name) ?? null)
      .filter((card): card is Card => card !== null);
  }, [levelType]);
  const evolvedByName = useMemo(
    () => ({
      Cub: cards.find((card) => card.name === "Wolf") ?? null,
      Fawn: cards.find((card) => card.name === "Elk") ?? null,
    }),
    [],
  );
  const tailCardTemplate = useMemo(
    () => ({
      name: "Tail",
      class: "Reptile" as const,
      image:
        "https://static.wikia.nocookie.net/duelyst/images/7/7c/Hawk_card.png/revision/latest?cb=20151109004244",
      damage: 0,
      health: 2,
      sigils: [],
      cost: 0,
      costType: "Blood" as const,
    }),
    [],
  );

  const cloneCard = (card: Card | BattleCard): BattleCard => ({
    ...card,
    sigils: card.sigils.map((sigil) => ({ ...sigil })),
    turnsOnBoard: (card as BattleCard).turnsOnBoard ?? 0,
    fledglingUsed: (card as BattleCard).fledglingUsed ?? false,
  });

  const hasSigil = (card: BattleCard | null, sigilName: string) =>
    Boolean(card?.sigils.some((sigil) => sigil.name === sigilName));

  const isAntName = (name: string) => name === "Ant" || name === "Alate";

  const renderTrinketIcon = (trinket: Trinket) => {
    if (trinket.iconLibrary === "FontAwesome6") {
      return (
        <FontAwesome6
          name={trinket.icon as keyof typeof FontAwesome6.glyphMap}
          size={70}
          color="#ffffff"
        />
      );
    }

    return (
      <MaterialCommunityIcons
        name={trinket.icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={70}
        color="#ffffff"
      />
    );
  };

  const handleOpenRulebookForCard = (card: Card) => {
    const firstSigilName = card.sigils[0]?.name;
    const targetKey =
      firstSigilName ?? (isAntName(card.name) ? ANT_RULE_KEY : null);
    setRulebookTargetKey(targetKey);
    setIsRulebookVisible(true);
  };

  const handleRuleSectionLayout =
    (sectionKey: string) => (event: LayoutChangeEvent) => {
      rulebookOffsetsRef.current[sectionKey] = event.nativeEvent.layout.y;
    };

  const clearHeldTrinketAt = (slotId: number) => {
    setHeldTrinkets((current) => {
      const next = [...current];
      next[slotId] = null;
      return next;
    });
  };

  const handleUseTrinket = (slotId: number) => {
    if (isAnimating || gameOver) {
      return;
    }

    const trinket = heldTrinkets[slotId];
    if (!trinket) {
      return;
    }

    if (trinket.name === "Scissors") {
      const hasEnemyTarget = slotCards
        .slice(0, 8)
        .some((card) => Boolean(card));
      if (!hasEnemyTarget) {
        return;
      }
      setPendingScissorsTarget(true);
      setSelectedTrinketSlot(slotId);
      setIsTrinketModalVisible(false);
      clearHeldTrinketAt(slotId);
      return;
    }

    if (trinket.name === "Pliers") {
      setScore((currentScore) => currentScore + 1);
    } else if (trinket.name === "Hoggy Bank") {
      setBones((currentBones) => currentBones + 4);
    } else if (trinket.name === "Hourglass") {
      setSkipOpponentAttackPhase(true);
    } else if (trinket.name === "Fan") {
      setFanActive(true);
    } else if (trinket.name === "Bottle Squirrel") {
      if (squirrelCard) {
        setHand((currentHand) => [...currentHand, cloneCard(squirrelCard)]);
      }
    }

    setSelectedTrinketSlot(slotId);
    setIsTrinketModalVisible(false);
    clearHeldTrinketAt(slotId);
  };

  const setSigilName = (
    card: BattleCard,
    fromName: string,
    toName: string,
  ): BattleCard => {
    const nextSigilTemplate = sigilsByName[toName];
    let changed = false;
    const nextSigils = card.sigils.map((sigil) => {
      if (sigil.name !== fromName) {
        return sigil;
      }
      changed = true;
      return {
        ...sigil,
        name: toName,
        icon: nextSigilTemplate?.icon ?? sigil.icon,
      };
    });

    if (!changed) {
      return card;
    }

    return {
      ...card,
      sigils: nextSigils,
    };
  };

  const getLeaderBonus = (
    localSlots: (BattleCard | null)[],
    attackerSlot: number,
  ) => {
    const inPlayerRow = attackerSlot >= 8 && attackerSlot <= 11;
    const inOpponentRow = attackerSlot >= 4 && attackerSlot <= 7;
    if (!inPlayerRow && !inOpponentRow) {
      return 0;
    }

    const rowStart = inPlayerRow ? 8 : 4;
    const rowEnd = inPlayerRow ? 11 : 7;
    let bonus = 0;
    const left = attackerSlot - 1;
    const right = attackerSlot + 1;

    if (left >= rowStart && hasSigil(localSlots[left], "Leader")) {
      bonus += 1;
    }
    if (right <= rowEnd && hasSigil(localSlots[right], "Leader")) {
      bonus += 1;
    }

    return bonus;
  };

  const isAntCard = (card: BattleCard | null) =>
    Boolean(card && (card.name === "Ant" || card.name === "Alate"));

  const getAntPower = (
    localSlots: (BattleCard | null)[],
    attackerSlot: number,
  ) => {
    const inPlayerRow = attackerSlot >= 8 && attackerSlot <= 11;
    const inOpponentRow = attackerSlot >= 4 && attackerSlot <= 7;

    if (!inPlayerRow && !inOpponentRow) {
      return 0;
    }

    const rowStart = inPlayerRow ? 8 : 4;
    const rowEnd = inPlayerRow ? 11 : 7;
    let antCount = 0;

    for (let slot = rowStart; slot <= rowEnd; slot += 1) {
      if (isAntCard(localSlots[slot])) {
        antCount += 1;
      }
    }

    return antCount;
  };

  const getCardPower = (
    localSlots: (BattleCard | null)[],
    attackerSlot: number,
  ) => {
    const attacker = localSlots[attackerSlot];
    if (!attacker) {
      return 0;
    }

    if (isAntCard(attacker)) {
      return getAntPower(localSlots, attackerSlot);
    }

    return attacker.damage;
  };

  const getAttackTargets = (
    localSlots: (BattleCard | null)[],
    attackerSlot: number,
    isPlayerAttack: boolean,
  ) => {
    const lane = isPlayerAttack ? attackerSlot - 8 : attackerSlot - 4;
    const targetRowStart = isPlayerAttack ? 4 : 8;
    const attacker = localSlots[attackerSlot];

    if (!attacker || !hasSigil(attacker, "Bifurcated Strike")) {
      return [targetRowStart + lane];
    }

    const adjacentLanes = [lane - 1, lane + 1].filter(
      (idx) => idx >= 0 && idx <= 3,
    );

    if (adjacentLanes.length === 0) {
      return [targetRowStart + lane];
    }

    return adjacentLanes.map((idx) => targetRowStart + idx);
  };

  const applySprinterMovement = (
    localSlots: (BattleCard | null)[],
    rowStart: number,
    rowEnd: number,
  ) => {
    const nextSlots = [...localSlots];
    const moveIntents: { from: number; to: number }[] = [];
    const reservedTargets = new Set<number>();

    for (let slot = rowStart; slot <= rowEnd; slot += 1) {
      const originalCard = localSlots[slot];
      if (!originalCard) {
        continue;
      }

      let card = originalCard;
      let direction: -1 | 1 | null = null;

      if (hasSigil(card, "Sprinter")) {
        direction = 1;
      } else if (hasSigil(card, "Sprint left")) {
        direction = -1;
      }

      if (direction === null) {
        continue;
      }

      const reverseDirection = () => {
        if (direction === 1) {
          card = setSigilName(card, "Sprinter", "Sprint left");
          direction = -1;
        } else {
          card = setSigilName(card, "Sprint left", "Sprinter");
          direction = 1;
        }
        nextSlots[slot] = card;
      };

      const canMoveTo = (target: number) =>
        target >= rowStart &&
        target <= rowEnd &&
        !localSlots[target] &&
        !reservedTargets.has(target);

      if (
        (slot === rowEnd && direction === 1) ||
        (slot === rowStart && direction === -1)
      ) {
        reverseDirection();
      }

      let target = slot + direction;
      if (!canMoveTo(target)) {
        reverseDirection();
        target = slot + direction;
      }

      if (canMoveTo(target)) {
        moveIntents.push({ from: slot, to: target });
        reservedTargets.add(target);
      }
    }

    moveIntents.forEach(({ from, to }) => {
      nextSlots[to] = nextSlots[from];
      nextSlots[from] = null;
    });

    return nextSlots;
  };

  const applyFledglingStep = (
    localSlots: (BattleCard | null)[],
    slotIndices?: number[],
    options?: { incrementTurns?: boolean },
  ) => {
    const nextSlots = [...localSlots];
    const incrementTurns = options?.incrementTurns ?? true;
    const slotsToProcess =
      slotIndices ?? Array.from({ length: nextSlots.length }, (_, idx) => idx);

    for (const slot of slotsToProcess) {
      const card = nextSlots[slot];
      if (!card) {
        continue;
      }

      const turnsOnBoard = incrementTurns
        ? (card.turnsOnBoard ?? 0) + 1
        : (card.turnsOnBoard ?? 0);
      let nextCard: BattleCard = {
        ...card,
        turnsOnBoard,
      };

      if (
        hasSigil(nextCard, "Fledgling") &&
        !nextCard.fledglingUsed &&
        turnsOnBoard >= 1
      ) {
        const evolvedTemplate = evolvedByName[nextCard.name as "Cub" | "Fawn"];
        if (evolvedTemplate) {
          const sourceWasSprintLeft = hasSigil(nextCard, "Sprint left");
          const sourceWasSprinter = hasSigil(nextCard, "Sprinter");
          let evolvedCard = cloneCard(evolvedTemplate);

          if (sourceWasSprintLeft && hasSigil(evolvedCard, "Sprinter")) {
            evolvedCard = setSigilName(evolvedCard, "Sprinter", "Sprint left");
          } else if (
            sourceWasSprinter &&
            hasSigil(evolvedCard, "Sprint left")
          ) {
            evolvedCard = setSigilName(evolvedCard, "Sprint left", "Sprinter");
          }

          nextCard = {
            ...evolvedCard,
            turnsOnBoard,
            fledglingUsed: true,
          };
        } else {
          nextCard = {
            ...nextCard,
            damage: nextCard.damage + 1,
            health: nextCard.health + 1,
            fledglingUsed: true,
          };
        }
      }

      nextSlots[slot] = nextCard;
    }

    return nextSlots;
  };

  const incrementTurnsOnBoard = (
    localSlots: (BattleCard | null)[],
    slotIndices: number[],
  ) => {
    const nextSlots = [...localSlots];

    for (const slot of slotIndices) {
      const card = nextSlots[slot];
      if (!card) {
        continue;
      }

      nextSlots[slot] = {
        ...card,
        turnsOnBoard: (card.turnsOnBoard ?? 0) + 1,
      };
    }

    return nextSlots;
  };

  useEffect(() => {
    const shuffledDeck = [...deck];
    for (let i = shuffledDeck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }

    const startingHand = shuffledDeck.slice(0, 3);
    const startingBattleHand = startingHand.map((card) => cloneCard(card));
    setHand(
      squirrelCard
        ? [...startingBattleHand, cloneCard(squirrelCard)]
        : startingBattleHand,
    );
    setDrawPile(shuffledDeck.slice(3).map((card) => cloneCard(card)));
    setBones(0);
    setSelectedIndex(null);
    setHeldTrinkets(
      startingTrinketSlots.map((trinket) => (trinket ? { ...trinket } : null)),
    );

    const initialSlots: (BattleCard | null)[] = Array.from(
      { length: 12 },
      () => null,
    );
    const emptyTopSlots = [0, 1, 2, 3];

    if (enemySpawnPool.length > 0 && emptyTopSlots.length > 0) {
      const spawnCap =
        levelType === "one bear"
          ? 1
          : Math.max(1, Math.min(3, levelDifficulty));
      const cardsToSpawn = Math.min(spawnCap, emptyTopSlots.length);

      for (let i = 0; i < cardsToSpawn; i += 1) {
        const slotIndex = Math.floor(Math.random() * emptyTopSlots.length);
        const selectedSlot = emptyTopSlots.splice(slotIndex, 1)[0];
        const enemyIndex = Math.floor(Math.random() * enemySpawnPool.length);
        const enemyTemplate = enemySpawnPool[enemyIndex];
        initialSlots[selectedSlot] = cloneCard(enemyTemplate);
      }
    }

    setSlotCards(initialSlots);
  }, [squirrelCard, enemySpawnPool, levelDifficulty, levelType]);

  useEffect(() => {
    if (mustDrawCard) {
      const flashAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(drawButtonOpacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(drawButtonOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      );
      flashAnimation.start();
      return () => {
        flashAnimation.stop();
        drawButtonOpacity.setValue(1);
      };
    }
  }, [mustDrawCard, drawButtonOpacity]);

  useEffect(() => {
    if (!isRulebookVisible) {
      return;
    }

    const timeout = setTimeout(() => {
      const targetOffset =
        rulebookTargetKey !== null
          ? rulebookOffsetsRef.current[rulebookTargetKey]
          : undefined;

      rulebookScrollRef.current?.scrollTo({
        y: targetOffset ?? 0,
        animated: true,
      });
    }, 40);

    return () => clearTimeout(timeout);
  }, [isRulebookVisible, rulebookTargetKey]);

  useEffect(() => {
    if (score >= 10) {
      setGameOver(true);
      setGameResult("win");
      setIsAnimating(false);
      setMustDrawCard(false);
    } else if (score <= 0) {
      setGameOver(true);
      setGameResult("lose");
      setIsAnimating(false);
      setMustDrawCard(false);
    }
  }, [score]);

  const checkSlots = (index: number) => {
    const card = hand[index];
    if (!card) {
      return;
    }

    if (card.costType === "Bone") {
      if (bones >= card.cost) {
        setSelectedIndex(index);
        setSacrificeRequired(0);
        setSacrificeSlots([]);
        return;
      }

      setSelectedIndex(null);
      setSacrificeRequired(0);
      setSacrificeSlots([]);
      return;
    }

    const cardsOnTable = [...placeableSlots].filter(
      (slotIndex) => slotCards[slotIndex],
    ).length;

    if (cardsOnTable >= card.cost) {
      setSelectedIndex(index);
      setSacrificeRequired(card.cost);
      setSacrificeSlots([]);
      return;
    }

    setSelectedIndex(null);
    setSacrificeRequired(0);
    setSacrificeSlots([]);
  };

  const handleSelectCard = (index: number) => {
    if (isAnimating) return;
    if (gameOver) return;
    if (selectedIndex === index) {
      setSelectedIndex(null);
      setSacrificeRequired(0);
      setSacrificeSlots([]);
      return;
    }

    checkSlots(index);
  };

  const handlePlaceCard = (slotIndex: number) => {
    if (isAnimating) return;
    if (gameOver) return;

    if (pendingScissorsTarget) {
      const isOpponentSideSlot = slotIndex >= 0 && slotIndex <= 7;
      if (!isOpponentSideSlot || !slotCards[slotIndex]) {
        return;
      }

      setSlotCards((current) => {
        const next = [...current];
        next[slotIndex] = null;
        return next;
      });
      setPendingScissorsTarget(false);
      return;
    }

    if (!placeableSlots.has(slotIndex)) {
      return;
    }
    if (selectedIndex === null) {
      return;
    }
    const cardToPlace = hand[selectedIndex];
    if (!cardToPlace) {
      return;
    }

    if (cardToPlace.costType === "Bone") {
      if (slotCards[slotIndex]) {
        return;
      }

      if (bones < cardToPlace.cost) {
        return;
      }

      setSlotCards((current) => {
        const next = [...current];
        next[slotIndex] = cardToPlace;
        return next;
      });
      setBones((currentBones) => currentBones - cardToPlace.cost);
      setHand((current) => current.filter((_, idx) => idx !== selectedIndex));
      setSelectedIndex(null);
      setSacrificeRequired(0);
      setSacrificeSlots([]);
      return;
    }

    if (cardToPlace.cost > 0) {
      if (slotCards[slotIndex]) {
        setBones((currentBones) => currentBones + 1);
        setSlotCards((current) => {
          const next = [...current];
          next[slotIndex] = null;
          return next;
        });
        setSacrificeSlots((current) => {
          if (current.length >= cardToPlace.cost) {
            return current;
          }
          return [...current, slotIndex];
        });
        return;
      }

      if (sacrificeSlots.length < cardToPlace.cost) {
        return;
      }

      setSlotCards((current) => {
        const next = [...current];
        sacrificeSlots.forEach((id) => {
          next[id] = null;
        });
        next[slotIndex] = cardToPlace;
        return next;
      });
      setHand((current) => current.filter((_, idx) => idx !== selectedIndex));
      setSelectedIndex(null);
      setSacrificeRequired(0);
      setSacrificeSlots([]);
      return;
    }

    if (slotCards[slotIndex]) {
      return;
    }

    setSlotCards((current) => {
      const next = [...current];
      next[slotIndex] = cardToPlace;
      return next;
    });
    setHand((current) => current.filter((_, idx) => idx !== selectedIndex));
    setSelectedIndex(null);
    setSacrificeRequired(0);
    setSacrificeSlots([]);
  };

  const handleAddSquirrel = () => {
    if (isAnimating) return;
    if (gameOver) return;
    if (!mustDrawCard) return;
    if (!squirrelCard) {
      return;
    }
    setHand((current) => [...current, cloneCard(squirrelCard)]);
    setMustDrawCard(false);
  };

  const handleDrawCard = () => {
    if (isAnimating) return;
    if (gameOver) return;
    if (!mustDrawCard) return;
    setDrawPile((current) => {
      if (current.length === 0) {
        return current;
      }
      const [nextCard, ...rest] = current;
      setHand((prev) => [...prev, nextCard]);
      return rest;
    });
    setMustDrawCard(false);
  };

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const bounceSlot = (slotIndex: number, direction: "up" | "down" = "up") =>
    new Promise<void>((resolve) => {
      const amplitude = 18;
      const toValue = direction === "up" ? -amplitude : amplitude;
      Animated.sequence([
        Animated.timing(slotY[slotIndex], {
          toValue,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slotY[slotIndex], {
          toValue: 0,
          duration: 160,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => resolve());
    });

  const handlePlayRound = async () => {
    const hasPendingSacrificePlacement =
      selectedIndex !== null && sacrificeSlots.length > 0;
    const shouldSkipOpponentAttack = skipOpponentAttackPhase;
    const hasPlayerFan = fanActive;
    if (isAnimating) return;
    if (gameOver) return;
    if (mustDrawCard) return;
    if (hasPendingSacrificePlacement) return;
    if (pendingScissorsTarget) return;
    setIsAnimating(true);
    try {
      let localSlots: (BattleCard | null)[] = slotCards.map((c) =>
        c ? cloneCard(c) : null,
      );

      const applyDirectDamage = async (
        amount: number,
        isPlayerAttack: boolean,
      ) => {
        for (let d = 0; d < amount; d += 1) {
          setScore((s) => (isPlayerAttack ? s + 1 : s - 1));
          await delay(250);
        }
      };

      const getBehindSlot = (targetSlot: number) => {
        if (targetSlot >= 4 && targetSlot <= 7) {
          return targetSlot - 4;
        }
        return null;
      };

      const getLooseTailDestination = (targetSlot: number) => {
        let rowStart = -1;
        let rowEnd = -1;

        if (targetSlot >= 0 && targetSlot <= 3) {
          rowStart = 0;
          rowEnd = 3;
        } else if (targetSlot >= 4 && targetSlot <= 7) {
          rowStart = 4;
          rowEnd = 7;
        } else if (targetSlot >= 8 && targetSlot <= 11) {
          rowStart = 8;
          rowEnd = 11;
        }

        if (rowStart === -1) {
          return null;
        }

        const rightSlot = targetSlot + 1;
        if (rightSlot <= rowEnd && !localSlots[rightSlot]) {
          return rightSlot;
        }

        const leftSlot = targetSlot - 1;
        if (leftSlot >= rowStart && !localSlots[leftSlot]) {
          return leftSlot;
        }

        return null;
      };

      const applyDamageToSlot = async (
        targetSlot: number,
        amount: number,
        options?: {
          touchOfDeath?: boolean;
          allowOverflow?: boolean;
        },
      ) => {
        const touchOfDeath = options?.touchOfDeath ?? false;
        const allowOverflow = options?.allowOverflow ?? false;
        const defender = localSlots[targetSlot];
        if (!defender || (amount <= 0 && !touchOfDeath)) {
          return;
        }

        if (hasSigil(defender, "Loose Tail")) {
          const moveToSlot = getLooseTailDestination(targetSlot);
          if (moveToSlot !== null) {
            const movedDefender: BattleCard = {
              ...defender,
              sigils: defender.sigils.filter(
                (sigil) => sigil.name !== "Loose Tail",
              ),
            };
            localSlots[moveToSlot] = movedDefender;
            localSlots[targetSlot] = cloneCard(tailCardTemplate);
            setSlotCards([...localSlots]);
            await delay(60);
          }
        }

        const currentDefender = localSlots[targetSlot];
        if (!currentDefender) {
          return;
        }

        const damageToApply = touchOfDeath ? currentDefender.health : amount;
        const newHealth = currentDefender.health - damageToApply;
        if (newHealth > 0) {
          localSlots[targetSlot] = { ...currentDefender, health: newHealth };
          setSlotCards([...localSlots]);
          await delay(60);
          return;
        }

        if (targetSlot >= 8 && targetSlot <= 11) {
          setBones((currentBones) => currentBones + 1);
        }
        localSlots[targetSlot] = null;
        setSlotCards([...localSlots]);
        await delay(60);

        if (!allowOverflow) {
          return;
        }

        const overflowDamage = Math.abs(newHealth);
        const behindSlot = getBehindSlot(targetSlot);
        if (
          behindSlot === null ||
          overflowDamage <= 0 ||
          !localSlots[behindSlot]
        ) {
          return;
        }

        await applyDamageToSlot(behindSlot, overflowDamage, {
          allowOverflow: true,
        });
      };

      const strikeTargets = async (
        attackerSlot: number,
        isPlayerAttack: boolean,
      ) => {
        const attacker = localSlots[attackerSlot];
        if (!attacker) {
          return;
        }

        const damage =
          getCardPower(localSlots, attackerSlot) +
          getLeaderBonus(localSlots, attackerSlot);
        const targets = getAttackTargets(
          localSlots,
          attackerSlot,
          isPlayerAttack,
        );

        for (const targetSlot of targets) {
          const currentAttacker = localSlots[attackerSlot];
          if (!currentAttacker) {
            break;
          }

          const defender = localSlots[targetSlot];
          const attackerHasFlying =
            hasSigil(currentAttacker, "Flying") ||
            (isPlayerAttack && hasPlayerFan);
          const bypassesBlock =
            attackerHasFlying &&
            (!defender || !hasSigil(defender, "Mighty Leap"));

          if (!defender || bypassesBlock) {
            await applyDirectDamage(damage, isPlayerAttack);
            continue;
          }

          const attackerHasTouchOfDeath = hasSigil(
            currentAttacker,
            "Touch of Death",
          );
          const defenderHasPrickly = hasSigil(defender, "Prickly");
          const pricklyDamage = 1;

          await applyDamageToSlot(targetSlot, damage, {
            touchOfDeath: attackerHasTouchOfDeath,
            allowOverflow: !attackerHasTouchOfDeath,
          });

          if (defenderHasPrickly && localSlots[attackerSlot]) {
            await applyDamageToSlot(attackerSlot, pricklyDamage);
          }
        }
      };

      // Phase 1: Player cards (8-11) attack left to right
      for (let i = 0; i < 4; i += 1) {
        const playerSlot = 8 + i;
        const playerCard = localSlots[playerSlot];
        if (!playerCard) {
          await delay(30);
          continue;
        }

        const playerAttackPower =
          getCardPower(localSlots, playerSlot) +
          getLeaderBonus(localSlots, playerSlot);
        if (playerAttackPower > 0) {
          await bounceSlot(playerSlot, "up");
          await delay(80);
        }

        await strikeTargets(playerSlot, true);
        await delay(30);
      }

      // Phase 1.5: Sprinter movement on player row (8-11)
      localSlots = applySprinterMovement(localSlots, 8, 11);
      setSlotCards([...localSlots]);
      await delay(160);

      // Small pause
      await delay(200);

      // Phase 2: Move opponent cards from 0-3 down to 4-7 if free
      for (let i = 0; i < 4; i += 1) {
        const topSlot = i;
        const targetSlot = 4 + i;
        const card = localSlots[topSlot];
        if (card && !localSlots[targetSlot]) {
          localSlots[targetSlot] = card;
          localSlots[topSlot] = null;
          setSlotCards([...localSlots]);
          await delay(120);
        }
      }

      await delay(200);

      // Phase 2.5: Opponent fledglings evolve at the beginning of their turn
      localSlots = applyFledglingStep(localSlots, [4, 5, 6, 7], {
        incrementTurns: false,
      });
      setSlotCards([...localSlots]);
      await delay(120);

      // Phase 3: Opponent cards (4-7) attack left to right
      if (!shouldSkipOpponentAttack) {
        for (let i = 0; i < 4; i += 1) {
          const opponentSlot = 4 + i;
          const opponentCard = localSlots[opponentSlot];
          if (!opponentCard) {
            await delay(150);
            continue;
          }

          const opponentAttackPower =
            getCardPower(localSlots, opponentSlot) +
            getLeaderBonus(localSlots, opponentSlot);
          if (opponentAttackPower > 0) {
            await bounceSlot(opponentSlot, "down");
            await delay(80);
          }

          await strikeTargets(opponentSlot, false);
          await delay(150);
        }
      } else {
        await delay(250);
      }

      // Phase 3.25: Sprinter movement on opponent row (4-7)
      localSlots = applySprinterMovement(localSlots, 4, 7);
      setSlotCards([...localSlots]);
      await delay(160);

      // Phase 3.4: End of opponent turn counter update
      localSlots = incrementTurnsOnBoard(localSlots, [4, 5, 6, 7]);
      setSlotCards([...localSlots]);

      // Small pause
      await delay(200);

      // Phase 3.5: End-of-turn sigils
      localSlots = applyFledglingStep(localSlots, [8, 9, 10, 11]);
      setSlotCards([...localSlots]);
      await delay(120);

      // Phase 4: Spawn enemy cards on top row (0-3) based on level type + difficulty
      const emptyOpponentSlots = [0, 1, 2, 3].filter((idx) => !localSlots[idx]);
      if (enemySpawnPool.length > 0 && emptyOpponentSlots.length > 0) {
        const spawnCap =
          levelType === "one bear"
            ? 1
            : Math.max(1, Math.min(3, levelDifficulty));
        const cardsToSpawn = Math.min(spawnCap, emptyOpponentSlots.length);

        for (let i = 0; i < cardsToSpawn; i += 1) {
          if (emptyOpponentSlots.length === 0) {
            break;
          }

          const slotIndex = Math.floor(
            Math.random() * emptyOpponentSlots.length,
          );
          const selectedSlot = emptyOpponentSlots.splice(slotIndex, 1)[0];
          const enemyIndex = Math.floor(Math.random() * enemySpawnPool.length);
          const enemyTemplate = enemySpawnPool[enemyIndex];
          localSlots[selectedSlot] = cloneCard(enemyTemplate);
          setSlotCards([...localSlots]);
          await delay(80);
        }
      }
    } finally {
      await delay(120);
      if (shouldSkipOpponentAttack) {
        setSkipOpponentAttackPhase(false);
      }
      if (hasPlayerFan) {
        setFanActive(false);
      }
      setIsAnimating(false);
      setMustDrawCard(true);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
      >
        {/*scoreboard*/}
        <View style={styles.scoreBoard}>
          <ThemedText
            type="title"
            style={{ color: "#fff", textAlign: "center", lineHeight: 80 }}
          >
            {score}
          </ThemedText>
        </View>

        {/*table*/}
        <View style={styles.table}>
          {slots.map((id) => {
            const cardInSlot = slotCards[id];
            const displayedDamage = cardInSlot
              ? getCardPower(slotCards, id) + getLeaderBonus(slotCards, id)
              : undefined;
            const isPlaceable = placeableSlots.has(id);
            const isSacrificeMode =
              selectedIndex !== null && sacrificeRequired > 0;
            const isSacrificeTarget =
              isSacrificeMode && isPlaceable && Boolean(cardInSlot);
            const isSacrificeSelected = sacrificeSlots.includes(id);
            const isScissorsTarget =
              pendingScissorsTarget &&
              id >= 0 &&
              id <= 7 &&
              Boolean(cardInSlot);
            return (
              <Pressable
                key={id}
                style={[
                  styles.cardSlot,
                  isPlaceable && styles.cardSlotPlaceable,
                  isSacrificeTarget && styles.cardSlotSacrificeTarget,
                  isSacrificeSelected && styles.cardSlotSacrificeSelected,
                  isScissorsTarget && styles.cardSlotScissorsTarget,
                ]}
                disabled={isAnimating}
                onLayout={(event) => {
                  if (slotSize) {
                    return;
                  }
                  const { width, height } = event.nativeEvent.layout;
                  if (width > 0 && height > 0) {
                    setSlotSize({ width, height });
                  }
                }}
                onPress={() => handlePlaceCard(id)}
              >
                <Animated.View
                  style={{ transform: [{ translateY: slotY[id] }] }}
                >
                  {cardInSlot ? (
                    <CardView
                      card={cardInSlot}
                      width={slotSize?.width}
                      height={slotSize?.height}
                      displayDamage={displayedDamage}
                      onInfoPress={handleOpenRulebookForCard}
                    />
                  ) : (
                    <FontAwesome name="paw" size={24} color="#4c2a0d" />
                  )}
                </Animated.View>
              </Pressable>
            );
          })}
        </View>

        {/*hand*/}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.handScroll}
          contentContainerStyle={styles.handRow}
        >
          {hand.map((card, index) => (
            <Pressable
              key={`${card.name}-${index}`}
              onPress={() => handleSelectCard(index)}
              style={[
                styles.handCard,
                selectedIndex === index && styles.handCardSelected,
              ]}
              disabled={isAnimating}
            >
              <CardView card={card} onInfoPress={handleOpenRulebookForCard} />
            </Pressable>
          ))}
        </ScrollView>

        {/*buttons*/}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 4,
            marginBottom: 0,
            width: "100%",
          }}
        >
          <View style={{ flexDirection: "row", gap: 4 }}>
            <Pressable
              style={{
                backgroundColor: "#ffe45c",
                borderRadius: 4,
                height: 92,
                width: 92,
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={handlePlayRound}
              disabled={
                isAnimating ||
                mustDrawCard ||
                (selectedIndex !== null && sacrificeSlots.length > 0)
              }
            >
              <FontAwesome6 name="bell-concierge" size={36} color="black" />
            </Pressable>
            <View style={styles.boneTrinketStack}>
              <View style={styles.boneCounterCompact}>
                <MaterialCommunityIcons name="bone" size={22} color="white" />
                <ThemedText style={{ color: "#fff", fontWeight: "bold" }}>
                  {bones}
                </ThemedText>
              </View>

              <Pressable
                style={styles.trinketButtonCompact}
                onPress={() => setIsTrinketModalVisible(true)}
                disabled={isAnimating}
              >
                <MaterialCommunityIcons
                  name="treasure-chest-outline"
                  size={36}
                  color="white"
                />
              </Pressable>
            </View>
          </View>

          {/*grab more cards*/}
          <Animated.View
            style={{ opacity: drawButtonOpacity, flexDirection: "row", gap: 4 }}
          >
            <Pressable
              style={{
                padding: 12,
                backgroundColor: "#ff8a5c",
                borderRadius: 4,
                height: 92,
                width: 69,
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={handleAddSquirrel}
              disabled={isAnimating || !mustDrawCard}
            >
              <Animated.View style={{}}>
                <Octicons name="squirrel" size={36} color="black" />
              </Animated.View>
            </Pressable>
            {drawPile.length > 0 ? (
              <Pressable
                style={{
                  padding: 12,
                  backgroundColor: "#ff8a5c",
                  borderRadius: 4,
                  height: 92,
                  width: 69,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={handleDrawCard}
                disabled={isAnimating || !mustDrawCard}
              >
                <Animated.View style={{}}>
                  <MaterialCommunityIcons
                    name="cards-playing-outline"
                    size={36}
                    color="black"
                  />
                </Animated.View>
              </Pressable>
            ) : null}
          </Animated.View>
        </View>
      </ScrollView>

      {gameOver && gameResult && (
        <View style={styles.gameOverOverlay}>
          <View style={styles.gameOverCard}>
            <ThemedText
              type="title"
              style={{
                fontSize: 48,
                color: gameResult === "win" ? "#4ade80" : "#ef4444",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {gameResult === "win" ? "Pass" : "What a shame"}
            </ThemedText>
          </View>
        </View>
      )}

      <Modal
        visible={isTrinketModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTrinketModalVisible(false)}
      >
        <View style={styles.trinketModalBackdrop}>
          <View style={styles.trinketModalCard}>
            <View style={styles.trinketModalSlotsRow}>
              {trinketSlots.map((slotId) => {
                const isSelected = selectedTrinketSlot === slotId;
                const trinket = heldTrinkets[slotId] ?? null;
                return (
                  <Pressable
                    key={`trinket-modal-slot-${slotId}`}
                    style={[
                      styles.trinketSlot,
                      isSelected && styles.trinketSlotSelected,
                    ]}
                    onPress={() => handleUseTrinket(slotId)}
                  >
                    {trinket ? (
                      <>
                        {renderTrinketIcon(trinket)}
                      </>
                    ) : (
                      <ThemedText style={styles.trinketSlotText}>
                        Empty
                      </ThemedText>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={styles.trinketModalCloseButton}
              onPress={() => setIsTrinketModalVisible(false)}
            >
              <ThemedText style={styles.trinketModalCloseText}>
                Close
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isRulebookVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRulebookVisible(false)}
      >
        <View style={styles.trinketModalBackdrop}>
          <View style={styles.rulebookModalCard}>
            <ThemedText type="subtitle" style={styles.trinketModalTitle}>
              Rulebook
            </ThemedText>

            <ScrollView
              ref={rulebookScrollRef}
              style={styles.rulebookScroll}
              contentContainerStyle={styles.rulebookContent}
              showsVerticalScrollIndicator
            >
              <View onLayout={handleRuleSectionLayout(ANT_RULE_KEY)}>
                <View style={styles.divider}></View>
                <ThemedText style={styles.rulebookSectionTitle}>
                  {ANT_RULE_KEY}
                </ThemedText>
                <ThemedText style={styles.rulebookSectionText}>
                  Ant and Alate have power equal to the number of ants (Ant +
                  Alate) on their side of the board.
                </ThemedText>
              </View>

              {sigils.map((sigil) => (
                <View
                  key={`rule-${sigil.name}`}
                  onLayout={handleRuleSectionLayout(sigil.name)}
                >
                  <View style={styles.divider}></View>
                  <ThemedText style={styles.rulebookSectionTitle}>
                    {sigil.iconLibrary === "FontAwesome6" ? (
                      <FontAwesome6
                        name={sigil.icon as keyof typeof FontAwesome6.glyphMap}
                        size={22}
                        color="#ffffff"
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name={
                          sigil.icon as keyof typeof MaterialCommunityIcons.glyphMap
                        }
                        size={24}
                        color="#ffffff"
                      />
                    )}
                    {"  "}
                    {sigil.name}
                  </ThemedText>
                  <ThemedText style={styles.rulebookSectionText}>
                    {sigil.description}
                  </ThemedText>
                </View>
              ))}
            </ScrollView>

            <Pressable
              style={styles.trinketModalCloseButton}
              onPress={() => setIsRulebookVisible(false)}
            >
              <ThemedText style={styles.trinketModalCloseText}>
                Close
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#02030a",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  table: {
    width: "100%",
    marginTop: 96,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  scoreBoard: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    borderWidth: 5,
    borderColor: "#ebf920",
    width: "100%",
    height: 80,
  },
  handRow: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 4,
    gap: 10,
  },
  handScroll: {
    width: "100%",
    backgroundColor: "rgb(50, 50, 50)",
    marginVertical: 8,
  },
  cardSlot: {
    width: "23%",
    aspectRatio: 3 / 4,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#3b2c1e",
    backgroundColor: "#20140b",
    justifyContent: "center",
    alignItems: "center",
  },
  cardSlotPlaceable: {
    borderColor: "#e3e66b",
  },
  cardSlotSacrificeTarget: {
    borderColor: "#ff8a5c",
  },
  cardSlotSacrificeSelected: {
    borderColor: "#ff3b3b",
    borderWidth: 3,
  },
  cardSlotScissorsTarget: {
    borderColor: "#f97316",
    borderWidth: 3,
  },
  handCard: {
    borderRadius: 8,
  },
  handCardSelected: {
    borderWidth: 2,
    borderColor: "#e3e66b",
  },
  boneTrinketStack: {
    height: 92,
    minWidth: 76,
    justifyContent: "space-between",
    alignItems: "center",
  },
  boneCounterCompact: {
    flexDirection: "row",
    width: "100%",
    height: 44,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 5,
  },
  trinketButtonCompact: {
    width: "100%",
    height: 44,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "#1f1f1f",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
  },
  trinketButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 11,
  },
  trinketSlot: {
    width: 88,
    minHeight: 78,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "#1f1f1f",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 6,
  },
  trinketSlotSelected: {
    borderColor: "#e3e66b",
  },
  trinketSlotText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  trinketModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  trinketModalCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "#1a1a1a",
    padding: 16,
    gap: 14,
    alignItems: "center",
  },
  rulebookModalCard: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "80%",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "#1a1a1a",
    padding: 16,
    gap: 12,
  },
  rulebookScroll: {
    width: "100%",
  },
  rulebookContent: {
    gap: 12,
    paddingBottom: 0,
  },
  rulebookSectionTitle: {
    color: "#ffffff",
    fontWeight: "bold",
    marginBottom: 0,
  },
  rulebookSectionText: {
    color: "#d9d9d9",
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: "#333333",
    marginVertical: 8,
  },
  trinketModalTitle: {
    color: "#ffffff",
    textAlign: "center",
  },
  trinketModalSlotsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    justifyContent: "center",
  },
  trinketModalCloseButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "#2a2a2a",
  },
  trinketModalCloseText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  gameOverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  gameOverCard: {
    backgroundColor: "#1a1a1a",
    padding: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#ebf920",
    minWidth: 300,
  },
});
