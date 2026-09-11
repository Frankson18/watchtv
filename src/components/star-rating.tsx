import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function StarRating({
  value,
  onChange,
  size = 26,
  color = "#F5A623",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  color?: string;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={onChange ? () => onChange(star) : undefined}
          disabled={!onChange}
          hitSlop={6}
        >
          <Ionicons
            name={value >= star ? "star" : "star-outline"}
            size={size}
            color={value >= star ? color : "#4A4A52"}
          />
        </Pressable>
      ))}
    </View>
  );
}
