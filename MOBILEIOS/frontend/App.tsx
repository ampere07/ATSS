import React, { useState, useEffect, useRef } from 'react';
import { View, Alert, DeviceEventEmitter } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import Login from './src/pages/Login';
import Dashboard from './src/pages/Dashboard';
import { UserData } from './src/types/api';
import { initializeCsrf, loadCookies, clearCookies, SESSION_EXPIRED_EVENT } from './src/config/api';
import { isCustomerAccount } from './src/config/customer';
import { revokeToken } from './src/services/api';
import { settingsColorPaletteService } from './src/services/settingsColorPaletteService';
import { getAppVersionConfig, isIosUpdateRequired, appStoreUrl, AppVersionConfig } from './src/services/appVersionService';
import { clearDashboardCache } from './src/utils/customerDashboardCache';
import PaymentResultModal from './src/components/PaymentResultModal';
import SplashScreen from './src/components/SplashScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import ForceUpdateModal from './src/modals/ForceUpdateModal';
import { version as currentVersion } from './package.json';

/** Why a stored session was not resumed, shown on the login screen. */
const STAFF_SESSION_NOTICE = 'This app is for ATSS customer accounts only. Please sign in with your account number.';

/**
 * The customer app's root.
 *
 * What the full app's App.tsx does for every role, less what never applied to
 * a customer:
 *
 *  - No idle sign-out. The full app already exempts customers from it; they are
 *    meant to stay signed in so paying is instant.
 *  - No technician time-out reminder and no location disclosure — both exist
 *    for technicians' attendance and live tracking.
 *  - No Android navigation-bar handling.
 */
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginNotice, setLoginNotice] = useState<string | undefined>(undefined);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [versionConfig, setVersionConfig] = useState<AppVersionConfig | null>(null);
  const [showPaymentResult, setShowPaymentResult] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');

  // Mirrors isLoggedIn for the session-expired listener, which is bound once on
  // mount and would otherwise close over the value from that first render.
  const isLoggedInRef = useRef(false);
  useEffect(() => { isLoggedInRef.current = isLoggedIn; }, [isLoggedIn]);

  // One notice per expired session, however many requests come back 401 at once.
  const sessionExpiredShownRef = useRef(false);

  const handleLogout = async () => {
    // Remove user data and cookies from AsyncStorage
    await AsyncStorage.removeItem('authData');
    await AsyncStorage.removeItem('authToken');
    await clearCookies();
    // The dashboard keeps the last-known figures so a cold start is not a
    // skeleton. Signing out is when a handset may change hands, so that snapshot
    // should not outlive it.
    await clearDashboardCache();
    setIsLoggedIn(false);
    sessionExpiredShownRef.current = false;
  };

  /**
   * Sign out when the server says the credential is dead.
   *
   * Handled here rather than on the screen that happened to make the request:
   * the credential is the app's, not one page's, so any 401 anywhere means the
   * same thing. The notice is shown before logging out so the customer is told
   * why they are being returned to the login screen.
   *
   * A native alert rather than the full app's SessionExpiredModal. The 401
   * often arrives from inside a payment sheet — Pay, Resume, Cancel Payment —
   * and iOS will not present a second modal over one already on screen, so
   * the modal would silently never appear and leave the customer on a
   * dashboard with no credential and no explanation. Alert draws in its own
   * window, above any modal, and signing out then closes everything beneath.
   */
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(SESSION_EXPIRED_EVENT, () => {
      // Only while signed in: a 401 raised on the way out, or by a stray request
      // that outlived the logout, must not put this in front of the login screen.
      if (!isLoggedInRef.current || sessionExpiredShownRef.current) return;
      sessionExpiredShownRef.current = true;

      Alert.alert(
        'Session Expired',
        'Please sign in again to continue.',
        [{ text: 'Re-login', onPress: () => { void handleLogout(); } }],
      );
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const initialize = async () => {
      // Check for payment result in URL
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          const { queryParams } = Linking.parse(url);
          if (queryParams?.payment && queryParams?.ref) {
            setPaymentSuccess(queryParams.payment === 'success');
            setPaymentRef(queryParams.ref as string);
            setShowPaymentResult(true);
          }
        }
      } catch (e) {
        console.error('Failed to parse linking URL:', e);
      }

      // App Version Check — against the iOS release line only. See
      // AppVersionConfig for why the Android minimum is not applied here.
      try {
        const config = await getAppVersionConfig();
        setVersionConfig(config);

        if (isIosUpdateRequired(config, currentVersion) && appStoreUrl(config)) {
          setShowUpdateModal(true);
        }
      } catch (error) {
        console.error('Failed to check app version:', error);
      }

      // Initialize CSRF cookie and check auth status
      try {
        await loadCookies();
        await initializeCsrf();
      } catch (error) {
        console.error('Failed to initialize CSRF or load cookies:', error);
      }

      // Pre-load the active configuration before rendering the app structure.
      // This eliminates the styling FOUC (Flash of Unstyled Content) on the Login & Dashboard screens.
      try {
        await settingsColorPaletteService.getActive();
      } catch (error) {
        console.error('Failed to preload color palette:', error);
      }

      try {
        const authData = await AsyncStorage.getItem('authData');
        if (authData) {
          const parsedUser = JSON.parse(authData);

          if (isCustomerAccount(parsedUser)) {
            setIsLoggedIn(true);
          } else {
            // A staff session this app cannot serve. Possible after an update
            // over the full app, which shares this bundle id — and with it the
            // stored session. Its token is this device's own, so it is revoked
            // as well as forgotten.
            const token = await AsyncStorage.getItem('authToken');
            if (token) void revokeToken(token);
            await handleLogout();
            setLoginNotice(STAFF_SESSION_NOTICE);
          }
        }
      } catch (error) {
        console.error('Error parsing auth data:', error);
        await AsyncStorage.removeItem('authData');
      }

      setIsLoading(false);
    };

    initialize();
  }, []);

  const handleLogin = async (user: UserData) => {
    // Show loading screen while applying theme
    setIsLoggingIn(true);
    setLoginNotice(undefined);

    try {
      // Store user data in AsyncStorage
      await AsyncStorage.setItem('authData', JSON.stringify(user));

      // Always set theme to light
      await AsyncStorage.setItem('theme', 'light');

      // Longer delay to ensure theme is fully applied
      await new Promise(resolve => setTimeout(resolve, 600));
    } catch (e) {
      console.error('Login error:', e);
    }

    setIsLoggingIn(false);
    setIsLoggedIn(true);
  };

  // Show loading state while checking authentication or logging in
  if (isLoading || isLoggingIn) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary resetKey={isLoggedIn ? 'in' : 'out'}>
        <View style={{ flex: 1 }}>
          <StatusBar hidden={true} />
          {isLoggedIn ? (
            <>
              <Dashboard onLogout={handleLogout} />
              <PaymentResultModal
                isOpen={showPaymentResult}
                onClose={() => setShowPaymentResult(false)}
                success={paymentSuccess}
                referenceNo={paymentRef}
                isDarkMode={false}
              />
            </>
          ) : (
            <Login onLogin={handleLogin} notice={loginNotice} />
          )}

          {versionConfig && (
            <ForceUpdateModal
              visible={showUpdateModal}
              storeUrl={appStoreUrl(versionConfig)}
              latestVersion={versionConfig.ios_latest_version || versionConfig.ios_min_version || ''}
              isForce={true}
              onClose={() => setShowUpdateModal(false)}
            />
          )}
        </View>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

export default App;
