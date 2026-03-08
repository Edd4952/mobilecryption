import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useGameRun } from "./game-state";
import { colorsFor, useThemeMode } from "./theme";

const HomePage = () => {
  const { mode } = useThemeMode();
  const { createNewGame, gameRun } = useGameRun();
  const c = colorsFor(mode);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Text
        style={[
          styles.text,
          { color: c.text, fontWeight: "bold", fontSize: 42 },
        ]}
      >
        Mobilecryption
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, !gameRun.canContinue && styles.buttonDisabled]}
          disabled={!gameRun.canContinue}
          onPress={() => {
            if (!gameRun.canContinue) return;
            router.push("/(tabs)/map");
          }}
        >
          <Text style={[styles.text, { color: c.text }]}>Continue</Text>
        </Pressable>
        <Pressable
          style={[styles.button2]}
          onPress={() => {
            createNewGame();
            router.push("/(tabs)/map");
          }}
        >
          <Text style={[styles.text, { color: c.text }]}>New Game</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-evenly",
    alignItems: "center",
    backgroundColor: "#222",
    gap: 8,
  },
  text: {
    color: "white",
    fontSize: 28,
  },
  link: {
    color: "#007AFF",
    fontSize: 18,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  button2: {
    backgroundColor: "grey",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actions: {
    alignItems: "center",
    gap: 8,
  },
});

export default HomePage;
