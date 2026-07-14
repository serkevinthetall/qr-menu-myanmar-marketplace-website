import { StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

type VoiceInputButtonProps = {
  listening: boolean;
  supported: boolean;
  secondsLeft?: number;
  onPress: () => void;
  disabled?: boolean;
};

export function VoiceInputButton({
  listening,
  supported,
  secondsLeft = 0,
  onPress,
  disabled = false,
}: VoiceInputButtonProps) {
  const theme = useTheme();
  const label = !supported
    ? 'Web only'
    : listening
      ? `${Math.max(secondsLeft, 1)}s`
      : 'မြန်မာ အသံ';

  return (
    <View style={styles.root}>
      <View style={styles.buttonWrap}>
        <IconButton
          icon={listening ? 'microphone' : 'microphone-outline'}
          size={20}
          mode="contained-tonal"
          containerColor={
            listening ? theme.colors.errorContainer : theme.colors.secondaryContainer
          }
          iconColor={listening ? theme.colors.error : theme.colors.primary}
          onPress={onPress}
          disabled={disabled || !supported}
          accessibilityLabel={
            listening
              ? `Stop voice input, ${secondsLeft} seconds left`
              : 'Start Myanmar voice input'
          }
        />
        {listening ? (
          <View
            style={[
              styles.pulseDot,
              { backgroundColor: theme.colors.error },
            ]}
          />
        ) : null}
      </View>
      <Text
        variant="labelSmall"
        style={[
          styles.hint,
          {
            color: listening ? theme.colors.error : theme.colors.onSurfaceVariant,
            fontWeight: listening ? '700' : '400',
          },
        ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  buttonWrap: {
    position: 'relative',
  },
  pulseDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  hint: {
    marginRight: 4,
    minWidth: 28,
  },
});
