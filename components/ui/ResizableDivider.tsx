import { useCallback, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

type ResizableDividerProps = {
  orientation: 'vertical' | 'horizontal';
  onDrag: (delta: number) => void;
  onDragEnd?: () => void;
};

export function ResizableDivider({
  orientation,
  onDrag,
  onDragEnd,
}: ResizableDividerProps) {
  const theme = useTheme();
  const draggingRef = useRef(false);
  const lastPosRef = useRef(0);
  const onDragRef = useRef(onDrag);
  const onDragEndRef = useRef(onDragEnd);
  const nodeRef = useRef<HTMLElement | null>(null);

  onDragRef.current = onDrag;
  onDragEndRef.current = onDragEnd;

  const startDrag = useCallback(
    (startX: number, startY: number) => {
      if (Platform.OS !== 'web') {
        return;
      }

      draggingRef.current = true;
      lastPosRef.current = orientation === 'vertical' ? startX : startY;

      const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
        if (!draggingRef.current) {
          return;
        }

        moveEvent.preventDefault();
        const point =
          'touches' in moveEvent ? moveEvent.touches[0] : moveEvent;
        if (!point) {
          return;
        }

        const position =
          orientation === 'vertical' ? point.clientX : point.clientY;
        const delta = position - lastPosRef.current;
        lastPosRef.current = position;

        if (delta !== 0) {
          onDragRef.current(delta);
        }
      };

      const stopDrag = () => {
        if (!draggingRef.current) {
          return;
        }

        draggingRef.current = false;
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', stopDrag);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        onDragEndRef.current?.();
      };

      document.body.style.cursor =
        orientation === 'vertical' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', stopDrag);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', stopDrag);
    },
    [orientation],
  );

  const bindNode = useCallback(
    (node: HTMLElement | null) => {
      if (nodeRef.current) {
        nodeRef.current.onmousedown = null;
        nodeRef.current.ontouchstart = null;
      }

      nodeRef.current = node;
      if (!node || Platform.OS !== 'web') {
        return;
      }

      node.onmousedown = event => {
        event.preventDefault();
        startDrag(event.clientX, event.clientY);
      };

      node.ontouchstart = event => {
        const touch = event.touches[0];
        if (!touch) {
          return;
        }
        startDrag(touch.clientX, touch.clientY);
      };
    },
    [startDrag],
  );

  if (Platform.OS !== 'web') {
    return null;
  }

  const isVertical = orientation === 'vertical';
  const outline = theme.colors.outlineVariant ?? theme.colors.outline;

  return (
    <View
      ref={view => bindNode(view as unknown as HTMLElement | null)}
      style={[
        styles.base,
        isVertical ? styles.vertical : styles.horizontal,
        { backgroundColor: theme.colors.surfaceVariant, borderColor: outline },
      ]}
      accessibilityRole="adjustable"
      accessibilityLabel={
        isVertical ? 'Resize panels horizontally' : 'Resize panels vertically'
      }>
      <View
        style={[
          styles.grip,
          isVertical ? styles.gripVertical : styles.gripHorizontal,
          { backgroundColor: theme.colors.primary },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    flexShrink: 0,
    justifyContent: 'center',
    zIndex: 10,
    ...(Platform.OS === 'web'
      ? ({ cursor: 'col-resize', touchAction: 'none' } as object)
      : {}),
  },
  vertical: {
    width: 16,
    alignSelf: 'stretch',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  horizontal: {
    height: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...(Platform.OS === 'web' ? ({ cursor: 'row-resize' } as object) : {}),
  },
  grip: {
    borderRadius: 6,
    opacity: 0.85,
  },
  gripVertical: {
    height: 56,
    width: 5,
  },
  gripHorizontal: {
    height: 5,
    width: 56,
  },
});
