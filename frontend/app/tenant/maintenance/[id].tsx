import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function TenantMaintenanceRedirect() {
  const { id } = useLocalSearchParams();
  return <Redirect href={`/tenant/maintenance?openId=${id}&openType=maintenance`} />;
}
