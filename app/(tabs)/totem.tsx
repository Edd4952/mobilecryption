import { Card, sigils } from "@/app/cards";
import { TotemState, useGameRun } from "@/app/game-state";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {
  TOTEM_BODY_SIGIL_SIZE,
  TotemBodyView,
  TotemView,
} from "@/components/totem-view";

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
  const [pickedHeadIndex, setPickedHeadIndex] = useState<number | null>(null);
  const [pickedBodyIndex, setPickedBodyIndex] = useState<number | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const fallY = useRef(new Animated.Value(0)).current;

  const totemState = gameRun.totem;
  const offerParts = totemState.offerParts;
  const hasAnyHead = totemState.collectedHeads.length > 0;
  const hasAnyBody = totemState.collectedBodies.length > 0;
  const canAssemble = hasAnyHead && hasAnyBody;

  useEffect(() => {
    if (!canAssemble) {
      setPickedHeadIndex(null);
      setPickedBodyIndex(null);
      setIsConfirming(false);
    }
  }, [canAssemble]);

  useEffect(() => {
    if (canAssemble || offerParts.length > 0) {
      return;
    }

    setTotem((current) => ({
      ...current,
      offerParts: buildOfferParts(),
    }));
  }, [canAssemble, offerParts.length, setTotem]);

  const selectedHead = useMemo(
    () =>
      pickedHeadIndex === null
        ? null
        : (totemState.collectedHeads[pickedHeadIndex] ?? null),
    [pickedHeadIndex, totemState.collectedHeads],
  );

  const selectedBodySigilName = useMemo(
    () =>
      pickedBodyIndex === null
        ? null
        : (totemState.collectedBodies[pickedBodyIndex] ?? null),
    [pickedBodyIndex, totemState.collectedBodies],
  );

  const assembledParts = useMemo(
    () => [
      ...totemState.collectedHeads.map((headClass, index) => ({
        kind: "head" as const,
        index,
        key: `head-${headClass}-${index}`,
        label: headClass,
        value: headClass,
      })),
      ...totemState.collectedBodies.map((sigilName, index) => ({
        kind: "body" as const,
        index,
        key: `body-${sigilName}-${index}`,
        label: sigilName,
        value: sigilName,
      })),
    ],
    [totemState.collectedBodies, totemState.collectedHeads],
  );

  const onPickOffer = (part: TotemPartOffer) => {
    if (isConfirming) {
      return;
    }

    setTotem((current) => {
      const nextHeads = [...current.collectedHeads];
      const nextBodies = [...current.collectedBodies];

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

    const willHaveHead =
      hasAnyHead ||
      (part.kind === "head" && !totemState.collectedHeads.includes(part.value));
    const willHaveBody =
      hasAnyBody ||
      (part.kind === "body" &&
        !totemState.collectedBodies.includes(part.value));

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
      collectedHeads: [],
      collectedBodies: [],
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
        router.replace("/(tabs)/map");
      }, 400);
    });
  };

  return (
    <View style={styles.container}>
      {!canAssemble ? (
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
                    sigilSize={TOTEM_BODY_SIGIL_SIZE}
                    style={styles.offerBodyWrap}
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
                        source={TOTEM_HEAD_IMAGES[part.value as TotemHeadClass]}
                        style={styles.gridPreview}
                        resizeMode="stretch"
                      />
                    ) : (
                      <TotemBodyView
                        bodySigilName={part.value as string}
                        sigilSize={TOTEM_BODY_SIGIL_SIZE}
                        style={styles.gridPreview}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
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
    width: "100%",
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  offerCard: {
    flex: 1,
    backgroundColor: "#111111",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#374151",
    paddingVertical: 8,
    paddingHorizontal: 6,
    minHeight: 264,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 5,
  },
  offerHeadImage: {
    width: "100%",
    height: 78,
  },
  offerBodyWrap: {
    width: "100%",
    height: 78,
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
