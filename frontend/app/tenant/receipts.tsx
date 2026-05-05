import { Redirect, useLocalSearchParams } from 'expo-router';

export default function TenantReceiptsRedirect() {
  const params = useLocalSearchParams<{ openId?: string; openType?: string }>();

  return (
    <Redirect
      href={{
        pathname: '/tenant/maintenance',
        params: {
          focus: 'payments',
          ...(params.openId ? { openId: params.openId } : {}),
          ...(params.openType ? { openType: params.openType } : {}),
        },
      }}
    />
  );
}
