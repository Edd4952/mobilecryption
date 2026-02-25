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
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Card, cards, sigilsByName } from "../cards";
import { deck } from "./deck";

type BattleCard = Card & {
  turnsOnBoard?: number;
  fledglingUsed?: boolean;
};

export default function Battle() {
  const slots = Array.from({ length: 12 }, (_, idx) => idx);
  const [hand, setHand] = useState<BattleCard[]>([]);
  const [drawPile, setDrawPile] = useState<BattleCard[]>([]);
  const [score, setScore] = useState(5);
  const [bones, setBones] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mustDrawCard, setMustDrawCard] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<"win" | "lose" | null>(null);
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
  const drawButtonOpacity = useRef(new Animated.Value(1)).current;
  const placeableSlots = useMemo(() => new Set([8, 9, 10, 11]), []);
  const squirrelCard = useMemo(
    () => cards.find((card) => card.name === "Squirrel") ?? null,
    [],
  );
  const sparrowCard = useMemo(
    () => cards.find((card) => card.name === "Sparrow") ?? null,
    [],
  );
  const evolvedByName = useMemo(
    () => ({
      Cub: cards.find((card) => card.name === "Wolf") ?? null,
      Fawn: cards.find((card) => card.name === "Elk") ?? null,
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

  const applySprinterMovement = (localSlots: (BattleCard | null)[]) => {
    const nextSlots = [...localSlots];
    const moveIntents: { from: number; to: number }[] = [];
    const reservedTargets = new Set<number>();

    for (let slot = 8; slot <= 11; slot += 1) {
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
        target >= 8 &&
        target <= 11 &&
        !localSlots[target] &&
        !reservedTargets.has(target);

      if (
        (slot === 11 && direction === 1) ||
        (slot === 8 && direction === -1)
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

  const applyFledglingStep = (localSlots: (BattleCard | null)[]) => {
    const nextSlots = [...localSlots];

    for (let slot = 0; slot < nextSlots.length; slot += 1) {
      const card = nextSlots[slot];
      if (!card) {
        continue;
      }

      const turnsOnBoard = (card.turnsOnBoard ?? 0) + 1;
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
    setSlotCards(Array.from({ length: 12 }, () => null));
  }, [squirrelCard]);

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
    if (isAnimating) return;
    if (gameOver) return;
    if (mustDrawCard) return;
    if (hasPendingSacrificePlacement) return;
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

      const applyDamageToDefenderWithOverflow = async (
        targetSlot: number,
        amount: number,
      ) => {
        const defender = localSlots[targetSlot];
        if (!defender || amount <= 0) {
          return;
        }

        const newHealth = defender.health - amount;
        if (newHealth > 0) {
          localSlots[targetSlot] = { ...defender, health: newHealth };
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

        const overflowDamage = Math.abs(newHealth);
        const behindSlot = getBehindSlot(targetSlot);
        if (
          behindSlot === null ||
          overflowDamage <= 0 ||
          !localSlots[behindSlot]
        ) {
          return;
        }

        await applyDamageToDefenderWithOverflow(behindSlot, overflowDamage);
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
          attacker.damage + getLeaderBonus(localSlots, attackerSlot);
        const targets = getAttackTargets(
          localSlots,
          attackerSlot,
          isPlayerAttack,
        );

        for (const targetSlot of targets) {
          const defender = localSlots[targetSlot];
          const bypassesBlock =
            hasSigil(attacker, "Flying") &&
            (!defender || !hasSigil(defender, "Mighty Leap"));

          if (!defender || bypassesBlock) {
            await applyDirectDamage(damage, isPlayerAttack);
            continue;
          }

          await applyDamageToDefenderWithOverflow(targetSlot, damage);
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

        await bounceSlot(playerSlot, "up");
        await delay(80);

        await strikeTargets(playerSlot, true);
        await delay(30);
      }

      // Phase 1.5: Sprinter movement on player row (8-11)
      localSlots = applySprinterMovement(localSlots);
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

      // Phase 3: Opponent cards (4-7) attack left to right
      for (let i = 0; i < 4; i += 1) {
        const opponentSlot = 4 + i;
        const opponentCard = localSlots[opponentSlot];
        if (!opponentCard) {
          await delay(150);
          continue;
        }

        await bounceSlot(opponentSlot, "down");
        await delay(80);

        await strikeTargets(opponentSlot, false);
        await delay(150);
      }

      // Small pause
      await delay(200);

      // Phase 3.5: End-of-turn sigils
      localSlots = applyFledglingStep(localSlots);
      setSlotCards([...localSlots]);
      await delay(120);

      // Phase 4: Spawn a sparrow on a random empty slot in 0-3
      if (sparrowCard) {
        const emptyOpponentSlots = [0, 1, 2, 3].filter(
          (idx) => !localSlots[idx],
        );
        if (emptyOpponentSlots.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * emptyOpponentSlots.length,
          );
          const selectedSlot = emptyOpponentSlots[randomIndex];
          localSlots[selectedSlot] = cloneCard(sparrowCard);
          setSlotCards([...localSlots]);
        }
      }
    } finally {
      await delay(120);
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
              ? cardInSlot.damage + getLeaderBonus(slotCards, id)
              : undefined;
            const isPlaceable = placeableSlots.has(id);
            const isSacrificeMode =
              selectedIndex !== null && sacrificeRequired > 0;
            const isSacrificeTarget =
              isSacrificeMode && isPlaceable && Boolean(cardInSlot);
            const isSacrificeSelected = sacrificeSlots.includes(id);
            return (
              <Pressable
                key={id}
                style={[
                  styles.cardSlot,
                  isPlaceable && styles.cardSlotPlaceable,
                  isSacrificeTarget && styles.cardSlotSacrificeTarget,
                  isSacrificeSelected && styles.cardSlotSacrificeSelected,
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
              <CardView card={card} />
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
            paddingHorizontal: 16,
          }}
        >
          <View style={{ flexDirection: "row", gap: 4 }}>
            <Pressable
              style={{
                padding: 12,
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
            <View
              style={{
                height: 92,
                minWidth: 76,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: "#ffffff",
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 8,
                gap: 2,
              }}
            >
              <MaterialCommunityIcons name="bone" size={26} color="white" />
              <ThemedText style={{ color: "#fff", fontWeight: "bold" }}>
                {bones}
              </ThemedText>
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
  handCard: {
    borderRadius: 8,
  },
  handCardSelected: {
    borderWidth: 2,
    borderColor: "#e3e66b",
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
