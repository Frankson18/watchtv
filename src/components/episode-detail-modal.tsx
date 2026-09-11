import { Modal, View, Text, ScrollView, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StarRating from "./star-rating";
import ScalePressable from "./scale-pressable";
import { stillUrl } from "@/lib/tmdb-config";

export default function EpisodeDetailModal({
  visible,
  onClose,
  showTitle,
  season,
  episode,
  name,
  overview,
  runtime,
  airDate,
  stillPath,
  watched,
  watchCount,
  rating,
  onToggleWatched,
  onRewatch,
  onRate,
}: {
  visible: boolean;
  onClose: () => void;
  showTitle: string;
  season: number;
  episode: number;
  name: string;
  overview: string;
  runtime: number | null;
  airDate: string | null;
  stillPath: string | null;
  watched: boolean;
  watchCount: number;
  rating: number;
  onToggleWatched: () => void;
  onRewatch: () => void;
  onRate: (value: number) => void;
}) {
  const still = stillUrl(stillPath, "w300");
  const dateFmt = airDate
    ? new Date(airDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "Data desconhecida";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable
          style={{ backgroundColor: "#161619", borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "88%", overflow: "hidden" }}
          onPress={(e) => e.stopPropagation?.()}
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={{ height: 200, backgroundColor: "#1F1F24" }}>
              {still ? (
                <Image
                  source={typeof still === "number" ? still : { uri: still }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : null}
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={{ position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(11,11,14,0.7)", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="close" size={20} color="#F5F5F7" />
              </Pressable>
            </View>

            <View style={{ padding: 20, gap: 16 }}>
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#6A6A72" }} numberOfLines={1}>{showTitle}</Text>
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#F5F5F7" }}>
                  T{String(season).padStart(2, "0")} · E{String(episode).padStart(2, "0")} — {name}
                </Text>
                <Text style={{ fontSize: 12, color: "#A8A8B0" }}>
                  {dateFmt}{runtime ? ` · ${runtime} min` : ""}{watchCount > 1 ? ` · visto ${watchCount}x` : ""}
                </Text>
              </View>

              {overview ? (
                <Text style={{ fontSize: 14, color: "#A8A8B0", lineHeight: 20 }}>{overview}</Text>
              ) : (
                <Text style={{ fontSize: 14, color: "#6A6A72" }}>Sem sinopse para este episódio.</Text>
              )}

              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", letterSpacing: 0.4, color: "#6A6A72" }}>SUA AVALIAÇÃO</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <StarRating value={rating} onChange={onRate} />
                  {rating > 0 && <Text style={{ fontSize: 13, color: "#A8A8B0" }}>{rating.toFixed(1)}</Text>}
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <ScalePressable
                  onPress={onToggleWatched}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: watched ? "#1F1F24" : "#F24E4E", borderWidth: 1, borderColor: watched ? "#2A2A30" : "#F24E4E" }}
                >
                  <Ionicons name={watched ? "close-circle-outline" : "checkmark-circle"} size={18} color={watched ? "#A8A8B0" : "#F5F5F7"} />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: watched ? "#A8A8B0" : "#F5F5F7" }}>
                    {watched ? "Desmarcar" : "Marcar assistido"}
                  </Text>
                </ScalePressable>
                {watched && (
                  <ScalePressable
                    onPress={onRewatch}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: "#1F1F24", borderWidth: 1, borderColor: "#2A2A30" }}
                  >
                    <Ionicons name="refresh" size={16} color="#F24E4E" />
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#F24E4E" }}>Revisto</Text>
                  </ScalePressable>
                )}
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
