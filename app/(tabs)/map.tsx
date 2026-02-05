import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

export type Node = {
  id: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
};

export type Break = {
  depth: number; // vertical “row” or depth
  numOfNodes: number; // 2 or 3
  connectiontype: string[];
  isBattle: boolean;
  nodes: Node[]; // nodes at this break
};

export const nodeList: Node[] = [
    { id: "newcard", icon: "cards-playing-outline" },
    { id: "campfire", icon: "fire" },
    { id: "gift", icon: "bag-personal" },
    { id: "sacrifice", icon: "table-furniture" },
    { id: "battle", icon: "skull" },
    { id: "", icon: "fire" }

];

export type MapState = {
  currentDepth: number;
  selectedNodeId?: string;
  breaks: Break[];
};

export const sampleMapState: MapState = {
  currentDepth: 2,
  selectedNodeId: "tier2-b",
  breaks: [
    { depth: 1, numOfNodes: 1, connectiontype: [], isBattle: false, nodes: []},
    { depth: 2, numOfNodes: 1, connectiontype: [], isBattle: false, nodes: [nodeList[0]] },
    { depth: 3, numOfNodes: 3, connectiontype: [], isBattle: false, nodes: [nodeList[1], nodeList[2], nodeList[3]] },
    { depth: 4, numOfNodes: 1, connectiontype: [], isBattle: true, nodes: [nodeList[4]] },
    { depth: 5, numOfNodes: 3, connectiontype: [], isBattle: false, nodes: [] },
    { depth: 6, numOfNodes: 2, connectiontype: [], isBattle: false, nodes: [] },
    { depth: 7, numOfNodes: 3, connectiontype: [], isBattle: false, nodes: [] },
    { depth: 8, numOfNodes: 1, connectiontype: [], isBattle: true, nodes: [] },
  ],
};

export default function map() {
  return (
    <View style={styles.container}>
      <ThemedText type="title" style={{ fontFamily: Fonts.rounded }}>
        Map Screen
      </ThemedText>

      <View style={styles.mapCanvas}>
        {[...sampleMapState.breaks].reverse().map((row) => (
          <View key={row.depth} style={styles.tierRow}>
            {Array.from({ length: row.numOfNodes }).map((_, idx) => (
              <Pressable
                key={`${row.depth}-${idx}`}
                style={[styles.node, row.isBattle && styles.battleNode]}
                onPress={() =>
                  console.log(`Tapped depth ${row.depth} node ${idx}`)
                }
              >
                <MaterialCommunityIcons
                  name={row.nodes[idx]?.icon ?? "circle-slice-8"}
                  size={36}
                  color="#000"
                />
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#02030a" },
  mapCanvas: { marginTop: 24, gap: 32 },
  tierRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  node: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#af721d",
    borderWidth: 2,
    borderColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  battleNode: { backgroundColor: "#f43f5e" },
  // ...existing code...
});
