import { useModalAnimation } from "@/hooks/useModalAnimation";
import { ReactNode } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleProp,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Render prop — receives `handleClose` so close buttons animate the dismiss */
  children: (handleClose: () => void) => ReactNode;
  minHeight?: number;
  /** Extra style merged into the sheet Animated.View (e.g. maxHeight: '80%') */
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Reusable bottom-sheet container. Handles:
 * - Animated overlay (fade) + sheet (slide-up), working on both web and native
 * - Swipe-down-to-close gesture on the drag handle
 * - Backdrop tap to close
 * - KeyboardAvoidingView for inputs inside the sheet
 *
 * Usage:
 *   <ModalSheet visible={visible} onClose={onClose}>
 *     {(handleClose) => <View><TouchableOpacity onPress={handleClose}>...</TouchableOpacity></View>}
 *   </ModalSheet>
 */
export function ModalSheet({
  visible,
  onClose,
  children,
  minHeight = 400,
  contentStyle,
}: ModalSheetProps) {
  const { overlayOpacity, slideAnim, handleClose, panHandlers } =
    useModalAnimation({ visible, onClose });

  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1 }} accessibilityViewIsModal>
        {/* Animated dark overlay */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            opacity: overlayOpacity,
          }}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          {/* Backdrop tap area */}
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={handleClose}
          />

          {/* Sheet content (stop propagation so taps don't hit the backdrop) */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Animated.View
              style={[
                {
                  transform: [{ translateY: slideAnim }],
                  backgroundColor: "#FFFFFF",
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  minHeight,
                },
                contentStyle,
              ]}
            >
              {/* Drag handle — swipe here to dismiss */}
              <View
                {...panHandlers}
                style={{
                  alignItems: "center",
                  paddingTop: 12,
                  paddingBottom: 4,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "#E5E7EB",
                  }}
                />
              </View>

              {children(handleClose)}
            </Animated.View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
