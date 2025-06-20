import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { authAPI, User } from "../../services/api";

const { width } = Dimensions.get("window");

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const scrollY = new Animated.Value(0);

  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Add missing state hooks
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        router.replace("/(auth)/login");
        return;
      }

      //   setDebugInfo({
      //     hasToken: !!token,
      //     tokenPreview: token ? token.substring(0, 20) + '...' : null,
      //     baseUrl: 'https://e639-27-124-95-155.ngrok-free.app/api',
      //   });

      await loadProfile();
    };

    loadData();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        console.log("No auth token found, redirecting to login");
        router.replace("/(auth)/login");
        return;
      }

      console.log(
        "Loading profile with token:",
        token.substring(0, 20) + "..."
      );
      const response = await authAPI.getProfile();

      console.log("Profile API response:", response);

      const userData: User | undefined = response.data;

      if (userData) {
        setUser(userData);
        setEditForm({
          name: userData.name || "",
          email: userData.email || "",
          password: "",
          password_confirmation: "",
        });
      } else {
        throw new Error(response.message || "Invalid response format");
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      if (error.response?.status === 401) {
        await AsyncStorage.removeItem("auth_token");
        await AsyncStorage.removeItem("user_data");
        router.replace("/(auth)/login");
        return;
      }

      Alert.alert(
        "Error",
        `Failed to load profile: ${
          error.message || "Unknown error"
        }\n\nStatus: ${error.response?.status || "N/A"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: performLogout,
      },
    ]);
  };

  const performLogout = async () => {
    try {
      setLoading(true);

      await authAPI.logout();

      await AsyncStorage.removeItem("auth_token");
      await AsyncStorage.removeItem("user_data");

      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Logout error:", error);

      await AsyncStorage.removeItem("auth_token");
      await AsyncStorage.removeItem("user_data");
      router.replace("/(auth)/login");
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    if (user) {
      setEditForm({
        name: user.name || "",
        email: user.email || "",
        password: "",
        password_confirmation: "",
      });
      setShowEditModal(true);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      // Validasi nama
      if (!editForm.name.trim()) {
        Alert.alert("Error", "Name is required");
        return;
      }

      // Validasi email
      if (!editForm.email.trim()) {
        Alert.alert("Error", "Email is required");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editForm.email)) {
        Alert.alert("Error", "Please enter a valid email address");
        return;
      }

      // Validasi password jika diisi
      if (editForm.password) {
        if (editForm.password.length < 6) {
          Alert.alert("Error", "Password must be at least 6 characters");
          return;
        }

        if (editForm.password !== editForm.password_confirmation) {
          Alert.alert("Error", "Password confirmation does not match");
          return;
        }
      }

      // Set loading state
      setUpdating(true);

      // Siapkan data untuk update
      const updateData: any = {
        name: editForm.name,
        email: editForm.email,
      };

      if (editForm.password) {
        updateData.password = editForm.password;
        updateData.password_confirmation = editForm.password_confirmation;
      }

      console.log("Updating profile with data:", updateData);

      // Panggil API update profile
      const response = await authAPI.updateProfile(updateData);

      console.log("Update profile response:", response);

      // Periksa status sukses
      if (response.data) {
        // Update user di state (atau context)
        setUser(response.data);
        setShowEditModal(false);

        Alert.alert(
          "Success",
          response.message || "Profile updated successfully"
        );

        // Kosongkan form password
        setEditForm((prev) => ({
          ...prev,
          password: "",
          password_confirmation: "",
        }));
      } else {
        // Tangani jika status bukan success
        throw new Error(response.message || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("Update profile error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          error.message ||
          "Failed to update profile"
      );
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: "clamp",
  });

  const headerTranslate = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -20],
    extrapolate: "clamp",
  });

  if (loading && !user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4A90E2" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4A90E2" />

      {/* Animated Header */}
      <Animated.View
        style={[
          styles.headerContainer,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslate }],
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name ? getInitials(user.name) : "U"}
              </Text>
            </View>
            <View style={styles.statusIndicator} />
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || "User"}</Text>
            <Text style={styles.userEmail}>{user?.email || "No email"}</Text>
            <View style={styles.verificationBadge}>
              <Ionicons
                name={
                  user?.email_verified_at ? "checkmark-circle" : "alert-circle"
                }
                size={14}
                color={user?.email_verified_at ? "#4CAF50" : "#FF9800"}
              />
              <Text
                style={[
                  styles.verificationText,
                  { color: user?.email_verified_at ? "#4CAF50" : "#FF9800" },
                ]}
              >
                {user?.email_verified_at
                  ? "Terverifikasi"
                  : "Belum diverifikasi"}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4A90E2"
            colors={["#4A90E2"]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="calendar" size={24} color="#4A90E2" />
              <Text style={styles.statLabel}>Anggota Sejak</Text>
              <Text style={styles.statValue}>
                {user?.created_at ? formatDate(user.created_at) : "N/A"}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
              <Text style={styles.statLabel}>Keamanan</Text>
              <Text style={styles.statValue}>Terlindung</Text>
            </View>
          </View>

          {/* Account Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manajemen Akun</Text>

            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleEditProfile}
              >
                <View style={styles.menuItemLeft}>
                  <View
                    style={[styles.menuIcon, { backgroundColor: "#E3F2FD" }]}
                  >
                    <Ionicons name="person-outline" size={20} color="#2196F3" />
                  </View>
                  <Text style={styles.menuItemText}>Edit Profile</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#C1C1C1" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={onRefresh}>
                <View style={styles.menuItemLeft}>
                  <View
                    style={[styles.menuIcon, { backgroundColor: "#E8F5E8" }]}
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={20}
                      color="#4CAF50"
                    />
                  </View>
                  <Text style={styles.menuItemText}>Refresh Data</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#C1C1C1" />
              </TouchableOpacity>

              {/* Debug section for development */}
              {/* {__DEV__ && (
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={async () => {
                    try {
                      const token = await AsyncStorage.getItem('auth_token');
                      console.log('Current token:', token);
                      
                      const response = await fetch('https://e639-27-124-95-155.ngrok-free.app/api/profile', {
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json',
                          'Accept': 'application/json',
                        },
                      });
                      
                      const data = await response.json();
                      console.log('Direct fetch response:', data);
                      Alert.alert('API Test', JSON.stringify(data, null, 2));
                    } catch (error) {
                      console.error('Direct fetch error:', error);
                      const errorMessage = error instanceof Error ? error.message : String(error);
                      Alert.alert('API Test Error', errorMessage);
                    }
                  }}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIcon, { backgroundColor: '#FFF3E0' }]}>
                      <Ionicons name="flask-outline" size={20} color="#FF9800" />
                    </View>
                    <Text style={styles.menuItemText}>Debug API</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#C1C1C1" />
                </TouchableOpacity>
              )} */}
            </View>
          </View>

          {/* Debug Info Card (Development only)
          {__DEV__ && debugInfo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Debug Information</Text>
              <View style={styles.debugCard}>
                <View style={styles.debugItem}>
                  <Text style={styles.debugLabel}>Token Status</Text>
                  <Text style={styles.debugValue}>{debugInfo.hasToken ? 'Active' : 'Missing'}</Text>
                </View>
                <View style={styles.debugItem}>
                  <Text style={styles.debugLabel}>API Endpoint</Text>
                  <Text style={styles.debugValue} numberOfLines={1}>{debugInfo.baseUrl}</Text>
                </View>
              </View>
            </View>
          )} */}

          {/* Logout Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={loading}
            >
              <Ionicons name="log-out-outline" size={20} color="#FF5252" />
              <Text style={styles.logoutText}>
                {loading ? "Loading..." : "Keluar"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appVersion}>CatatUang v1.0.0</Text>
            <Text style={styles.appCopyright}>© 2024 CodingSalatiga</Text>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Enhanced Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

          <KeyboardAvoidingView
            style={styles.modalContent}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.modalButton}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>Edit Profile</Text>

              <TouchableOpacity
                onPress={handleUpdateProfile}
                disabled={updating}
                style={[
                  styles.modalButton,
                  updating && styles.modalButtonDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.modalSaveText,
                    updating && styles.modalSaveTextDisabled,
                  ]}
                >
                  {updating ? "Menyimpan..." : "Simpan"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalForm}
              showsVerticalScrollIndicator={false}
            >
              {/* Profile Picture Section */}
              <View style={styles.modalAvatarSection}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>
                    {editForm.name ? getInitials(editForm.name) : "U"}
                  </Text>
                </View>
                <TouchableOpacity style={styles.changePhotoButton}>
                  <Text style={styles.changePhotoText}>Change Photo</Text>
                </TouchableOpacity>
              </View>

              {/* Form Fields */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Informasi Pribadi</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nama Lengkap *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.name}
                    onChangeText={(text) =>
                      setEditForm((prev) => ({ ...prev, name: text }))
                    }
                    placeholder="Enter your full name"
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.email}
                    onChangeText={(text) =>
                      setEditForm((prev) => ({ ...prev, email: text }))
                    }
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Password Section */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Ubah Password</Text>
                <Text style={styles.formSectionSubtitle}>
                  Leave blank if you don't want to change your password
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.password}
                    onChangeText={(text) =>
                      setEditForm((prev) => ({ ...prev, password: text }))
                    }
                    placeholder="Enter new password"
                    secureTextEntry
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.password_confirmation}
                    onChangeText={(text) =>
                      setEditForm((prev) => ({
                        ...prev,
                        password_confirmation: text,
                      }))
                    }
                    placeholder="Confirm new password"
                    secureTextEntry
                    autoCapitalize="none"
                    returnKeyType="done"
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#E0E0E0",
    borderTopColor: "#4A90E2",
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  headerContainer: {
    backgroundColor: "#4A90E2",
    paddingTop: 35,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4CAF50",
    borderWidth: 3,
    borderColor: "#4A90E2",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  verificationText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 20,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 20,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  menuContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  debugCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  debugItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  debugLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  debugValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFE5E5",
    shadowColor: "#FF5252",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    fontSize: 16,
    color: "#FF5252",
    fontWeight: "600",
    marginLeft: 8,
  },
  appInfo: {
    alignItems: "center",
    paddingVertical: 32,
    paddingBottom: 40,
  },
  appVersion: {
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
    marginBottom: 4,
  },
  appCopyright: {
    fontSize: 12,
    color: "#CCC",
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalCancelText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalSaveText: {
    fontSize: 16,
    color: "#4A90E2",
    fontWeight: "600",
    textAlign: "right",
  },
  modalSaveTextDisabled: {
    color: "#CCC",
  },
  modalForm: {
    flex: 1,
  },
  modalAvatarSection: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#FFFFFF",
    marginBottom: 20,
  },
  modalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  modalAvatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  changePhotoButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changePhotoText: {
    fontSize: 16,
    color: "#4A90E2",
    fontWeight: "500",
  },
  formSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  formSectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
});

export default Profile;
