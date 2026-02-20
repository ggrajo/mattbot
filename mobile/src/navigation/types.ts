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
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
