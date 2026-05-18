import type { Href } from 'expo-router';

export const ROUTES = {
  // Landing
  welcome: '/welcome' as Href,

  // Auth
  login: '/login' as Href,
  register: '/register' as Href,
  verifyEmail: (email: string) => `/verify-email?email=${encodeURIComponent(email)}` as Href,
  forgotPassword: '/forgot-password' as Href,
  resetPassword: '/reset-password' as Href,

  // Tabs
  tabsHome: '/(app)/(tabs)/' as Href,
  tabsCreateTrip: '/(app)/(tabs)/CreateTrip' as Href,
  tabsEventsMap: '/(app)/(tabs)/EventsMap' as Href,
  tabsFeed: '/(app)/(tabs)/Feed' as Href,
  tabsProfile: '/(app)/(tabs)/Profile' as Href,

  // App screens
  completeProfile: '/complete-profile' as Href,
  upgradeAccount: '/upgrade-account' as Href,
  notifications: '/notifications' as Href,
  premium: '/premium' as Href,
  editProfile: '/profile/EditProfile' as Href,
  test: '/test' as Href,

  // Subscriptions
  subscriptionSuccess: '/subscription/success' as Href,
  subscriptionCancel: '/subscription/cancel' as Href,
  subscriptionManage: '/subscription/manage' as Href,

  // Trips
  trip: (tripId: string | number) => `/trip/${tripId}` as Href,
  tripCreateWizard: (tripName: string, isAi: boolean, continueDraft = false) =>
    `/trip/createWizard?tripName=${encodeURIComponent(tripName)}&isAi=${isAi}${continueDraft ? '&continueDraft=true' : ''}` as Href,
  tripEdit: (tripId: string | number) => `/trip/edit?tripId=${tripId}` as Href,
  tripTravelers: (tripId: string | number) => `/trip/travelers?tripId=${tripId}` as Href,
  tripVehicles: '/trip/vehicles' as Href,
  tripAddStop: '/trip/addNewStop' as Href,
  tripEditStop: (stopId: string) => `/trip/addNewStop?stopId=${stopId}` as Href,

  // Users
  userProfile: (username: string) => `/${username}` as Href,
} as const;
