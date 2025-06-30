import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  Animated,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { authAPI, User } from "../../services/api";
import {
  categoriesAPI,
  walletTypesAPI,
  Category,
  WalletType,
} from "../../services/api";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const Profile = () => {
  const insets = useSafeAreaInsets();
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

  // 2. State tambahan yang perlu ditambahkan setelah state yang sudah ada
  const [categories, setCategories] = useState<Category[]>([]);
  const [walletTypes, setWalletTypes] = useState<WalletType[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWalletTypeModal, setShowWalletTypeModal] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showWalletTypeForm, setShowWalletTypeForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [selectedWalletType, setSelectedWalletType] =
    useState<WalletType | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    type: "expense" as "income" | "expense",
    icon: "",
  });
  const [walletTypeForm, setWalletTypeForm] = useState({
    name: "",
    icon: "",
  });
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingWalletTypes, setLoadingWalletTypes] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingWalletType, setSavingWalletType] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "income" | "expense"
  >("all");

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
  // 3. Functions untuk handle kategori dan wallet type
  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await categoriesAPI.getAll();
      if (response.data) {
        setCategories(response.data);
      }
    } catch (error: any) {
      console.error("Error loading categories:", error);
      Alert.alert("Error", "Failed to load categories");
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadWalletTypes = async () => {
    try {
      setLoadingWalletTypes(true);
      const response = await walletTypesAPI.getAll();
      if (response.data) {
        setWalletTypes(response.data);
      }
    } catch (error: any) {
      console.error("Error loading wallet types:", error);
      Alert.alert("Error", "Failed to load wallet types");
    } finally {
      setLoadingWalletTypes(false);
    }
  };

  const handleCategoryPress = () => {
    loadCategories();
    setCategoryFilter("all"); // Reset filter ke 'all' saat membuka modal
    setShowCategoryModal(true);
  };

  const handleWalletTypePress = () => {
    loadWalletTypes();
    setShowWalletTypeModal(true);
  };

  const handleCreateCategory = () => {
    setCategoryForm({ name: "", type: "expense", icon: "" });
    setSelectedCategory(null);
    setShowCategoryForm(true);
  };

  const handleEditCategory = (category: Category) => {
    setCategoryForm({
      name: category.name,
      type: category.type,
      icon: category.icon || "",
    });
    setSelectedCategory(category);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      "Hapus Kategori",
      `Apakah Anda yakin ingin menghapus kategori "${category.name}"?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => performDeleteCategory(category.id),
        },
      ]
    );
  };

  const performDeleteCategory = async (categoryId: number) => {
    try {
      await categoriesAPI.delete(categoryId);
      Alert.alert("Berhasil", "Kategori berhasil dihapus");
      loadCategories();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      Alert.alert("Error", "Gagal menghapus kategori");
    }
  };
  // 2. Function untuk filter categories berdasarkan tab
  const getFilteredCategories = () => {
    if (categoryFilter === "all") {
      return categories;
    }
    return categories.filter((category) => category.type === categoryFilter);
  };
  // 3. Function untuk handle tab change
  const handleCategoryFilterChange = (filter: "all" | "income" | "expense") => {
    setCategoryFilter(filter);
  };

  // 4. Function untuk get count categories per type
  const getCategoryCount = (type: "all" | "income" | "expense") => {
    if (type === "all") {
      return categories.length;
    }
    return categories.filter((category) => category.type === type).length;
  };

  const handleCreateWalletType = () => {
    setWalletTypeForm({ name: "", icon: "" });
    setSelectedWalletType(null);
    setShowWalletTypeForm(true);
  };

  const handleEditWalletType = (walletType: WalletType) => {
    setWalletTypeForm({
      name: walletType.name,
      icon: walletType.icon || "",
    });
    setSelectedWalletType(walletType);
    setShowWalletTypeForm(true);
  };

  const handleDeleteWalletType = (walletType: WalletType) => {
    Alert.alert(
      "Hapus Tipe Dompet",
      `Apakah Anda yakin ingin menghapus tipe dompet "${walletType.name}"?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => performDeleteWalletType(walletType.id),
        },
      ]
    );
  };

  const performDeleteWalletType = async (walletTypeId: number) => {
    try {
      await walletTypesAPI.delete(walletTypeId);
      Alert.alert("Berhasil", "Tipe dompet berhasil dihapus");
      loadWalletTypes();
    } catch (error: any) {
      console.error("Error deleting wallet type:", error);
      Alert.alert("Error", "Gagal menghapus tipe dompet");
    }
  };

  // Category Form Functions
  const handleSaveCategory = async () => {
    try {
      // Validasi
      if (!categoryForm.name.trim()) {
        Alert.alert("Error", "Nama kategori harus diisi");
        return;
      }

      setSavingCategory(true);

      if (selectedCategory) {
        // Update existing category
        const response = await categoriesAPI.update(
          selectedCategory.id,
          categoryForm
        );
        if (response.data) {
          Alert.alert("Berhasil", "Kategori berhasil diperbarui");
          setShowCategoryForm(false);
          loadCategories();
        }
      } else {
        // Create new category
        const response = await categoriesAPI.create(categoryForm);
        if (response.data) {
          Alert.alert("Berhasil", "Kategori berhasil dibuat");
          setShowCategoryForm(false);
          loadCategories();
        }
      }
    } catch (error: any) {
      console.error("Error saving category:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          error.message ||
          "Gagal menyimpan kategori"
      );
    } finally {
      setSavingCategory(false);
    }
  };

  // Wallet Type Form Functions
  const handleSaveWalletType = async () => {
    try {
      // Validasi
      if (!walletTypeForm.name.trim()) {
        Alert.alert("Error", "Nama tipe dompet harus diisi");
        return;
      }

      setSavingWalletType(true);

      if (selectedWalletType) {
        // Update existing wallet type
        const response = await walletTypesAPI.update(
          selectedWalletType.id,
          walletTypeForm
        );
        if (response.data) {
          Alert.alert("Berhasil", "Tipe dompet berhasil diperbarui");
          setShowWalletTypeForm(false);
          loadWalletTypes();
        }
      } else {
        // Create new wallet type
        const response = await walletTypesAPI.create(walletTypeForm);
        if (response.data) {
          Alert.alert("Berhasil", "Tipe dompet berhasil dibuat");
          setShowWalletTypeForm(false);
          loadWalletTypes();
        }
      }
    } catch (error: any) {
      console.error("Error saving wallet type:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          error.message ||
          "Gagal menyimpan tipe dompet"
      );
    } finally {
      setSavingWalletType(false);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {/* StatusBar untuk loading state */}
        <StatusBar
          animated={true}
          backgroundColor="#4A90E2"
          barStyle="light-content"
          translucent={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Memuat Profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      {/* StatusBar - konsisten dengan header */}
      <StatusBar
        animated={true}
        backgroundColor="#4A90E2"
        barStyle="light-content"
        translucent={false}
      />
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>
            Kelola Profile dan Data Anda
          </Text>
        </View>
      </View>

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
            </View>
          </View>
          {/* Data Management Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kelola Data</Text>

            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleCategoryPress}
              >
                <View style={styles.menuItemLeft}>
                  <View
                    style={[styles.menuIcon, { backgroundColor: "#FFF3E0" }]}
                  >
                    <Ionicons
                      name="pricetags-outline"
                      size={20}
                      color="#FF9800"
                    />
                  </View>
                  <Text style={styles.menuItemText}>Kelola Kategori</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#C1C1C1" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { borderBottomWidth: 0 }]}
                onPress={handleWalletTypePress}
              >
                <View style={styles.menuItemLeft}>
                  <View
                    style={[styles.menuIcon, { backgroundColor: "#F3E5F5" }]}
                  >
                    <Ionicons name="wallet-outline" size={20} color="#9C27B0" />
                  </View>
                  <Text style={styles.menuItemText}>Kelola Tipe Dompet</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#C1C1C1" />
              </TouchableOpacity>
            </View>
          </View>
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
            <Text style={styles.appCopyright}>© 2025 CodingSalatiga</Text>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Enhanced Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)} // Tambahkan ini

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
                <Text style={styles.modalCancelText}>Tutup</Text>
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
                    placeholderTextColor="#777"

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
                    placeholderTextColor="#777"
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
      {/* Categories Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryModal(false)} // Tambahkan ini
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowCategoryModal(false)}
              style={styles.modalButton}
            >
              <Text style={styles.modalCancelText}>Tutup</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Kelola Kategori</Text>

            <TouchableOpacity
              onPress={handleCreateCategory}
              style={styles.modalButton}
            >
              <Text style={styles.modalSaveText}>Tambah</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Tab */}
          {/* Improved Filter Tab */}
          <View style={styles.filterTabContainer}>
            <TouchableOpacity
              style={[
                styles.filterTab,
                categoryFilter === "all" && styles.filterTabActive,
              ]}
              onPress={() => handleCategoryFilterChange("all")}
              activeOpacity={0.7}
            >
              <View style={styles.filterTabContent}>
                <View
                  style={[
                    styles.iconContainer,
                    categoryFilter === "all" && styles.iconContainerActive,
                  ]}
                >
                  <Ionicons
                    name="apps"
                    size={16}
                    color={categoryFilter === "all" ? "#6366F1" : "#9CA3AF"}
                  />
                </View>
                <Text
                  style={[
                    styles.filterTabText,
                    categoryFilter === "all" && styles.filterTabTextActive,
                  ]}
                >
                  Semua
                </Text>
                <View
                  style={[
                    styles.countBadge,
                    categoryFilter === "all" && styles.countBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      categoryFilter === "all" && styles.countTextActive,
                    ]}
                  >
                    {getCategoryCount("all")}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                categoryFilter === "income" && styles.filterTabActive,
              ]}
              onPress={() => handleCategoryFilterChange("income")}
              activeOpacity={0.7}
            >
              <View style={styles.filterTabContent}>
                <View
                  style={[
                    styles.iconContainer,
                    categoryFilter === "income" &&
                      styles.iconContainerActiveIncome,
                  ]}
                >
                  <Ionicons
                    name="trending-up"
                    size={16}
                    color={categoryFilter === "income" ? "#10B981" : "#9CA3AF"}
                  />
                </View>
                <Text
                  style={[
                    styles.filterTabText,
                    categoryFilter === "income" &&
                      styles.filterTabTextActiveIncome,
                  ]}
                >
                  Pemasukan
                </Text>
                <View
                  style={[
                    styles.countBadge,
                    categoryFilter === "income" &&
                      styles.countBadgeActiveIncome,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      categoryFilter === "income" &&
                        styles.countTextActiveIncome,
                    ]}
                  >
                    {getCategoryCount("income")}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                categoryFilter === "expense" && styles.filterTabActive,
              ]}
              onPress={() => handleCategoryFilterChange("expense")}
              activeOpacity={0.7}
            >
              <View style={styles.filterTabContent}>
                <View
                  style={[
                    styles.iconContainer,
                    categoryFilter === "expense" &&
                      styles.iconContainerActiveExpense,
                  ]}
                >
                  <Ionicons
                    name="trending-down"
                    size={16}
                    color={categoryFilter === "expense" ? "#EF4444" : "#9CA3AF"}
                  />
                </View>
                <Text
                  style={[
                    styles.filterTabText,
                    categoryFilter === "expense" &&
                      styles.filterTabTextActiveExpense,
                  ]}
                >
                  Pengeluaran
                </Text>
                <View
                  style={[
                    styles.countBadge,
                    categoryFilter === "expense" &&
                      styles.countBadgeActiveExpense,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      categoryFilter === "expense" &&
                        styles.countTextActiveExpense,
                    ]}
                  >
                    {getCategoryCount("expense")}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {loadingCategories ? (
            // Loading di tengah modal
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading categories...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.modalForm}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.dataContainer}>
                {getFilteredCategories().map((category) => (
                  <View key={category.id} style={styles.dataItem}>
                    <View style={styles.dataItemLeft}>
                      <View
                        style={[
                          styles.dataIcon,
                          {
                            backgroundColor:
                              category.type === "income"
                                ? "#E8F5E8"
                                : "#FFE5E5",
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            category.type === "income"
                              ? "arrow-down"
                              : "arrow-up"
                          }
                          size={20}
                          color={
                            category.type === "income" ? "#4CAF50" : "#F44336"
                          }
                        />
                      </View>
                      <View style={styles.dataInfo}>
                        <Text style={styles.dataName}>{category.name}</Text>
                        <Text style={styles.dataType}>
                          {category.type === "income"
                            ? "Pemasukan"
                            : "Pengeluaran"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.dataActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditCategory(category)}
                      >
                        <Ionicons name="pencil" size={16} color="#4A90E2" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteCategory(category)}
                      >
                        <Ionicons name="trash" size={16} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {getFilteredCategories().length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="pricetags-outline" size={48} color="#CCC" />
                    <Text style={styles.emptyStateText}>
                      {categoryFilter === "all"
                        ? "Belum ada kategori"
                        : categoryFilter === "income"
                        ? "Belum ada kategori pemasukan"
                        : "Belum ada kategori pengeluaran"}
                    </Text>
                    <Text style={styles.emptyStateSubtext}>
                      Tap tombol "Tambah" untuk membuat kategori baru
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Category Form Modal */}
      <Modal
        visible={showCategoryForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryForm(false)} // Tambahkan ini
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

          <KeyboardAvoidingView
            style={styles.modalContent}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowCategoryForm(false)}
                style={styles.modalButton}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                {selectedCategory ? "Edit Kategori" : "Tambah Kategori"}
              </Text>

              <TouchableOpacity
                onPress={handleSaveCategory}
                disabled={savingCategory}
                style={[
                  styles.modalButton,
                  savingCategory && styles.modalButtonDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.modalSaveText,
                    savingCategory && styles.modalSaveTextDisabled,
                  ]}
                >
                  {savingCategory ? "Menyimpan..." : "Simpan"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalForm}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Informasi Kategori</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nama Kategori *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={categoryForm.name}
                    onChangeText={(text) =>
                      setCategoryForm((prev) => ({ ...prev, name: text }))
                    }
                    placeholder="Masukkan nama kategori"
                    placeholderTextColor="#777"
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tipe Kategori *</Text>
                  <View style={styles.typeSelector}>
                    <TouchableOpacity
                      style={[
                        styles.typeSelectorButton,
                        categoryForm.type === "income" &&
                          styles.typeSelectorButtonActiveIncome,
                      ]}
                      onPress={() =>
                        setCategoryForm((prev) => ({ ...prev, type: "income" }))
                      }
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.iconContainer,
                          categoryForm.type === "income" &&
                            styles.iconContainerIncome,
                        ]}
                      >
                        <Ionicons
                          name="trending-up"
                          size={16}
                          color={
                            categoryForm.type === "income"
                              ? "#10B981"
                              : "#9CA3AF"
                          }
                        />
                      </View>

                      <Text
                        style={[
                          styles.typeSelectorText,
                          categoryForm.type === "income" &&
                            styles.typeSelectorTextIncome,
                        ]}
                      >
                        Pemasukan
                      </Text>

                      {categoryForm.type === "income" && (
                        <View style={styles.checkContainer}>
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#10B981"
                          />
                        </View>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.typeSelectorButton,
                        categoryForm.type === "expense" &&
                          styles.typeSelectorButtonActiveExpense,
                      ]}
                      onPress={() =>
                        setCategoryForm((prev) => ({
                          ...prev,
                          type: "expense",
                        }))
                      }
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.iconContainer,
                          categoryForm.type === "expense" &&
                            styles.iconContainerExpense,
                        ]}
                      >
                        <Ionicons
                          name="trending-down"
                          size={16}
                          color={
                            categoryForm.type === "expense"
                              ? "#EF4444"
                              : "#9CA3AF"
                          }
                        />
                      </View>

                      <Text
                        style={[
                          styles.typeSelectorText,
                          categoryForm.type === "expense" &&
                            styles.typeSelectorTextExpense,
                        ]}
                      >
                        Pengeluaran
                      </Text>

                      {categoryForm.type === "expense" && (
                        <View style={styles.checkContainer}>
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#EF4444"
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Icon (Opsional)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={categoryForm.icon}
                    onChangeText={(text) =>
                      setCategoryForm((prev) => ({ ...prev, icon: text }))
                    }
                    placeholder="Masukkan nama icon (contoh: food, car, home)"
                    autoCapitalize="none"
                    returnKeyType="done"
                  />
                  <Text style={styles.inputHelper}>
                    Icon akan ditampilkan sebagai emoji atau simbol
                  </Text>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Wallet Type Form Modal */}
      <Modal
        visible={showWalletTypeForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWalletTypeForm(false)} // Tambahkan ini

      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

          <KeyboardAvoidingView
            style={styles.modalContent}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowWalletTypeForm(false)}
                style={styles.modalButton}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                {selectedWalletType ? "Edit Tipe Dompet" : "Tambah Tipe Dompet"}
              </Text>

              <TouchableOpacity
                onPress={handleSaveWalletType}
                disabled={savingWalletType}
                style={[
                  styles.modalButton,
                  savingWalletType && styles.modalButtonDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.modalSaveText,
                    savingWalletType && styles.modalSaveTextDisabled,
                  ]}
                >
                  {savingWalletType ? "Menyimpan..." : "Simpan"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalForm}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>
                  Informasi Tipe Dompet
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nama Tipe Dompet *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={walletTypeForm.name}
                    onChangeText={(text) =>
                      setWalletTypeForm((prev) => ({ ...prev, name: text }))
                    }
                    placeholder="Masukkan nama tipe dompet"
                    placeholderTextColor="#777"
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Icon (Opsional)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={walletTypeForm.icon}
                    onChangeText={(text) =>
                      setWalletTypeForm((prev) => ({ ...prev, icon: text }))
                    }
                    placeholder="Masukkan nama icon (contoh: wallet, bank, cash)"
                    placeholderTextColor="#777"
                    autoCapitalize="none"
                    returnKeyType="done"
                  />
                  <Text style={styles.inputHelper}>
                    Icon akan ditampilkan sebagai emoji atau simbol
                  </Text>
                </View>

                <View style={styles.formPreview}>
                  <Text style={styles.formPreviewTitle}>Preview</Text>
                  <View style={styles.previewItem}>
                    <View
                      style={[styles.dataIcon, { backgroundColor: "#F3E5F5" }]}
                    >
                      <Ionicons
                        name="wallet-outline"
                        size={20}
                        color="#9C27B0"
                      />
                    </View>
                    <View style={styles.dataInfo}>
                      <Text style={styles.dataName}>
                        {walletTypeForm.name || "Nama Tipe Dompet"}
                      </Text>
                      <Text style={styles.dataType}>Tipe Dompet</Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Wallet Types Modal */}
      <Modal
        visible={showWalletTypeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWalletTypeModal(false)} // Tambahkan ini
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowWalletTypeModal(false)}
              style={styles.modalButton}
            >
              <Text style={styles.modalCancelText}>Tutup</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Kelola Tipe Dompet</Text>

            <TouchableOpacity
              onPress={handleCreateWalletType}
              style={styles.modalButton}
            >
              <Text style={styles.modalSaveText}>Tambah</Text>
            </TouchableOpacity>
          </View>

          {loadingWalletTypes ? (
            // Loading di tengah modal
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading wallet types...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.modalForm}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.dataContainer}>
                {walletTypes.map((walletType) => (
                  <View key={walletType.id} style={styles.dataItem}>
                    <View style={styles.dataItemLeft}>
                      <View
                        style={[
                          styles.dataIcon,
                          { backgroundColor: "#F3E5F5" },
                        ]}
                      >
                        <Ionicons
                          name="wallet-outline"
                          size={20}
                          color="#9C27B0"
                        />
                      </View>
                      <View style={styles.dataInfo}>
                        <Text style={styles.dataName}>{walletType.name}</Text>
                        <Text style={styles.dataType}>Tipe Dompet</Text>
                      </View>
                    </View>

                    <View style={styles.dataActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditWalletType(walletType)}
                      >
                        <Ionicons name="pencil" size={16} color="#4A90E2" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteWalletType(walletType)}
                      >
                        <Ionicons name="trash" size={16} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {walletTypes.length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="wallet-outline" size={48} color="#CCC" />
                    <Text style={styles.emptyStateText}>
                      Belum ada tipe dompet
                    </Text>
                    <Text style={styles.emptyStateSubtext}>
                      Tap tombol "Tambah" untuk membuat tipe dompet baru
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#4A90E2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    // Hapus minHeight untuk mencegah konflik
  },
  headerContent: {
    flex: 1,
    justifyContent: "center",
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    // Tambahkan minHeight di sini untuk konsistensi
    minHeight: 60,
  },

  logo: {
    width: 48,
    height: 48,
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  titleContainer: {
    flex: 1,
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "400",
    letterSpacing: 0.3,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  headerRight: {
    marginLeft: 16,
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
    marginTop: 30,
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
  dataContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  dataItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dataItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dataIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dataInfo: {
    flex: 1,
  },
  dataName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  dataType: {
    fontSize: 14,
    color: "#666",
  },
  dataActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFEBEE",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#CCC",
    textAlign: "center",
    lineHeight: 20,
  },
  filterTabContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    marginHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
  },
  filterTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  filterTabContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  iconContainerActive: {
    backgroundColor: "#EEF2FF",
  },
  iconContainerActiveIncome: {
    backgroundColor: "#ECFDF5",
  },
  iconContainerActiveExpense: {
    backgroundColor: "#FEF2F2",
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 2,
  },
  filterTabTextActive: {
    color: "#6366F1",
    fontWeight: "600",
  },
  filterTabTextActiveIncome: {
    color: "#10B981",
    fontWeight: "600",
  },
  filterTabTextActiveExpense: {
    color: "#EF4444",
    fontWeight: "600",
  },
  countBadge: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeActive: {
    backgroundColor: "#EEF2FF",
  },
  countBadgeActiveIncome: {
    backgroundColor: "#ECFDF5",
  },
  countBadgeActiveExpense: {
    backgroundColor: "#FEF2F2",
  },
  countText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
  },
  countTextActive: {
    color: "#6366F1",
  },
  countTextActiveIncome: {
    color: "#10B981",
  },
  countTextActiveExpense: {
    color: "#EF4444",
  },
  typeSelector: {
    flexDirection: "row",
    gap: 12,
  },
  typeSelectorButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typeSelectorButtonActiveIncome: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  typeSelectorButtonActiveExpense: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainerIncome: {
    backgroundColor: "#D1FAE5",
  },
  iconContainerExpense: {
    backgroundColor: "#FEE2E2",
  },
  textContainer: {
    flex: 1,
    alignItems: "flex-start",
  },
  typeSelectorText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 2,
  },
  typeSelectorTextIncome: {
    color: "#10B981",
  },
  typeSelectorTextExpense: {
    color: "#EF4444",
  },
  typeSelectorSubtext: {
    fontSize: 12,
    fontWeight: "400",
    color: "#9CA3AF",
  },
  typeSelectorSubtextIncome: {
    color: "#059669",
  },
  typeSelectorSubtextExpense: {
    color: "#DC2626",
  },
  checkContainer: {
    marginLeft: 8,
  },
  inputHelper: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  formPreview: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  formPreviewTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  previewItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  loadingContainerCategory: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },

  loadingSpinnerCategory: {
    width: 40,
    height: 40,
    borderWidth: 4,
    borderColor: "#4A90E2",
    borderTopColor: "transparent",
    borderRadius: 20,
    marginBottom: 12,
    // Hanya jika pakai custom spinner, kalau pakai ActivityIndicator, abaikan
  },

  loadingTextCategory: {
    color: "#666",
    fontSize: 16,
  },
});

export default Profile;
