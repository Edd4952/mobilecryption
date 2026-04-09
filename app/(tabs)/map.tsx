import { useGameRun } from "@/app/game-state";
import { CardView } from "@/components/card-view";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Line } from "react-native-svg";
import {
  type MapState,
  connectionResolvers,
  generateRandomMapState,
  makeNodeInstanceId,
  range,
} from "../map-generation";

type NodeLayout = {
  depth: number;
  layout: { x: number; y: number; width: number; height: number };
};

const PLAYER_ICON_SIZE = 48;
const ROUTE_AFTER_MOVE_DELAY_MS = 400;
const MAP_THEME_COLORS: Record<1 | 2 | 3, string> = {
  1: "#af721d",
  2: "#1daf57",
  3: "#5fbbd5",
};

const clampTargets = (targets: number[], toCount: number) =>
  Array.from(new Set(targets)).filter((index) => index >= 0 && index < toCount);
const fullMatrix = (fromCount: number, toCount: number) =>
  Array.from({ length: fromCount }, () => range(toCount));

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

const parseNodeInstanceId = (nodeInstanceId: string) => {
  const match = nodeInstanceId.match(/^(\d+)-(\d+)-/);
  if (!match) return null;

  return {
    depth: Number(match[1]),
    nodeIndex: Number(match[2]),
  };
};

export const sampleMapState: MapState = generateRandomMapState();

export default function MapScreen() {
  const router = useRouter();
  const {
    gameRun: { deck, map, mapThemeNumber, mapNumber, levelDifficulty },
    advanceToNextMap,
    setMapState,
  } = useGameRun();
  const lastCompletedMapNumberRef = useRef<number | null>(null);
  const [deckModalVisible, setDeckModalVisible] = useState(false);
  const swipeToDeckResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const { dx, dy } = gestureState;
          return Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy < -60) {
            setDeckModalVisible(true);
          }
        },
      }),
    [],
  );
  const orderedBreaks = useMemo(
    () => [...map.breaks].sort((a, b) => a.depth - b.depth),
    [map.breaks],
  );
  const firstOccupiedBreak = useMemo(
    () => orderedBreaks.find((br) => br.nodes.length > 0),
    [orderedBreaks],
  );
  const initialNode = firstOccupiedBreak?.nodes[0];

  const initialNodeInstanceId = initialNode
    ? makeNodeInstanceId(firstOccupiedBreak.depth, 0, initialNode)
    : undefined;

  const selectedNodeId = map.selectedNodeId ?? initialNodeInstanceId;
  const activeThemeColor = MAP_THEME_COLORS[mapThemeNumber];
  const playerPosition = useMemo(
    () =>
      map.playerPosition ?? {
        depth: firstOccupiedBreak?.depth ?? orderedBreaks[0]?.depth ?? 0,
        nodeIndex: 0,
        nodeInstanceId: initialNodeInstanceId,
      },
    [
      map.playerPosition,
      firstOccupiedBreak?.depth,
      orderedBreaks,
      initialNodeInstanceId,
    ],
  );

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
    if (map.playerPosition) return;
    setMapState((current) => ({
      ...current,
      currentDepth: playerPosition.depth,
      selectedNodeId: playerPosition.nodeInstanceId,
      playerPosition,
    }));
  }, [map.playerPosition, playerPosition, setMapState]);

  useFocusEffect(
    useCallback(() => {
      if (
        !map.selectedNodeId ||
        map.selectedNodeId === map.playerPosition.nodeInstanceId
      ) {
        return;
      }

      setMapState((current) => {
        if (
          !current.selectedNodeId ||
          current.selectedNodeId === current.playerPosition.nodeInstanceId
        ) {
          return current;
        }

        const parsedSelection = parseNodeInstanceId(current.selectedNodeId);
        if (!parsedSelection) {
          return current;
        }

        return {
          ...current,
          currentDepth: parsedSelection.depth,
          playerPosition: {
            depth: parsedSelection.depth,
            nodeIndex: parsedSelection.nodeIndex,
            nodeInstanceId: current.selectedNodeId,
          },
        };
      });
    }, [map.playerPosition.nodeInstanceId, map.selectedNodeId, setMapState]),
  );

  const [rowLayouts, setRowLayouts] = useState<
    Record<number, { x: number; y: number; width: number; height: number }>
  >({});
  const [nodeLayouts, setNodeLayouts] = useState<Record<string, NodeLayout>>(
    {},
  );
  const playerXY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const playerPlaced = useRef(false);
  const mapScrollRef = useRef<ScrollView>(null);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [mapViewportHeight, setMapViewportHeight] = useState(0);
  const [mapContentHeight, setMapContentHeight] = useState(0);

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

  const scrollToPlayer = useCallback(
    (nodeInstanceId?: string, animated = true) => {
      if (!nodeInstanceId || mapViewportHeight <= 0 || mapContentHeight <= 0) {
        return;
      }

      const target = computeTarget(nodeInstanceId);
      if (!target) return;

      const playerCenterY = target.y + PLAYER_ICON_SIZE / 2;
      const maxScrollY = Math.max(mapContentHeight - mapViewportHeight, 0);
      const desiredScrollY = Math.max(
        0,
        Math.min(playerCenterY - mapViewportHeight / 2, maxScrollY),
      );

      mapScrollRef.current?.scrollTo({ x: 0, y: desiredScrollY, animated });
    },
    [computeTarget, mapContentHeight, mapViewportHeight],
  );

  React.useEffect(() => {
    animateToNode(playerPosition.nodeInstanceId);
  }, [playerPosition.nodeInstanceId, animateToNode]);

  React.useEffect(() => {
    scrollToPlayer(playerPosition.nodeInstanceId, playerPlaced.current);
  }, [playerPosition.nodeInstanceId, scrollToPlayer, nodeLayouts, rowLayouts]);

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
            stroke={`${activeThemeColor}aa`}
            strokeWidth={5}
            strokeLinecap="round"
          />
        );
      })
      .filter(Boolean);
  }, [activeThemeColor, allConnections, nodeLayouts, rowLayouts]);

  const [mapCanvasLayout, setMapCanvasLayout] = useState({
    width: 0,
    height: 0,
  });

  useFocusEffect(
    useCallback(() => {
      const currentBreakIndex = depthToIndex[playerPosition.depth];
      if (currentBreakIndex === undefined) {
        return;
      }

      const currentBreak = orderedBreaks[currentBreakIndex];
      const currentNode = currentBreak?.nodes[playerPosition.nodeIndex];
      const isFinalBreak = currentBreakIndex === orderedBreaks.length - 1;
      const isMapComplete =
        Boolean(currentBreak) &&
        isFinalBreak &&
        Boolean(currentBreak.isBattle) &&
        currentNode?.id === "battle";

      if (!isMapComplete) {
        return;
      }

      if (lastCompletedMapNumberRef.current === mapNumber) {
        return;
      }

      lastCompletedMapNumberRef.current = mapNumber;
      advanceToNextMap();
    }, [
      advanceToNextMap,
      depthToIndex,
      mapNumber,
      orderedBreaks,
      playerPosition.depth,
      playerPosition.nodeIndex,
    ]),
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={mapScrollRef}
        style={styles.mapScroller}
        contentContainerStyle={styles.mapScrollerContent}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        {...swipeToDeckResponder.panHandlers}
        onLayout={(event) => {
          setMapViewportHeight(event.nativeEvent.layout.height);
        }}
        onContentSizeChange={(_, height) => {
          setMapContentHeight(height);
        }}
      >
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

          <View
            style={[styles.progressBadge, { borderColor: activeThemeColor }]}
          >
            <Text style={styles.progressBadgeText}>
              Map {mapNumber} - Difficulty {levelDifficulty}
            </Text>
          </View>

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
                      { backgroundColor: activeThemeColor },
                      row.isBattle && styles.battleNode,
                      nodeInstanceId === selectedNodeId && styles.selectedNode,
                      isNextReachable && styles.reachableNode,
                      !canSelect && styles.disabledNode,
                    ]}
                    disabled={!canSelect}
                    onPress={() => {
                      if (!node || !canSelect || isPlayerNode) return;
                      setMapState((current) => ({
                        ...current,
                        currentDepth: row.depth,
                        selectedNodeId: nodeInstanceId,
                      }));
                      if (row.isBattle) {
                        setTimeout(() => {
                          router.push("/(tabs)/battle");
                        }, ROUTE_AFTER_MOVE_DELAY_MS);
                      } else if (node.id === "campfire") {
                        setTimeout(() => {
                          router.push("/(tabs)/campfire");
                        }, ROUTE_AFTER_MOVE_DELAY_MS);
                      } else if (node.id === "trinket" || node.id === "gift") {
                        setTimeout(() => {
                          router.push("/(tabs)/trinket");
                        }, ROUTE_AFTER_MOVE_DELAY_MS);
                      } else if (node.id === "newcard") {
                        router.push("/(tabs)/newcard");
                      } else if (node.id === "newcardCost") {
                        router.push("/(tabs)/newcardCost");
                      } else if (node.id === "newcardClass") {
                        setTimeout(() => {
                          router.push("/(tabs)/newcardClass");
                        }, ROUTE_AFTER_MOVE_DELAY_MS);
                      } else if (node.id === "sacrifice") {
                        setTimeout(() => {
                          router.push("/(tabs)/sacrifice");
                        }, ROUTE_AFTER_MOVE_DELAY_MS);
                      } else if (node.id === "totem") {
                        setTimeout(() => {
                          router.push("/(tabs)/totem");
                        }, ROUTE_AFTER_MOVE_DELAY_MS);
                      }
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
                    {node?.iconLibrary === "MaterialIcons" ? (
                      <MaterialIcons
                        name={
                          (node?.icon as keyof typeof MaterialIcons.glyphMap) ??
                          "help-outline"
                        }
                        size={36}
                        color={isNextReachable ? "#ffffff" : "#000000"}
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name={
                          (node?.icon as keyof typeof MaterialCommunityIcons.glyphMap) ??
                          "circle-slice-8"
                        }
                        size={36}
                        color={isNextReachable ? "#ffffff" : "#000000"}
                      />
                    )}
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
      </ScrollView>

      <View style={styles.menuOverlay} pointerEvents="box-none">
        <Pressable style={styles.menuButton} onPress={() => router.push("/")}>
          <MaterialCommunityIcons
            name="menu"
            size={36}
            color={activeThemeColor}
          />
        </Pressable>
      </View>

      {/* Deck Modal */}
      <Modal
        visible={deckModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeckModalVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setDeckModalVisible(false)}
          />
          <View style={styles.modalCard}>
            <ScrollView
              contentContainerStyle={styles.deckGrid}
              showsVerticalScrollIndicator={false}
            >
              {deck.map((card, idx) => (
                <View key={`${card.name}-${idx}`} style={styles.deckItem}>
                  <CardView card={card} width={110} />
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#02030a",
  },
  mapScroller: { flex: 1 },
  mapScrollerContent: { flexGrow: 1 },
  menuOverlay: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 10,
    elevation: 10,
  },
  menuButton: {
    padding: 2,
  },
  mapCanvas: { gap: 32, position: "relative", paddingBottom: 24 },
  progressBadge: {
    alignSelf: "center",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderRadius: 999,
    backgroundColor: "rgba(2, 3, 10, 0.8)",
  },
  progressBadgeText: {
    color: "#ffffff",
    fontWeight: "700",
    letterSpacing: 0.3,
  },
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
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalCard: {
    width: "88%",
    maxHeight: "75%",
    backgroundColor: "#0b1222",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#f59e0b",
    padding: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: {
    color: "#ffffff",
  },
  closeButton: {
    padding: 6,
  },
  deckGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  deckItem: {
    marginBottom: 10,
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
