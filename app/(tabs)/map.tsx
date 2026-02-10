import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import Svg, { Line } from "react-native-svg";

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
  { id: "start", icon: "circle-slice-8" },
  { id: "newcard", icon: "cards-playing-outline" },
  { id: "campfire", icon: "fire" },
  { id: "gift", icon: "bag-personal" },
  { id: "sacrifice", icon: "table-furniture" },
  { id: "battle", icon: "skull" },
];

export const connectionTypes: string[] = [
  //one to anything
  "1-x",
  //anything to one
  "x-1",
  //two to two
  "22straight",
  "22divergeleft", // the path on the left diverges to the right and forward
  "22divergeright",
  //three to two
  "32convergeleft", // the left and middle paths converge to the left, the right path continues straight
  "32convergeright",
  //two to three
  "23divergeleft", // the right path continues straight, the left path diverges to the left and forward
  "23divergeright",
  //three to three
  "33straight",
  "33divergeleft", //left continues forward, middle diverges left and forward, right diverges left and forward
  "33divergeright", //right continues forward, middle diverges right and forward, left diverges right and forward
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
    {
      depth: 1,
      numOfNodes: 1,
      connectiontype: ["1-x"],
      isBattle: false,
      nodes: [nodeList[0]],
    },
    {
      depth: 2,
      numOfNodes: 1,
      connectiontype: ["1-x"],
      isBattle: false,
      nodes: [nodeList[1]],
    },
    {
      depth: 3,
      numOfNodes: 3,
      connectiontype: ["x-1"],
      isBattle: false,
      nodes: [nodeList[2], nodeList[3], nodeList[4]],
    },
    {
      depth: 4,
      numOfNodes: 1,
      connectiontype: ["1-x"],
      isBattle: true,
      nodes: [nodeList[5]],
    },
    {
      depth: 5,
      numOfNodes: 3,
      connectiontype: ["32convergeright"],
      isBattle: false,
      nodes: [nodeList[1], nodeList[3], nodeList[2]],
    },
    {
      depth: 6,
      numOfNodes: 2,
      connectiontype: ["23divergeright"],
      isBattle: false,
      nodes: [nodeList[3], nodeList[4]],
    },
    {
      depth: 7,
      numOfNodes: 3,
      connectiontype: ["x-1"],
      isBattle: false,
      nodes: [nodeList[3], nodeList[4], nodeList[2]],
    },
    {
      depth: 8,
      numOfNodes: 1,
      connectiontype: ["1-x"],
      isBattle: true,
      nodes: [nodeList[5]],
    },
  ],
};

export type PlayerPosition = {
  depth: number;
  nodeIndex: number;
  nodeInstanceId?: string;
};

const makeNodeInstanceId = (depth: number, nodeIndex: number, node?: Node) =>
  `${depth}-${nodeIndex}-${node?.id ?? "empty"}`;

type NodeLayout = {
  depth: number;
  layout: { x: number; y: number; width: number; height: number };
};

const PLAYER_ICON_SIZE = 48;

const range = (count: number) => Array.from({ length: count }, (_, idx) => idx);
const clampTargets = (targets: number[], toCount: number) =>
  Array.from(new Set(targets)).filter((index) => index >= 0 && index < toCount);
const fullMatrix = (fromCount: number, toCount: number) =>
  Array.from({ length: fromCount }, () => range(toCount));

const connectionResolvers: Record<
  string,
  (fromCount: number, toCount: number) => number[][] | null
> = {
  "1-x": (fromCount, toCount) => {
    if (fromCount !== 1 || toCount < 1) return null;
    return [range(toCount)];
  },
  "x-1": (fromCount, toCount) => {
    if (toCount !== 1) return null;
    return Array.from({ length: fromCount }, () => [0]);
  },
  "22straight": (fromCount, toCount) =>
    fromCount === 2 && toCount === 2 ? [[0], [1]] : null,
  "22divergeleft": (fromCount, toCount) =>
    fromCount === 2 && toCount === 2 ? [[0, 1], [1]] : null,
  "22divergeright": (fromCount, toCount) =>
    fromCount === 2 && toCount === 2 ? [[0], [0, 1]] : null,
  "32convergeleft": (fromCount, toCount) =>
    fromCount === 3 && toCount === 2 ? [[0], [0], [1]] : null,
  "32convergeright": (fromCount, toCount) =>
    fromCount === 3 && toCount === 2 ? [[0], [1], [1]] : null,
  "23divergeleft": (fromCount, toCount) =>
    fromCount === 2 && toCount === 3 ? [[0, 1], [2]] : null,
  "23divergeright": (fromCount, toCount) =>
    fromCount === 2 && toCount === 3 ? [[0], [1, 2]] : null,
  "33straight": (fromCount, toCount) =>
    fromCount === 3 && toCount === 3 ? [[0], [1], [2]] : null,
  "33divergeleft": (fromCount, toCount) =>
    fromCount === 3 && toCount === 3 ? [[0], [0, 1], [1, 2]] : null,
  "33divergeright": (fromCount, toCount) =>
    fromCount === 3 && toCount === 3 ? [[0, 1], [1, 2], [2]] : null,
};

const resolveConnectionMatrix = (
  type: string | undefined,
  fromCount: number,
  toCount: number,
) => {
  if (fromCount <= 0) return [];
  if (toCount <= 0) return Array.from({ length: fromCount }, () => []);
  const matrix = type ? connectionResolvers[type]?.(fromCount, toCount) : null;
  if (!matrix) {
    return fullMatrix(fromCount, toCount);
  }
  return matrix.map((targets) => clampTargets(targets, toCount));
};

export default function MapScreen() {
  const orderedBreaks = useMemo(
    () => [...sampleMapState.breaks].sort((a, b) => a.depth - b.depth),
    [],
  );
  const firstOccupiedBreak = useMemo(
    () => orderedBreaks.find((br) => br.nodes.length > 0),
    [orderedBreaks],
  );
  const initialNode = firstOccupiedBreak?.nodes[0];

  const initialNodeInstanceId = initialNode
    ? makeNodeInstanceId(firstOccupiedBreak.depth, 0, initialNode)
    : undefined;

  const [selectedNodeId, setSelectedNodeId] = useState(
    () => sampleMapState.selectedNodeId ?? initialNodeInstanceId,
  );
  const [playerPosition, setPlayerPosition] = useState<PlayerPosition>(() => ({
    depth: firstOccupiedBreak?.depth ?? orderedBreaks[0]?.depth ?? 0,
    nodeIndex: 0,
    nodeInstanceId: initialNodeInstanceId,
  }));

  const depthToIndex = useMemo(() => {
    const indexMap: Record<number, number> = {};
    orderedBreaks.forEach((br, idx) => {
      indexMap[br.depth] = idx;
    });
    return indexMap;
  }, [orderedBreaks]);

  const connectionMatrices = useMemo(() => {
    const matrices: Record<number, number[][]> = {};
    orderedBreaks.forEach((current, idx) => {
      const next = orderedBreaks[idx + 1];
      if (!next) return;
      matrices[current.depth] = resolveConnectionMatrix(
        current.connectiontype[0],
        current.numOfNodes,
        next.numOfNodes,
      );
    });
    return matrices;
  }, [orderedBreaks]);

  const { nextBreakDepth, allowedNextIndices } = useMemo(() => {
    const currentIndex = depthToIndex[playerPosition.depth];
    if (currentIndex === undefined) {
      return { nextBreakDepth: undefined, allowedNextIndices: [] as number[] };
    }
    const nextBreak = orderedBreaks[currentIndex + 1];
    if (!nextBreak) {
      return { nextBreakDepth: undefined, allowedNextIndices: [] as number[] };
    }
    const matrix = connectionMatrices[playerPosition.depth];
    const rawTargets = matrix?.[playerPosition.nodeIndex] ?? [];
    const filteredTargets = rawTargets.filter(
      (targetIdx) => !!nextBreak.nodes[targetIdx],
    );
    return {
      nextBreakDepth: nextBreak.depth,
      allowedNextIndices: filteredTargets,
    };
  }, [
    connectionMatrices,
    depthToIndex,
    orderedBreaks,
    playerPosition.depth,
    playerPosition.nodeIndex,
  ]);

  React.useEffect(() => {
    if (playerPosition.nodeInstanceId) {
      setSelectedNodeId(playerPosition.nodeInstanceId);
    }
  }, [playerPosition.nodeInstanceId]);

  const [rowLayouts, setRowLayouts] = useState<
    Record<number, { x: number; y: number; width: number; height: number }>
  >({});
  const [nodeLayouts, setNodeLayouts] = useState<Record<string, NodeLayout>>(
    {},
  );
  const playerXY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const playerPlaced = useRef(false);
  const [playerVisible, setPlayerVisible] = useState(false);

  const computeTarget = useCallback(
    (nodeInstanceId?: string) => {
      if (!nodeInstanceId) return;
      const nodeInfo = nodeLayouts[nodeInstanceId];
      if (!nodeInfo) return;
      const rowLayout = rowLayouts[nodeInfo.depth];
      if (!rowLayout) return;
      const nodeLayout = nodeInfo.layout;

      return {
        x:
          rowLayout.x +
          nodeLayout.x +
          nodeLayout.width / 2 -
          PLAYER_ICON_SIZE / 2,
        y:
          rowLayout.y +
          nodeLayout.y +
          nodeLayout.height / 2 -
          PLAYER_ICON_SIZE / 2,
      };
    },
    [nodeLayouts, rowLayouts],
  );

  const animateToNode = useCallback(
    (nodeInstanceId?: string) => {
      const target = computeTarget(nodeInstanceId);
      if (!target) return;

      if (!playerPlaced.current) {
        playerXY.setValue(target);
        playerPlaced.current = true;
        setPlayerVisible(true);
        return;
      }

      Animated.timing(playerXY, {
        toValue: target,
        duration: 320,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start();
    },
    [computeTarget, playerXY],
  );

  React.useEffect(() => {
    animateToNode(playerPosition.nodeInstanceId);
  }, [playerPosition.nodeInstanceId, animateToNode]);

  const allConnections = useMemo(() => {
    const edges: { from: string; to: string }[] = [];
    orderedBreaks.forEach((current, idx) => {
      const next = orderedBreaks[idx + 1];
      if (!next) return;

      const matrix = connectionMatrices[current.depth] ?? [];
      for (let fromIdx = 0; fromIdx < current.numOfNodes; fromIdx += 1) {
        const fromNode = current.nodes[fromIdx];
        if (!fromNode) continue;
        const fromId = makeNodeInstanceId(current.depth, fromIdx, fromNode);

        const targets = matrix[fromIdx] ?? [];
        targets.forEach((toIdx) => {
          const toNode = next.nodes[toIdx];
          if (!toNode) return;
          const toId = makeNodeInstanceId(next.depth, toIdx, toNode);
          edges.push({ from: fromId, to: toId });
        });
      }
    });
    return edges;
  }, [orderedBreaks, connectionMatrices]);

  const connectionLines = useMemo(() => {
    return allConnections
      .map(({ from, to }, idx) => {
        const fromCenter = getNodeCenter(from, nodeLayouts, rowLayouts);
        const toCenter = getNodeCenter(to, nodeLayouts, rowLayouts);
        if (!fromCenter || !toCenter) return null;
        return (
          <Line
            key={`line-${idx}`}
            x1={fromCenter.x}
            y1={fromCenter.y}
            x2={toCenter.x}
            y2={toCenter.y}
            stroke="#ffce79ad"
            strokeWidth={5}
            strokeLinecap="round"
          />
        );
      })
      .filter(Boolean);
  }, [allConnections, nodeLayouts, rowLayouts]);

  const [mapCanvasLayout, setMapCanvasLayout] = useState({
    width: 0,
    height: 0,
  });

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={{ fontFamily: Fonts.rounded }}>
        Map Screen
      </ThemedText>

      <View
        style={styles.mapCanvas}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setMapCanvasLayout({ width, height });
        }}
      >
        <Svg
          width={mapCanvasLayout.width}
          height={mapCanvasLayout.height}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {connectionLines}
        </Svg>

        {[...orderedBreaks].reverse().map((row) => (
          <View
            key={row.depth}
            style={styles.tierRow}
            onLayout={(event) => {
              const layout = event.nativeEvent.layout;
              setRowLayouts((prev) => {
                const existing = prev[row.depth];
                if (
                  existing &&
                  existing.x === layout.x &&
                  existing.y === layout.y &&
                  existing.width === layout.width &&
                  existing.height === layout.height
                ) {
                  return prev;
                }
                return { ...prev, [row.depth]: layout };
              });
            }}
          >
            {Array.from({ length: row.numOfNodes }).map((_, idx) => {
              const node = row.nodes[idx];
              const nodeInstanceId = makeNodeInstanceId(row.depth, idx, node);
              const isPlayerNode =
                row.depth === playerPosition.depth &&
                idx === playerPosition.nodeIndex;
              const isNextReachable =
                row.depth === nextBreakDepth &&
                allowedNextIndices.includes(idx);
              const canSelect =
                Boolean(node) && (isPlayerNode || isNextReachable);

              return (
                <Pressable
                  key={nodeInstanceId}
                  style={[
                    styles.node,
                    row.isBattle && styles.battleNode,
                    nodeInstanceId === selectedNodeId && styles.selectedNode,
                    isNextReachable && styles.reachableNode,
                    !canSelect && styles.disabledNode,
                  ]}
                  disabled={!canSelect}
                  onPress={() => {
                    if (!node || !canSelect || isPlayerNode) return;
                    setPlayerPosition({
                      depth: row.depth,
                      nodeIndex: idx,
                      nodeInstanceId,
                    });
                  }}
                  onLayout={(event) => {
                    if (!node) return;
                    const layout = event.nativeEvent.layout;
                    setNodeLayouts((prev) => {
                      const existing = prev[nodeInstanceId];
                      if (
                        existing &&
                        existing.layout.x === layout.x &&
                        existing.layout.y === layout.y &&
                        existing.layout.width === layout.width &&
                        existing.layout.height === layout.height
                      ) {
                        return prev;
                      }
                      return {
                        ...prev,
                        [nodeInstanceId]: { depth: row.depth, layout },
                      };
                    });
                  }}
                >
                  <MaterialCommunityIcons
                    name={node?.icon ?? "circle-slice-8"}
                    size={36}
                    color={isNextReachable ? "#ffffff" : "#000000"}
                  />
                </Pressable>
              );
            })}
          </View>
        ))}
        {playerVisible && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.playerIcon,
              { transform: playerXY.getTranslateTransform() },
            ]}
          >
            <MaterialCommunityIcons name="hiking" size={28} color="#0f172a" />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#02030a" },
  mapCanvas: { marginTop: 24, gap: 32, position: "relative" },
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
  selectedNode: { borderWidth: 3, borderColor: "#fbbf24" },
  reachableNode: { borderColor: "#ffffff" },
  disabledNode: {},
  playerIcon: {
    position: "absolute",
    width: PLAYER_ICON_SIZE,
    height: PLAYER_ICON_SIZE,
    borderRadius: PLAYER_ICON_SIZE / 2,
    backgroundColor: "#fde68a",
    borderWidth: 3,
    borderColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
  },
});

const getNodeCenter = (
  nodeInstanceId: string,
  nodeLayouts: Record<string, NodeLayout>,
  rowLayouts: Record<
    number,
    { x: number; y: number; width: number; height: number }
  >,
) => {
  const nodeInfo = nodeLayouts[nodeInstanceId];
  if (!nodeInfo) return null;
  const rowLayout = rowLayouts[nodeInfo.depth];
  if (!rowLayout) return null;
  const { x, y, width, height } = nodeInfo.layout;

  return {
    x: rowLayout.x + x + width / 2,
    y: rowLayout.y + y + height / 2,
  };
};
