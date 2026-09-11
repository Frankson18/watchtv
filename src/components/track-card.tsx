import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Image, Pressable, Alert } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { markEpisode } from "@/lib/library";
import { posterUrl } from "@/lib/tmdb-config";
import type { LibraryItem } from "@/lib/types";

const CARD_H = 112;
const REVEAL = 88;
const BTN = 42;
const BTN_TOP = (CARD_H - BTN) / 2;
const SPRING = { damping: 18, stiffness: 220, mass: 0.6 };

function TrackCard({
  item, epTitle, totalEps, watchedCount, seasonNumber, displayEpisode, nextSeason, nextEpisode, onUpdated, hideCheck,
}: {
  item: LibraryItem;
  epTitle?: string;
  totalEps?: number;
  watchedCount?: number;
  seasonNumber?: number;
  displayEpisode?: number;
  nextSeason?: number;
  nextEpisode?: number;
  onUpdated?: () => void;
  hideCheck?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(false);
  const [success, setSuccess] = useState(false);
  const [optimisticEp, setOptimisticEp] = useState<number | null>(null);

  const translateX = useSharedValue(0);
  const successAnim = useSharedValue(0);

  const ep = optimisticEp ?? displayEpisode ?? watchedCount ?? item.current_episode;

  useEffect(() => {
    setOptimisticEp(null);
  }, [item.current_episode, watchedCount]);

  const doConfirm = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPop(true);
    setSuccess(true);
    successAnim.value = 0;
    successAnim.value = withTiming(1, { duration: 140 });
    setTimeout(() => setPop(false), 350);
    setTimeout(() => {
      successAnim.value = withTiming(0, { duration: 180 }, (finished) => {
        if (finished) runOnJS(setSuccess)(false);
      });
    }, 1200);
    const watched = watchedCount ?? item.current_episode;
    try {
      const season = nextSeason ?? item.current_season;
      const episode = nextEpisode ?? watched + 1;
      setOptimisticEp(episode);
      await markEpisode(item.id, season, episode, item.tmdb_id);
      onUpdated?.();
    } catch {
      setOptimisticEp(null);
      Alert.alert("Erro", "Não foi possível marcar o episódio. Verifique sua conexão.");
    } finally {
      setBusy(false);
    }
  }, [busy, item, watchedCount, nextSeason, nextEpisode, onUpdated, successAnim]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!hideCheck)
        .activeOffsetX([-12, 12])
        .failOffsetY([-14, 14])
        .onUpdate((e) => {
          translateX.value = Math.min(0, Math.max(-REVEAL, e.translationX));
        })
        .onEnd((e) => {
          if (e.translationX < -REVEAL * 0.5 || e.velocityX < -600) {
            translateX.value = withTiming(-REVEAL, { duration: 110 }, (finished) => {
              if (finished) {
                runOnJS(doConfirm)();
                translateX.value = withSpring(0, SPRING);
              }
            });
          } else {
            translateX.value = withSpring(0, SPRING);
          }
        }),
    [hideCheck, doConfirm, translateX],
  );

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const revealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-REVEAL, -8, 0], [1, 0.35, 0], Extrapolation.CLAMP),
  }));

  const successStyle = useAnimatedStyle(() => ({
    opacity: successAnim.value,
    transform: [{ scale: 0.96 + 0.04 * successAnim.value }],
  }));

  const s = seasonNumber ?? item.current_season;
  const meta = `S${String(s).padStart(2, "0")} E${String(ep).padStart(2, "0")}${totalEps ? `  ·  ${ep}/${totalEps}` : ""}`;
  const src = posterUrl(item.poster_path, "w185");

  return (
    <View style={{ position: "relative", height: CARD_H, borderRadius: 12, overflow: "hidden" }}>
      {success && (
        <Animated.View style={[{
          position: "absolute", inset: 0,
          backgroundColor: "#2A4A26",
          flexDirection: "row", alignItems: "center", justifyContent: "flex-end",
          paddingRight: 20, gap: 10, zIndex: 10,
        }, successStyle]}>
          <Ionicons name="checkmark-circle" size={28} color="#5BD68F" />
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#5BD68F" }}>Assistido</Text>
        </Animated.View>
      )}

      {!hideCheck && (
        <Animated.View
          pointerEvents="none"
          style={[{
            position: "absolute", inset: 0,
            backgroundColor: "#2A4A26",
            flexDirection: "row", alignItems: "center", justifyContent: "flex-end",
            paddingRight: 20, gap: 8,
          }, revealStyle]}
        >
          <Ionicons name="checkmark-circle" size={26} color="#5BD68F" />
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#5BD68F" }}>Assistido</Text>
        </Animated.View>
      )}

      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[{
            flexDirection: "row", gap: 12, padding: 8,
            backgroundColor: "#161619",
            borderRadius: 12, borderWidth: 1, borderColor: "#2A2A30",
            height: CARD_H, width: "100%",
          }, cardStyle]}
        >
          <Pressable onPress={() => router.push(`/titulo/${item.tmdb_id}`)} style={{ width: 90, height: "100%", borderRadius: 10, overflow: "hidden", backgroundColor: "#1F1F24" }}>
            {src && <Image source={typeof src === "number" ? src : { uri: src }} style={{ width: "100%", height: "100%" }} />}
          </Pressable>
          <Pressable onPress={() => router.push(`/titulo/${item.tmdb_id}`)} style={{ flex: 1, justifyContent: "center", gap: 5, paddingRight: hideCheck ? 16 : 56 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: pop ? "#5BD68F" : "#F5F5F7" }} numberOfLines={1}>{item.title}</Text>
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#A8A8B0" }}>{meta}</Text>
            {epTitle && <Text style={{ fontSize: 13, color: "#6A6A72" }} numberOfLines={1}>{epTitle}</Text>}
          </Pressable>
          {!hideCheck && (
            <Pressable
              onPress={doConfirm}
              disabled={busy}
              hitSlop={8}
              android_ripple={{ color: "rgba(242,78,78,0.25)", borderless: false }}
              style={{
                position: "absolute", right: 12, top: BTN_TOP,
                width: BTN, height: BTN, borderRadius: BTN / 2,
                borderWidth: 2, borderColor: "#F24E4E",
                backgroundColor: pop ? "rgba(91,214,143,0.15)" : "transparent",
                justifyContent: "center", alignItems: "center",
                overflow: "hidden",
              }}
            >
              <Ionicons name="checkmark" size={20} color={pop ? "#5BD68F" : "#F24E4E"} />
            </Pressable>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default memo(TrackCard, (a, b) =>
  a.item.id === b.item.id &&
  a.item.current_episode === b.item.current_episode &&
  a.item.current_season === b.item.current_season &&
  a.item.last_watched_at === b.item.last_watched_at &&
  a.item.title === b.item.title &&
  a.item.poster_path === b.item.poster_path &&
  a.epTitle === b.epTitle &&
  a.totalEps === b.totalEps &&
  a.watchedCount === b.watchedCount &&
  a.seasonNumber === b.seasonNumber &&
  a.displayEpisode === b.displayEpisode &&
  a.nextSeason === b.nextSeason &&
  a.nextEpisode === b.nextEpisode &&
  a.hideCheck === b.hideCheck &&
  a.onUpdated === b.onUpdated,
);
