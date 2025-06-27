// components/AddTransactionModal.tsx
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { categoriesAPI, Category, transactionsAPI, Wallet, walletsAPI } from '../services/api';
import TransactionModal from './ModalSuccessAddTransaction';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onTransactionAdded: () => void;
}

export default function AddTransactionModal({ 
  visible, 
  onClose, 
  onTransactionAdded 
}: AddTransactionModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transaction Modal state
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [transactionModalType, setTransactionModalType] = useState<'loading' | 'success' | 'error'>('loading');
  const [transactionModalTitle, setTransactionModalTitle] = useState('');
  const [transactionModalMessage, setTransactionModalMessage] = useState('');
  const [submitProgress, setSubmitProgress] = useState(0);

  // Form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      loadInitialData();
    }
  }, [visible]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [categoriesResponse, walletsResponse] = await Promise.all([
        categoriesAPI.getAll(),
        walletsAPI.getAll()
      ]);

      if (categoriesResponse.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data);
      }

      if (walletsResponse.success && walletsResponse.data) {
        setWallets(walletsResponse.data);
        // Auto-select first wallet if available
        if (walletsResponse.data.length > 0 && !selectedWalletId) {
          setSelectedWalletId(walletsResponse.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showTransactionModal('error', 'Gagal Memuat Data', 'Terjadi kesalahan saat memuat data. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const showTransactionModal = (
    type: 'loading' | 'success' | 'error',
    title: string,
    message: string,
    progress?: number
  ) => {
    setTransactionModalType(type);
    setTransactionModalTitle(title);
    setTransactionModalMessage(message);
    if (progress !== undefined) {
      setSubmitProgress(progress);
    }
    setTransactionModalVisible(true);
  };

  const hideTransactionModal = () => {
    setTransactionModalVisible(false);
    setSubmitProgress(0);
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setSelectedType('expense');
    setSelectedCategoryId(null);
    setSelectedWalletId(wallets.length > 0 ? wallets[0].id : null);
    setTransactionDate(new Date());
    setShowDatePicker(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      hideTransactionModal();
      onClose();
    }
  };

  const validateForm = () => {
    if (!amount || parseFloat(amount) <= 0) {
      showTransactionModal('error', 'Data Tidak Valid', 'Jumlah harus diisi dan lebih dari 0');
      return false;
    }
    if (!selectedCategoryId) {
      showTransactionModal('error', 'Data Tidak Valid', 'Silakan pilih kategori terlebih dahulu');
      return false;
    }
    if (!selectedWalletId) {
      showTransactionModal('error', 'Data Tidak Valid', 'Silakan pilih dompet terlebih dahulu');
      return false;
    }
    return true;
  };

  const simulateProgress = () => {
    const intervals = [20, 40, 60, 80, 100];
    intervals.forEach((progress, index) => {
      setTimeout(() => {
        setSubmitProgress(progress);
      }, (index + 1) * 200);
    });
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    // Show loading modal
    showTransactionModal('loading', 'Menyimpan Transaksi', 'Sedang memproses transaksi Anda...');
    simulateProgress();

    try {
      const transactionData = {
        wallet_id: selectedWalletId!,
        category_id: selectedCategoryId!,
        amount: parseFloat(amount),
        description: description.trim() || undefined,
        transaction_date: transactionDate.toISOString().split('T')[0],
        type: selectedType,
      };

      const response = await transactionsAPI.create(transactionData);
      
      if (response.success) {
        // Show success modal
        showTransactionModal('success', 'Transaksi Berhasil!', 'Transaksi Anda telah berhasil disimpan');
      } else {
        // Show error modal
        showTransactionModal('error', 'Transaksi Gagal', response.message || 'Gagal menambahkan transaksi. Silakan coba lagi.');
      }
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      const errorMessage = error.response?.data?.message || 'Terjadi kesalahan jaringan. Silakan periksa koneksi Anda dan coba lagi.';
      showTransactionModal('error', 'Transaksi Gagal', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransactionModalClose = () => {
    if (transactionModalType === 'success') {
      // If success, trigger callback and close main modal
      onTransactionAdded();
      resetForm();
      hideTransactionModal();
      onClose();
    } else {
      // For error, just hide the transaction modal
      hideTransactionModal();
    }
  };

  const formatCurrency = (value: string) => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    return numericValue;
  };

  const getFilteredCategories = () => {
    return categories.filter(category => category.type === selectedType);
  };

  const formatDisplayAmount = (value: string) => {
    if (!value) return '';
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return '';
    return new Intl.NumberFormat('id-ID').format(numericValue);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setTransactionDate(selectedDate);
    }
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={handleClose} 
              style={[styles.closeButton, isSubmitting && styles.disabledButton]}
              disabled={isSubmitting}
            >
              <Text style={[
                { fontSize: 16, color: "#333", fontWeight: "500" },
                isSubmitting && styles.disabledText
              ]}>
                Tutup
              </Text>         
            </TouchableOpacity>
            <Text style={styles.title}>Tambah Transaksi</Text>
            <TouchableOpacity 
              onPress={handleSubmit} 
              style={[styles.saveButton, isSubmitting && styles.disabledButton]}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Text style={styles.saveButtonText}>Simpan</Text>
              )}
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Memuat data...</Text>
            </View>
          ) : (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Transaction Type */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Jenis Transaksi</Text>
                <View style={styles.typeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      selectedType === 'expense' && styles.typeButtonActive,
                      { backgroundColor: selectedType === 'expense' ? '#dc3545' : '#f0f0f0' }
                    ]}
                    onPress={() => {
                      setSelectedType('expense');
                      setSelectedCategoryId(null); // Reset category selection
                    }}
                    disabled={isSubmitting}
                  >
                    <MaterialIcons 
                      name="trending-down" 
                      size={20} 
                      color={selectedType === 'expense' ? '#fff' : '#666'} 
                    />
                    <Text style={[
                      styles.typeButtonText,
                      selectedType === 'expense' && styles.typeButtonTextActive
                    ]}>
                      Pengeluaran
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      selectedType === 'income' && styles.typeButtonActive,
                      { backgroundColor: selectedType === 'income' ? '#28a745' : '#f0f0f0' }
                    ]}
                    onPress={() => {
                      setSelectedType('income');
                      setSelectedCategoryId(null); // Reset category selection
                    }}
                    disabled={isSubmitting}
                  >
                    <MaterialIcons 
                      name="trending-up" 
                      size={20} 
                      color={selectedType === 'income' ? '#fff' : '#666'} 
                    />
                    <Text style={[
                      styles.typeButtonText,
                      selectedType === 'income' && styles.typeButtonTextActive
                    ]}>
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
                    placeholder="0"
                    value={formatDisplayAmount(amount)}
                    onChangeText={(text) => setAmount(formatCurrency(text.replace(/[,.]/g, '')))}
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {/* Category */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Kategori</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryContainer}>
                    {getFilteredCategories().map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryButton,
                          selectedCategoryId === category.id && styles.categoryButtonActive
                        ]}
                        onPress={() => setSelectedCategoryId(category.id)}
                        disabled={isSubmitting}
                      >
                        <Text style={[
                          styles.categoryButtonText,
                          selectedCategoryId === category.id && styles.categoryButtonTextActive
                        ]}>
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Wallet */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Dompet</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.walletContainer}>
                    {wallets.map((wallet) => (
                      <TouchableOpacity
                        key={wallet.id}
                        style={[
                          styles.walletButton,
                          selectedWalletId === wallet.id && styles.walletButtonActive
                        ]}
                        onPress={() => setSelectedWalletId(wallet.id)}
                        disabled={isSubmitting}
                      >
                        <Text style={[
                          styles.walletButtonText,
                          selectedWalletId === wallet.id && styles.walletButtonTextActive
                        ]}>
                          {wallet.name}
                        </Text>
                        <Text style={[
                          styles.walletBalance,
                          selectedWalletId === wallet.id && styles.walletBalanceActive
                        ]}>
                          Rp {new Intl.NumberFormat('id-ID').format(wallet.balance)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Description */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Deskripsi (Opsional)</Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Tambahkan catatan..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!isSubmitting}
                />
              </View>

              {/* Date */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tanggal</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={showDatePickerModal}
                  disabled={isSubmitting}
                >
                  <MaterialIcons name="event" size={20} color="#666" />
                  <Text style={styles.dateButtonText}>
                    {formatDate(transactionDate)}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Date Picker */}
              {showDatePicker && (
                <DateTimePicker
                  value={transactionDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                  locale="id-ID"
                />
              )}

              {/* iOS Date Picker Done Button */}
              {Platform.OS === 'ios' && showDatePicker && (
                <View style={styles.iosDatePickerContainer}>
                  <TouchableOpacity
                    style={styles.iosDatePickerDoneButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.iosDatePickerDoneText}>Selesai</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Transaction Status Modal */}
      <TransactionModal
        visible={transactionModalVisible}
        type={transactionModalType}
        title={transactionModalTitle}
        message={transactionModalMessage}
        onClose={transactionModalType !== 'loading' ? handleTransactionModalClose : undefined}
        buttonText={transactionModalType === 'success' ? 'Selesai' : 'Coba Lagi'}
        progress={transactionModalType === 'loading' ? submitProgress : undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  saveButton: {
    padding: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  typeButtonActive: {
    // Background color is set dynamically
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    paddingVertical: 16,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  walletContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  walletButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 120,
  },
  walletButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  walletButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  walletButtonTextActive: {
    color: '#fff',
  },
  walletBalance: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  walletBalanceActive: {
    color: '#fff',
  },
  descriptionInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
  },
  dateButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
    marginLeft: 12,
  },
  iosDatePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 8,
    paddingVertical: 8,
  },
  iosDatePickerDoneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iosDatePickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});