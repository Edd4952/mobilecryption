import { Card, cards } from "@/app/cards";
import { useGameRun } from "@/app/game-state";
import { CardView } from "@/components/card-view";
import { ThemedText } from "@/components/themed-text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

const CARD_BACK_COUNT = 3;
const CARD_BASE_WIDTH = 75;
const CARD_BASE_HEIGHT = 100;

const shuffle = <T,>(items: T[]) => {
  const cloned = [...items];
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }
  return cloned;
};

const pickThreeCards = (sourceDeck: Card[]) => {
  const baseDeck = sourceDeck.length > 0 ? sourceDeck : cards;
  const pool = shuffle(baseDeck).map((card) => ({
    ...card,
    sigils: card.sigils.map((sigil) => ({ ...sigil })),
  }));

  if (pool.length >= CARD_BACK_COUNT) {
    return pool.slice(0, CARD_BACK_COUNT);
  }

  const fallback = shuffle(cards).map((card) => ({
    ...card,
    sigils: card.sigils.map((sigil) => ({ ...sigil })),
  }));
  const combined = [...pool, ...fallback];
  return combined.slice(0, CARD_BACK_COUNT);
};

export default function NewCardScreen() {
  const router = useRouter();
  const { appendCardToDeck } = useGameRun();
  const { width: screenWidth } = useWindowDimensions();

  const [cardChoices, setCardChoices] = useState<Card[]>(() =>
    pickThreeCards(cards),
  );
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const cardWidth = useMemo(() => {
    const horizontalScreenPadding = 48;
    const totalGap = 24;
    const availableWidth = screenWidth - horizontalScreenPadding - totalGap;
    return Math.max(92, Math.floor(availableWidth / CARD_BACK_COUNT));
  }, [screenWidth]);

  const cardHeight = useMemo(
    () => cardWidth * (CARD_BASE_HEIGHT / CARD_BASE_WIDTH),
    [cardWidth],
  );

  // Reset the screen whenever it becomes focused again (e.g., after routing back from the map)
  const resetScreen = useCallback(() => {
    setCardChoices(pickThreeCards(cards));
    setRevealedIndices([]);
    setSelectedIndex(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetScreen();
      // no cleanup needed
      return undefined;
    }, [resetScreen]),
  );

  const handleCardPress = (index: number) => {
    if (selectedIndex !== null) return;

    if (!revealedIndices.includes(index)) {
      setRevealedIndices((current) => [...current, index]);
      return;
    }

    const chosenCard = cardChoices[index];
    if (!chosenCard) return;
    appendCardToDeck(chosenCard);
    setSelectedIndex(index);
    router.replace("/(tabs)/map");
  };

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Pick a card, any card
      </ThemedText>

      <View style={styles.cardsRow}>
        {cardChoices.map((card, index) => {
          const isRevealed = revealedIndices.includes(index);
          return (
            <Pressable
              key={`${card.name}-${index}`}
              style={styles.cardSlot}
              onPress={() => handleCardPress(index)}
            >
              {isRevealed ? (
                <CardView card={card} width={cardWidth} height={cardHeight} />
              ) : (
                <View
                  style={[
                    styles.cardBack,
                    { width: cardWidth, height: cardHeight },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="cards-playing-outline"
                    size={56}
                    color="black"
                  />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#02030a",
    padding: 24,
    justifyContent: "center",
    gap: 14,
  },
  title: {
    textAlign: "center",
    color: "#ffffff",
  },
  subtitle: {
    textAlign: "center",
    color: "#cbd5e1",
  },
  cardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  cardSlot: {
    flex: 1,
    alignItems: "center",
  },
  cardBack: {
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: "#fbbf24",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBackText: {
    fontSize: 40,
    color: "#fbbf24",
    fontWeight: "bold",
  },
});
