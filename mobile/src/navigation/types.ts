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
  DeviceList: undefined;
  PlanSelection: undefined;
  PaymentMethod: undefined;
  SubscriptionStatus: undefined;
  ManageSubscription: undefined;
  NumberProvision: undefined;
  CallModes: undefined;
  ForwardingSetupGuide: undefined;
  ForwardingVerify: undefined;
  CallsList: undefined;
  CallDetail: { callId: string };
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
