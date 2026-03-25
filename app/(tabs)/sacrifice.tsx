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

const ROUTE_DELAY_MS = 1000;

type ActiveSurface = "recipient" | "sacrifice" | null;

type SlottedCard = {
  card: Card;
  deckIndex: number;
};

const cloneCard = (card: Card): Card => ({
  ...card,
  sigils: card.sigils.map((sigil) => ({ ...sigil })),
});

export default function SacrificeScreen() {
  const router = useRouter();
  const { gameRun, setDeck } = useGameRun();
  const [recipientCard, setRecipientCard] = useState<SlottedCard | null>(null);
  const [sacrificeCard, setSacrificeCard] = useState<SlottedCard | null>(null);
  const [activeSurface, setActiveSurface] = useState<ActiveSurface>(null);
  const [isResolvingSacrifice, setIsResolvingSacrifice] = useState(false);
  const [transferredSigilCount, setTransferredSigilCount] = useState<
    number | null
  >(null);
  const routeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width: screenWidth } = useWindowDimensions();

  const resetSacrificeState = useCallback(() => {
    setRecipientCard(null);
    setSacrificeCard(null);
    setActiveSurface(null);
    setTransferredSigilCount(null);
  }, []);

  useEffect(() => {
    return () => {
      if (routeTimeoutRef.current) {
        clearTimeout(routeTimeoutRef.current);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsResolvingSacrifice(false);
      setTransferredSigilCount(null);
      setActiveSurface(null);
      return undefined;
    }, []),
  );

  const cardWidth = useMemo(() => {
    const available = screenWidth - 64;
    const target = Math.floor(available / 3.2);
    return Math.max(82, Math.min(110, target));
  }, [screenWidth]);

  const cardHeight = useMemo(() => cardWidth * (100 / 75), [cardWidth]);

  const deckChoices = useMemo(() => {
    const blockedIndex =
      activeSurface === "recipient"
        ? sacrificeCard?.deckIndex
        : recipientCard?.deckIndex;

    return gameRun.deck
      .map((card, index) => ({ card, index }))
      .filter(({ card, index }) => {
        if (blockedIndex === index) {
          return false;
        }

        if (activeSurface === "sacrifice") {
          return card.sigils.length > 0;
        }

        return true;
      });
  }, [
    activeSurface,
    gameRun.deck,
    recipientCard?.deckIndex,
    sacrificeCard?.deckIndex,
  ]);

  const canApplySacrifice =
    !isResolvingSacrifice && recipientCard !== null && sacrificeCard !== null;

  return (
    <View style={styles.container}>
      {activeSurface ? (
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            if (isResolvingSacrifice) return;
            setActiveSurface(null);
          }}
          accessibilityRole="button"
          accessibilityLabel="Close deck panel"
        />
      ) : null}

      <View style={styles.sacrificeRow} pointerEvents="box-none">
        <Pressable
          style={styles.receiverSlot}
          onPress={() => {
            if (isResolvingSacrifice) return;
            if (recipientCard) {
              setRecipientCard(null);
              return;
            }
            setActiveSurface("recipient");
          }}
          accessibilityRole="button"
          accessibilityLabel="Recipient slot"
        >
          {recipientCard ? (
            <CardView
              card={recipientCard.card}
              width={cardWidth}
              height={cardHeight}
            />
          ) : (
            <View
              style={[
                styles.emptyCardFrame,
                styles.receiverFrame,
                activeSurface === "recipient" && styles.receiverFrameActive,
                { width: cardWidth, height: cardHeight },
              ]}
            >
              <MaterialCommunityIcons
                name="star-four-points"
                size={42}
                color="#5eead4"
              />
            </View>
          )}
        </Pressable>

        <Pressable
          style={[styles.plusButton, { width: cardWidth }]}
          disabled={!canApplySacrifice}
          onPress={() => {
            if (!recipientCard || !sacrificeCard || isResolvingSacrifice) {
              return;
            }

            const existingSigilNames = new Set(
              recipientCard.card.sigils.map((sigil) => sigil.name),
            );
            const transferredSigils = sacrificeCard.card.sigils
              .filter((sigil) => !existingSigilNames.has(sigil.name))
              .map((sigil) => ({ ...sigil }));

            const nextRecipient: Card = {
              ...recipientCard.card,
              sigils: [
                ...recipientCard.card.sigils.map((sigil) => ({ ...sigil })),
                ...transferredSigils,
              ],
            };

            setDeck((currentDeck) => {
              if (
                recipientCard.deckIndex < 0 ||
                recipientCard.deckIndex >= currentDeck.length ||
                sacrificeCard.deckIndex < 0 ||
                sacrificeCard.deckIndex >= currentDeck.length ||
                recipientCard.deckIndex === sacrificeCard.deckIndex
              ) {
                return currentDeck;
              }

              const nextDeck = currentDeck.map((card) => cloneCard(card));
              nextDeck[recipientCard.deckIndex] = cloneCard(nextRecipient);
              nextDeck.splice(sacrificeCard.deckIndex, 1);
              return nextDeck;
            });

            setRecipientCard({ ...recipientCard, card: nextRecipient });
            setSacrificeCard(null);
            setTransferredSigilCount(transferredSigils.length);
            setIsResolvingSacrifice(true);
            setActiveSurface(null);

            routeTimeoutRef.current = setTimeout(() => {
              resetSacrificeState();
              router.replace("/(tabs)/map");
            }, ROUTE_DELAY_MS);
          }}
          accessibilityRole="button"
          accessibilityLabel="Sacrifice transfer button"
        >
          <View style={styles.transferContent}>
            <MaterialCommunityIcons
              name="transfer-right"
              size={28}
              color="#ffffff"
            />
            <MaterialCommunityIcons
              name="star-four-points"
              size={22}
              color="#ffffff"
            />
          </View>
        </Pressable>

        {transferredSigilCount !== null ? (
          <View style={styles.appliedBuffBanner}>
            <MaterialCommunityIcons
              name="star-four-points"
              size={18}
              color="#ffffff"
            />
            <Text style={styles.appliedBuffText}>
              {transferredSigilCount === 1
                ? "Transferred 1 sigil"
                : `Transferred ${transferredSigilCount} sigils`}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={styles.sacrificeSlot}
          onPress={() => {
            if (isResolvingSacrifice) return;
            if (sacrificeCard) {
              setSacrificeCard(null);
              return;
            }
            setActiveSurface("sacrifice");
          }}
          accessibilityRole="button"
          accessibilityLabel="Sacrifice slot"
        >
          {sacrificeCard ? (
            <View
              style={{
                width: cardHeight,
                height: cardWidth,
                alignItems: "center",
                justifyContent: "center",
                transform: [{ rotate: "270deg" }],
              }}
            >
              <CardView
                card={sacrificeCard.card}
                width={cardWidth}
                height={cardHeight}
              />
            </View>
          ) : (
            <View
              style={[
                styles.emptyCardFrame,
                styles.sacrificeFrame,
                activeSurface === "sacrifice" && styles.sacrificeFrameActive,
                { width: cardHeight, height: cardWidth },
              ]}
            >
              <MaterialCommunityIcons
                name="knife-military"
                size={38}
                color="#99f6e4"
              />
            </View>
          )}
        </Pressable>
      </View>

      {activeSurface ? (
        <View style={styles.deckPanel}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.deckContent}
          >
            {deckChoices.map(({ card, index }) => (
              <Pressable
                key={`${card.name}-${index}`}
                style={styles.deckCardButton}
                onPress={() => {
                  if (isResolvingSacrifice || !activeSurface) return;

                  const slottedCard = {
                    card: cloneCard(card),
                    deckIndex: index,
                  };

                  if (activeSurface === "recipient") {
                    setRecipientCard(slottedCard);
                  } else {
                    setSacrificeCard(slottedCard);
                  }

                  setActiveSurface(null);
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
    backgroundColor: "#091217",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    backgroundColor: "transparent",
  },
  sacrificeRow: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: "25%",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
    gap: 16,
  },
  receiverSlot: {
    width: 150,
    height: 200,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  sacrificeSlot: {
    width: 200,
    height: 150,
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
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  receiverFrame: {
    borderColor: "#0f766e",
    backgroundColor: "#0b2b2d",
  },
  receiverFrameActive: {
    borderWidth: 4,
    borderStyle: "solid",
  },
  sacrificeFrame: {
    borderColor: "#0e7490",
    backgroundColor: "#0c2430",
  },
  sacrificeFrameActive: {
    borderWidth: 4,
    borderStyle: "solid",
  },
  plusButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#0f766e",
    borderWidth: 2,
    borderColor: "#115e59",
    alignItems: "center",
    justifyContent: "center",
  },
  transferContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  appliedBuffBanner: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2dd4bf",
    backgroundColor: "rgba(45, 212, 191, 0.22)",
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
    borderTopColor: "#22404a",
    backgroundColor: "#0b1820",
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
});
