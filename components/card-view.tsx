import { Card } from "@/app/cards";
import { ThemedText } from "@/components/themed-text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Fontisto from "@expo/vector-icons/Fontisto";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View } from "react-native";

type CardViewProps = {
  card: Card;
  width?: number;
  height?: number;
  scale?: number;
};

//the minimum base height is 100
const BASE_HEIGHT = 100;
const BASE_WIDTH = BASE_HEIGHT * (75 / 100);

export function CardView({ card, width, height, scale }: CardViewProps) {
  const resolvedWidth = width ?? BASE_WIDTH;
  const resolvedHeight = height ?? resolvedWidth * (BASE_HEIGHT / BASE_WIDTH);
  const resolvedScale = scale ?? resolvedWidth / BASE_WIDTH;
  const styles = makeStyles(resolvedScale, resolvedWidth, resolvedHeight);

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
          {Array.from({ length: card.cost }).map((_, index) => (
            <Fontisto
              key={`blood-${index}`}
              name="blood-drop"
              size={16 * resolvedScale}
              color="red"
            />
          ))}
        </View>
      </View>
      <View style={styles.cardinfo}>
        <ThemedText style={styles.cardinfotext}>{card.damage}</ThemedText>

        <View style={styles.sigils}>
          {card.sigils.map((sigil, index) => (
            <MaterialCommunityIcons
              key={sigil.icon ?? `sigil-${index}`}
              name={sigil.icon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={20 * resolvedScale}
              color={"#ffffff"}
            />
          ))}
        </View>

        <ThemedText style={styles.cardinfotext}>{card.health}</ThemedText>
      </View>
    </View>
  );
}

const makeStyles = (scale: number, width: number, height: number) =>
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
    costBadge: {
      position: "absolute",
      top: 4 * scale,
      right: 4 * scale,
      flexDirection: "row",
      alignItems: "center",
      gap: 2 * scale,
      paddingHorizontal: 3 * scale,
      paddingVertical: 2 * scale,
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
