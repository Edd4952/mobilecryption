import { miscCards } from "@/app/cards";
import { useGameRun } from "@/app/game-state";
import { trinkets, type Trinket } from "@/app/trinkets";
import { CardView } from "@/components/card-view";
import { ThemedText } from "@/components/themed-text";
import {
    FontAwesome6,
    MaterialCommunityIcons,
    Octicons,
} from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

const CHOICES_PER_ROUND = 3;
const RETURN_DELAY_MS = 1500;
const PACKRAT_ROUTE_DELAY_MS = 1500;

const shuffle = <T,>(items: T[]) => {
  const cloned = [...items];
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }
  return cloned;
};

const cloneTrinketSlots = (slots: (Trinket | null)[]) =>
  slots.map((trinket) => (trinket ? { ...trinket } : null));

const pickChoices = () => {
  const pool = trinkets.map((trinket) => ({ ...trinket }));

  const uniqueByName = new Map<string, Trinket>();
  shuffle(pool).forEach((trinket) => {
    if (!uniqueByName.has(trinket.name)) {
      uniqueByName.set(trinket.name, trinket);
    }
  });

  return Array.from(uniqueByName.values()).slice(0, CHOICES_PER_ROUND);
};

const getNextEmptySlotIndex = (slots: (Trinket | null)[]) =>
  slots.findIndex((slot) => slot === null);

const renderTrinketIcon = (trinket: Trinket) => {
  if (trinket.iconLibrary === "FontAwesome6") {
    return (
      <FontAwesome6
        name={trinket.icon as keyof typeof FontAwesome6.glyphMap}
        size={28}
        color="#f8fafc"
      />
    );
  }

  if (trinket.iconLibrary === "Octicons") {
    return (
      <Octicons
        name={trinket.icon as keyof typeof Octicons.glyphMap}
        size={28}
        color="#f8fafc"
      />
    );
  }

  return (
    <MaterialCommunityIcons
      name={trinket.icon as keyof typeof MaterialCommunityIcons.glyphMap}
      size={28}
      color="#f8fafc"
    />
  );
};

export default function TrinketScreen() {
  const router = useRouter();
  const { gameRun, setTrinkets } = useGameRun();
  const routeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameRunTrinketsRef = useRef(gameRun.trinkets);
  const packratTranslateY = useRef(new Animated.Value(0)).current;

  const [workingSlots, setWorkingSlots] = useState<(Trinket | null)[]>(() =>
    cloneTrinketSlots(gameRun.trinkets),
  );
  const [choiceSet, setChoiceSet] = useState<Trinket[]>(() => pickChoices());
  const [isResolving, setIsResolving] = useState(false);
  const [isFullSlotsReveal, setIsFullSlotsReveal] = useState(false);
  const [hasSelectedPackrat, setHasSelectedPackrat] = useState(false);
  const packratCard = useMemo(
    () => miscCards.find((card) => card.name === "Packrat") ?? null,
    [],
  );

  const nextEmptySlotIndex = useMemo(
    () => getNextEmptySlotIndex(workingSlots),
    [workingSlots],
  );

  useEffect(() => {
    gameRunTrinketsRef.current = gameRun.trinkets;
  }, [gameRun.trinkets]);

  const resetRoom = useCallback(() => {
    const startingSlots = cloneTrinketSlots(gameRunTrinketsRef.current);
    const startingEmptySlotIndex = getNextEmptySlotIndex(startingSlots);
    const shouldShowFullSlotsReveal = startingEmptySlotIndex === -1;

    setWorkingSlots(startingSlots);
    setChoiceSet(pickChoices());
    setIsResolving(false);
    setIsFullSlotsReveal(shouldShowFullSlotsReveal);
    setHasSelectedPackrat(false);
    packratTranslateY.setValue(0);

    if (routeTimeoutRef.current) {
      clearTimeout(routeTimeoutRef.current);
      routeTimeoutRef.current = null;
    }
  }, [packratTranslateY]);

  const finishRoom = useCallback(
    (completedSlots: (Trinket | null)[]) => {
      setTrinkets(cloneTrinketSlots(completedSlots));
      setIsResolving(true);
      routeTimeoutRef.current = setTimeout(() => {
        router.replace("/(tabs)/map");
      }, RETURN_DELAY_MS);
    },
    [router, setTrinkets],
  );

  useFocusEffect(
    useCallback(() => {
      resetRoom();
      return () => {
        if (routeTimeoutRef.current) {
          clearTimeout(routeTimeoutRef.current);
          routeTimeoutRef.current = null;
        }
      };
    }, [resetRoom]),
  );

  useEffect(() => {
    if (isFullSlotsReveal || nextEmptySlotIndex !== -1 || isResolving) {
      return;
    }

    finishRoom(workingSlots);
  }, [
    finishRoom,
    isFullSlotsReveal,
    isResolving,
    nextEmptySlotIndex,
    workingSlots,
  ]);

  const handlePickTrinket = (picked: Trinket) => {
    if (isResolving || nextEmptySlotIndex === -1) {
      return;
    }

    const nextSlots = cloneTrinketSlots(workingSlots);
    nextSlots[nextEmptySlotIndex] = { ...picked };
    setWorkingSlots(nextSlots);

    const nextMissingSlot = getNextEmptySlotIndex(nextSlots);
    if (nextMissingSlot !== -1) {
      setChoiceSet(pickChoices());
    }
  };

  const handleSelectPackrat = () => {
    if (!isFullSlotsReveal || hasSelectedPackrat) {
      return;
    }

    setHasSelectedPackrat(true);

    Animated.timing(packratTranslateY, {
      toValue: 500,
      duration: 250,
      useNativeDriver: true,
    }).start();

    routeTimeoutRef.current = setTimeout(() => {
      router.replace("/(tabs)/map");
    }, PACKRAT_ROUTE_DELAY_MS);
  };

  if (isFullSlotsReveal) {
    return (
      <View style={styles.container}>
        <View style={styles.fullSlotsRevealWrap}>
          <ThemedText style={styles.fullSlotsRevealText}>
            Your pockets were full, but a critter revealed himself.
          </ThemedText>
          {packratCard ? (
            <Pressable
              onPress={handleSelectPackrat}
              disabled={hasSelectedPackrat}
              accessibilityRole="button"
              accessibilityLabel="Select Packrat"
            >
              <Animated.View
                style={{ transform: [{ translateY: packratTranslateY }] }}
              >
                <CardView card={packratCard} width={182} height={242} />
              </Animated.View>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        You found a satchel on the road
      </ThemedText>

      <ThemedText style={styles.subtitle}>
        It contained:
      </ThemedText>
      
      <View style={styles.choicesRow}>
        {choiceSet.map((trinket) => (
          <Pressable
            key={trinket.name}
            style={({ pressed }) => [
              styles.choiceCard,
              pressed && !isResolving && styles.choiceCardPressed,
              isResolving && styles.choiceCardDisabled,
            ]}
            disabled={isResolving || nextEmptySlotIndex === -1}
            onPress={() => handlePickTrinket(trinket)}
          >
            <View style={styles.choiceIconWrap}>
              {renderTrinketIcon(trinket)}
            </View>
            <ThemedText style={styles.choiceTitle}>{trinket.name}</ThemedText>
            <ThemedText style={styles.choiceDescription}>
              {trinket.description}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      
      <View style={styles.slotRow}>
        {workingSlots.map((slot, index) => {
          const isTarget = index === nextEmptySlotIndex;
          return (
            <View
              key={`trinket-slot-${index}`}
              style={[
                styles.slot,
                slot ? styles.slotFilled : styles.slotEmpty,
                isTarget && styles.slotTarget,
              ]}
            >
              {slot ? (
                <>
                  {renderTrinketIcon(slot)}
                  <ThemedText style={styles.slotName}>{slot.name}</ThemedText>
                </>
              ) : (
                <MaterialCommunityIcons name="plus" size={24} color="#94a3b8" />
              )}
            </View>
          );
        })}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030712",
    paddingHorizontal: 20,
    paddingTop: 48,
    gap: 16,
  },
  title: {
    textAlign: "center",
    color: "#ff8c00",
  },
  subtitle: {
    textAlign: "center",
    color: "#ff7700",
  },
  slotRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "stretch",
    gap: 10,
    marginTop: 4,
    marginBottom: 24,
  },
  slot: {
    flex: 1,
    minHeight: 92,
    borderRadius: 12,
    borderWidth: 2,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  slotFilled: {
    borderColor: "#2563eb",
    backgroundColor: "rgba(37, 99, 235, 0.15)",
  },
  slotEmpty: {
    borderColor: "#334155",
    backgroundColor: "rgba(51, 65, 85, 0.25)",
  },
  slotTarget: {
    borderColor: "#f59e0b",
    backgroundColor: "rgba(245, 158, 11, 0.18)",
  },
  slotName: {
    textAlign: "center",
    color: "#f1f5f9",
    fontSize: 12,
  },
  choicesRow: {
    flex: 1,
    flexDirection: "column",
    gap: 12,
    justifyContent: "center",
  },
  choiceCard: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#1e293b",
    backgroundColor: "#0f172a",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  choiceCardPressed: {
    transform: [{ scale: 0.98 }],
    borderColor: "#3b82f6",
  },
  choiceCardDisabled: {
    opacity: 0.6,
  },
  choiceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e293b",
  },
  choiceTitle: {
    color: "#f8fafc",
    fontWeight: "700",
    minWidth: 105,
  },
  choiceDescription: {
    flex: 1,
    color: "#cbd5e1",
    fontSize: 12,
  },
  returningText: {
    textAlign: "center",
    color: "#f59e0b",
    fontWeight: "700",
    paddingBottom: 24,
  },
  fullSlotsRevealWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  fullSlotsRevealText: {
    color: "#f97316",
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "900",
    textAlign: "center",
    paddingHorizontal: 12,
  },
});
