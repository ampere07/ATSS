import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Height of the floating tab bar (see pages/Sidebar.tsx). */
export const TAB_BAR_HEIGHT = 68;

/** Where the bar sits on a phone with no home indicator, as in the full app. */
const BASE_TAB_BAR_BOTTOM = 25;

/**
 * Where the floating tab bar sits, and how far everything that clears it has
 * to move.
 *
 * The full app pins the bar 25pt off the bottom edge on every device. On an
 * iPhone with a home indicator that puts its lower edge inside the 34pt strip
 * iOS reserves for the home gesture, so here it sits at whichever is higher.
 *
 * `lift` is how far it moved. The buttons floating above the bar (Messenger,
 * New Ticket) and the bottom padding of scrolling lists were laid out against
 * the 25pt position, so they add `lift` to stay exactly as far clear of it.
 * On a home-button iPhone it is 0 and every layout matches the full app.
 */
export const useTabBarOffset = () => {
  const { bottom } = useSafeAreaInsets();
  const tabBarBottom = Math.max(BASE_TAB_BAR_BOTTOM, bottom);

  return { tabBarBottom, lift: tabBarBottom - BASE_TAB_BAR_BOTTOM };
};
