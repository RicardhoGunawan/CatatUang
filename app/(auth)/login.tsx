import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons"; // Menggunakan Ionicons dari Expo

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Mohon isi email dan password");
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert("Error", "Format email tidak valid");
      return;
    }

    try {
      setIsLoading(true);
      await login(email, password);
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Login Gagal", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const navigateToRegister = () => {
    router.push("/(auth)/register");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Image
              source={require("../../assets/images/wallet.png")}
              style={styles.logoContainer}
              resizeMode="contain"
            />
            <Text style={styles.title}>CatatUang</Text>
            <Text style={styles.subtitle}>Masuk ke akun Anda</Text>
          </View>
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#7f8c8d"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.inputWithIcon}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Masukkan email Anda"
                  placeholderTextColor="#a0a0a0"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#7f8c8d"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.inputWithIcon}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Masukkan password Anda"
                  placeholderTextColor="#a0a0a0"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#7f8c8d"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.buttonText, { marginLeft: 8 }]}>
                    Memproses...
                  </Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Masuk</Text>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Belum punya akun? </Text>
              <TouchableOpacity
                onPress={navigateToRegister}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.linkText}>Daftar sekarang</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 15,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    fontWeight: "400",
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fafafa",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputWithIcon: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    color: "#2c3e50",
  },
  eyeButton: {
    padding: 8,
    marginLeft: 8,
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#007AFF",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: "#a0a0a0",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: "#7f8c8d",
    fontWeight: "400",
  },
  linkText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
