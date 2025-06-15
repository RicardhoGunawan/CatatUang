import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import {
  transactionsAPI,
  walletsAPI,
  Transaction,
  Wallet,
  TransactionSummary,
} from "../../services/api";

export default function HomeScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    []
  );
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const router = useRouter();
  const { logout } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadSummary(),
        loadRecentTransactions(),
        loadWallets(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      "Konfirmasi Keluar",
      "Apakah Anda yakin ingin keluar?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: () => performLogout(),
        },
      ],
      { cancelable: true }
    );
  };

  const performLogout = async () => {
    try {
      await logout(); // fungsi logout milikmu
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Logout failed:", error);
      Alert.alert("Error", "Gagal keluar, silakan coba lagi");
    }
  };

  const loadSummary = async () => {
    try {
      const response = await transactionsAPI.getSummary();
      if (response.success && response.data) {
        setSummary(response.data);
      }
    } catch (error) {
      console.error("Error loading summary:", error);
    }
  };

  const loadRecentTransactions = async () => {
    try {
      const response = await transactionsAPI.getAll({ page: 1 });
      if (response.success && response.data) {
        setRecentTransactions(response.data.data.slice(0, 5)); // Take only 5 recent
      }
    } catch (error) {
      console.error("Error loading recent transactions:", error);
    }
  };

  const loadWallets = async () => {
    try {
      const response = await walletsAPI.getAll();

      if (response.success && response.data) {
        setWallets(response.data);

        // Perbaikan perhitungan total balance
        const total = response.data.reduce((sum, wallet) => {
          // Pastikan balance adalah number dan bukan NaN
          const balance =
            typeof wallet.balance === "string"
              ? parseFloat(wallet.balance) || 0
              : typeof wallet.balance === "number"
              ? wallet.balance
              : 0;
          return sum + balance;
        }, 0);

        setTotalBalance(total);
      } else {
        console.log("Wallets API failed or no data:", response);
        setWallets([]);
        setTotalBalance(0);
      }
    } catch (error) {
      console.error("Error loading wallets:", error);
      setWallets([]);
      setTotalBalance(0);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    // Pastikan amount adalah number dan bukan NaN
    const validAmount = isNaN(amount) ? 0 : amount;

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(validAmount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Halo, {user?.name}!</Text>
          <Text style={styles.subtitle}>Selamat datang di CatatUang</Text>
          <TouchableOpacity onPress={confirmLogout} style={styles.logoutButton}>
            <MaterialIcons name="logout" size={20} color="#dc3545" />
          </TouchableOpacity>
        </View>

        {/* Total Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Saldo</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(totalBalance)}
          </Text>
        </View>

        {/* Summary Cards */}
        {summary && (
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, { backgroundColor: "#e8f5e8" }]}>
              <MaterialIcons name="trending-up" size={24} color="#28a745" />
              <Text style={styles.summaryLabel}>Pemasukan</Text>
              <Text style={[styles.summaryAmount, { color: "#28a745" }]}>
                {formatCurrency(summary.summary.total_income)}
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: "#ffeaea" }]}>
              <MaterialIcons name="trending-down" size={24} color="#dc3545" />
              <Text style={styles.summaryLabel}>Pengeluaran</Text>
              <Text style={[styles.summaryAmount, { color: "#dc3545" }]}>
                {formatCurrency(summary.summary.total_expense)}
              </Text>
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transaksi Terbaru</Text>
            <TouchableOpacity onPress={() => router.push("/transactions")}>
              <Text style={styles.seeAll}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length > 0 ? (
            <View style={styles.transactionList}>
              {recentTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={styles.transactionIcon}>
                    <MaterialIcons
                      name={
                        transaction.type === "income"
                          ? "trending-up"
                          : "trending-down"
                      }
                      size={20}
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
                      {formatDate(transaction.transaction_date)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color:
                          transaction.type === "income" ? "#28a745" : "#dc3545",
                      },
                    ]}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt-long" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Belum ada transaksi</Text>
            </View>
          )}
        </View>

        {/* Wallets */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dompet Saya</Text>
            <TouchableOpacity onPress={() => router.push("/wallets")}>
              <Text style={styles.seeAll}>Kelola</Text>
            </TouchableOpacity>
          </View>

          {wallets.length > 0 ? (
            <View style={styles.walletList}>
              {wallets.slice(0, 3).map((wallet) => (
                <View key={wallet.id} style={styles.walletItem}>
                  <View style={styles.walletIcon}>
                    <MaterialIcons
                      name="account-balance-wallet"
                      size={20}
                      color="#007AFF"
                    />
                  </View>
                  <View style={styles.walletDetails}>
                    <Text style={styles.walletName}>{wallet.name}</Text>
                    <Text style={styles.walletType}>
                      {wallet.user_wallet_type?.name || "Dompet"}
                    </Text>
                  </View>
                  <Text style={styles.walletBalance}>
                    {formatCurrency(
                      typeof wallet.balance === "string"
                        ? parseFloat(wallet.balance) || 0
                        : typeof wallet.balance === "number"
                        ? wallet.balance
                        : 0
                    )}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons
                name="account-balance-wallet"
                size={48}
                color="#ccc"
              />
              <Text style={styles.emptyText}>Belum ada dompet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  logoutButton: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: 8,
  },
  scrollContainer: {
    padding: 16,
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
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  subtitle: {
    fontSize: 16,
    color: "#7f8c8d",
    marginTop: 4,
  },
  balanceCard: {
    backgroundColor: "#007AFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 16,
    color: "#fff",
    opacity: 0.8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 8,
  },
  summaryContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  seeAll: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  transactionList: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  walletList: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  walletItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e6f3ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  walletDetails: {
    flex: 1,
  },
  walletName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  walletType: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  walletBalance: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 8,
  },
});
