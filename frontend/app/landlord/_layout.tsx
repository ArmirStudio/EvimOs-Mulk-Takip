import { Stack } from 'expo-router';
import {
  getDetailScreenOptions,
  getMainSurfaceScreenOptions,
  getSoftStackBaseOptions,
} from '../../utils/navigationTransitions';
import { useAppTheme } from '../theme';

export default function LandlordLayout() {
  const theme = useAppTheme();

  return (
    <Stack screenOptions={getSoftStackBaseOptions(theme)}>
      <Stack.Screen name="dashboard" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="properties" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="maintenance" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="receipts" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="settings" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="calendar" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="archive" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="tenants" options={getMainSurfaceScreenOptions(theme)} />

      <Stack.Screen name="property-detail" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="profile-edit" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="change-password" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="maintenance/[id]" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="receipts/[id]" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="reports" options={getDetailScreenOptions(theme)} />
    </Stack>
  );
}
