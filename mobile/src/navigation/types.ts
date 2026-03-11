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
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
