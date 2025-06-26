import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  FlatList,
  StatusBar,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { transactionsAPI, Transaction } from "../../services/api";
import { useFocusEffect } from "@react-navigation/native";
import AddTransactionModal from "../../components/AddTransactionModal";
import EditTransactionModal from "../../components/EditTransactionModal";

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">(
    "all"
  );
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [groupedTransactions, setGroupedTransactions] = useState<{
    [key: string]: Transaction[];
  }>({});

  // Generate months for date picker
  const generateMonths = () => {
    const months = [];
    const currentDate = new Date();
    for (let i = 0; i < 24; i++) {
      // Last 24 months
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      months.push(date);
    }
    return months;
  };

  const [availableMonths] = useState(generateMonths());

  useFocusEffect(
    useCallback(() => {
      loadTransactions(true);
    }, [filterType, selectedDate])
  );

  const loadTransactions = async (refresh = false) => {
    try {
      if (refresh) {
        setIsLoading(true);
        setCurrentPage(1);
      } else {
        setIsLoadingMore(true);
      }

      // Set date range for selected month
      const startDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1
      );
      const endDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        0
      );

      const params: any = {
        page: refresh ? 1 : currentPage + 1,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        ...(filterType !== "all" && { type: filterType }),
      };

      const response = await transactionsAPI.getAll(params);

      if (response.success && response.data) {
        const newTransactions = response.data.data;

        if (refresh) {
          setTransactions(newTransactions);
          setCurrentPage(1);
        } else {
          setTransactions((prev) => [...prev, ...newTransactions]);
          setCurrentPage((prev) => prev + 1);
        }

        setLastPage(response.data.last_page);
        groupTransactionsByDate(
          refresh ? newTransactions : [...transactions, ...newTransactions]
        );
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
      Alert.alert("Error", "Gagal memuat transaksi");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  const groupTransactionsByDate = (transactionList: Transaction[]) => {
    const grouped = transactionList.reduce(
      (groups: { [key: string]: Transaction[] }, transaction) => {
        const date = new Date(transaction.transaction_date).toDateString();
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(transaction);
        return groups;
      },
      {}
    );

    // Sort groups by date (newest first)
    const sortedGroups: { [key: string]: Transaction[] } = {};
    Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .forEach((key) => {
        sortedGroups[key] = grouped[key].sort(
          (a, b) =>
            new Date(b.transaction_date).getTime() -
            new Date(a.transaction_date).getTime()
        );
      });

    setGroupedTransactions(sortedGroups);
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadTransactions(true);
  };

  const loadMore = () => {
    if (currentPage < lastPage && !isLoadingMore) {
      loadTransactions(false);
    }
  };

  const deleteTransaction = async (id: number) => {
    Alert.alert(
      "Hapus Transaksi",
      "Apakah Anda yakin ingin menghapus transaksi ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await transactionsAPI.delete(id);
              if (response.success) {
                const updatedTransactions = transactions.filter(
                  (t) => t.id !== id
                );
                setTransactions(updatedTransactions);
                groupTransactionsByDate(updatedTransactions);
                Alert.alert("Berhasil", "Transaksi berhasil dihapus");
              }
            } catch (error) {
              console.error("Error deleting transaction:", error);
              Alert.alert("Error", "Gagal menghapus transaksi");
            }
          },
        },
      ]
    );
  };

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowEditModal(true);
  };

  const handleTransactionAdded = () => {
    loadTransactions(true);
  };

  const handleTransactionUpdated = () => {
    setShowEditModal(false);
    setSelectedTransaction(null);
    loadTransactions(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateGroup = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Hari Ini";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Kemarin";
    } else {
      return date.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    }
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
  };

  const filteredGroupedTransactions = Object.keys(groupedTransactions).reduce(
    (filtered, date) => {
      const filteredTransactions = groupedTransactions[date].filter(
        (transaction) =>
          transaction.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          transaction.category?.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      );

      if (filteredTransactions.length > 0) {
        filtered[date] = filteredTransactions;
      }

      return filtered;
    },
    {} as { [key: string]: Transaction[] }
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        {/* StatusBar untuk loading state */}
        <StatusBar
          animated={true}
          backgroundColor="#4A90E2"
          barStyle="light-content"
          translucent={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Memuat Transaksi...</Text>
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
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Aktivitas</Text>
          <Text style={styles.headerSubtitle}>
            Kelola catatan finansial harian
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[styles.actionButton, showFilters && styles.activeButton]}
          >
            <MaterialIcons
              name="filter-list"
              size={20}
              color={showFilters ? "#fff" : "#007AFF"}
            />
            <Text
              style={[
                styles.buttonText,
                showFilters && styles.activeButtonText,
              ]}
            >
              Filter
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Selector */}
      <TouchableOpacity
        style={styles.dateSelector}
        onPress={() => setShowDatePicker(true)}
      >
        <MaterialIcons name="calendar-today" size={20} color="#007AFF" />
        <Text style={styles.dateSelectorText}>
          {formatMonthYear(selectedDate)}
        </Text>
        <MaterialIcons name="keyboard-arrow-down" size={20} color="#007AFF" />
      </TouchableOpacity>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari transaksi..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterType === "all" && styles.filterChipActive,
              ]}
              onPress={() => setFilterType("all")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterType === "all" && styles.filterChipTextActive,
                ]}
              >
                Semua
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterType === "income" && styles.filterChipActive,
              ]}
              onPress={() => setFilterType("income")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterType === "income" && styles.filterChipTextActive,
                ]}
              >
                Pemasukan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterType === "expense" && styles.filterChipActive,
              ]}
              onPress={() => setFilterType("expense")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterType === "expense" && styles.filterChipTextActive,
                ]}
              >
                Pengeluaran
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Transaction List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom
          ) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {Object.keys(filteredGroupedTransactions).length > 0 ? (
          <View style={styles.transactionList}>
            {Object.keys(filteredGroupedTransactions).map((date) => (
              <View key={date} style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <Text style={styles.dateHeaderText}>
                    {formatDateGroup(date)}
                  </Text>
                  <View style={styles.dateHeaderLine} />
                </View>

                {filteredGroupedTransactions[date].map((transaction) => (
                  <View key={transaction.id} style={styles.transactionItem}>
                    <View style={styles.transactionIcon}>
                      <MaterialIcons
                        name={
                          transaction.type === "income"
                            ? "trending-up"
                            : "trending-down"
                        }
                        size={24}
                        color={
                          transaction.type === "income" ? "#28a745" : "#dc3545"
                        }
                      />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionCategory}>
                        {transaction.category?.name || "Tanpa Kategori"}
                      </Text>
                      <Text style={styles.transactionDescription}>
                        {transaction.description || "Tidak ada deskripsi"}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {new Date(
                          transaction.transaction_date
                        ).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        • {transaction.wallet?.name || "Dompet"}
                      </Text>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text
                        style={[
                          styles.transactionAmount,
                          {
                            color:
                              transaction.type === "income"
                                ? "#28a745"
                                : "#dc3545",
                          },
                        ]}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </Text>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          onPress={() => handleEdit(transaction)}
                          style={styles.editButton}
                        >
                          <MaterialIcons
                            name="edit"
                            size={16}
                            color="#007AFF"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => deleteTransaction(transaction.id)}
                          style={styles.deleteButton}
                        >
                          <MaterialIcons
                            name="delete"
                            size={16}
                            color="#dc3545"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ))}

            {isLoadingMore && (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#007AFF" />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
            <Text style={styles.emptyText}>
              Transaksi untuk {formatMonthYear(selectedDate)} akan muncul di
              sini
            </Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={() => setShowAddModal(true)}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.emptyAddButtonText}>Tambah Transaksi</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Pilih Bulan</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableMonths}
              keyExtractor={(item) => item.toISOString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.monthItem,
                    item.getMonth() === selectedDate.getMonth() &&
                      item.getFullYear() === selectedDate.getFullYear() &&
                      styles.monthItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedDate(item);
                    setShowDatePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.monthItemText,
                      item.getMonth() === selectedDate.getMonth() &&
                        item.getFullYear() === selectedDate.getFullYear() &&
                        styles.monthItemTextSelected,
                    ]}
                  >
                    {formatMonthYear(item)}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onTransactionAdded={handleTransactionAdded}
      />

      {/* Edit Transaction Modal */}
      {selectedTransaction && (
        <EditTransactionModal
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTransaction(null);
          }}
          onTransactionUpdated={handleTransactionUpdated}
          transaction={selectedTransaction}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
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
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    gap: 6,
  },
  activeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  activeButtonText: {
    color: "#FFFFFF",
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dateSelectorText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterChip: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#007AFF",
  },
  filterChipText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  transactionList: {
    marginHorizontal: 16,
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginRight: 12,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  transactionDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#f0f8ff",
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#fff5f5",
  },
  loadingMore: {
    padding: 16,
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  emptyAddButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  datePickerModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  monthItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  monthItemSelected: {
    backgroundColor: "#f0f8ff",
  },
  monthItemText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  monthItemTextSelected: {
    color: "#007AFF",
    fontWeight: "600",
  },
});
