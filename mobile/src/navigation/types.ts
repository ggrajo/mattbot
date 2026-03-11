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
  OnboardingAssistantSetup: undefined;
  OnboardingCalendarSetup: undefined;
  TabRoot: undefined;
  SubscriptionGate: undefined;
  DeviceList: undefined;
  PrivacySettings: undefined;
  QuietHours: undefined;
  MemorySettings: undefined;
  AccountSettings: undefined;
  ProfileSettings: undefined;
  AssistantSettings: undefined;
  NumberProvision: { onboarding?: boolean } | undefined;
  CallModes: { onboarding?: boolean } | undefined;
  ForwardingSetupGuide: { onboarding?: boolean } | undefined;
  ForwardingVerify: { onboarding?: boolean } | undefined;
  PlanSelection: { source?: 'onboarding' | 'manage' } | undefined;
  PaymentMethod: { plan: string; source?: 'onboarding' | 'manage' };
  SubscriptionStatus: undefined;
  ManageSubscription: undefined;
  CallDetail: { callId: string };
  CallerProfile: { phoneHash: string };
  LiveTranscript: { callId: string };
  VipList: undefined;
  BlockList: undefined;
  RemindersList: undefined;
  CreateReminder: { callId: string };
  TextBack: { callId: string; callerId?: string };
  MemoryList: undefined;
  BusinessHours: undefined;
  Temperament: undefined;
  HandoffSettings: undefined;
  Calendar: undefined;
  CalendarBookingSettings: undefined;
  ChangePassword: undefined;
  PinSetup: undefined;
  PinLogin: undefined;
  UrgentNotifications: undefined;
  PaymentMethodsList: undefined;
  ContactsList: undefined;
  ContactDetail: { contactId: string };
  AddContact: undefined;
  CategoryDefaults: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
