import { Redirect } from "expo-router";
import { ActivityIndicator, Platform, View } from "react-native";
import { ROUTES } from "../constants/routes";
import { useAuth } from "../context/AuthContext";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FFD54D",
        }}
      >
        <ActivityIndicator size="large" color="#202020" />
      </View>
    );
  }

  if (user) {
    return <Redirect href={ROUTES.tabsHome} />;
  }

  // Web -> landing page, móvil -> login directo
  return (
    <Redirect href={Platform.OS === "web" ? ROUTES.welcome : ROUTES.login} />
  );
}
