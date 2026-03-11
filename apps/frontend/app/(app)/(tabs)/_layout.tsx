import { SettingsIcon } from '@/components/assets/Icons';
import { TabFeedIcon, TabHomeIcon, TabNewTripIcon, TabProfileIcon } from '@/components/assets/TabsIcons';
import { DropdownMenu, DropdownMenuItem } from '@/components/modals/DropdownMenu';
import { FlappyBirdGame } from '@/components/trip/FlappyBirdGame';
import { useClientOnlyValue } from '@/components/useClientOnlyValue.web';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import useNotifications from '@/hooks/useNotifications';
import { useProfile } from '@/hooks/useUsers';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isPremium } = useSubscription();
  const userId = user?.id;

  const [settingsMenuVisible, setSettingsMenuVisible] = useState(false);
  const [gameModalVisible, setGameModalVisible] = useState(false);

  const { data: profile } = useProfile(userId, undefined);
  const { data: notifications } = useNotifications(userId, { enabled: Boolean(userId) });

  const pendingCount = notifications?.filter(n => n.action_status === 'pending').length || 0;

  const handleEditProfile = () => {
    setSettingsMenuVisible(false);
    router.push('/profile/EditProfile');
  };

  const handleManageSubscription = () => {
    setSettingsMenuVisible(false);
    router.push('/subscription/manage');
  };

  const handleOpenGame = () => {
    setSettingsMenuVisible(false);
    setGameModalVisible(true);
  };

  const handleSignOut = () => {
    const isWeb = typeof window !== 'undefined' && window.confirm;

    if (isWeb) {
      if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        signOut().then(() => router.replace('/login'));
      }
    } else {
      Alert.alert(
        'Cerrar sesión',
        '¿Estás seguro de que quieres cerrar sesión?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Cerrar sesión',
            style: 'destructive',
            onPress: async () => {
              await signOut();
              router.replace('/login');
            },
          },
        ]
      );
    }
  };

  // Configurar items del menú
  const settingsMenuItems: DropdownMenuItem[] = useMemo(() => {
    const items: DropdownMenuItem[] = [
      {
        id: 'edit-profile',
        label: 'Editar perfil',
        icon: 'person-outline',
        onPress: handleEditProfile,
      },
      {
        id: 'subscription',
        label: isPremium ? 'Gestionar suscripción' : 'Hazte Premium',
        icon: isPremium ? 'card-outline' : 'diamond-outline',
        onPress: isPremium ? handleManageSubscription : () => {
          setSettingsMenuVisible(false);
          router.push('/premium');
        },
      },
    ];

    // Solo añadir el juego si es premium
    if (isPremium) {
      items.push({
        id: 'game',
        label: 'Jugar Flappy Bird',
        icon: 'game-controller-outline',
        onPress: handleOpenGame,
      });
    }

    items.push({
      id: 'sign-out',
      label: 'Cerrar sesión',
      icon: 'log-out-outline',
      onPress: handleSignOut,
      variant: 'destructive',
    });

    return items;
  }, [isPremium]);

  return (
    <>
      {/* Modal de menú de configuración */}
      <DropdownMenu
        visible={settingsMenuVisible}
        onClose={() => setSettingsMenuVisible(false)}
        items={settingsMenuItems}
        position="top-right"
      />

      {/* Modal del juego FlappyBird */}
      <Modal
        visible={gameModalVisible}
        animationType="slide"
        onRequestClose={() => setGameModalVisible(false)}
      >
        <View className="flex-1 bg-primary-yellow">
          {/* Botón de cerrar */}
          <View className="absolute top-12 right-4 z-50">
            <TouchableOpacity
              onPress={() => setGameModalVisible(false)}
              className="w-12 h-12 bg-dark-black rounded-full items-center justify-center"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={28} color="#FFD54D" />
            </TouchableOpacity>
          </View>

          {/* Juego */}
          <FlappyBirdGame
            visible={gameModalVisible}
            onGameOver={(score) => {
              console.log('Game Over! Score:', score);
            }}
          />
        </View>
      </Modal>

      <Tabs
        screenOptions={{
          headerShown: useClientOnlyValue(false, true),
          tabBarActiveTintColor: '#FFD54D',
          tabBarInactiveTintColor: '#000000',
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 0,
            elevation: 0,
            paddingBottom: insets.bottom,
            paddingTop: 8,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'PlanMyRoute',
            headerShadowVisible: false,
            headerStyle: {
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 0,
              backgroundColor: '#FFFFFF',
            },
            headerRight: () => (
              <TouchableOpacity
                onPress={() => router.push('/notifications')}
                className="mr-4"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View className="w-12 h-12 bg-primary-yellow rounded-full items-center justify-center">
                  <Ionicons name="notifications-outline" size={24} color="#202020" />
                  {pendingCount > 0 && (
                    <View className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full min-w-[20px] h-[20px] items-center justify-center border-2 border-white">
                      <Text className="text-white text-[10px] font-bold">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ),
            tabBarIcon: ({ color }) => <TabHomeIcon stroke={color} />,
            tabBarLabel: 'PlanMyRoute',
          }}
        />

        <Tabs.Screen
          name="feed"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color }) => <TabFeedIcon stroke={color} />,
            tabBarLabel: 'Feed',
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="createTrip"
          options={{
            title: 'Crear viajes',
            tabBarIcon: ({ color }) => <TabNewTripIcon stroke={color} />,
            tabBarLabel: 'Crear viajes',
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: profile?.user.username || 'Perfil',
            headerShadowVisible: false,
            headerStyle: {
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 0,
              backgroundColor: '#FFFFFF',
            },
            headerRight: () => (
              <TouchableOpacity
                onPress={() => setSettingsMenuVisible(true)}
                className="mr-4"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <SettingsIcon width={24} height={24} />
              </TouchableOpacity>
            ),
            tabBarIcon: ({ color }) => <TabProfileIcon stroke={color} />,
            tabBarLabel: profile?.user.username || 'Perfil',
          }}
        />
      </Tabs>
    </>
  );
}