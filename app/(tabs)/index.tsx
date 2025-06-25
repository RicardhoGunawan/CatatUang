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
  StatusBar,
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
  // const { logout } = useAuth();
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

  // const confirmLogout = () => {
  //   Alert.alert(
  //     "Konfirmasi Keluar",
  //     "Apakah Anda yakin ingin keluar?",
  //     [
  //       { text: "Batal", style: "cancel" },
  //       {
  //         text: "Keluar",
  //         style: "destructive",
  //         onPress: () => performLogout(),
  //       },
  //     ],
  //     { cancelable: true }
  //   );
  // };

  // const performLogout = async () => {
  //   try {
  //     await logout();
  //     router.replace("/(auth)/login");
  //   } catch (error) {
  //     console.error("Logout failed:", error);
  //     Alert.alert("Error", "Gagal keluar, silakan coba lagi");
  //   }
  // };

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
        setRecentTransactions(response.data.data.slice(0, 5));
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

        const total = response.data.reduce((sum, wallet) => {
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
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        {/* StatusBar untuk loading state */}
        <StatusBar
          animated={true}
          backgroundColor="#f0f0f0"
          barStyle="dark-content"
          translucent={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* StatusBar dengan warna yang sesuai header */}
      <StatusBar
        animated={true}
        backgroundColor="#4A90E2"
        barStyle="light-content"
        translucent={false}
      />
      
      {/* Compact Sticky Header */}
      <View style={styles.stickyHeader}>
        <View style={styles.headerGradient}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.brandContainer}>
                <View style={styles.logoContainer}>
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={24}
                    color="#FFD700"
                  />
                </View>
                <View style={styles.appTitleContainer}>
                  <Text style={styles.appTitle}>CatatUang</Text>
                  <Text style={styles.appSubtitle}>Kelola Keuangan Anda</Text>
                </View>
              </View>
            </View>

            {/* <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={confirmLogout}
                style={styles.logoutButton}
                activeOpacity={0.7}
              >
                <MaterialIcons name="logout" size={18} color="#FF4757" />
                <Text style={styles.logoutText}>Keluar</Text>
              </TouchableOpacity>
            </View> */}
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Balance Card with Gradient Effect */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceCardOverlay} />
          <View style={styles.balanceContent}>
            <Text style={styles.balanceLabel}>Total Saldo</Text>
            <Text style={styles.balanceAmount}>
              {formatCurrency(totalBalance)}
            </Text>
            <View style={styles.balanceIndicator}>
              <MaterialIcons
                name="account-balance-wallet"
                size={16}
                color="#fff"
              />
              <Text style={styles.balanceSubtext}>Semua Dompet</Text>
            </View>
          </View>
        </View>

        {/* Enhanced Summary Cards */}
        {summary && (
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, styles.incomeCard]}>
              <View style={styles.summaryIconContainer}>
                <MaterialIcons name="trending-up" size={22} color="#27AE60" />
              </View>
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryLabel}>Pemasukan</Text>
                <Text style={[styles.summaryAmount, { color: "#27AE60" }]}>
                  {formatCurrency(summary.summary.total_income)}
                </Text>
              </View>
            </View>
            <View style={[styles.summaryCard, styles.expenseCard]}>
              <View style={styles.summaryIconContainer}>
                <MaterialIcons name="trending-down" size={22} color="#E74C3C" />
              </View>
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryLabel}>Pengeluaran</Text>
                <Text style={[styles.summaryAmount, { color: "#E74C3C" }]}>
                  {formatCurrency(summary.summary.total_expense)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Enhanced Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transaksi Terbaru</Text>
            <TouchableOpacity
              onPress={() => router.push("/transactions")}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAll}>Lihat Semua</Text>
              <MaterialIcons
                name="arrow-forward-ios"
                size={12}
                color="#4A90E2"
              />
            </TouchableOpacity>
          </View>

          {recentTransactions.length > 0 ? (
            <View style={styles.transactionList}>
              {recentTransactions.map((transaction, index) => (
                <View
                  key={transaction.id}
                  style={[
                    styles.transactionItem,
                    index === recentTransactions.length - 1 &&
                      styles.lastTransactionItem,
                  ]}
                >
                  <View
                    style={[
                      styles.transactionIcon,
                      transaction.type === "income"
                        ? styles.incomeIcon
                        : styles.expenseIcon,
                    ]}
                  >
                    <MaterialIcons
                      name={
                        transaction.type === "income"
                          ? "trending-up"
                          : "trending-down"
                      }
                      size={18}
                      color={
                        transaction.type === "income" ? "#27AE60" : "#E74C3C"
                      }
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionCategory}>
                      {transaction.category?.name || "Tanpa Kategori"}
                    </Text>
                    <Text
                      style={styles.transactionDescription}
                      numberOfLines={1}
                    >
                      {transaction.description || "Tidak ada deskripsi"}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.transaction_date)}
                    </Text>
                  </View>
                  <View style={styles.transactionAmountContainer}>
                    <Text
                      style={[
                        styles.transactionAmount,
                        {
                          color:
                            transaction.type === "income"
                              ? "#27AE60"
                              : "#E74C3C",
                        },
                      ]}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <MaterialIcons name="receipt-long" size={40} color="#BDC3C7" />
              </View>
              <Text style={styles.emptyText}>Belum ada transaksi</Text>
              <Text style={styles.emptySubtext}>
                Mulai catat transaksi Anda
              </Text>
            </View>
          )}
        </View>

        {/* Enhanced Wallets */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dompet Saya</Text>
            <TouchableOpacity
              onPress={() => router.push("/wallets")}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAll}>Kelola</Text>
              <MaterialIcons
                name="arrow-forward-ios"
                size={12}
                color="#4A90E2"
              />
            </TouchableOpacity>
          </View>

          {wallets.length > 0 ? (
            <View style={styles.walletList}>
              {wallets.slice(0, 3).map((wallet, index) => (
                <View
                  key={wallet.id}
                  style={[
                    styles.walletItem,
                    index === Math.min(wallets.length - 1, 2) &&
                      styles.lastWalletItem,
                  ]}
                >
                  <View style={styles.walletIcon}>
                    <MaterialIcons
                      name="account-balance-wallet"
                      size={18}
                      color="#4A90E2"
                    />
                  </View>
                  <View style={styles.walletDetails}>
                    <Text style={styles.walletName}>{wallet.name}</Text>
                    <Text style={styles.walletType}>
                      {wallet.user_wallet_type?.name || "Dompet"}
                    </Text>
                  </View>
                  <View style={styles.walletBalanceContainer}>
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
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <MaterialIcons
                  name="account-balance-wallet"
                  size={40}
                  color="#BDC3C7"
                />
              </View>
              <Text style={styles.emptyText}>Belum ada dompet</Text>
              <Text style={styles.emptySubtext}>
                Tambahkan dompet pertama Anda
              </Text>
            </View>
          )}
        </View>

        {/* Bottom spacing for better scrolling experience */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  // Compact Header Styles
  stickyHeader: {
    backgroundColor: "#4A90E2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerGradient: {
    // Jika menggunakan gradient library, bisa ditambahkan di sini
    backgroundColor: "linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 70,
  },
  headerLeft: {
    flex: 1,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },

   appTitleContainer: {
    flex: 1,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: "800",
    fontFamily: "inter",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 2,
  },
  appSubtitle: {
    fontSize: 12,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.8)",
    letterSpacing: 0.3,
  },
  headerRight: {
    marginLeft: 16,
  },
  // titleUnderline: {
  //   width: 30,
  //   height: 2,
  //   backgroundColor: "#FFD700",
  //   marginLeft: 8,
  //   borderRadius: 1,
  // },

  // logoutButton: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   paddingHorizontal: 16,
  //   paddingVertical: 10,
  //   borderRadius: 25,
  //   backgroundColor: "rgba(255, 255, 255, 0.9)",
  //   borderWidth: 1,
  //   borderColor: "rgba(255, 71, 87, 0.2)",
  //   shadowColor: "rgba(255, 71, 87, 0.3)",
  //   shadowOffset: { width: 0, height: 3 },
  //   shadowOpacity: 0.3,
  //   shadowRadius: 6,
  //   elevation: 4,
  //   minWidth: 80,
  //   justifyContent: "center",
  // },
  // logoutText: {
  //   fontSize: 13,
  //   fontWeight: "600",
  //   color: "#FF4757",
  //   marginLeft: 6,
  //   letterSpacing: 0.2,
  // },
  scrollView: {
    flex: 1,
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
    color: "#64748B",
  },
  // Enhanced Balance Card
  balanceCard: {
    backgroundColor: "#4A90E2",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    position: "relative",
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#4A90E2",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  balanceCardOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
  },
  balanceContent: {
    alignItems: "center",
    position: "relative",
  },
  balanceLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
    fontWeight: "500",
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
    letterSpacing: -0.5,
  },
  balanceIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
  },
  balanceSubtext: {
    fontSize: 12,
    color: "#FFFFFF",
    marginLeft: 4,
    fontWeight: "500",
  },
  // Enhanced Summary Cards
  summaryContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  incomeCard: {
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 4,
    borderLeftColor: "#27AE60",
  },
  expenseCard: {
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 4,
    borderLeftColor: "#E74C3C",
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
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
    fontWeight: "700",
    color: "#1E293B",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  seeAll: {
    fontSize: 14,
    color: "#4A90E2",
    fontWeight: "600",
    marginRight: 4,
  },
  // Enhanced Transaction List
  transactionList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  lastTransactionItem: {
    borderBottomWidth: 0,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  incomeIcon: {
    backgroundColor: "#DCFCE7",
  },
  expenseIcon: {
    backgroundColor: "#FEF2F2",
  },
  transactionDetails: {
    flex: 1,
    marginRight: 8,
  },
  transactionCategory: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  transactionDescription: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  transactionAmountContainer: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  // Enhanced Wallet List
  walletList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  walletItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  lastWalletItem: {
    borderBottomWidth: 0,
  },
  walletIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EBF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  walletDetails: {
    flex: 1,
    marginRight: 8,
  },
  walletName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  walletType: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  walletBalanceContainer: {
    alignItems: "flex-end",
  },
  walletBalance: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  // Enhanced Empty State
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
  },
  bottomSpacing: {
    height: 20,
  },
});