import { I18nManager } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App';

// Hebrew-first: force the native layout to flow right-to-left.
// In dev/production builds the expo-localization plugin (app.json) applies this
// natively at launch; in Expo Go it takes effect from the next app start.
// Until then, `direction: 'rtl'` on the root view in App.tsx keeps the layout RTL.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

registerRootComponent(App);
