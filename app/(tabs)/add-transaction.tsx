import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { transactionsAPI, categoriesAPI, walletsAPI, Category, Wallet } from '../../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

export default function AddTransactionScreen() {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Reset category when type changes
    setSelectedCategory(null);
  }, [type]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [categoriesResponse, walletsResponse] = await Promise.all([
        categoriesAPI.getAll(),
        walletsAPI.getAll(),
      ]);

      if (categoriesResponse.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data);
      }

      if (walletsResponse.success && walletsResponse.data) {
        setWallets(walletsResponse.data);
        // Auto select first wallet if available
        if (walletsResponse.data.length > 0) {
          setSelectedWallet(walletsResponse.data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Jumlah harus diisi dan lebih dari 0');
      return;
    }

    if (!selectedWallet) {
      Alert.alert('Error', 'Pilih dompet terlebih dahulu');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Error', 'Pilih kategori terlebih dahulu');
      return;
    }

    try {
      setIsSubmitting(true);

      const transactionData = {
        wallet_id: selectedWallet.id,
        category_id: selectedCategory.id,
        amount: parseFloat(amount),
        description: description.trim() || undefined,
        transaction_date: transactionDate.toISOString().split('T')[0],
        type,
      };

      const response = await transactionsAPI.create(transactionData);

      if (response.success) {
        Alert.alert('Berhasil', 'Transaksi berhasil ditambahkan', [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setAmount('');
              setDescription('');
              setSelectedCategory(null);
              setTransactionDate(new Date());
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      Alert.alert('Error', error.response?.data?.message || 'Gagal menambahkan transaksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTransactionDate(selectedDate);
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    return new Intl.NumberFormat('id-ID').format(parseInt(numericValue) || 0);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const filteredCategories = categories.filter(category => category.type === type);

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tambah Transaksi</Text>
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Type Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jenis Transaksi</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]}
              onPress={() => setType('expense')}
            >
              <MaterialIcons
                name="trending-down"
                size={24}
                color={type === 'expense' ? '#fff' : '#dc3545'}
              />
              <Text
                style={[styles.typeButtonText, type === 'expense' && styles.typeButtonTextActive]}
              >
                Pengeluaran
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeButton, type === 'income' && styles.typeButtonActive]}
              onPress={() => setType('income')}
            >
              <MaterialIcons
                name="trending-up"
                size={24}
                color={type === 'income' ? '#fff' : '#28a745'}
              />
              <Text
                style={[styles.typeButtonText, type === 'income' && styles.typeButtonTextActive]}
              >
                Pemasukan
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jumlah</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>Rp</Text>
            <TextInput
              style={styles.amountInput}
              value={formatCurrency(amount)}
              onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
              placeholder="0"
              keyboardType="numeric"
              maxLength={15}
            />
          </View>
        </View>

        {/* Wallet Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dompet</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowWalletModal(true)}
          >
            <View style={styles.selectorContent}>
              <MaterialIcons name="account-balance-wallet" size={24} color="#007AFF" />
              <Text style={styles.selectorText}>
                {selectedWallet ? selectedWallet.name : 'Pilih Dompet'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Category Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kategori</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowCategoryModal(true)}
          >
            <View style={styles.selectorContent}>
              <MaterialIcons name="category" size={24} color="#007AFF" />
              <Text style={styles.selectorText}>
                {selectedCategory ? selectedCategory.name : 'Pilih Kategori'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Date Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tanggal</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.selectorContent}>
              <MaterialIcons name="event" size={24} color="#007AFF" />
              <Text style={styles.selectorText}>{formatDate(transactionDate)}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Description Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deskripsi (Opsional)</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Tulis deskripsi transaksi..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Simpan Transaksi</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={transactionDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* Wallet Modal */}
      <Modal
        visible={showWalletModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pilih Dompet</Text>
            <TouchableOpacity onPress={() => setShowWalletModal(false)}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {wallets.map((wallet) => (
              <TouchableOpacity
                key={wallet.id}
                style={styles.modalItem}
                onPress={() => {
                  setSelectedWallet(wallet);
                  setShowWalletModal(false);
                }}
              >
                <MaterialIcons name="account-balance-wallet" size={24} color="#007AFF" />
                <View style={styles.modalItemContent}>
                  <Text style={styles.modalItemTitle}>{wallet.name}</Text>
                  <Text style={styles.modalItemSubtitle}>
                    Saldo: {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    }).format(wallet.balance)}
                  </Text>
                </View>
                {selectedWallet?.id === wallet.id && (
                  <MaterialIcons name="check" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pilih Kategori</Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {filteredCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.modalItem}
                onPress={() => {
                  setSelectedCategory(category);
                  setShowCategoryModal(false);
                }}
              >
                <MaterialIcons 
                  name={
                    category.icon &&
                    (MaterialIcons.hasOwnProperty('glyphMap') &&
                      (MaterialIcons as any).glyphMap[category.icon])
                      ? (category.icon as any)
                      : "category"
                  }
                  size={24} 
                  color={type === 'income' ? '#28a745' : '#dc3545'} 
                />
                <View style={styles.modalItemContent}>
                  <Text style={styles.modalItemTitle}>{category.name}</Text>
                  <Text style={styles.modalItemSubtitle}>
                    {type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                  </Text>
                </View>
                {selectedCategory?.id === category.id && (
                  <MaterialIcons name="check" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
            {filteredCategories.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="category" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>
                  Belum ada kategori {type === 'income' ? 'pemasukan' : 'pengeluaran'}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Silakan buat kategori terlebih dahulu
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e9ecef',
    backgroundColor: '#fff',
    gap: 8,
  },
  typeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
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
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 15,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
  },
  descriptionInput: {
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    minHeight: 80,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    gap: 15,
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
});