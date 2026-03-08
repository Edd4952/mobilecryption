import { type Card } from "@/app/cards";
import { useGameRun } from "@/app/game-state";
import { CardView } from "@/components/card-view";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
	useWindowDimensions,
} from "react-native";

const ROUTE_DELAY_MS = 700;

export default function CampfireScreen() {
  const router = useRouter();
  const { gameRun, replaceDeckCardAt } = useGameRun();
  const [campfireCard, setCampfireCard] = useState<Card | null>(null);
  const [selectedDeckIndex, setSelectedDeckIndex] = useState<number | null>(
    null,
  );
  const [slottedDeckIndex, setSlottedDeckIndex] = useState<number | null>(null);
  const [isResolvingCampfire, setIsResolvingCampfire] = useState(false);
  const [appliedBuff, setAppliedBuff] = useState<"power" | "health" | null>(
    null,
  );
  const [campfireBuff, setCampfireBuff] = useState<"power" | "health">(() =>
    Math.random() < 0.5 ? "power" : "health",
  );
  const routeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width: screenWidth } = useWindowDimensions();

  useEffect(() => {
    return () => {
      if (routeTimeoutRef.current) {
        clearTimeout(routeTimeoutRef.current);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsResolvingCampfire(false);
      setAppliedBuff(null);
      setCampfireBuff(Math.random() < 0.5 ? "power" : "health");
      return undefined;
    }, []),
  );

  const selectedDeckCard =
    selectedDeckIndex !== null
      ? (gameRun.deck[selectedDeckIndex] ?? null)
      : null;

  const cardWidth = useMemo(() => {
    const available = screenWidth - 64;
    const target = Math.floor(available / 3.2);
    return Math.max(82, Math.min(110, target));
  }, [screenWidth]);

  const cardHeight = useMemo(() => cardWidth * (100 / 75), [cardWidth]);

  return (
    <View style={styles.container}>
      {campfireCard ? (
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            if (isResolvingCampfire) return;
            setCampfireCard(null);
            setSelectedDeckIndex(null);
            setSlottedDeckIndex(null);
            setAppliedBuff(null);
          }}
          accessibilityRole="button"
          accessibilityLabel="Remove card from campfire"
        />
      ) : null}

      <View style={styles.campfireRow}>
        <Pressable
          style={styles.campfireSlot}
          onPress={() => {
            if (isResolvingCampfire) return;
            if (campfireCard || !selectedDeckCard) return;
            setCampfireCard(selectedDeckCard);
            setSlottedDeckIndex(selectedDeckIndex);
            setSelectedDeckIndex(null);
          }}
          accessibilityRole="button"
          accessibilityLabel="Campfire slot"
        >
          {campfireCard ? (
            <CardView
              card={campfireCard}
              width={cardWidth}
              height={cardHeight}
            />
          ) : (
            <View
              style={[
                styles.emptyCardFrame,
                { width: cardWidth, height: cardHeight },
              ]}
            >
              <MaterialCommunityIcons name="fire" size={48} color="#f97316" />
            </View>
          )}
        </Pressable>

        <Pressable
          style={[styles.plusButton, { width: cardWidth }]}
          disabled={isResolvingCampfire}
          onPress={() => {
            if (isResolvingCampfire) return;
            if (!campfireCard || slottedDeckIndex === null) {
              return;
            }

            const upgradedCard: Card =
              campfireBuff === "power"
                ? { ...campfireCard, damage: campfireCard.damage + 1 }
                : { ...campfireCard, health: campfireCard.health + 2 };

            replaceDeckCardAt(slottedDeckIndex, upgradedCard);
            setCampfireCard(upgradedCard);
            setAppliedBuff(campfireBuff);
            setIsResolvingCampfire(true);
            routeTimeoutRef.current = setTimeout(() => {
              router.replace("/(tabs)/map");
            }, ROUTE_DELAY_MS);
          }}
          accessibilityRole="button"
          accessibilityLabel="Campfire plus option"
        >
          {campfireBuff === "power" ? (
            <View style={styles.healthBuffContent}>
              <MaterialCommunityIcons name="plus" size={30} color="#ffffff" />
              <MaterialCommunityIcons name="paw" size={30} color="#ffffff" />
            </View>
          ) : (
            <View style={styles.healthBuffContent}>
              <MaterialCommunityIcons name="plus" size={30} color="#ffffff" />
              <Text style={styles.healthBuffValue}>2</Text>
              <MaterialCommunityIcons name="heart" size={22} color="#ffffff" />
            </View>
          )}
        </Pressable>

        {appliedBuff ? (
          <View style={styles.appliedBuffBanner}>
            {appliedBuff === "power" ? (
              <>
                <MaterialCommunityIcons name="paw" size={18} color="#ffffff" />
                <Text style={styles.appliedBuffText}>Power +1</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="heart"
                  size={18}
                  color="#ffffff"
                />
                <Text style={styles.appliedBuffText}>Health +2</Text>
              </>
            )}
          </View>
        ) : null}
      </View>

      {!campfireCard ? (
        <View style={styles.deckPanel}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.deckContent}
          >
            {gameRun.deck.map((card, index) => (
              <Pressable
                key={`${card.name}-${index}`}
                style={[
                  styles.deckCardButton,
                  selectedDeckIndex === index && styles.deckCardButtonSelected,
                ]}
                onPress={() => {
                  if (isResolvingCampfire) return;
                  setSelectedDeckIndex((current) =>
                    current === index ? null : index,
                  );
                }}
              >
                <CardView card={card} width={cardWidth} height={cardHeight} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f17",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    backgroundColor: "transparent",
  },
  campfireRow: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: "25%",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
  },
  campfireSlot: {
    width: 150,
    height: 200,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCardFrame: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#7a4b1a",
    borderStyle: "dashed",
    backgroundColor: "#2e1a11",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptySlotText: {
    color: "#f7d4a9",
    fontSize: 13,
    fontWeight: "600",
  },
  plusButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#6f4300",
    borderWidth: 2,
    borderColor: "#3b2801",
    alignItems: "center",
    justifyContent: "center",
  },
  healthBuffContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  healthBuffValue: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 24,
  },
  appliedBuffBanner: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f59e0b",
    backgroundColor: "rgba(245, 158, 11, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  appliedBuffText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  deckPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "25%",
    borderTopWidth: 2,
    borderTopColor: "#2f3645",
    backgroundColor: "#0f1724",
    zIndex: 20,
  },
  deckContent: {
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
  },
  deckCardButton: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  deckCardButtonSelected: {
    borderColor: "#f59e0b",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
  },
});
