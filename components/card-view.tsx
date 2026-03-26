import { Card } from "@/app/cards";
import { ThemedText } from "@/components/themed-text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Fontisto from "@expo/vector-icons/Fontisto";
import { Image } from "expo-image";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

type CardViewProps = {
  card: Card;
  width?: number;
  height?: number;
  scale?: number;
  displayDamage?: number;
  overlaySigil?: Card["sigils"][number] | null;
  overlaySigils?: {
    sigil: Card["sigils"][number];
    color?: string;
    side?: "left" | "right";
  }[];
  onInfoPress?: (card: Card) => void;
};

//the minimum base height is 100
const BASE_HEIGHT = 100;
const BASE_WIDTH = BASE_HEIGHT * (75 / 100);

export function CardView({
  card,
  width,
  height,
  scale,
  displayDamage,
  overlaySigil,
  overlaySigils,
  onInfoPress,
}: CardViewProps) {
  const resolvedWidth = width ?? BASE_WIDTH;
  const resolvedHeight = height ?? resolvedWidth * (BASE_HEIGHT / BASE_WIDTH);
  const resolvedScale = scale ?? resolvedWidth / BASE_WIDTH;
  const sigilIconSize = (card.sigils.length > 1 ? 10 : 20) * resolvedScale;
  const isBoneCost = card.costType === "Bone";
  const renderedDamage = displayDamage ?? card.damage;
  const styles = makeStyles(
    resolvedScale,
    resolvedWidth,
    resolvedHeight,
    sigilIconSize,
  );
  const normalizedOverlaySigils = useMemo(() => {
    const fromSingle = overlaySigil
      ? [{ sigil: overlaySigil, side: "left" as const, color: "#ff0000" }]
      : [];
    const fromList = (overlaySigils ?? []).map((entry) => ({
      sigil: entry.sigil,
      side: entry.side ?? "left",
      color: entry.color ?? "#ffffff",
    }));
    return [...fromSingle, ...fromList];
  }, [overlaySigil, overlaySigils]);
  const leftOverlays = normalizedOverlaySigils.filter(
    (entry) => entry.side === "left",
  );
  const rightOverlays = normalizedOverlaySigils.filter(
    (entry) => entry.side === "right",
  );

  const renderSigilIcon = (
    sigil: Card["sigils"][number],
    key: string,
    size: number = sigilIconSize,
    color: string = "#ffffff",
  ) => {
    if (sigil.iconLibrary === "FontAwesome6") {
      return (
        <FontAwesome6
          key={key}
          name={sigil.icon as keyof typeof FontAwesome6.glyphMap}
          size={size}
          color={color}
        />
      );
    }

    return (
      <MaterialCommunityIcons
        key={key}
        name={sigil.icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={size}
        color={color}
      />
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.nameSlot}>
        <ThemedText style={styles.name}>{card.name}</ThemedText>
      </View>
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: card.image }}
          style={styles.image}
          contentFit="cover"
        />
        <View style={styles.costBadge}>
          {Array.from({ length: card.cost }).map((_, index) =>
            isBoneCost ? (
              <MaterialCommunityIcons
                key={`bone-${index}`}
                name="bone"
                size={16 * resolvedScale}
                color="black"
                style={{
                  transform: [
                    { rotate: "90deg" },
                    { translateX: -6 * resolvedScale },
                  ],
                  width: 8,
                }}
              />
            ) : (
              <Fontisto
                key={`blood-${index}`}
                name="blood-drop"
                size={16 * resolvedScale}
                color="red"
              />
            ),
          )}
        </View>
        {normalizedOverlaySigils.length > 0 ? (
          <View pointerEvents="none" style={styles.overlaySigilLayer}>
            {leftOverlays.map((entry, index) => {
              const offset =
                (index - (leftOverlays.length - 1) / 2) *
                (sigilIconSize + 2 * resolvedScale);
              return (
                <View
                  key={`${entry.sigil.name}-overlay-left-${index}`}
                  style={[
                    styles.overlayLeftSigil,
                    {
                      transform: [{ translateY: -sigilIconSize / 2 + offset }],
                    },
                  ]}
                >
                  {renderSigilIcon(
                    entry.sigil,
                    `${entry.sigil.name}-overlay-left-icon-${index}`,
                    sigilIconSize,
                    entry.color,
                  )}
                </View>
              );
            })}
            {rightOverlays.map((entry, index) => {
              const offset =
                (index - (rightOverlays.length - 1) / 2) *
                (sigilIconSize + 2 * resolvedScale);
              return (
                <View
                  key={`${entry.sigil.name}-overlay-right-${index}`}
                  style={[
                    styles.overlayRightSigil,
                    {
                      transform: [{ translateY: -sigilIconSize / 2 + offset }],
                    },
                  ]}
                >
                  {renderSigilIcon(
                    entry.sigil,
                    `${entry.sigil.name}-overlay-right-icon-${index}`,
                    sigilIconSize,
                    entry.color,
                  )}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
      <View style={styles.cardinfo}>
        <ThemedText style={styles.cardinfotext}>{renderedDamage}</ThemedText>

        <Pressable
          style={styles.sigils}
          disabled={!onInfoPress || card.sigils.length === 0}
          onPress={() => onInfoPress?.(card)}
          hitSlop={6}
        >
          {card.sigils.map((sigil, index) =>
            renderSigilIcon(sigil, `${sigil.name}-${index}`),
          )}
        </Pressable>

        <ThemedText style={styles.cardinfotext}>{card.health}</ThemedText>
      </View>
    </View>
  );
}

const makeStyles = (
  scale: number,
  width: number,
  height: number,
  sigilIconSize: number,
) =>
  StyleSheet.create({
    card: {
      width,
      height,
      borderRadius: 6 * scale,
      borderWidth: 2 * scale,
      borderColor: "#3b2c1e",
      backgroundColor: "#20140b",
      overflow: "hidden",
      alignItems: "center",
    },
    nameSlot: {
      height: 25 * scale,
      borderColor: "#fff",
      borderWidth: 1 * scale,
      width: "100%",
    },
    image: {
      width: "100%",
      height: 40 * scale,
    },
    imageWrap: {
      width: "100%",
      position: "relative",
    },
    overlaySigilLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    overlayLeftSigil: {
      position: "absolute",
      left: 4 * scale,
      top: "55%",
      borderColor: "#ff0000",
      borderWidth: 3 * scale,
    },
    overlayRightSigil: {
      position: "absolute",
      right: 4 * scale,
      top: "55%",
      borderColor: "#00ffff",
      borderWidth: 3 * scale,
    },
    costBadge: {
      position: "absolute",
      top: -4 * scale,
      right: 4 * scale,
      flexDirection: "row",
      alignItems: "center",
      gap: 1 * scale,
      paddingHorizontal: 3 * scale,
      borderRadius: 10 * scale,
    },
    name: {
      fontSize: 17 * scale,
      color: "#fff",
      textAlign: "center",
      fontWeight: "bold",
    },
    cardinfo: {
      height: 30 * scale,
      width: "100%",
      marginTop: "auto",
      borderWidth: 2 * scale,
      borderColor: "#ffffff",
      flexDirection: "row",
      justifyContent: "space-between",
      color: "#fff",
      fontSize: 10 * scale,
      fontFamily: "monospace",
      alignItems: "center",
    },
    sigils: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4 * scale,
    },
    sigilIcon: {
      width: 14 * scale,
      height: 14 * scale,
    },
    cardinfotext: {
      fontWeight: "bold",
      fontSize: 25 * scale,
      paddingHorizontal: 4 * scale,
    },
  });
