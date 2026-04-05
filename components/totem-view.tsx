import { Card, sigilsByName } from "@/app/cards";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Image } from "expo-image";
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import totemAvian from "../assets/totem_avian_img.png";
import totemBody from "../assets/totem_body_img.png";
import totemCanine from "../assets/totem_canine_img.png";
import totemHooved from "../assets/totem_hooved_img.png";
import totemInsect from "../assets/totem_insect_img.png";
import totemReptile from "../assets/totem_reptile_img.png";

type TotemViewProps = {
  headClass: Exclude<Card["class"], "Miscellaneous">;
  bodySigilName: string;
  size?: number;
  sigilOffsetX?: number;
  sigilOffsetY?: number;
};

type TotemBodyViewProps = {
  bodySigilName: string;
  sigilSize?: number;
  sigilColor?: string;
  sigilOffsetX?: number;
  sigilOffsetY?: number;
  style?: StyleProp<ViewStyle>;
};

const HEAD_IMAGES = {
  Avian: totemAvian,
  Canine: totemCanine,
  Insect: totemInsect,
  Reptile: totemReptile,
  Hooved: totemHooved,
} as const;

const BODY_IMAGE = totemBody;

const sigilOffsetX = -2;
const sigilOffsetY = 12;
export const TOTEM_BODY_SIGIL_SIZE = 24;
export const TOTEM_VIEW_SIGIL_SIZE_RATIO = 0.34;

const renderSigilIcon = (
  bodySigilName: string,
  size: number,
  color: string,
) => {
  const sigil = sigilsByName[bodySigilName] ?? null;
  if (!sigil) {
    return null;
  }

  if (sigil.iconLibrary === "FontAwesome6") {
    return (
      <FontAwesome6
        name={sigil.icon as keyof typeof FontAwesome6.glyphMap}
        size={size}
        color={color}
      />
    );
  }

  return (
    <MaterialCommunityIcons
      name={sigil.icon as keyof typeof MaterialCommunityIcons.glyphMap}
      size={size}
      color={color}
    />
  );
};

export function TotemBodyView({
  bodySigilName,
  sigilSize = TOTEM_BODY_SIGIL_SIZE,
  sigilColor = "#ff0000",
  style,
}: TotemBodyViewProps) {
  const sigilIcon = renderSigilIcon(bodySigilName, sigilSize, sigilColor);

  return (
    <View style={style}>
      <Image source={BODY_IMAGE} style={styles.fill} contentFit="fill" />
      {sigilIcon ? (
        <View
          pointerEvents="none"
          style={[
            styles.sigilOverlayCenter,
            {
              transform: [
                { translateX: sigilOffsetX },
                { translateY: sigilOffsetY },
              ],
            },
          ]}
        >
          {sigilIcon}
        </View>
      ) : null}
    </View>
  );
}

export function TotemView({
  headClass,
  bodySigilName,
  size = 80,
}: TotemViewProps) {
  const headHeight = Math.round(size);
  const bodyHeight = Math.round(size);
  const totalHeight = headHeight + bodyHeight;

  return (
    <View style={{ width: size, height: totalHeight }}>
      <Image
        source={HEAD_IMAGES[headClass]}
        style={{ width: size, height: headHeight }}
        contentFit="fill"
      />
      <TotemBodyView
        bodySigilName={bodySigilName}
        sigilSize={Math.round(size * TOTEM_VIEW_SIGIL_SIZE_RATIO)}
        style={{ width: size, height: bodyHeight }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    width: "100%",
    height: "100%",
  },
  sigilOverlayCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
