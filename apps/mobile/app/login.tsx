import { useState } from 'react';
import { View, VStack, Input, Button, Text, FormControl } from 'native-base';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiClient } from '@chronic-covid19/api-client';
import { loginSchema, LoginFormData } from '@chronic-covid19/api-client/dist/validation';
import { RolEnum } from '@chronic-covid19/shared-types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.login(data);

      await AsyncStorage.setItem('token', response.access_token);
      await AsyncStorage.setItem('user', JSON.stringify({
        email: data.username,
        rol: RolEnum.PACIENTE,
      }));

      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View flex={1} bg="white" px={4} py={8}>
      <VStack space={4} width="100%">
        {error && (
          <View bg="red.100" p={3} rounded="md">
            <Text color="red.800">{error}</Text>
          </View>
        )}

        <FormControl isInvalid={!!errors.username}>
          <FormControl.Label>Email</FormControl.Label>
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, value } }) => (
              <Input
                placeholder="tu@email.com"
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />
          <FormControl.ErrorMessage>
            {errors.username?.message}
          </FormControl.ErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.password}>
          <FormControl.Label>Contraseña</FormControl.Label>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Input
                placeholder="••••••••"
                value={value}
                onChangeText={onChange}
                type="password"
              />
            )}
          />
          <FormControl.ErrorMessage>
            {errors.password?.message}
          </FormControl.ErrorMessage>
        </FormControl>

        <Button
          mt={4}
          colorScheme="primary"
          isLoading={loading}
          onPress={handleSubmit(onSubmit)}
        >
          Iniciar Sesión
        </Button>

        <Button
          variant="ghost"
          onPress={() => router.push('/register')}
        >
          ¿No tienes cuenta? Regístrate
        </Button>
      </VStack>
    </View>
  );
}