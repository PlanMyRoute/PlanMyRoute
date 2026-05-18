import UserProfile from '@/components/profile/UserProfile';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useNeedsProfileCompletion } from '@/hooks/users/useNeedsProfileCompletion';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { needsCompletion, isLoading } = useNeedsProfileCompletion();

  useEffect(() => {
    if (needsCompletion) {
      router.replace(ROUTES.completeProfile);
    }
  }, [needsCompletion, router]);

  if (!user?.id || isLoading || needsCompletion) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#FFD54D" />
      </View>
    );
  }

  return <UserProfile userId={user.id} isOwnProfile={true} />;
}
