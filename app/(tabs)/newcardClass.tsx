import { Card, cards } from "@/app/cards";
import { useGameRun } from "@/app/game-state";
import { CardView } from "@/components/card-view";
import { ThemedText } from "@/components/themed-text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

const CARD_CHOICE_COUNT = 3;
const CARD_BASE_WIDTH = 75;
const CARD_BASE_HEIGHT = 100;
const CARD_ROUTE_DELAY_MS = 1500;
const CARD_EXIT_DURATION_MS = 500;

type ClassBucket = "Avian" | "Canine" | "Insect" | "Reptile" | "Hooved";

type ClassChoice = {
  bucket: ClassBucket;
  card: Card;
};

const shuffle = <T,>(items: T[]) => {
  const cloned = [...items];
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }
  return cloned;
};

const cloneCard = (card: Card): Card => ({
  ...card,
  sigils: card.sigils.map((sigil) => ({ ...sigil })),
});

const cardsByBucket: Record<ClassBucket, Card[]> = {
  Avian: cards.filter((card) => card.class === "Avian"),
  Canine: cards.filter((card) => card.class === "Canine"),
  Insect: cards.filter((card) => card.class === "Insect"),
  Reptile: cards.filter((card) => card.class === "Reptile"),
  Hooved: cards.filter((card) => card.class === "Hooved"),
};

const bucketIcons: Record<
  ClassBucket,
  keyof typeof MaterialCommunityIcons.glyphMap
> = {
  Avian: "bird",
  Canine: "dog",
  Insect: "bug",
  Reptile: "tortoise",
  Hooved: "horseshoe",
};

const availableBuckets = (Object.keys(cardsByBucket) as ClassBucket[]).filter(
  (bucket) => cardsByBucket[bucket].length > 0,
);

const pickCardForBucket = (bucket: ClassBucket): Card => {
  const pool = cardsByBucket[bucket];
  const card = pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
  return cloneCard(card);
};

const pickCardChoices = (): ClassChoice[] =>
  shuffle(availableBuckets)
    .slice(0, CARD_CHOICE_COUNT)
    .map((bucket) => ({
      bucket,
      card: pickCardForBucket(bucket),
    }));

const ClassBack = ({
  bucket,
  width,
  height,
}: {
  bucket: ClassBucket;
  width: number;
  height: number;
}) => (
  <View style={[styles.cardBack, { width, height }]}>
    <View style={styles.cardBackContent}>
      <MaterialCommunityIcons
        name={bucketIcons[bucket]}
        size={36}
        color="#000000"
      />
    </View>
  </View>
);

export default function NewCardClassScreen() {
  const router = useRouter();
  const { appendCardToDeck } = useGameRun();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const routeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardTranslateY = useRef(
    Array.from({ length: CARD_CHOICE_COUNT }, () => new Animated.Value(0)),
  ).current;

  const [cardChoices, setCardChoices] = useState<ClassChoice[]>(() =>
    pickCardChoices(),
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isResolvingSelection, setIsResolvingSelection] = useState(false);

  const cardWidth = useMemo(() => {
    const horizontalScreenPadding = 48;
    const totalGap = 24;
    const availableWidth = screenWidth - horizontalScreenPadding - totalGap;
    return Math.max(92, Math.floor(availableWidth / CARD_CHOICE_COUNT));
  }, [screenWidth]);

  const cardHeight = useMemo(
    () => cardWidth * (CARD_BASE_HEIGHT / CARD_BASE_WIDTH),
    [cardWidth],
  );

  const resetScreen = useCallback(() => {
    if (routeTimeoutRef.current) {
      clearTimeout(routeTimeoutRef.current);
      routeTimeoutRef.current = null;
    }

    cardTranslateY.forEach((value) => value.setValue(0));
    setCardChoices(pickCardChoices());
    setSelectedIndex(null);
    setIsResolvingSelection(false);
  }, [cardTranslateY]);

  useFocusEffect(
    useCallback(() => {
      resetScreen();
      return () => {
        if (routeTimeoutRef.current) {
          clearTimeout(routeTimeoutRef.current);
          routeTimeoutRef.current = null;
        }
      };
    }, [resetScreen]),
  );

  const handleCardPress = (index: number) => {
    if (isResolvingSelection) return;

    const selectedChoice = cardChoices[index];
    if (!selectedChoice) return;

    if (selectedIndex === null) {
      setSelectedIndex(index);

      const hiddenCardOffset = -(screenHeight + cardHeight);
      const animations = cardTranslateY.reduce<Animated.CompositeAnimation[]>(
        (result, value, currentIndex) => {
          if (currentIndex !== index) {
            result.push(
              Animated.timing(value, {
                toValue: hiddenCardOffset,
                duration: CARD_EXIT_DURATION_MS,
                useNativeDriver: true,
              }),
            );
          }
          return result;
        },
        [],
      );

      Animated.parallel(animations).start();
      return;
    }

    if (selectedIndex !== index) {
      return;
    }

    setIsResolvingSelection(true);

    appendCardToDeck(selectedChoice.card);

    const hiddenCardOffset = screenHeight + cardHeight;
    Animated.timing(cardTranslateY[index], {
      toValue: hiddenCardOffset,
      duration: CARD_EXIT_DURATION_MS,
      useNativeDriver: true,
    }).start();

    routeTimeoutRef.current = setTimeout(() => {
      router.replace("/(tabs)/map");
    }, CARD_ROUTE_DELAY_MS);
  };

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Pick by class
      </ThemedText>

      <ThemedText style={styles.subtitle}>
        Choose one class. The hidden card will match the class symbol on its
        back.
      </ThemedText>

      <View style={styles.cardsRow}>
        {cardChoices.map((choice, index) => {
          const isSelected = selectedIndex === index;
          return (
            <Pressable
              key={`${choice.bucket}-${choice.card.name}-${index}`}
              style={styles.cardSlot}
              disabled={isResolvingSelection}
              onPress={() => handleCardPress(index)}
            >
              <Animated.View
                style={{ transform: [{ translateY: cardTranslateY[index] }] }}
              >
                {isSelected ? (
                  <CardView
                    card={choice.card}
                    width={cardWidth}
                    height={cardHeight}
                  />
                ) : (
                  <ClassBack
                    bucket={choice.bucket}
                    width={cardWidth}
                    height={cardHeight}
                  />
                )}
              </Animated.View>
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
    backgroundColor: "#b28920",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBackContent: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
