import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  walletsAPI,
  walletTypesAPI,
  Wallet,
  WalletType,
} from "../../services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface WalletFormData {
  name: string;
  user_wallet_type_id: number | null;
  balance: number;
}

function WalletsScreenContent() {
  const insets = useSafeAreaInsets();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletTypes, setWalletTypes] = useState<WalletType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [formData, setFormData] = useState<WalletFormData>({
    name: "",
    user_wallet_type_id: null,
    balance: 0,
  });
  const [showTypeModal, setShowTypeModal] = useState(false);

  // Load data
  const loadWallets = async () => {
    try {
      const response = await walletsAPI.getAll();
      if (response.success && response.data) {
        setWallets(response.data);
      }
    } catch (error) {
      console.error("Error loading wallets:", error);
      Alert.alert("Error", "Gagal memuat data dompet");
    }
  };

  const loadWalletTypes = async () => {
    try {
      const response = await walletTypesAPI.getAll();
      if (response.success && response.data) {
        setWalletTypes(response.data);
      }
    } catch (error) {
      console.error("Error loading wallet types:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadWallets(), loadWalletTypes()]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Form handlers
  const openCreateModal = () => {
    setEditingWallet(null);
    setFormData({
      name: "",
      user_wallet_type_id: null,
      balance: 0,
    });
    setModalVisible(true);
  };

  const openEditModal = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setFormData({
      name: wallet.name,
      user_wallet_type_id: wallet.user_wallet_type_id || null,
      balance: wallet.balance,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingWallet(null);
    setFormData({
      name: "",
      user_wallet_type_id: null,
      balance: 0,
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Nama dompet tidak boleh kosong");
      return;
    }

    try {
      const submitData: {
        name: string;
        user_wallet_type_id?: number;
        balance: number;
      } = {
        name: formData.name.trim(),
        balance: formData.balance,
      };
      if (formData.user_wallet_type_id !== null) {
        submitData.user_wallet_type_id = formData.user_wallet_type_id;
      }

      let response;
      if (editingWallet) {
        response = await walletsAPI.update(editingWallet.id, submitData);
      } else {
        response = await walletsAPI.create(submitData);
      }

      if (response.success) {
        Alert.alert(
          "Berhasil",
          editingWallet
            ? "Dompet berhasil diperbarui"
            : "Dompet berhasil ditambahkan"
        );
        closeModal();
        loadWallets();
      } else {
        Alert.alert("Error", response.message || "Terjadi kesalahan");
      }
    } catch (error: any) {
      console.error("Error saving wallet:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Gagal menyimpan dompet"
      );
    }
  };

  const handleDelete = (wallet: Wallet) => {
    Alert.alert(
      "Konfirmasi Hapus",
      `Apakah Anda yakin ingin menghapus dompet "${wallet.name}"?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => deleteWallet(wallet.id),
        },
      ]
    );
  };

  const deleteWallet = async (id: number) => {
    try {
      const response = await walletsAPI.delete(id);
      if (response.success) {
        Alert.alert("Berhasil", "Dompet berhasil dihapus");
        loadWallets();
      } else {
        Alert.alert("Error", response.message || "Gagal menghapus dompet");
      }
    } catch (error: any) {
      console.error("Error deleting wallet:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Gagal menghapus dompet"
      );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getWalletTypeName = (typeId: number | undefined) => {
    if (!typeId) return "Tidak ada tipe";
    const type = walletTypes.find((t) => t.id === typeId);
    return type?.name || "Tidak diketahui";
  };

  const getTotalBalance = () => {
    return wallets.reduce((sum, wallet) => {
      const balance =
        typeof wallet.balance === "string"
          ? parseFloat(wallet.balance) || 0
          : typeof wallet.balance === "number"
          ? wallet.balance
          : 0;

      return sum + balance;
    }, 0);
  };

  const getWalletIcon = (typeId: number | undefined) => {
    if (!typeId) return "account-balance-wallet";
    const type = walletTypes.find((t) => t.id === typeId);
    if (type?.name.toLowerCase().includes("bank")) return "account-balance";
    if (type?.name.toLowerCase().includes("cash")) return "payments";
    if (type?.name.toLowerCase().includes("card")) return "credit-card";
    return "account-balance-wallet";
  };

  const renderWalletItem = ({
    item,
    index,
  }: {
    item: Wallet;
    index: number;
  }) => (
    <View style={styles.walletItemContainer}>
      <TouchableOpacity
        style={styles.walletItem}
        onPress={() => openEditModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.walletContent}>
          <View style={styles.walletLeft}>
            <View
              style={[
                styles.walletIconContainer,
                { backgroundColor: item.balance >= 0 ? "#E8F5E8" : "#FFEBEE" },
              ]}
            >
              <MaterialIcons
                name={getWalletIcon(item.user_wallet_type_id)}
                size={28}
                color={item.balance >= 0 ? "#4CAF50" : "#F44336"}
              />
            </View>
            <View style={styles.walletInfo}>
              <Text style={styles.walletName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.walletType} numberOfLines={1}>
                {getWalletTypeName(item.user_wallet_type_id)}
              </Text>
            </View>
          </View>

          <View style={styles.walletRight}>
            <Text
              style={[
                styles.balanceAmount,
                { color: item.balance >= 0 ? "#2E7D32" : "#D32F2F" },
              ]}
              numberOfLines={1}
            >
              {formatCurrency(item.balance)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(item)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="edit" size={20} color="#2196F3" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="delete" size={20} color="#F44336" />
          <Text style={styles.deleteButtonText}>Hapus</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTypeSelector = () => (
    <TouchableOpacity
      style={styles.typeSelector}
      onPress={() => setShowTypeModal(true)}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.typeSelectorLabel,
          { color: formData.user_wallet_type_id ? "#1A1A1A" : "#9E9E9E" },
        ]}
      >
        {formData.user_wallet_type_id
          ? getWalletTypeName(formData.user_wallet_type_id)
          : "Pilih Tipe Dompet"}
      </Text>
      <MaterialIcons name="expand-more" size={24} color="#9E9E9E" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Memuat dompet...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Dompet Saya</Text>
          <Text style={styles.headerSubtitle}>
            Kelola semua dompet dalam satu tempat
          </Text>
        </View>
      </View>

      {/* Quick Stats - Balance Only */}
      {wallets.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabel}>Total Saldo</Text>
                <Text
                  style={[
                    styles.statValue,
                    styles.balanceValue,
                    { color: getTotalBalance() >= 0 ? "#4CAF50" : "#F44336" },
                  ]}
                >
                  {formatCurrency(getTotalBalance())}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Wallet List */}
      <View style={styles.listSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.headerContentDompet}>
            <View style={styles.titleContainer}>
              <Text style={styles.sectionTitle}>Daftar Dompet</Text>
              {wallets.length > 0 && (
                <Text style={styles.sectionSubtitle}>
                  {wallets.length} dompet tersedia
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={openCreateModal}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={wallets}
          renderItem={renderWalletItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: insets.bottom + 100 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2196F3"]}
              tintColor="#2196F3"
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <MaterialIcons
                  name="account-balance-wallet"
                  size={64}
                  color="#E0E0E0"
                />
              </View>
              <Text style={styles.emptyTitle}>Belum Ada Dompet</Text>
              <Text style={styles.emptySubtitle}>
                Tambahkan dompet pertama Anda untuk mulai{"\n"}mengelola
                keuangan dengan lebih baik
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={openCreateModal}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={24} color="#fff" />
                <Text style={styles.emptyButtonText}>
                  Tambah Dompet Pertama
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      {/* Form Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalHeaderButton}
              onPress={closeModal}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButton}>Batal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingWallet ? "Edit Dompet" : "Tambah Dompet Baru"}
            </Text>
            <TouchableOpacity
              style={styles.modalHeaderButton}
              onPress={handleSubmit}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButton}>Simpan</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nama Dompet *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                placeholder="Contoh: Dompet Harian, Tabungan Bank"
                placeholderTextColor="#9E9E9E"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tipe Dompet</Text>
              {renderTypeSelector()}
              <Text style={styles.helperText}>
                Pilih tipe untuk mengkategorikan dompet Anda
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Saldo Awal</Text>
              <TextInput
                style={styles.input}
                value={formData.balance.toString()}
                onChangeText={(text) => {
                  const numericValue =
                    parseFloat(text.replace(/[^0-9.-]/g, "")) || 0;
                  setFormData({ ...formData, balance: numericValue });
                }}
                placeholder="0"
                placeholderTextColor="#9E9E9E"
                keyboardType="numeric"
              />
              <Text style={styles.helperText}>
                Masukkan saldo awal yang ada di dompet ini
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Type Selection Modal */}
      <Modal
        visible={showTypeModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalHeaderButton}
              onPress={() => setShowTypeModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButton}>Batal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Pilih Tipe Dompet</Text>
            <View style={styles.modalHeaderButton} />
          </View>

          <FlatList
            data={[{ id: 0, name: "Tidak ada tipe" }, ...walletTypes]}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.typeItem}
                onPress={() => {
                  setFormData({
                    ...formData,
                    user_wallet_type_id: item.id === 0 ? null : item.id,
                  });
                  setShowTypeModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.typeItemText}>{item.name}</Text>
                {((formData.user_wallet_type_id === null && item.id === 0) ||
                  formData.user_wallet_type_id === item.id) && (
                  <MaterialIcons name="check" size={24} color="#2196F3" />
                )}
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
            ItemSeparatorComponent={() => (
              <View style={styles.typeItemSeparator} />
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

export default function WalletsScreen() {
  return (
    <SafeAreaProvider>
      <WalletsScreenContent />
    </SafeAreaProvider>
  );
}

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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#757575",
    fontWeight: "500",
  },

  // Header Styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    minHeight: 70,
    backgroundColor: "#4A90E2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerContent: {
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "400",
    letterSpacing: 0.3,
  },

  // Stats Styles
  statsContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    justifyContent: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statTextContainer: {
    alignItems: "flex-start",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 2,
  },
  balanceValue: {
    fontSize: 24,
  },
  statLabel: {
    fontSize: 14,
    color: "#757575",
    fontWeight: "500",
    marginBottom: 4,
  },

  // List Section Styles
  listSection: {
    flex: 1,
    paddingTop: 32,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#757575",
  },
  listContainer: {
    paddingHorizontal: 24,
  },

  // New styles untuk layout perbaikan
  headerContentDompet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  titleContainer: {
    flex: 1,
  },

  addButton: {
    backgroundColor: "#2196F3",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    marginLeft: 12,
  },

  // Wallet Item Styles
  walletItemContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  walletItem: {
    padding: 20,
  },
  walletContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  walletIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  walletType: {
    fontSize: 14,
    color: "#757575",
    fontWeight: "500",
  },
  walletRight: {
    alignItems: "flex-end",
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: "700",
  },

  // Action Buttons Styles
  actionButtonsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  editButton: {
    backgroundColor: "#E3F2FD",
  },
  deleteButton: {
    backgroundColor: "#FFEBEE",
  },
  editButtonText: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "600",
  },
  deleteButtonText: {
    color: "#F44336",
    fontSize: 14,
    fontWeight: "600",
  },
  itemSeparator: {
    height: 8,
  },

  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#757575",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
  },
  emptyButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalHeaderButton: {
    minWidth: 60,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  cancelButton: {
    fontSize: 16,
    color: "#F44336",
    fontWeight: "500",
  },
  saveButton: {
    fontSize: 16,
    color: "#2196F3",
    fontWeight: "600",
  },

  // Form Styles
  formContainer: {
    padding: 24,
  },
  formGroup: {
    marginBottom: 28,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    color: "#1A1A1A",
  },
  helperText: {
    fontSize: 13,
    color: "#757575",
    marginTop: 8,
    lineHeight: 18,
  },
  typeSelector: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  typeSelectorLabel: {
    fontSize: 16,
  },

  // Type Modal Styles
  typeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
  },
  typeItemText: {
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  typeItemSeparator: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginHorizontal: 24,
  },
});
