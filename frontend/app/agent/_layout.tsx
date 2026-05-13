import { Stack } from 'expo-router';
import {
  getDetailScreenOptions,
  getMainSurfaceScreenOptions,
  getSoftStackBaseOptions,
  getWizardScreenOptions,
} from '../../utils/navigationTransitions';
import { useAppTheme } from '../theme';

export default function AgentLayout() {
  const theme = useAppTheme();

  return (
    <Stack screenOptions={getSoftStackBaseOptions(theme)}>
      <Stack.Screen name="dashboard" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="properties" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="maintenance" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="receipts" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="settings" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="team" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="calendar" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="archive" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="property-detail" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="contact-detail" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="team-member" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="profile-edit" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="change-password" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="maintenance/[id]" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="receipts/[id]" options={getDetailScreenOptions(theme)} />

      <Stack.Screen name="create-property" options={getWizardScreenOptions(theme)} />
      <Stack.Screen name="create-maintenance" options={getWizardScreenOptions(theme)} />
      <Stack.Screen name="edit-property" options={getWizardScreenOptions(theme)} />
      <Stack.Screen name="task-form" options={getWizardScreenOptions(theme)} />
      <Stack.Screen name="invite" options={getWizardScreenOptions(theme)} />
      <Stack.Screen name="pending-invites" options={getMainSurfaceScreenOptions(theme)} />
      <Stack.Screen name="pending-invite-detail" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="team-messages" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="reports" options={getDetailScreenOptions(theme)} />
      <Stack.Screen name="force-password-change" options={{ headerShown: false }} />
    </Stack>
  );
}
