import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

messaging().setBackgroundMessageHandler(async (_remoteMessage) => {
  // Android shows system tray notification automatically.
  // Additional background processing (e.g., badge count) can go here.
});

AppRegistry.registerComponent(appName, () => App);
