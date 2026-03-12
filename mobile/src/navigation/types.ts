export type DrawerParamList = {
  HomeTab: undefined;
  SettingsTab: undefined;
  SubscriptionTab: undefined;
  CallModesTab: undefined;
  DevicesTab: undefined;
  AccountTab: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  CallsTab: undefined;
  SettingsTab: undefined;
  AccountTab: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Register: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  EmailVerification: { token?: string; email?: string } | undefined;
  PasswordResetConfirm: { token: string };
  MfaEnroll: undefined;
  RecoveryCodes: undefined;
  MfaVerify: undefined;
  OnboardingPrivacy: undefined;
  OnboardingSettings: undefined;
  DrawerRoot: undefined;
  Home: undefined;
  DeviceList: undefined;
  Settings: undefined;
  PrivacySettings: undefined;
  QuietHours: undefined;
  MemorySettings: undefined;
  AccountSettings: undefined;
  NumberProvision: undefined;
  CallModes: { onboarding?: boolean } | undefined;
  ForwardingSetupGuide: undefined;
  ForwardingVerify: { onboarding?: boolean } | undefined;
  PlanSelection: { source?: 'onboarding' | 'manage' } | undefined;
  PaymentMethod: { plan: string; source?: 'onboarding' | 'manage' };
  SubscriptionStatus: undefined;
  ManageSubscription: undefined;
  CallsList: undefined;
  CallDetail: { callId: string };
  Calendar: undefined;
  AddContact: undefined;
  CategoryDefaults: undefined;
  HandoffSettings: undefined;
  PaymentMethodsList: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
