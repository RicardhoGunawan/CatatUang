import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { authAPI } from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SuccessModal from "../../components/SuccessModal";

interface OtpVerificationScreenProps {
  email?: string;
  fromRegistration?: boolean;
}

export default function OtpVerificationScreen() {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  const fromRegistration = params.fromRegistration === "true";

  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Start countdown timer untuk resend OTP
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto focus ke input berikutnya
      if (value !== "" && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join("");
    
    if (otpCode.length !== 6) {
      Alert.alert("Error", "Mohon masukkan kode OTP 6 digit");
      return;
    }

    try {
      setIsLoading(true);
      const response = await authAPI.verifyEmailOtp(otpCode);
      
      if (response.status === "success") {
        // Update user data di AsyncStorage
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
        
        // Tampilkan modal sukses
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Verifikasi OTP gagal";
      Alert.alert("Verifikasi Gagal", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setIsResending(true);
      const response = await authAPI.resendOtp();
      
      if (response.status === "success") {
        setCountdown(60); // Set countdown 60 detik
        setOtp(["", "", "", "", "", ""]); // Reset OTP input
        Alert.alert("Berhasil", "Kode OTP baru telah dikirim ke email Anda");
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Gagal mengirim ulang OTP";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Redirect ke halaman login jika dari registrasi, atau ke halaman sebelumnya
    if (fromRegistration) {
      router.replace("/(auth)/login");
    } else {
      router.back();
    }
  };

  const isOtpComplete = otp.every(digit => digit !== "");

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
            <View style={styles.iconContainer}>
              <Ionicons name="mail-outline" size={48} color="#007AFF" />
            </View>
            <Text style={styles.title}>Verifikasi Email</Text>
            <Text style={styles.subtitle}>
              Masukkan kode OTP 6 digit yang telah dikirim ke email:
            </Text>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          <View style={styles.form}>
            {/* OTP Input */}
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[
                    styles.otpInput,
                    digit !== "" && styles.otpInputFilled,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                  editable={!isLoading}
                />
              ))}
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (!isOtpComplete || isLoading) && styles.verifyButtonDisabled,
              ]}
              onPress={handleVerifyOtp}
              disabled={!isOtpComplete || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.verifyButtonText, { marginLeft: 8 }]}>
                    Memverifikasi...
                  </Text>
                </View>
              ) : (
                <Text style={styles.verifyButtonText}>Verifikasi</Text>
              )}
            </TouchableOpacity>

            {/* Resend OTP */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Tidak menerima kode? </Text>
              {countdown > 0 ? (
                <Text style={styles.countdownText}>
                  Kirim ulang dalam {countdown}s
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={isResending}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resendButtonText}>
                    {isResending ? "Mengirim..." : "Kirim Ulang"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={16} color="#7f8c8d" />
              <Text style={styles.backButtonText}>Kembali</Text>
            </TouchableOpacity>
          </View>

          {/* Helper Text */}
          <View style={styles.helperContainer}>
            <View style={styles.helperItem}>
              <Ionicons name="time-outline" size={16} color="#7f8c8d" />
              <Text style={styles.helperText}>
                Kode OTP berlaku selama 10 menit
              </Text>
            </View>
            <View style={styles.helperItem}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#7f8c8d" />
              <Text style={styles.helperText}>
                Verifikasi email diperlukan untuk keamanan akun
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title="Email Berhasil Diverifikasi!"
        message="Selamat! Email Anda telah berhasil diverifikasi. Sekarang Anda dapat menggunakan semua fitur aplikasi."
        buttonText="Lanjutkan"
        onClose={handleSuccessModalClose}
        onButtonPress={handleSuccessModalClose}
      />
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
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 22,
  },
  emailText: {
    fontSize: 16,
    color: "#007AFF",
    textAlign: "center",
    fontWeight: "600",
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    fontSize: 20,
    fontWeight: "600",
    color: "#2c3e50",
    backgroundColor: "#fafafa",
  },
  otpInputFilled: {
    borderColor: "#007AFF",
    backgroundColor: "#f0f8ff",
  },
  verifyButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#007AFF",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  verifyButtonDisabled: {
    backgroundColor: "#a0a0a0",
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  resendButtonText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  countdownText: {
    fontSize: 14,
    color: "#e74c3c",
    fontWeight: "500",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: "#7f8c8d",
    marginLeft: 8,
  },
  helperContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  helperItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  helperText: {
    fontSize: 14,
    color: "#7f8c8d",
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
});