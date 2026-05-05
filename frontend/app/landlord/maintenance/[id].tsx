import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function LandlordMaintenanceRedirect() {
  const { id } = useLocalSearchParams();
  return <Redirect href={`/landlord/maintenance?openId=${id}&openType=maintenance`} />;
}
