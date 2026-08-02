import { Image, View, Text } from "react-native";
import { posterUrl } from "@/lib/tmdb-config";

export default function Poster({
  path,
  alt,
  size = "w185",
  style,
}: {
  path: string | null;
  alt: string;
  size?: "w92" | "w154" | "w185" | "w342" | "w500";
  style?: any;
}) {
  const src = posterUrl(path, size);
  if (!src) {
    return (
      <View
        style={[
          {
            backgroundColor: "#1F1F24",
            borderRadius: 6,
            justifyContent: "center",
            alignItems: "center",
            padding: 8,
          },
          style,
        ]}
      >
        <Text style={{ fontSize: 10, color: "#6A6A72", textAlign: "center" }}>
          {alt.slice(0, 24) || "—"}
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={typeof src === "number" ? src : { uri: src }}
      alt={alt}
      style={[{ borderRadius: 6 }, style]}
    />
  );
}