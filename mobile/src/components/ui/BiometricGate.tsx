import React from 'react';

interface Props {
  enabled: boolean;
  promptMessage: string;
  children: React.ReactNode;
}

export function BiometricGate({ enabled, promptMessage, children }: Props) {
  if (!enabled) {
    return <>{children}</>;
  }
  return <>{children}</>;
}
