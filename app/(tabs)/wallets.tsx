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
      // Konversi balance ke number jika bertipe string, fallback ke 0 jika invalid
      const balance =
        typeof wallet.balance === "string"
          ? parseFloat(wallet.balance) || 0
          : typeof wallet.balance === "number"
          ? wallet.balance
          : 0;

      return sum + balance;
    }, 0);
  };

  const renderWalletItem = ({
    item,
    index,
  }: {
    item: Wallet;
    index: number;
  }) => (
    <View style={[styles.walletCard, { marginLeft: index % 2 === 0 ? 0 : 8 }]}>
      <View style={styles.walletHeader}>
        <View style={styles.walletIconContainer}>
          <MaterialIcons
            name="account-balance-wallet"
            size={24}
            color="#007AFF"
          />
        </View>
        <View style={styles.walletActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => openEditModal(item)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit" size={18} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="delete" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.walletContent}>
        <Text style={styles.walletName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.walletType} numberOfLines={1}>
          {getWalletTypeName(item.user_wallet_type_id)}
        </Text>

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Saldo</Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: item.balance >= 0 ? "#34C759" : "#FF3B30" },
            ]}
            numberOfLines={1}
          >
            {formatCurrency(item.balance)}
          </Text>
        </View>
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
          { color: formData.user_wallet_type_id ? "#000" : "#8E8E93" },
        ]}
      >
        {formData.user_wallet_type_id
          ? getWalletTypeName(formData.user_wallet_type_id)
          : "Pilih Tipe Dompet"}
      </Text>
      <MaterialIcons name="keyboard-arrow-down" size={24} color="#8E8E93" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Memuat data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={styles.headerTitle}>Dompet Saya</Text>
          <Text style={styles.headerSubtitle}>
            {wallets.length} Dompet • Total: {formatCurrency(getTotalBalance())}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openCreateModal}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Wallet List */}
      <FlatList
        data={wallets}
        renderItem={renderWalletItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: insets.bottom + 20 },
        ]}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons
                name="account-balance-wallet"
                size={80}
                color="#E5E5EA"
              />
            </View>
            <Text style={styles.emptyTitle}>Belum ada dompet</Text>
            <Text style={styles.emptySubtitle}>
              Tambahkan dompet pertama Anda untuk mulai mengelola keuangan
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={openCreateModal}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Tambah Dompet</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Form Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} activeOpacity={0.7}>
              <Text style={styles.cancelButton}>Batal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingWallet ? "Edit Dompet" : "Tambah Dompet"}
            </Text>
            <TouchableOpacity onPress={handleSubmit} activeOpacity={0.7}>
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
                placeholder="Masukkan nama dompet"
                placeholderTextColor="#C7C7CC"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tipe Dompet</Text>
              {renderTypeSelector()}
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
                placeholderTextColor="#C7C7CC"
                keyboardType="numeric"
              />
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
              onPress={() => setShowTypeModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButton}>Batal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Pilih Tipe Dompet</Text>
            <View style={{ width: 60 }} />
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
                  <MaterialIcons name="check" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
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
    color: "#8E8E93",
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1D1D1F",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
  },
  addButton: {
    backgroundColor: "#007AFF",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  listContainer: {
    padding: 16,
  },
  row: {
    justifyContent: "space-between",
  },
  walletCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    width: (SCREEN_WIDTH - 40) / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  walletHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  walletIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  walletActions: {
    flexDirection: "row",
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  editButton: {
    backgroundColor: "#F0F8FF",
  },
  deleteButton: {
    backgroundColor: "#FFF5F5",
  },
  walletContent: {
    flex: 1,
  },
  walletName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 4,
  },
  walletType: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 12,
  },
  balanceContainer: {
    marginTop: 8,
  },
  balanceLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1D1D1F",
  },
  cancelButton: {
    fontSize: 16,
    color: "#FF3B30",
    fontWeight: "500",
  },
  saveButton: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  formContainer: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    color: "#1D1D1F",
  },
  typeSelector: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  typeSelectorLabel: {
    fontSize: 16,
  },
  typeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  typeItemText: {
    fontSize: 16,
    color: "#1D1D1F",
  },
});
