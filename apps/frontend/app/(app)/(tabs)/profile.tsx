import UserProfile from '@/components/profile/UserProfile';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useNeedsProfileCompletion } from '@/hooks/users/useNeedsProfileCompletion';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { LoadingView } from '@/components/customElements/LoadingView';

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
    return <LoadingView />;
  }

  return <UserProfile userId={user.id} isOwnProfile={true} />;
}
