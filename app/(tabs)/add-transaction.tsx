// app/(tabs)/add-transaction.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router'; // ⬅️ gunakan router dari expo-router
import AddTransactionModal from '../../components/AddTransactionModal';

export default function AddTransactionTab() {
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter(); // ⬅️ inisialisasi router

  // Auto-open modal ketika tab ini difokuskan
  useFocusEffect(
    useCallback(() => {
      setModalVisible(true);
    }, [])
  );

  const handleCloseModal = () => {
    setModalVisible(false);
    router.replace('/'); // ⬅️ kembali ke tab utama (index.tsx)
  };

  const handleTransactionAdded = () => {
    console.log('Transaction added successfully');
    setModalVisible(false);
    router.replace('/'); // ⬅️ arahkan kembali ke halaman utama setelah tambah transaksi
  };

  return (
    <View style={styles.container}>
      <AddTransactionModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onTransactionAdded={handleTransactionAdded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});
