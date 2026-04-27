import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { canEdit, RoundSnapshotPayload } from "./src/contract";
import { buildSeasonLeaderboard } from "./src/leaderboard";
import { applyHoleScores, createRoundSnapshot } from "./src/round";
import { listSnapshots, saveSnapshot } from "./src/storage";
import { summarizeSettlement } from "./src/settlement";

type Screen = "create" | "resume" | "score" | "settlement" | "leaderboard";

const CURRENT_USER_ID = process.env.EXPO_PUBLIC_ROUND_USER_ID?.trim() || "local-device";

function parsePositiveInt(input: string): number {
  const value = Number(input);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function nextHoleToScore(snapshot: RoundSnapshotPayload): number {
  const playerIds = snapshot.players.map((player) => String(player.id ?? "")).filter(Boolean);
  if (!playerIds.length) return 1;
  for (let hole = 1; hole <= 18; hole += 1) {
    const entered = new Set(
      snapshot.holeScores
        .filter((row) => Number(row.holeNumber) === hole)
        .map((row) => String(row.playerId ?? ""))
    );
    if (!playerIds.every((playerId) => entered.has(playerId))) return hole;
  }
  return 18;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("create");
  const [snapshots, setSnapshots] = useState<RoundSnapshotPayload[]>([]);
  const [currentRound, setCurrentRound] = useState<RoundSnapshotPayload | null>(null);
  const [courseName, setCourseName] = useState("Old Westbury");
  const [teeBoxId, setTeeBoxId] = useState("Blue");
  const [playerNames, setPlayerNames] = useState(["Player 1", "Player 2", "Player 3", "Player 4"]);
  const [holeNumber, setHoleNumber] = useState(1);
  const [holeInputs, setHoleInputs] = useState<Record<string, string>>({});

  const settlement = useMemo(() => (currentRound ? summarizeSettlement(currentRound) : null), [currentRound]);
  const leaderboard = useMemo(() => buildSeasonLeaderboard(snapshots), [snapshots]);

  async function refreshSnapshots(): Promise<void> {
    const rows = await listSnapshots(CURRENT_USER_ID);
    setSnapshots(rows);
  }

  useEffect(() => {
    void refreshSnapshots();
  }, []);

  useEffect(() => {
    if (!currentRound) return;
    const next: Record<string, string> = {};
    for (const player of currentRound.players) {
      const playerId = String(player.id ?? "");
      const row = currentRound.holeScores.find(
        (score) => Number(score.holeNumber) === holeNumber && String(score.playerId ?? "") === playerId
      );
      next[playerId] = typeof row?.grossScore === "number" ? String(row.grossScore) : "";
    }
    setHoleInputs(next);
  }, [currentRound, holeNumber]);

  async function handleCreateRound(): Promise<void> {
    const round = createRoundSnapshot({
      currentUserId: CURRENT_USER_ID,
      courseName,
      teeBoxId,
      playerNames
    });
    await saveSnapshot(round);
    setCurrentRound(round);
    setHoleNumber(1);
    setScreen("score");
    await refreshSnapshots();
  }

  async function handleSaveHole(): Promise<void> {
    if (!currentRound) return;
    if (!canEdit(currentRound, CURRENT_USER_ID)) {
      Alert.alert("Read Only", "You can view this round but cannot edit it.");
      return;
    }

    const inputs = currentRound.players.map((player) => ({
      playerId: String(player.id ?? ""),
      grossScore: parsePositiveInt(holeInputs[String(player.id ?? "")] ?? "")
    }));

    if (inputs.some((input) => input.grossScore <= 0)) {
      Alert.alert("Missing Scores", `Enter positive gross scores for all players on hole ${holeNumber}.`);
      return;
    }

    const next = applyHoleScores(currentRound, holeNumber, inputs);
    await saveSnapshot(next);
    setCurrentRound(next);
    if (holeNumber < 18) setHoleNumber(holeNumber + 1);
    await refreshSnapshots();
  }

  async function handleShareSettlement(): Promise<void> {
    if (!settlement) return;
    await Share.share({
      title: "Settlement",
      message: settlement.textMessage
    });
  }

  function renderCreate(): React.ReactNode {
    return (
      <View style={styles.card}>
        <Text style={styles.h2}>Create Round</Text>
        <TextInput value={courseName} onChangeText={setCourseName} style={styles.input} placeholder="Course name" />
        <TextInput value={teeBoxId} onChangeText={setTeeBoxId} style={styles.input} placeholder="Tee box" />
        {playerNames.map((playerName, idx) => (
          <TextInput
            key={`player-${idx + 1}`}
            value={playerName}
            onChangeText={(text) => {
              const next = [...playerNames];
              next[idx] = text;
              setPlayerNames(next);
            }}
            style={styles.input}
            placeholder={`Player ${idx + 1}`}
          />
        ))}
        <Pressable onPress={() => void handleCreateRound()} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Create Round</Text>
        </Pressable>
      </View>
    );
  }

  function renderResume(): React.ReactNode {
    return (
      <View style={styles.card}>
        <Text style={styles.h2}>Resume Round</Text>
        {!snapshots.length ? <Text style={styles.muted}>No saved rounds yet.</Text> : null}
        {snapshots.map((snapshot) => (
          <Pressable
            key={snapshot.roundId}
            style={styles.listRow}
            onPress={() => {
              setCurrentRound(snapshot);
              setHoleNumber(nextHoleToScore(snapshot));
              setScreen("score");
            }}
          >
            <Text style={styles.listRowTitle}>{snapshot.roundMetadata.courseName}</Text>
            <Text style={styles.muted}>{snapshot.roundId}</Text>
            <Text style={styles.muted}>{snapshot.status === "complete" ? "Completed" : "In Progress"}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  function renderScore(): React.ReactNode {
    if (!currentRound) {
      return (
        <View style={styles.card}>
          <Text style={styles.h2}>Score Round</Text>
          <Text style={styles.muted}>Create or resume a round first.</Text>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.h2}>Score Round</Text>
        <Text style={styles.muted}>{currentRound.roundMetadata.courseName}</Text>
        <Text style={styles.muted}>{currentRound.roundId}</Text>
        <View style={styles.rowBetween}>
          <Pressable style={styles.secondaryBtn} onPress={() => setHoleNumber((prev) => Math.max(1, prev - 1))}>
            <Text style={styles.secondaryBtnText}>Prev</Text>
          </Pressable>
          <Text style={styles.holeLabel}>Hole {holeNumber}</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => setHoleNumber((prev) => Math.min(18, prev + 1))}>
            <Text style={styles.secondaryBtnText}>Next</Text>
          </Pressable>
        </View>
        {currentRound.players.map((player) => {
          const playerId = String(player.id ?? "");
          return (
            <View key={playerId} style={styles.scoreRow}>
              <Text style={styles.scoreName}>{String(player.name ?? playerId)}</Text>
              <TextInput
                style={styles.scoreInput}
                keyboardType="number-pad"
                value={holeInputs[playerId] ?? ""}
                onChangeText={(text) => setHoleInputs((prev) => ({ ...prev, [playerId]: text.replace(/[^0-9]/g, "") }))}
                placeholder="Gross"
              />
            </View>
          );
        })}
        <Pressable onPress={() => void handleSaveHole()} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Save Hole</Text>
        </Pressable>
        <Text style={styles.muted}>Status: {currentRound.status}</Text>
      </View>
    );
  }

  function renderSettlement(): React.ReactNode {
    if (!currentRound || !settlement) {
      return (
        <View style={styles.card}>
          <Text style={styles.h2}>Settlement</Text>
          <Text style={styles.muted}>Create or resume a round first.</Text>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.h2}>Settlement</Text>
        {settlement.teamRows.map((row) => (
          <Text key={row.teamName} style={styles.rowText}>
            {row.teamName}: {row.outcome} ({row.points} pts)
          </Text>
        ))}

        <Text style={styles.sectionTitle}>Player Junk Totals</Text>
        {settlement.junkRows.length ? settlement.junkRows.map((row) => <Text key={row.playerName}>{row.playerName}: +{row.points}</Text>) : <Text style={styles.muted}>None</Text>}

        <Text style={styles.sectionTitle}>CP Winners</Text>
        {settlement.cpRows.length ? settlement.cpRows.map((row) => <Text key={row.playerName}>{row.playerName}: +{row.points}</Text>) : <Text style={styles.muted}>None</Text>}

        <Text style={styles.sectionTitle}>Press Results</Text>
        {settlement.pressRows.length ? settlement.pressRows.map((row, idx) => <Text key={`press-${idx}`}>{row}</Text>) : <Text style={styles.muted}>None</Text>}

        <Text style={styles.sectionTitle}>Text Message Format</Text>
        <Text style={styles.messagePreview}>{settlement.textMessage}</Text>

        <Pressable onPress={() => void handleShareSettlement()} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Share Settlement Summary</Text>
        </Pressable>
      </View>
    );
  }

  function renderLeaderboard(): React.ReactNode {
    return (
      <View style={styles.card}>
        <Text style={styles.h2}>Season Leaderboard</Text>
        {!leaderboard.length ? <Text style={styles.muted}>No junk/CP points yet.</Text> : null}
        {leaderboard.map((row, idx) => (
          <Text key={row.playerId}>
            {idx + 1}. {row.playerName} - {row.junkPoints}
          </Text>
        ))}
      </View>
    );
  }

  const content =
    screen === "create"
      ? renderCreate()
      : screen === "resume"
        ? renderResume()
        : screen === "score"
          ? renderScore()
          : screen === "settlement"
            ? renderSettlement()
            : renderLeaderboard();

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Golf App Mobile (Expo)</Text>
        <Text style={styles.subTitle}>Contract v1 | User: {CURRENT_USER_ID}</Text>
      </View>
      <View style={styles.nav}>
        {(["create", "resume", "score", "settlement", "leaderboard"] as Screen[]).map((item) => (
          <Pressable key={item} onPress={() => setScreen(item)} style={[styles.navBtn, screen === item ? styles.navBtnActive : null]}>
            <Text style={[styles.navText, screen === item ? styles.navTextActive : null]}>{item.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.container}>{content}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f4f7f6" },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: "700", color: "#18322f" },
  subTitle: { fontSize: 12, color: "#486762", marginTop: 4 },
  nav: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  navBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#dfe9e6" },
  navBtnActive: { backgroundColor: "#1f7a43" },
  navText: { fontSize: 11, fontWeight: "600", color: "#2b4742" },
  navTextActive: { color: "#ffffff" },
  container: { padding: 12, paddingBottom: 24 },
  card: { backgroundColor: "#ffffff", borderRadius: 12, borderWidth: 1, borderColor: "#d8e3df", padding: 14, gap: 10 },
  h2: { fontSize: 18, fontWeight: "700", color: "#16302c" },
  input: {
    borderWidth: 1,
    borderColor: "#b6c9c1",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fbfdfc"
  },
  primaryBtn: {
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: "#1f7a43",
    alignItems: "center"
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#5f7078"
  },
  secondaryBtnText: { color: "#fff", fontWeight: "600" },
  muted: { color: "#56716c", fontSize: 12 },
  listRow: {
    borderWidth: 1,
    borderColor: "#d8e3df",
    borderRadius: 10,
    padding: 10,
    gap: 4,
    backgroundColor: "#fbfdfc"
  },
  listRowTitle: { fontWeight: "700", color: "#17332f" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  holeLabel: { fontSize: 16, fontWeight: "700", color: "#17332f" },
  scoreRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  scoreName: { flex: 1, color: "#1b3733" },
  scoreInput: {
    width: 88,
    borderWidth: 1,
    borderColor: "#b6c9c1",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#fbfdfc"
  },
  rowText: { color: "#1c3733", fontWeight: "600" },
  sectionTitle: { marginTop: 6, fontWeight: "700", color: "#17332f" },
  messagePreview: {
    borderWidth: 1,
    borderColor: "#d8e3df",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#f8fbfa",
    color: "#1b3733"
  }
});
