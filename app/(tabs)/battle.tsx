import { CardView } from "@/components/card-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { FontAwesome6, MaterialCommunityIcons } from "@expo/vector-icons";
import Octicons from "@expo/vector-icons/Octicons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Card, cards } from "../cards";
import { deck } from "./deck";

export default function Battle() {
  const slots = Array.from({ length: 12 }, (_, idx) => idx);
  const [hand, setHand] = useState<Card[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sacrificeSlots, setSacrificeSlots] = useState<number[]>([]);
  const [sacrificeRequired, setSacrificeRequired] = useState(0);
  const [slotSize, setSlotSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [slotCards, setSlotCards] = useState<(Card | null)[]>(
    Array.from({ length: 12 }, () => null),
  );
  const placeableSlots = useMemo(() => new Set([8, 9, 10, 11]), []);
  const squirrelCard = useMemo(
    () => cards.find((card) => card.name === "Squirrel") ?? null,
    [],
  );

  useEffect(() => {
    const shuffledDeck = [...deck];
    for (let i = shuffledDeck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }

    const startingHand = shuffledDeck.slice(0, 3);
    setHand(squirrelCard ? [...startingHand, squirrelCard] : startingHand);
    setSelectedIndex(null);
    setSlotCards(Array.from({ length: 12 }, () => null));
  }, []);

  const checkSlots = (index: number) => {
    const card = hand[index];
    if (!card) {
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
    if (selectedIndex === index) {
      setSelectedIndex(null);
      setSacrificeRequired(0);
      setSacrificeSlots([]);
      return;
    }

    checkSlots(index);
  };

  const handlePlaceCard = (slotIndex: number) => {
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

    if (cardToPlace.cost > 0) {
      if (slotCards[slotIndex]) {
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
    if (!squirrelCard) {
      return;
    }
    setHand((current) => [...current, squirrelCard]);
  };

  return (
    <ThemedView style={styles.container}>
      {/*scoreboard*/}
      <View style={styles.scoreBoard}>
        <ThemedText
          type="title"
          style={{ color: "#fff", textAlign: "center", lineHeight: 80 }}
        >
          0
        </ThemedText>
      </View>

      {/*table*/}
      <View style={styles.table}>
        {slots.map((id) => {
          const cardInSlot = slotCards[id];
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
              {cardInSlot ? (
                <CardView
                  card={cardInSlot}
                  width={slotSize?.width}
                  height={slotSize?.height}
                />
              ) : null}
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
          borderColor: "pink",
          borderWidth: 1,
          width: "100%",
          paddingHorizontal: 16,
        }}
      >
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
        >
          <FontAwesome6 name="bell-concierge" size={36} color="black" />
        </Pressable>
        {/*grab more cards*/}
        <View style={{ flexDirection: "row", gap: 4 }}>
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
          >
            <Octicons name="squirrel" size={36} color="black" />
          </Pressable>
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
          >
            <MaterialCommunityIcons
              name="cards-playing-outline"
              size={36}
              color="black"
            />
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
