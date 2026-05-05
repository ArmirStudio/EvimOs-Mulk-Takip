import { Redirect, useLocalSearchParams } from 'expo-router';

export default function TenantReceiptDetailRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Redirect
      href={{
        pathname: '/tenant/maintenance',
        params: {
          focus: 'payments',
          openId: id,
          openType: 'receipt',
        },
      }}
    />
  );
}
