import { Redirect } from "expo-router";
import { useAuth } from "@/lib/use-auth";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { user, loading, configured } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0B0B0E" }}>
        <ActivityIndicator size="large" color="#F24E4E" />
      </View>
    );
  }

  if (user && configured) return <Redirect href="/(tabs)/assistindo" />;
  return <Redirect href="/login" />;
}
