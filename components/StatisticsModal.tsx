import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  FlatList,
  BackHandler,
} from "react-native";
import Modal from "react-native-modal";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { PieChart, LineChart, BarChart } from "react-native-chart-kit";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
} from "date-fns";
import { id } from "date-fns/locale";
import {
  transactionsAPI,
  categoriesAPI,
  Transaction,
  Category,
} from "../services/api";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface StatisticsModalProps {
  isVisible: boolean;
  onClose: () => void;
}

interface ChartData {
  name: string;
  amount: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

interface LineChartData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
}

interface ComparisonData {
  labels: string[];
  datasets: {
    data: number[];
    color: (opacity: number) => string;
    strokeWidth?: number;
  }[];
  legend: string[];
}

const COLORS = [
  "#FF6384",
  "#36A2EB",
  "#FFCE56",
  "#4BC0C0",
  "#9966FF",
  "#FF9F40",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
];

export const StatisticsModal: React.FC<StatisticsModalProps> = ({
  isVisible,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    "expense" | "income" | "comparison"
  >("expense");
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [comparisonPieData, setComparisonPieData] = useState<ChartData[]>([]);
  const [pieChartData, setPieChartData] = useState<ChartData[]>([]);
  const [lineChartData, setLineChartData] = useState<LineChartData>({
    labels: [],
    datasets: [{ data: [] }],
  });

  // Comparison tab states
  const [comparisonData, setComparisonData] = useState<ComparisonData>({
    labels: [],
    datasets: [],
    legend: [],
  });
  const [selectedComparisonMonth, setSelectedComparisonMonth] = useState(
    new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<Date[]>([]);

  useEffect(() => {
    if (isVisible) {
      generateAvailableMonths();
      loadData();
    }
  }, [isVisible, activeTab, period, selectedComparisonMonth]);

  // useEffect terpisah untuk handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (isVisible) {
          onClose();
          return true; // Mencegah default behavior
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, [isVisible, onClose]); // Dependensi yang diperlukan

  const generateAvailableMonths = () => {
    const months: Date[] = [];
    const currentDate = new Date();

    // Generate last 12 months
    for (let i = 0; i < 12; i++) {
      const monthDate = subMonths(currentDate, i + 1);
      months.push(monthDate);
    }

    setAvailableMonths(months);
    if (months.length > 0 && !selectedComparisonMonth) {
      setSelectedComparisonMonth(months[0]);
    }
  };

  const formatMonthYear = (date: Date) => {
    return format(date, "MMMM yyyy", { locale: id });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "comparison") {
        await loadComparisonData();
      } else {
        const { startDate, endDate } = getDateRange();

        // Load transactions and categories
        const [transactionsResponse, categoriesResponse] = await Promise.all([
          transactionsAPI.getAll({
            start_date: startDate,
            end_date: endDate,
            type: activeTab,
          }),
          categoriesAPI.getAll(),
        ]);

        if (transactionsResponse.success && categoriesResponse.success) {
          const transactionData = transactionsResponse.data?.data || [];
          const categoryData = categoriesResponse.data || [];

          setTransactions(transactionData);
          setCategories(categoryData);

          // Process data for charts
          processPieChartData(transactionData, categoryData);
          processLineChartData(transactionData);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Gagal memuat data statistik");
    } finally {
      setLoading(false);
    }
  };

  const loadComparisonData = async () => {
    try {
      const currentMonth = new Date();
      const comparisonMonth = selectedComparisonMonth;

      // Get date ranges for both months
      const currentStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const currentEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      const comparisonStart = format(
        startOfMonth(comparisonMonth),
        "yyyy-MM-dd"
      );
      const comparisonEnd = format(endOfMonth(comparisonMonth), "yyyy-MM-dd");

      // Load data for both months
      const [
        currentExpenses,
        currentIncome,
        comparisonExpenses,
        comparisonIncome,
      ] = await Promise.all([
        transactionsAPI.getAll({
          start_date: currentStart,
          end_date: currentEnd,
          type: "expense",
        }),
        transactionsAPI.getAll({
          start_date: currentStart,
          end_date: currentEnd,
          type: "income",
        }),
        transactionsAPI.getAll({
          start_date: comparisonStart,
          end_date: comparisonEnd,
          type: "expense",
        }),
        transactionsAPI.getAll({
          start_date: comparisonStart,
          end_date: comparisonEnd,
          type: "income",
        }),
      ]);

      if (
        currentExpenses.success &&
        currentIncome.success &&
        comparisonExpenses.success &&
        comparisonIncome.success
      ) {
        processComparisonData(
          currentExpenses.data?.data || [],
          currentIncome.data?.data || [],
          comparisonExpenses.data?.data || [],
          comparisonIncome.data?.data || []
        );
      }
    } catch (error) {
      console.error("Error loading comparison data:", error);
    }
  };

  const processComparisonData = (
    currentExpenses: Transaction[],
    currentIncome: Transaction[],
    comparisonExpenses: Transaction[],
    comparisonIncome: Transaction[]
  ) => {
    const currentExpenseTotal = currentExpenses.reduce(
      (sum, t) => sum + safeNumber(t.amount),
      0
    );
    const currentIncomeTotal = currentIncome.reduce(
      (sum, t) => sum + safeNumber(t.amount),
      0
    );
    const comparisonExpenseTotal = comparisonExpenses.reduce(
      (sum, t) => sum + safeNumber(t.amount),
      0
    );
    const comparisonIncomeTotal = comparisonIncome.reduce(
      (sum, t) => sum + safeNumber(t.amount),
      0
    );

    // Data untuk bar chart (tetap dipertahankan untuk insights)
    const data: ComparisonData = {
      labels: ["Pengeluaran", "Pemasukan", "Net"],
      datasets: [
        {
          data: [
            currentExpenseTotal,
            currentIncomeTotal,
            currentIncomeTotal - currentExpenseTotal,
          ],
          color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
          strokeWidth: 3,
        },
        {
          data: [
            comparisonExpenseTotal,
            comparisonIncomeTotal,
            comparisonIncomeTotal - comparisonExpenseTotal,
          ],
          color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
          strokeWidth: 3,
        },
      ],
      legend: [
        `${format(new Date(), "MMMM yyyy", { locale: id })}`,
        `${formatMonthYear(selectedComparisonMonth)}`,
      ],
    };

    setComparisonData(data);

    // Data untuk pie chart
    const pieData: ChartData[] = [
      {
        name: "Pengeluaran Bulan Ini",
        amount: currentExpenseTotal,
        color: "#FF6B6B",
        legendFontColor: "#333",
        legendFontSize: 11,
      },
      {
        name: "Pemasukan Bulan Ini",
        amount: currentIncomeTotal,
        color: "#4CAF50",
        legendFontColor: "#333",
        legendFontSize: 11,
      },
      {
        name: `Pengeluaran ${formatMonthYear(selectedComparisonMonth)}`,
        amount: comparisonExpenseTotal,
        color: "#FFB74D",
        legendFontColor: "#333",
        legendFontSize: 11,
      },
      {
        name: `Pemasukan ${formatMonthYear(selectedComparisonMonth)}`,
        amount: comparisonIncomeTotal,
        color: "#81C784",
        legendFontColor: "#333",
        legendFontSize: 11,
      },
    ].filter((item) => item.amount > 0); // Filter out zero amounts

    console.log("Current Expense Total:", currentExpenseTotal);
    console.log("Comparison Expense Total:", comparisonExpenseTotal);
    console.log("Current Income Total:", currentIncomeTotal);
    console.log("Comparison Income Total:", comparisonIncomeTotal);

    setComparisonPieData(pieData);
  };
  const getDateRange = () => {
    const today = new Date();
    let startDate: string;
    let endDate: string;

    if (period === "week") {
      startDate = format(subDays(today, 6), "yyyy-MM-dd");
      endDate = format(today, "yyyy-MM-dd");
    } else {
      startDate = format(startOfMonth(today), "yyyy-MM-dd");
      endDate = format(endOfMonth(today), "yyyy-MM-dd");
    }

    return { startDate, endDate };
  };

  const safeNumber = (value: any): number => {
    const num = Number(value);
    return isNaN(num) || !isFinite(num) ? 0 : num;
  };

  const processPieChartData = (
    transactions: Transaction[],
    categories: Category[]
  ) => {
    const categoryTotals: { [key: number]: number } = {};

    transactions.forEach((transaction) => {
      const amount = safeNumber(transaction.amount);
      if (amount > 0) {
        if (categoryTotals[transaction.category_id]) {
          categoryTotals[transaction.category_id] += amount;
        } else {
          categoryTotals[transaction.category_id] = amount;
        }
      }
    });

    const chartData: ChartData[] = Object.entries(categoryTotals)
      .filter(([, amount]) => amount > 0)
      .map(([categoryId, amount], index) => {
        const category = categories.find(
          (cat) => cat.id === parseInt(categoryId)
        );
        return {
          name: category?.name || "Lainnya",
          amount: safeNumber(amount),
          color: COLORS[index % COLORS.length],
          legendFontColor: "#333",
          legendFontSize: 12,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    setPieChartData(chartData);
  };

  const processLineChartData = (transactions: Transaction[]) => {
    const days = period === "week" ? 7 : 30;
    const labels: string[] = [];
    const data: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayTransactions = transactions.filter((t) => {
        const transactionDate = format(
          new Date(t.transaction_date),
          "yyyy-MM-dd"
        );
        return transactionDate === dateStr;
      });

      const dayTotal = dayTransactions.reduce(
        (sum, t) => sum + safeNumber(t.amount),
        0
      );

      labels.push(format(date, period === "week" ? "dd/MM" : "dd"));
      data.push(safeNumber(dayTotal));
    }

    const validData = data.map((value) => safeNumber(value));
    const hasValidData = validData.some((value) => value > 0);

    setLineChartData({
      labels,
      datasets: [
        {
          data: hasValidData ? validData : [0],
          color: (opacity = 1) =>
            activeTab === "expense"
              ? `rgba(255, 107, 107, ${opacity})`
              : `rgba(76, 175, 80, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    });
  };

  const formatCurrency = (amount: number) => {
    const safeAmount = safeNumber(amount);
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(safeAmount);
  };

  const getTotalAmount = () => {
    return pieChartData.reduce((sum, item) => sum + safeNumber(item.amount), 0);
  };

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: activeTab === "expense" ? "#FF6B6B" : "#4CAF50",
    },
    fillShadowGradient: activeTab === "expense" ? "#FF6B6B" : "#4CAF50",
    fillShadowGradientOpacity: 0.1,
  };

  const renderComparisonInsights = () => {
    if (comparisonData.datasets.length < 2) return null;

    const currentData = comparisonData.datasets[0].data;
    const comparisonData_ = comparisonData.datasets[1].data;

    const expenseChange =
      ((currentData[0] - comparisonData_[0]) / comparisonData_[0]) * 100;
    const incomeChange =
      ((currentData[1] - comparisonData_[1]) / comparisonData_[1]) * 100;
    const netChange = currentData[2] - comparisonData_[2];

    return (
      <View style={styles.insightsContainer}>
        <View style={styles.chartHeader}>
          <Ionicons name="bulb-outline" size={20} color="#4A90E2" />
          <Text style={styles.chartTitle}>Insights</Text>
        </View>

        <View style={styles.insightItem}>
          <View style={styles.insightRow}>
            <Ionicons
              name={expenseChange > 0 ? "trending-up" : "trending-down"}
              size={18}
              color={expenseChange > 0 ? "#FF5252" : "#4CAF50"}
            />
            <Text style={styles.insightText}>
              Pengeluaran {expenseChange > 0 ? "naik" : "turun"}{" "}
              {Math.abs(expenseChange).toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.insightItem}>
          <View style={styles.insightRow}>
            <Ionicons
              name={incomeChange > 0 ? "trending-up" : "trending-down"}
              size={18}
              color={incomeChange > 0 ? "#4CAF50" : "#FF5252"}
            />
            <Text style={styles.insightText}>
              Pemasukan {incomeChange > 0 ? "naik" : "turun"}{" "}
              {Math.abs(incomeChange).toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.insightItem}>
          <View style={styles.insightRow}>
            <Ionicons
              name={netChange > 0 ? "trending-up" : "trending-down"}
              size={18}
              color={netChange > 0 ? "#4CAF50" : "#FF5252"}
            />
            <Text style={styles.insightText}>
              Net cash flow {netChange > 0 ? "meningkat" : "menurun"}{" "}
              {formatCurrency(Math.abs(netChange))}
            </Text>
          </View>
        </View>

        {netChange < 0 && (
          <View style={[styles.insightItem, styles.warningInsight]}>
            <View style={styles.insightRow}>
              <Ionicons name="warning-outline" size={18} color="#FF9800" />
              <Text style={[styles.insightText, { color: "#FF9800" }]}>
                Perhatikan pengeluaran Anda bulan ini
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      isVisible={isVisible}
      style={styles.fullScreenModal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.5} // Kurangi opacity untuk feedback visual yang lebih baik
      backdropColor="#000"
      onBackButtonPress={onClose} // Tambahkan ini untuk Android back button
      onBackdropPress={onClose} // Untuk tap di area luar modal
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Statistik Keuangan</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "expense" && styles.activeTab]}
            onPress={() => setActiveTab("expense")}
          >
            <Ionicons
              name="trending-down"
              size={16}
              color={activeTab === "expense" ? "#fff" : "#666"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "expense" && styles.activeTabText,
              ]}
            >
              Pengeluaran
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "income" && styles.activeTab]}
            onPress={() => setActiveTab("income")}
          >
            <Ionicons
              name="trending-up"
              size={16}
              color={activeTab === "income" ? "#fff" : "#666"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "income" && styles.activeTabText,
              ]}
            >
              Pemasukan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "comparison" && styles.activeTab]}
            onPress={() => setActiveTab("comparison")}
          >
            <Ionicons
              name="bar-chart"
              size={16}
              color={activeTab === "comparison" ? "#fff" : "#666"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "comparison" && styles.activeTabText,
              ]}
            >
              Perbandingan
            </Text>
          </TouchableOpacity>
        </View>

        {/* Period Selector (hidden for comparison tab) */}
        {activeTab !== "comparison" && (
          <View style={styles.periodContainer}>
            <TouchableOpacity
              style={[
                styles.periodButton,
                period === "week" && styles.activePeriod,
              ]}
              onPress={() => setPeriod("week")}
            >
              <Ionicons
                name="calendar"
                size={16}
                color={period === "week" ? "#2196F3" : "#666"}
              />
              <Text
                style={[
                  styles.periodText,
                  period === "week" && styles.activePeriodText,
                ]}
              >
                7 Hari Terakhir
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodButton,
                period === "month" && styles.activePeriod,
              ]}
              onPress={() => setPeriod("month")}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={period === "month" ? "#2196F3" : "#666"}
              />
              <Text
                style={[
                  styles.periodText,
                  period === "month" && styles.activePeriodText,
                ]}
              >
                Bulan Ini
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Comparison Month Selector */}
        {activeTab === "comparison" && (
          <View style={styles.periodContainer}>
            <TouchableOpacity
              style={styles.comparisonSelector}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color="#2196F3" />
              <Text style={styles.comparisonText}>
                Bandingkan dengan: {formatMonthYear(selectedComparisonMonth)}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#2196F3" />
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Memuat data statistik...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {activeTab === "comparison" ? (
              // Comparison View
              <>
                {comparisonPieData.length > 0 && (
                  <>
                    {/* Comparison Pie Chart */}
                    <View style={styles.chartContainer}>
                      <View style={styles.chartHeader}>
                        <Ionicons
                          name="pie-chart-outline"
                          size={20}
                          color="#4A90E2"
                        />
                        <Text style={styles.chartTitle}>
                          Pemasukan vs Pengeluaran
                        </Text>
                      </View>
                      <PieChart
                        data={comparisonPieData}
                        width={screenWidth - 40}
                        height={250}
                        chartConfig={{
                          ...chartConfig,
                          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        }}
                        accessor="amount"
                        backgroundColor="transparent"
                        paddingLeft="68"
                        center={[10, 10]}
                        absolute
                        hasLegend={false}
                      />
                      {/* Custom Legend */}
                      <View style={styles.customLegendContainer}>
                        {comparisonPieData.map((item, index) => (
                          <View key={index} style={styles.customLegendItem}>
                            <View
                              style={[
                                styles.customLegendColor,
                                { backgroundColor: item.color },
                              ]}
                            />
                            <Text
                              style={styles.customLegendText}
                              numberOfLines={1}
                            >
                              {item.name}
                            </Text>
                            <Text style={styles.customLegendAmount}>
                              {formatCurrency(item.amount)}
                            </Text>
                          </View>
                        ))}
                      </View>
                      {/* Summary Cards */}
                      {/* <View style={styles.comparisonSummary}>
                        <View style={styles.summaryCard}>
                          <Text style={styles.summaryCardTitle}>Bulan Ini</Text>
                          <View style={styles.summaryCardRow}>
                            <View style={styles.summaryCardItem}>
                              <View
                                style={[
                                  styles.summaryIndicator,
                                  { backgroundColor: "#FF6B6B" },
                                ]}
                              />
                              <Text style={styles.summaryCardLabel}>
                                Keluar
                              </Text>
                              <Text style={styles.summaryAmount}>
                                {formatCurrency(
                                  comparisonPieData.find(
                                    (item) =>
                                      item.name === "Pengeluaran Bulan Ini"
                                  )?.amount || 0
                                )}
                              </Text>
                            </View>
                            <View style={styles.summaryCardItem}>
                              <View
                                style={[
                                  styles.summaryIndicator,
                                  { backgroundColor: "#4CAF50" },
                                ]}
                              />
                              <Text style={styles.summaryCardLabel}>Masuk</Text>
                              <Text style={styles.summaryAmount}>
                                {formatCurrency(
                                  comparisonPieData.find(
                                    (item) =>
                                      item.name === "Pemasukan Bulan Ini"
                                  )?.amount || 0
                                )}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.summaryCard}>
                          <Text style={styles.summaryCardTitle}>
                            {formatMonthYear(selectedComparisonMonth)}
                          </Text>
                          <View style={styles.summaryCardRow}>
                            <View style={styles.summaryCardItem}>
                              <View
                                style={[
                                  styles.summaryIndicator,
                                  { backgroundColor: "#FFB74D" },
                                ]}
                              />
                              <Text style={styles.summaryCardLabel}>
                                Keluar
                              </Text>
                              <Text style={styles.summaryAmount}>
                                {formatCurrency(
                                  comparisonPieData.find((item) =>
                                    item.name.includes(
                                      `Pengeluaran ${formatMonthYear(
                                        selectedComparisonMonth
                                      )}`
                                    )
                                  )?.amount || 0
                                )}
                              </Text>
                            </View>
                            <View style={styles.summaryCardItem}>
                              <View
                                style={[
                                  styles.summaryIndicator,
                                  { backgroundColor: "#81C784" },
                                ]}
                              />
                              <Text style={styles.summaryCardLabel}>Masuk</Text>
                              <Text style={styles.summaryAmount}>
                                {formatCurrency(
                                  comparisonPieData.find((item) =>
                                    item.name.includes(
                                      `Pemasukan ${formatMonthYear(
                                        selectedComparisonMonth
                                      )}`
                                    )
                                  )?.amount || 0
                                )}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View> */}
                    </View>

                    {/* Insights */}
                    {renderComparisonInsights()}
                  </>
                )}
              </>
            ) : (
              // Regular View (Expense/Income)
              <>
                {/* Total Summary */}
                <View
                  style={[
                    styles.summaryContainer,
                    {
                      backgroundColor:
                        activeTab === "expense" ? "#FFE5E5" : "#E8F5E8",
                    },
                  ]}
                >
                  <View style={styles.summaryIconContainer}>
                    <Ionicons
                      name={
                        activeTab === "expense"
                          ? "trending-down"
                          : "trending-up"
                      }
                      size={32}
                      color={activeTab === "expense" ? "#FF5252" : "#4CAF50"}
                    />
                  </View>
                  <Text style={styles.summaryLabel}>
                    Total{" "}
                    {activeTab === "expense" ? "Pengeluaran" : "Pemasukan"}
                  </Text>
                  <Text
                    style={[
                      styles.summaryAmount,
                      {
                        color: activeTab === "expense" ? "#FF5252" : "#4CAF50",
                      },
                    ]}
                  >
                    {formatCurrency(getTotalAmount())}
                  </Text>
                  <Text style={styles.summaryPeriod}>
                    {period === "week" ? "7 hari terakhir" : "Bulan ini"}
                  </Text>
                </View>

                {/* Charts Container */}
                {pieChartData.length > 0 ? (
                  <>
                    {/* Pie Chart */}
                    <View style={styles.chartContainer}>
                      <View style={styles.chartHeader}>
                        <Ionicons
                          name="pie-chart-outline"
                          size={20}
                          color="#4A90E2"
                        />
                        <Text style={styles.chartTitle}>
                          Distribusi per Kategori
                        </Text>
                      </View>
                      <PieChart
                        data={pieChartData}
                        width={screenWidth - 40}
                        height={250}
                        chartConfig={chartConfig}
                        accessor="amount"
                        backgroundColor="transparent"
                        paddingLeft="68"
                        center={[10, 10]}
                        absolute
                        hasLegend={false}
                      />
                    </View>

                    {/* Category List */}
                    <View style={styles.categoryContainer}>
                      <View style={styles.chartHeader}>
                        <Ionicons
                          name="list-outline"
                          size={20}
                          color="#4A90E2"
                        />
                        <Text style={styles.chartTitle}>Detail Kategori</Text>
                      </View>
                      {pieChartData.map((item, index) => (
                        <View key={index} style={styles.categoryItem}>
                          <View style={styles.categoryLeft}>
                            <View
                              style={[
                                styles.colorIndicator,
                                { backgroundColor: item.color },
                              ]}
                            />
                            <Text style={styles.categoryName}>{item.name}</Text>
                          </View>
                          <View style={styles.categoryRight}>
                            <Text style={styles.categoryAmount}>
                              {formatCurrency(item.amount)}
                            </Text>
                            <Text style={styles.categoryPercentage}>
                              {((item.amount / getTotalAmount()) * 100).toFixed(
                                1
                              )}
                              %
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Line Chart with Horizontal Scroll */}
                    {lineChartData.labels.length > 0 && (
                      <View style={styles.chartContainer}>
                        <View style={styles.chartHeader}>
                          <Ionicons
                            name="analytics-outline"
                            size={20}
                            color="#4A90E2"
                          />
                          <Text style={styles.chartTitle}>
                            Tren{" "}
                            {period === "week"
                              ? "7 Hari Terakhir"
                              : "Bulan Ini"}
                          </Text>
                        </View>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.chartScrollContainer}
                        >
                          <LineChart
                            data={lineChartData}
                            width={Math.max(
                              screenWidth - 40,
                              lineChartData.labels.length * 25
                            )}
                            height={220}
                            chartConfig={chartConfig}
                            bezier
                            style={styles.chart}
                            withHorizontalLabels={true}
                            withVerticalLabels={true}
                            withDots={true}
                            withShadow={false}
                            withScrollableDot={false}
                          />
                        </ScrollView>
                        <Text style={styles.scrollHint}>
                          <Ionicons
                            name="arrow-forward"
                            size={12}
                            color="#999"
                          />{" "}
                          Geser untuk melihat lebih detail
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.noDataContainer}>
                    <Ionicons
                      name="analytics-outline"
                      size={80}
                      color="#E0E0E0"
                    />
                    <Text style={styles.noDataText}>
                      Belum ada data transaksi
                    </Text>
                    <Text style={styles.noDataSubtext}>
                      Mulai catat{" "}
                      {activeTab === "expense" ? "pengeluaran" : "pemasukan"}{" "}
                      Anda untuk melihat statistik
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}

        {/* Date Picker Modal */}
        <Modal
          isVisible={showDatePicker}
          style={styles.datePickerModalContainer}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          onBackdropPress={() => setShowDatePicker(false)}
        >
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
                    item.getMonth() === selectedComparisonMonth.getMonth() &&
                      item.getFullYear() ===
                        selectedComparisonMonth.getFullYear() &&
                      styles.monthItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedComparisonMonth(item);
                    setShowDatePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.monthItemText,
                      item.getMonth() === selectedComparisonMonth.getMonth() &&
                        item.getFullYear() ===
                          selectedComparisonMonth.getFullYear() &&
                        styles.monthItemTextSelected,
                    ]}
                  >
                    {formatMonthYear(item)}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.monthsList}
            />
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenModal: {
    margin: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 32,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#f8f9fa",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    marginHorizontal: 2,
    backgroundColor: "#fff",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activeTab: {
    backgroundColor: "#4A90E2",
    elevation: 3,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginLeft: 4,
  },
  activeTabText: {
    color: "#fff",
  },
  periodContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: "#f8f9fa",
  },
  periodButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  activePeriod: {
    backgroundColor: "#E3F2FD",
    borderColor: "#2196F3",
  },
  periodText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginLeft: 4,
  },
  activePeriodText: {
    color: "#2196F3",
    fontWeight: "600",
  },
  comparisonSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#E3F2FD",
    borderWidth: 1,
    borderColor: "#2196F3",
    flex: 1,
  },
  comparisonText: {
    fontSize: 14,
    color: "#2196F3",
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  summaryContainer: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summaryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  summaryPeriod: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  chartContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  chart: {
    marginVertical: 10,
    borderRadius: 16,
  },
  chartScrollContainer: {
    marginVertical: 8,
  },
  scrollHint: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  categoryContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    flex: 1,
  },
  categoryRight: {
    alignItems: "flex-end",
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  categoryPercentage: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  insightsContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  insightItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  insightText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
    fontWeight: "500",
  },
  warningInsight: {
    backgroundColor: "#FFF3E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 0,
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
    marginTop: 40,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },
  noDataSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  datePickerModalContainer: {
    justifyContent: "flex-end",
    margin: 0,
  },
  datePickerModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: screenHeight * 0.6,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  monthsList: {
    maxHeight: screenHeight * 0.4,
  },
  monthItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  monthItemSelected: {
    backgroundColor: "#E3F2FD",
  },
  monthItemText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  monthItemTextSelected: {
    color: "#2196F3",
    fontWeight: "600",
  },
  comparisonSummary: {
    marginTop: 20,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  summaryCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 12,
    textAlign: "center",
  },
  summaryCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryCardItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  summaryCardLabel: {
    fontSize: 12,
    color: "#6C757D",
    marginBottom: 4,
  },
  customLegendContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  customLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  customLegendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  customLegendText: {
    fontSize: 11,
    color: "#333",
    flex: 1,
    fontWeight: "500",
  },
  customLegendAmount: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
    minWidth: 80,
    textAlign: "right",
  },
});
