export type RootStackParamList = {
  Welcome: undefined;
  Register: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  EmailVerification: { token?: string } | undefined;
  MfaEnroll: undefined;
  RecoveryCodes: undefined;
  MfaVerify: undefined;
  Home: undefined;
  HomeTab: undefined;
  CallsTab: undefined;
  SettingsTab: undefined;
  DeviceList: undefined;
  PlanSelection: undefined;
  PaymentMethod: undefined;
  SubscriptionStatus: undefined;
  ManageSubscription: undefined;
  NumberProvision: undefined;
  CallModes: undefined;
  ForwardingSetupGuide: undefined;
  ForwardingVerify: undefined;
  CallDetail: { callId: string };
  OnboardingAssistantSetup: undefined;
  AssistantSettings: { agentId?: string };
  SubscriptionGate: undefined;
  Calendar: undefined;
  CalendarBookingSettings: undefined;
  OnboardingCalendarSetup: undefined;
  CallerProfile: { phoneHash: string; callerName?: string };
  MemoryList: { callerPhoneHash?: string } | undefined;
  Temperament: undefined;
  BusinessHours: undefined;
  AccountSettings: undefined;
  AccountHub: undefined;
  ContactsList: undefined;
  ContactDetail: { contactId: string };
  AddContact: undefined;
  CategoryDefaults: undefined;
  PinSetup: undefined;
  PinLogin: undefined;
  PaymentMethodsList: undefined;
  RemindersList: undefined;
  CreateReminder: { callId?: string } | undefined;
  SettingsHub: undefined;
  ProfileSettings: undefined;
  ChangePassword: undefined;
  PrivacySettings: undefined;
  PasswordResetConfirm: { token?: string; email?: string };
  HandoffSettings: undefined;
  QuietHours: undefined;
  UrgentNotifications: undefined;
  VipList: undefined;
  BlockList: undefined;
  MemorySettings: undefined;
  LiveTranscript: { callId: string };
  TextBack: { callId: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
