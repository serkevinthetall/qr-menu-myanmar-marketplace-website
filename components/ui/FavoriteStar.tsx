import { Pressable, StyleSheet } from 'react-native';
import { Icon, useTheme } from 'react-native-paper';

const GOLD = '#F4C430';

type FavoriteStarProps = {
  favorite: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: number;
  /** Outline color when not favorited (defaults to theme muted). */
  inactiveColor?: string;
};

/** Odoo-style favorite star: gold filled when on, muted outline when off. */
export function FavoriteStar({
  favorite,
  onToggle,
  disabled,
  size = 22,
  inactiveColor,
}: FavoriteStarProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={event => {
        // Avoid opening the row / detail when tapping the star.
        event.stopPropagation?.();
        if (!disabled) onToggle();
      }}
      hitSlop={8}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
      style={({ pressed }) => [
        styles.hit,
        { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}>
      <Icon
        source={favorite ? 'star' : 'star-outline'}
        size={size}
        color={favorite ? GOLD : inactiveColor ?? theme.colors.onSurfaceVariant}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
