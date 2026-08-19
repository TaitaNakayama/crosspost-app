import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createPost,
  listAccounts,
  type ConnectedAccount,
  type Post,
} from "../src/api";

// TODO: comes from the session once auth exists.
const USER_ID = "dev-user";

const PLATFORM_LABELS: Record<ConnectedAccount["platform"], string> = {
  x: "X",
  threads: "Threads",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
};

export default function Composer() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Post | null>(null);

  useEffect(() => {
    listAccounts(USER_ID)
      .then(setAccounts)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const post = await createPost(USER_ID, {
        caption,
        connectedAccountIds: [...selected],
      });
      setResult(post);
      setCaption("");
      setSelected(new Set());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [caption, selected]);

  const canSubmit = caption.trim() !== "" && selected.size > 0 && !submitting;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Shared caption across every target in v1 — no per-account override. */}
      <TextInput
        style={styles.caption}
        placeholder="What are you posting?"
        value={caption}
        onChangeText={setCaption}
        multiline
        textAlignVertical="top"
      />

      <Text style={styles.heading}>Post to</Text>

      {loading ? (
        <ActivityIndicator />
      ) : accounts.length === 0 ? (
        <Text style={styles.empty}>No connected accounts yet.</Text>
      ) : (
        // Each account is its own row. Two X accounts are two entries, never one
        // collapsed "X" toggle.
        accounts.map((account) => {
          const isSelected = selected.has(account.id);
          const disabled = account.status !== "active";
          return (
            <Pressable
              key={account.id}
              onPress={() => !disabled && toggle(account.id)}
              style={[
                styles.account,
                isSelected && styles.accountSelected,
                disabled && styles.accountDisabled,
              ]}
            >
              <View style={styles.accountText}>
                <Text style={styles.accountHandle}>
                  {account.handle ?? account.displayName ?? account.id}
                </Text>
                <Text style={styles.accountPlatform}>
                  {PLATFORM_LABELS[account.platform]}
                  {disabled ? " · needs reconnecting" : ""}
                </Text>
              </View>
              <Text style={styles.check}>{isSelected ? "✓" : ""}</Text>
            </Pressable>
          );
        })
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        onPress={submit}
        disabled={!canSubmit}
        style={[styles.submit, !canSubmit && styles.submitDisabled]}
      >
        <Text style={styles.submitText}>
          {submitting ? "Queueing…" : `Post to ${selected.size || "…"}`}
        </Text>
      </Pressable>

      {/* Status is reported per account, never as one rolled-up result. */}
      {result ? (
        <View style={styles.results}>
          <Text style={styles.heading}>Queued</Text>
          {result.targets.map((target) => (
            <Text key={target.id} style={styles.resultRow}>
              {target.connectedAccountId} · {target.status}
              {target.errorMessage ? ` · ${target.errorMessage}` : ""}
            </Text>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, maxWidth: 640, width: "100%", alignSelf: "center" },
  caption: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  heading: { fontSize: 13, fontWeight: "600", color: "#71717a", textTransform: "uppercase" },
  empty: { color: "#71717a" },
  account: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 12,
    padding: 12,
  },
  accountSelected: { borderColor: "#18181b", backgroundColor: "#fafafa" },
  accountDisabled: { opacity: 0.5 },
  accountText: { gap: 2 },
  accountHandle: { fontSize: 15, fontWeight: "500" },
  accountPlatform: { fontSize: 13, color: "#71717a" },
  check: { fontSize: 16, fontWeight: "700" },
  error: { color: "#b91c1c" },
  submit: {
    backgroundColor: "#18181b",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  results: { gap: 4 },
  resultRow: { fontSize: 13, color: "#3f3f46" },
});
