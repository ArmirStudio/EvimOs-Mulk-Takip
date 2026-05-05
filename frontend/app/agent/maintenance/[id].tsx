import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function AgentMaintenanceRedirect() {
  const { id } = useLocalSearchParams();
  return <Redirect href={`/agent/maintenance?openId=${id}&openType=maintenance`} />;
}
