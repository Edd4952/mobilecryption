import { Link, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colorsFor, useThemeMode } from "./theme";

const HomePage = () => {
  const { mode } = useThemeMode();
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
        <Link
          style={[styles.button]}
          href={{ pathname: "/(tabs)/map", params: { mode: "create" } }}
        >
          <Text style={[styles.text, { color: c.text }]}>Continue</Text>
        </Link>
        {/* Continue game */}
        
        
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
  actions: {
    alignItems: "center",
    gap: 8,
  },
});

export default HomePage;
