import { Card, sigils } from "@/app/cards";
import { TotemState, useGameRun } from "@/app/game-state";
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
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import totemAvian from "../../assets/totem_avian_img.png";
import totemCanine from "../../assets/totem_canine_img.png";
import totemHooved from "../../assets/totem_hooved_img.png";
import totemInsect from "../../assets/totem_insect_img.png";
import totemReptile from "../../assets/totem_reptile_img.png";

import { ThemedText } from "@/components/themed-text";
import { TotemBodyView, TotemView } from "@/components/totem-view";

type TotemHeadClass = Exclude<Card["class"], "Miscellaneous">;

type TotemPartOffer = TotemState["offerParts"][number];

const TOTEM_HEAD_CLASSES: TotemHeadClass[] = [
  "Avian",
  "Canine",
  "Insect",
  "Reptile",
  "Hooved",
];

const TOTEM_HEAD_IMAGES: Record<TotemHeadClass, number> = {
  Avian: totemAvian,
  Canine: totemCanine,
  Insect: totemInsect,
  Reptile: totemReptile,
  Hooved: totemHooved,
};

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const buildOfferParts = (): TotemPartOffer[] => {
  const heads = shuffle(TOTEM_HEAD_CLASSES);
  const bodies = shuffle(sigils.map((sigil) => sigil.name));
  const useTwoHeads = Math.random() < 0.5;

  // Enforce 2:1 or 1:2 split with no duplicates.
  const offers: TotemPartOffer[] = useTwoHeads
    ? [
        { kind: "head", key: `head-${heads[0]}`, value: heads[0] },
        { kind: "head", key: `head-${heads[1]}`, value: heads[1] },
        { kind: "body", key: `body-${bodies[0]}`, value: bodies[0] },
      ]
    : [
        { kind: "body", key: `body-${bodies[0]}`, value: bodies[0] },
        { kind: "body", key: `body-${bodies[1]}`, value: bodies[1] },
        { kind: "head", key: `head-${heads[0]}`, value: heads[0] },
      ];

  return shuffle(offers);
};

export default function TotemScreen() {
  const router = useRouter();
  const { gameRun, setTotem } = useGameRun();
  const [isOfferPhase, setIsOfferPhase] = useState(true);
  const [pickedHeadIndex, setPickedHeadIndex] = useState<number | null>(null);
  const [pickedBodyIndex, setPickedBodyIndex] = useState<number | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const fallY = useRef(new Animated.Value(0)).current;

  const totemState = gameRun.totem;
  const offerParts = totemState.offerParts;
  const hasAnyHead =
    totemState.collectedHeads.length > 0 ||
    (totemState.headClass !== null && totemState.headClass !== "Miscellaneous");
  const hasAnyBody =
    totemState.collectedBodies.length > 0 || Boolean(totemState.bodySigilName);
  const canAssemble = hasAnyHead && hasAnyBody;

  useFocusEffect(
    useCallback(() => {
      setIsOfferPhase(true);
      setPreviewVisible(false);
      setIsConfirming(false);

      return () => {
        // Ensure modal/backdrop never survives route transitions.
        setPreviewVisible(false);
        setIsConfirming(false);
      };
    }, []),
  );

  useEffect(() => {
    if (!isOfferPhase) {
      return;
    }

    setPickedHeadIndex(null);
    setPickedBodyIndex(null);
    setPreviewVisible(false);
    setIsConfirming(false);
  }, [isOfferPhase]);

  useEffect(() => {
    if (!isOfferPhase || offerParts.length > 0) {
      return;
    }

    setTotem((current) => ({
      ...current,
      offerParts: buildOfferParts(),
    }));
  }, [isOfferPhase, offerParts.length, setTotem]);

  const availableHeads = useMemo(() => {
    const heads = [...totemState.collectedHeads];
    if (
      totemState.headClass !== null &&
      totemState.headClass !== "Miscellaneous" &&
      !heads.includes(totemState.headClass)
    ) {
      heads.push(totemState.headClass);
    }
    return heads;
  }, [totemState.collectedHeads, totemState.headClass]);

  const availableBodies = useMemo(() => {
    const bodies = [...totemState.collectedBodies];
    if (
      totemState.bodySigilName &&
      !bodies.includes(totemState.bodySigilName)
    ) {
      bodies.push(totemState.bodySigilName);
    }
    return bodies;
  }, [totemState.bodySigilName, totemState.collectedBodies]);

  const selectedHead = useMemo(
    () =>
      pickedHeadIndex === null
        ? null
        : (availableHeads[pickedHeadIndex] ?? null),
    [availableHeads, pickedHeadIndex],
  );

  const selectedBodySigilName = useMemo(
    () =>
      pickedBodyIndex === null
        ? null
        : (availableBodies[pickedBodyIndex] ?? null),
    [availableBodies, pickedBodyIndex],
  );

  const assembledParts = useMemo(
    () => [
      ...availableHeads.map((headClass, index) => ({
        kind: "head" as const,
        index,
        key: `head-${headClass}-${index}`,
        label: headClass,
        value: headClass,
      })),
      ...availableBodies.map((sigilName, index) => ({
        kind: "body" as const,
        index,
        key: `body-${sigilName}-${index}`,
        label: sigilName,
        value: sigilName,
      })),
    ],
    [availableBodies, availableHeads],
  );

  const onPickOffer = (part: TotemPartOffer) => {
    if (isConfirming) {
      return;
    }

    setTotem((current) => {
      const nextHeads = [...current.collectedHeads];
      const nextBodies = [...current.collectedBodies];

      if (
        current.headClass !== null &&
        current.headClass !== "Miscellaneous" &&
        !nextHeads.includes(current.headClass)
      ) {
        nextHeads.push(current.headClass);
      }

      if (
        current.bodySigilName &&
        !nextBodies.includes(current.bodySigilName)
      ) {
        nextBodies.push(current.bodySigilName);
      }

      if (part.kind === "head") {
        if (!nextHeads.includes(part.value)) {
          nextHeads.push(part.value);
        }
      } else if (!nextBodies.includes(part.value)) {
        nextBodies.push(part.value);
      }

      return {
        ...current,
        collectedHeads: nextHeads,
        collectedBodies: nextBodies,
        offerParts: [],
      };
    });

    setIsOfferPhase(false);

    const willHaveHead =
      hasAnyHead ||
      (part.kind === "head" && !availableHeads.includes(part.value));
    const willHaveBody =
      hasAnyBody ||
      (part.kind === "body" && !availableBodies.includes(part.value));

    if (!willHaveHead || !willHaveBody) {
      router.replace("/(tabs)/map");
    }
  };

  const openPreviewIfReady = (
    nextHeadIndex: number | null,
    nextBodyIndex: number | null,
  ) => {
    if (nextHeadIndex !== null && nextBodyIndex !== null) {
      fallY.setValue(0);
      setPreviewVisible(true);
    }
  };

  const onPickHead = (index: number) => {
    setPickedHeadIndex(index);
    openPreviewIfReady(index, pickedBodyIndex);
  };

  const onPickBody = (index: number) => {
    setPickedBodyIndex(index);
    openPreviewIfReady(pickedHeadIndex, index);
  };

  const onBackdropPress = () => {
    if (isConfirming) {
      return;
    }
    setPreviewVisible(false);
  };

  const onConfirmTotem = () => {
    if (!selectedHead || !selectedBodySigilName || isConfirming) {
      return;
    }

    setIsConfirming(true);
    setTotem((current) => ({
      ...current,
      headClass: selectedHead,
      bodySigilName: selectedBodySigilName,
      offerParts: [],
    }));

    const screenHeight = Dimensions.get("window").height;
    Animated.timing(fallY, {
      toValue: screenHeight + 120,
      duration: 600,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        setPreviewVisible(false);
        setIsConfirming(false);
        router.replace("/(tabs)/map");
      }, 400);
    });
  };

  return (
    <View style={styles.container}>
      {isOfferPhase ? (
        <>
          <View style={styles.offerRow}>
            {offerParts.map((part) => (
              <Pressable
                key={part.key}
                style={styles.offerCard}
                onPress={() => onPickOffer(part)}
              >
                {part.kind === "head" ? (
                  <Animated.Image
                    source={TOTEM_HEAD_IMAGES[part.value]}
                    style={styles.offerHeadImage}
                    resizeMode="stretch"
                  />
                ) : (
                  <TotemBodyView
                    bodySigilName={part.value}
                    sigilOffsetX={-2}
                    sigilOffsetY={18}
                    style={styles.offerBodyWrap}
                    sigilSize={36}
                  />
                )}
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <>
          <ThemedText type="title" style={styles.title}>
            Assemble Totem
          </ThemedText>

          {canAssemble ? (
            <ScrollView contentContainerStyle={styles.assembleScrollContent}>
              <View style={styles.grid}>
                {assembledParts.map((part) => {
                  const isSelected =
                    part.kind === "head"
                      ? pickedHeadIndex === part.index
                      : pickedBodyIndex === part.index;

                  return (
                    <Pressable
                      key={part.key}
                      style={[
                        styles.gridItem,
                        isSelected && styles.gridItemSelected,
                      ]}
                      onPress={() =>
                        part.kind === "head"
                          ? onPickHead(part.index)
                          : onPickBody(part.index)
                      }
                    >
                      {part.kind === "head" ? (
                        <Animated.Image
                          source={
                            TOTEM_HEAD_IMAGES[part.value as TotemHeadClass]
                          }
                          style={styles.gridPreview}
                          resizeMode="stretch"
                        />
                      ) : (
                        <TotemBodyView
                          bodySigilName={part.value as string}
                          sigilOffsetX={-2}
                          sigilOffsetY={13}
                          style={styles.gridPreview}

                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          ) : null}
        </>
      )}

      <Modal
        visible={
          previewVisible && Boolean(selectedHead && selectedBodySigilName)
        }
        transparent
        animationType="fade"
        onRequestClose={onBackdropPress}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={onBackdropPress}
          />

          <View pointerEvents="box-none" style={styles.modalCenterWrap}>
            <Animated.View style={{ transform: [{ translateY: fallY }] }}>
              {selectedHead && selectedBodySigilName ? (
                <Pressable onPress={onConfirmTotem}>
                  <TotemView
                    headClass={selectedHead as TotemHeadClass}
                    bodySigilName={selectedBodySigilName}
                    size={150}
                  />
                </Pressable>
              ) : null}
            </Animated.View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#02030a",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    color: "#ffffff",
    textAlign: "center",
  },
  subtitle: {
    color: "#cbd5e1",
    textAlign: "center",
  },
  completedTotemDisplay: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 24,
  },
  offerRow: {
    width: "50%",
    marginTop: 12,
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 10,
  },
  offerCard: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#111111",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#374151",
    overflow: "hidden",
  },
  offerHeadImage: {
    width: "100%",
    height: "100%",
  },
  offerBodyWrap: {
    width: "100%",
    height: "100%",
  },
  assembleScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    borderColor: "#374151",
    borderWidth: 2,
    borderRadius: 8,
    padding: 10,
  },
  gridItem: {
    width: "40%",
    backgroundColor: "#111111",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#374151",
    paddingVertical: 8,
    paddingHorizontal: 6,
    minWidth: 132,
    minHeight: 132,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 5,
  },
  gridItemSelected: {
    borderColor: "#fbbf24",
    borderWidth: 3,
  },
  gridPreview: {
    width: "100%",
    height: "100%",
  },
  gridLabel: {
    color: "#e5e7eb",
    fontSize: 11,
    textAlign: "center",
    minHeight: 30,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCenterWrap: {
    alignItems: "center",
    gap: 10,
  },
  modalHint: {
    color: "#d1d5db",
    textAlign: "center",
  },
});
