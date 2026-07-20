import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { Icon, useTheme } from 'react-native-paper';

/** Compact menu control for the phone app header (not shared with web ERP). */
export function AppMenuButton() {
  const theme = useTheme();
  const navigation = useNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      hitSlop={10}
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}>
      <Icon source="menu" size={24} color={theme.colors.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginLeft: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
