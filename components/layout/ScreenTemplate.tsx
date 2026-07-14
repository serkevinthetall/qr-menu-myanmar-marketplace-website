import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

type ScreenTemplateProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function ScreenTemplate({
  title,
  description,
  children,
}: ScreenTemplateProps) {
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
          {title}
        </Text>
        <Text variant="bodyLarge" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          {description}
        </Text>
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    gap: 8,
    borderWidth: 1,
  },
  title: {
    fontWeight: '600',
  },
  description: {
    marginBottom: 0,
  },
});
