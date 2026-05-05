import { Stack } from 'expo-router';
import {
  getDetailScreenOptions,
  getMainSurfaceScreenOptions,
  getSoftStackBaseOptions,
  getWizardScreenOptions,
} from '../../utils/navigationTransitions';
import { useAppTheme } from '../theme';

export default function AdminLayout() {
  const theme = useAppTheme();

  return (
    <Stack screenOptions={getSoftStackBaseOptions(theme)}>
      <Stack.Screen name="dashboard" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="companies" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="contacts" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="settings" options={getMainSurfaceScreenOptions(theme)} />

      <Stack.Screen name="edit-company" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="edit-agent" options={getDetailScreenOptions(theme)} />

      <Stack.Screen name="create-company" options={getWizardScreenOptions(theme)} />
      <Stack.Screen name="create-agent" options={getWizardScreenOptions(theme)} />
    </Stack>
  );
}
