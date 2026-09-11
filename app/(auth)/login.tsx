import { useState } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { createClient } from "@/lib/supabase";
import ScalePressable from "@/components/scale-pressable";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sb = createClient();

  async function submit() {
    setError(null);
    if (!sb) {
      setError("Supabase não configurado.");
      return;
    }
    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    router.replace("/(tabs)/assistindo");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: "#0B0B0E" }}
    >
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: "#F24E4E",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: "800", color: "#F5F5F7" }}>W</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#F5F5F7", marginTop: 8 }}>
            Entrar
          </Text>
          <Text style={{ fontSize: 14, color: "#A8A8B0", marginTop: 4 }}>
            Bem-vindo de volta ao seu tracking
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, color: "#A8A8B0", fontWeight: "500" }}>E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="voce@email.com"
              placeholderTextColor="#6A6A72"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                backgroundColor: "#161619",
                borderWidth: 1,
                borderColor: "#2A2A30",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: "#F5F5F7",
                fontSize: 14,
              }}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, color: "#A8A8B0", fontWeight: "500" }}>Senha</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#6A6A72"
              secureTextEntry
              style={{
                backgroundColor: "#161619",
                borderWidth: 1,
                borderColor: "#2A2A30",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: "#F5F5F7",
                fontSize: 14,
              }}
            />
          </View>

          {error && <Text style={{ color: "#F24E4E", fontSize: 14 }}>{error}</Text>}

          <ScalePressable
            onPress={submit}
            disabled={busy}
            style={{
              backgroundColor: "#F24E4E",
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              opacity: busy ? 0.5 : 1,
            }}
          >
            <Text style={{ color: "#F5F5F7", fontSize: 14, fontWeight: "600" }}>
              {busy ? "Entrando…" : "Entrar"}
            </Text>
          </ScalePressable>

          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text style={{ color: "#A8A8B0", fontSize: 14, textAlign: "center" }}>
              Não tem conta?{" "}
              <Text style={{ color: "#F24E4E", fontWeight: "500" }}>Criar agora</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}