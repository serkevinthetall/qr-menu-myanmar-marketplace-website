import { useWindowDimensions } from 'react-native';

const SIDEBAR_BREAKPOINT = 900;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= SIDEBAR_BREAKPOINT;

  return {
    width,
    height,
    isDesktop,
    isMobile: !isDesktop,
    sidebarWidth: 280,
  };
}
