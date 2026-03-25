import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";

export default function NewCardClassScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        New Card Class
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        This node is wired into the map and ready for a dedicated class-based
        reward flow.
      </ThemedText>
      <Pressable
        style={styles.button}
        onPress={() => router.replace("/(tabs)/map")}
      >
        <ThemedText style={styles.buttonText}>Return to map</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#02030a",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  title: {
    color: "#ffffff",
    textAlign: "center",
  },
  subtitle: {
    color: "#cbd5e1",
    textAlign: "center",
  },
  button: {
    borderRadius: 10,
    backgroundColor: "#af721d",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#02030a",
    fontWeight: "700",
  },
});
