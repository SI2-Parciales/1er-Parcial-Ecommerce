import './src/global.css';
import React from 'react';
import { LogBox } from 'react-native';
import { AppProviders } from '@app/providers/AppProviders';
import { RootNavigator } from '@app/navigation/RootNavigator';

LogBox.ignoreLogs(['Cannot connect to Expo CLI', 'As of SDK 56']);

export default function App(): React.JSX.Element {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
