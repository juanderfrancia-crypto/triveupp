import "react-native-gesture-handler";
import React, { useState, useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import AppNavigator from "./src/navigation/AppNavigator";
import Splash from "./src/screens/SplashScreen";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [splashVisible, setSplashVisible] = useState(true);

  return splashVisible ? (
    <Splash onFinish={() => setSplashVisible(false)} />
  ) : (
    <AppNavigator />
  );
}