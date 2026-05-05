import { Redirect } from 'expo-router';

export default function LandlordArchiveRedirect() {
  return <Redirect href="/landlord/maintenance?tab=receipts" />;
}
