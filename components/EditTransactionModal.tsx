import React, { useState, useEffect } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  transactionsAPI,
  walletsAPI,
  categoriesAPI,
  Transaction,
  Wallet,
  Category,
} from "../services/api";

interface EditTransactionModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onTransactionUpdated: () => void;
}

export default function EditTransactionModal({
  visible,
  transaction,
  onClose,
  onTransactionUpdated,
}: EditTransactionModalProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [transactionDate, setTransactionDate] = useState("");
  const [transactionType, setTransactionType] = useState<"income" | "expense">(
    "expense"
  );
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible && transaction) {
      loadInitialData();
      populateForm();
    }
  }, [visible, transaction]);

  const loadInitialData = async () => {
    setIsLoadingData(true);
    try {
      const [walletsResponse, categoriesResponse] = await Promise.all([
        walletsAPI.getAll(),
        categoriesAPI.getAll(),
      ]);

      if (walletsResponse.success) {
        setWallets(walletsResponse.data ?? []);
      }

      if (categoriesResponse.success) {
        setCategories(categoriesResponse.data ?? []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Gagal memuat data");
    } finally {
      setIsLoadingData(false);
    }
  };

  const populateForm = () => {
    if (!transaction) return;

    setAmount(transaction.amount.toString());
    setDescription(transaction.description || "");
    setTransactionType(transaction.type);
    setTransactionDate(transaction.transaction_date);

    // Set selected wallet and category based on transaction data
    setSelectedWallet(transaction.wallet || null);
    setSelectedCategory(transaction.category || null);
  };

  const handleSubmit = async () => {
    if (!transaction) return;

    if (!amount || !selectedWallet || !selectedCategory || !transactionDate) {
      Alert.alert("Error", "Mohon lengkapi semua field yang diperlukan");
      return;
    }

    setIsLoading(true);
    try {
      const updateData = {
        wallet_id: selectedWallet.id,
        category_id: selectedCategory.id,
        amount: parseFloat(amount),
        description,
        transaction_date: transactionDate,
        type: transactionType,
      };

      const response = await transactionsAPI.update(transaction.id, updateData);

      if (response.success) {
        Alert.alert("Berhasil", "Transaksi berhasil diperbarui");
        onTransactionUpdated();
      }
    } catch (error) {
      console.error("Error updating transaction:", error);
      Alert.alert("Error", "Gagal memperbarui transaksi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setAmount("");
    setDescription("");
    setSelectedWallet(null);
    setSelectedCategory(null);
    setTransactionDate("");
    setTransactionType("expense");
    onClose();
  };
  const handleChangeDate = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios"); // iOS tetap tampil setelah pilih
    if (selectedDate) {
      const isoDate = selectedDate.toISOString().split("T")[0]; // format yyyy-mm-dd
      setTransactionDate(isoDate);
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    if (numericValue === "") return "";

    return new Intl.NumberFormat("id-ID").format(parseInt(numericValue));
  };

  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setAmount(numericValue);
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (!visible || !transaction) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Transaksi</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Simpan</Text>
            )}
          </TouchableOpacity>
        </View>

        {isLoadingData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Memuat data...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Transaction Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Jenis Transaksi</Text>
              <View style={styles.typeContainer}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === "expense" && styles.typeButtonActive,
                    transactionType === "expense" && styles.expenseActive,
                  ]}
                  onPress={() => setTransactionType("expense")}
                >
                  <MaterialIcons
                    name="trending-down"
                    size={20}
                    color={transactionType === "expense" ? "#fff" : "#dc3545"}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      transactionType === "expense" &&
                        styles.typeButtonTextActive,
                    ]}
                  >
                    Pengeluaran
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === "income" && styles.typeButtonActive,
                    transactionType === "income" && styles.incomeActive,
                  ]}
                  onPress={() => setTransactionType("income")}
                >
                  <MaterialIcons
                    name="trending-up"
                    size={20}
                    color={transactionType === "income" ? "#fff" : "#28a745"}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      transactionType === "income" &&
                        styles.typeButtonTextActive,
                    ]}
                  >
                    Pemasukan
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Amount */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Jumlah</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.currencySymbol}>Rp</Text>
                <TextInput
                  style={styles.amountInput}
                  value={formatCurrency(amount)}
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#ccc"
                />
              </View>
            </View>

            {/* Wallet Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dompet</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.optionsContainer}>
                  {wallets.map((wallet) => (
                    <TouchableOpacity
                      key={wallet.id}
                      style={[
                        styles.optionButton,
                        selectedWallet?.id === wallet.id &&
                          styles.optionButtonActive,
                      ]}
                      onPress={() => setSelectedWallet(wallet)}
                    >
                      <MaterialIcons
                        name="account-balance-wallet"
                        size={18}
                        color={
                          selectedWallet?.id === wallet.id ? "#fff" : "#666"
                        }
                      />
                      <Text
                        style={[
                          styles.optionButtonText,
                          selectedWallet?.id === wallet.id &&
                            styles.optionButtonTextActive,
                        ]}
                      >
                        {wallet.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Category Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kategori</Text>
              <View style={styles.optionsGrid}>
                {categories
                  .filter((category) => category.type === transactionType)
                  .map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryButton,
                        selectedCategory?.id === category.id &&
                          styles.categoryButtonActive,
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <MaterialIcons
                        name="category"
                        size={18}
                        color={
                          selectedCategory?.id === category.id ? "#fff" : "#666"
                        }
                      />
                      <Text
                        style={[
                          styles.categoryButtonText,
                          selectedCategory?.id === category.id &&
                            styles.categoryButtonTextActive,
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Deskripsi</Text>
              <TextInput
                style={styles.descriptionInput}
                value={description}
                onChangeText={setDescription}
                placeholder="Tambahkan catatan (opsional)"
                placeholderTextColor="#ccc"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Date Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tanggal</Text>
              <View style={styles.dateContainer}>
                <MaterialIcons name="calendar-today" size={20} color="#666" />
                <Text style={styles.dateText}>
                  {transactionDate
                    ? formatDateForDisplay(transactionDate)
                    : "Belum dipilih"}
                </Text>
                <TouchableOpacity
                  style={styles.changeDateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.changeDateText}>Ubah</Text>
                </TouchableOpacity>
              </View>

              {/* Tampilkan Date Picker jika showDatePicker true */}
              {showDatePicker && (
                <DateTimePicker
                  mode="date"
                  value={
                    transactionDate ? new Date(transactionDate) : new Date()
                  }
                  display="default"
                  onChange={handleChangeDate}
                  maximumDate={new Date()}
                />
              )}
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    gap: 8,
  },
  typeButtonActive: {
    borderColor: "transparent",
  },
  expenseActive: {
    backgroundColor: "#dc3545",
  },
  incomeActive: {
    backgroundColor: "#28a745",
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  typeButtonTextActive: {
    color: "#fff",
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: "600",
    color: "#2c3e50",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    color: "#2c3e50",
  },
  optionsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 6,
  },
  optionButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  optionButtonTextActive: {
    color: "#fff",
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 6,
    marginBottom: 8,
  },
  categoryButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  categoryButtonTextActive: {
    color: "#fff",
  },
  descriptionInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    fontSize: 16,
    color: "#2c3e50",
    minHeight: 80,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dateText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#2c3e50",
  },
  changeDateButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  changeDateText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  bottomSpacer: {
    height: 40,
  },
});
