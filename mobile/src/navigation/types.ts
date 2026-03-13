export type TabParamList = {
  HomeTab: undefined;
  CallsTab: undefined;
  CalendarTab: undefined;
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
  DrawerRoot: undefined;
  Home: undefined;
  DeviceList: undefined;
  Settings: undefined;
  PrivacySettings: undefined;
  QuietHours: undefined;
  MemorySettings: undefined;
  AccountSettings: undefined;
  NumberProvision: { onboarding?: boolean } | undefined;
  CallModes: { onboarding?: boolean } | undefined;
  ForwardingSetupGuide: { onboarding?: boolean } | undefined;
  ForwardingVerify: { onboarding?: boolean } | undefined;
  PlanSelection: { source?: 'onboarding' | 'manage' } | undefined;
  PaymentMethod: { plan: string; source?: 'onboarding' | 'manage' };
  SubscriptionStatus: undefined;
  ManageSubscription: undefined;
  CallsList: undefined;
  CallDetail: { callId: string };
  LiveTranscript: { callId: string };
  Calendar: { date?: string } | undefined;
  AddContact: { autoVip?: boolean; autoBlocked?: boolean } | undefined;
  ContactsList: undefined;
  ContactDetail: { contactId: string };
  BlockList: undefined;
  SpamList: undefined;
  VipList: undefined;
  CategoryDefaults: undefined;
  HandoffSettings: undefined;
  AssistantSettings: undefined;
  PaymentMethodsList: undefined;
  CalendarBookingSettings: undefined;
  ProfileSettings: undefined;
  MemoryList: undefined;
  UrgentNotifications: undefined;
  BusinessHours: undefined;
  RemindersList: undefined;
  TextBack: { callId: string };
  CreateReminder: { callId: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
