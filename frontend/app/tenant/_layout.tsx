import { Stack } from 'expo-router';
import {
  getDetailScreenOptions,
  getMainSurfaceScreenOptions,
  getSoftStackBaseOptions,
  getWizardScreenOptions,
} from '../../utils/navigationTransitions';
import { useAppTheme } from '../theme';

export default function TenantLayout() {
  const theme = useAppTheme();

  return (
    <Stack screenOptions={getSoftStackBaseOptions(theme)}>
      <Stack.Screen name="dashboard" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="property" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="maintenance" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="receipts" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="settings" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="calendar" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="archive" options={getMainSurfaceScreenOptions(theme)} />

      <Stack.Screen name="profile-edit" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="change-password" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="maintenance/[id]" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="receipts/[id]" options={getDetailScreenOptions(theme)} />

      <Stack.Screen name="maintenance-request" options={getWizardScreenOptions(theme)} />
      <Stack.Screen name="upload-receipt" options={getWizardScreenOptions(theme)} />
      <Stack.Screen name="maintenance/success" options={getWizardScreenOptions(theme)} />
    </Stack>
  );
}
