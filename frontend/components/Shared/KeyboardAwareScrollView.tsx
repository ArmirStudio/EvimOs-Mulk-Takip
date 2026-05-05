import React, { PropsWithChildren, RefObject, useRef } from 'react';
import {
  findNodeHandle,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';

type KeyboardAwareScrollViewProps = PropsWithChildren<
  ScrollViewProps & {
    containerStyle?: StyleProp<ViewStyle>;
    keyboardVerticalOffset?: number;
    scrollRef?: RefObject<ScrollView | null>;
    extraBottomSpace?: number;
  }
>;

type KeyboardScrollResponder = ScrollView & {
  scrollResponderScrollNativeHandleToKeyboard?: (
    nodeHandle: number,
    additionalOffset?: number,
    preventNegativeScrollOffset?: boolean
  ) => void;
};

export function scrollToInput(
  scrollRef: RefObject<ScrollView | null>,
  inputRef: RefObject<TextInput | null>,
  extraOffset = 96
) {
  const nodeHandle = inputRef.current ? findNodeHandle(inputRef.current) : null;
  if (!nodeHandle) {
    return;
  }

  requestAnimationFrame(() => {
    const responder = scrollRef.current as KeyboardScrollResponder | null;
    responder?.scrollResponderScrollNativeHandleToKeyboard?.(nodeHandle, extraOffset, true);
  });
}

export function focusAndScrollToInput(
  scrollRef: RefObject<ScrollView | null>,
  inputRef: RefObject<TextInput | null>,
  extraOffset = 96
) {
  inputRef.current?.focus();

  requestAnimationFrame(() => {
    scrollToInput(scrollRef, inputRef, extraOffset);
  });
}

export default function KeyboardAwareScrollView({
  children,
  containerStyle,
  keyboardVerticalOffset,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode = Platform.OS === 'ios' ? 'interactive' : 'on-drag',
  showsVerticalScrollIndicator = false,
  scrollRef: externalScrollRef,
  automaticallyAdjustKeyboardInsets,
  extraBottomSpace = 24,
  contentContainerStyle,
  ...scrollProps
}: KeyboardAwareScrollViewProps) {
  const localScrollRef = useRef<ScrollView>(null);
  const scrollRef = externalScrollRef ?? localScrollRef;
  const resolvedKeyboardOffset = keyboardVerticalOffset ?? 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={resolvedKeyboardOffset}
      style={[styles.flex, containerStyle]}
    >
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        contentContainerStyle={[contentContainerStyle, { paddingBottom: extraBottomSpace }]}
        automaticallyAdjustKeyboardInsets={
          automaticallyAdjustKeyboardInsets ?? Platform.OS === 'ios'
        }
        {...scrollProps}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.content}>{children}</View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
