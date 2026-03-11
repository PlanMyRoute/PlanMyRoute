import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, View } from 'react-native';
import CustomButton from './CustomButton';
import { SubtitleSemibold, TextRegular } from './CustomText';

// Tipos de alerta según severidad
export type AlertType = 'error' | 'warning' | 'success' | 'info';

// Acción de botón
export interface AlertAction {
  text: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'dark' | 'danger' | 'yellow';
}

// Props del componente
interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: AlertType;
  actions?: AlertAction[]; // Si no se provee, usará botón "Cerrar" por defecto
  onClose?: () => void; // Acción por defecto al cerrar
  onDismiss?: () => void; // Callback ejecutado después de cerrar (útil para limpiar estado)
  blocking?: boolean; // Si es true, no se puede cerrar tocando fuera
}

export default function CustomAlert({
  visible,
  title,
  message,
  type = 'error',
  actions,
  onClose,
  onDismiss,
  blocking = false
}: CustomAlertProps) {

  const handleClose = () => {
    if (onClose) onClose();
    if (onDismiss) onDismiss();
  };

  const handleBackdropPress = () => {
    if (!blocking) {
      handleClose();
    }
  };

  // Configuración de iconos y colores según el tipo
  const alertConfig = {
    error: {
      iconName: 'close-circle' as keyof typeof Ionicons.glyphMap,
      iconColor: '#EF4444'
    },
    warning: {
      iconName: 'warning' as keyof typeof Ionicons.glyphMap,
      iconColor: '#F59E0B'
    },
    success: {
      iconName: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
      iconColor: '#10B981'
    },
    info: {
      iconName: 'information-circle' as keyof typeof Ionicons.glyphMap,
      iconColor: '#3B82F6'
    }
  };

  const config = alertConfig[type];

  // Acciones por defecto si no se proporcionan
  const defaultActions: AlertAction[] = [
    {
      text: 'Cerrar',
      onPress: handleClose,
      variant: 'dark'
    }
  ];

  const finalActions = actions && actions.length > 0 ? actions : defaultActions;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      {/* Backdrop - clickeable para cerrar si no es blocking */}
      <View
        className="flex-1 justify-center items-center bg-black/50 px-6"
        onStartShouldSetResponder={() => true}
        onResponderRelease={handleBackdropPress}
      >
        {/* Alert container - detiene la propagación del click */}
        <View
          className="bg-white w-full rounded-3xl p-6 items-center shadow-lg max-w-md"
          onStartShouldSetResponder={() => true}
          onResponderRelease={(e) => e.stopPropagation()}
        >
          {/* Botón X para cerrar (solo si no es blocking) */}
          {!blocking && (
            <View className="absolute top-4 right-4 z-10">
              <Ionicons
                name="close"
                size={24}
                color="#999999"
                onPress={handleClose}
              />
            </View>
          )}

          {/* Icono */}
          <Ionicons
            name={config.iconName}
            size={60}
            color={config.iconColor}
            style={{ marginBottom: 16 }}
          />

          {/* Título */}
          <SubtitleSemibold className="mb-3 text-center">
            {title}
          </SubtitleSemibold>

          {/* Mensaje */}
          <TextRegular className="text-neutral-gray text-center mb-6">
            {message}
          </TextRegular>

          {/* Botones de acción - en fila si hay 2 o menos */}
          <View className={`w-full ${finalActions.length <= 2 ? 'flex-row gap-3' : 'gap-3'}`}>
            {finalActions.map((action, index) => (
              <CustomButton
                key={index}
                title={action.text}
                variant={action.variant || 'dark'}
                size="medium"
                onPress={action.onPress}
                className={finalActions.length <= 2 ? 'flex-1' : ''}
              />
            ))}
          </View>

        </View>
      </View>
    </Modal>
  );
}