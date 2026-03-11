import UserProfile from '@/components/profile/UserProfile';
import { useAuth } from '@/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function ProfileScreen() {
  const { user } = useAuth();

  if (!user?.id) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#FFD54D" />
      </View>
    );
  }

  return <UserProfile userId={user.id} isOwnProfile={true} />;
}
