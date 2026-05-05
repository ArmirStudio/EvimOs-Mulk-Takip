import { useLocalSearchParams, router } from 'expo-router';
import { ReceiptDetailView } from '../../../components/Shared/ReceiptDetailView';

export default function ReceiptDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReceiptDetailView receiptId={id} onClose={() => router.back()} />;
}
