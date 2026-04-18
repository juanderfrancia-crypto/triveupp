import "react-native-gesture-handler";
import AppNavigator from "./src/navigation/AppNavigator";
import { initSentryAnalytics } from "./src/services/analytics";

// Inicializar Sentry (deshabilitado temporalmente)
initSentryAnalytics();

export default function App() {
  return <AppNavigator />;
}