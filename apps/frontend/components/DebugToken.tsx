// components/DebugToken.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '@/context/AuthContext';

/**
 * Componente de DEBUG para ver el token JWT
 * Úsalo solo en desarrollo
 * 
 * Ejemplo de uso:
 * <DebugToken />
 */
export function DebugToken() {
  const { token, user } = useAuth();

  const copyToClipboard = (text: string) => {
    // En una app real usarías react-native-clipboard
    console.log('Copied to clipboard:', text);
  };

  if (!token || !user) {
    return null;
  }

  return (
    <View className="bg-yellow-100 border-l-4 border-yellow-500 p-4 m-4">
      <Text className="font-bold text-yellow-800 mb-2">🔐 DEBUG TOKEN</Text>
      
      {/* User ID */}
      <View className="mb-3">
        <Text className="text-xs text-gray-600">User ID:</Text>
        <Text className="text-sm font-mono break-all text-gray-800">{user.id}</Text>
      </View>

      {/* User Email */}
      <View className="mb-3">
        <Text className="text-xs text-gray-600">Email:</Text>
        <Text className="text-sm font-mono break-all text-gray-800">{user.email}</Text>
      </View>

      {/* Token */}
      <View className="mb-3">
        <Text className="text-xs text-gray-600">JWT Token:</Text>
        <ScrollView horizontal className="bg-gray-900 p-2 rounded">
          <Text className="text-xs font-mono text-green-400 break-all">{token}</Text>
        </ScrollView>
      </View>

      {/* Postman Instructions */}
      <View className="bg-blue-50 border border-blue-200 p-2 rounded">
        <Text className="text-xs font-bold text-blue-900 mb-1">Para usar en Postman:</Text>
        <Text className="text-xs text-blue-800 font-mono">Authorization: Bearer {token}</Text>
      </View>

      {/* Copy Button */}
      <TouchableOpacity 
        className="bg-blue-500 rounded mt-3 py-2 px-3"
        onPress={() => copyToClipboard(token)}
      >
        <Text className="text-white text-center font-semibold">Copiar Token</Text>
      </TouchableOpacity>
    </View>
  );
}
