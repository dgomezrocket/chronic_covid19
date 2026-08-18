import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, Button, TextInput, HelperText, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@chronic-covid19/api-client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loginPaciente, RolNoPermitidoError } from '../../src/lib/auth';
import { useAuthStore } from '../../src/store/authStore';
import { mensajeDeError } from '../../src/lib/errors';

export default function Login() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const setSession = useAuthStore((s) => s.setSession);

  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [verPassword, setVerPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorGeneral(null);
    setEnviando(true);
    try {
      const sesion = await loginPaciente(data.username.trim(), data.password);
      await setSession(sesion);
      // El gate de sesión redirige automáticamente a las tabs.
    } catch (e) {
      if (e instanceof RolNoPermitidoError) {
        setErrorGeneral(e.message);
      } else {
        setErrorGeneral(mensajeDeError(e, 'No pudimos iniciar sesión. Verificá tus datos.'));
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
            Salud en Mapa
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Iniciá sesión para continuar
          </Text>
        </View>

        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.field}>
              <TextInput
                mode="outlined"
                label="Email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                error={!!errors.username}
              />
              {errors.username ? (
                <HelperText type="error" visible>
                  {errors.username.message}
                </HelperText>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.field}>
              <TextInput
                mode="outlined"
                label="Contraseña"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!verPassword}
                autoCapitalize="none"
                right={
                  <TextInput.Icon
                    icon={verPassword ? 'eye-off' : 'eye'}
                    onPress={() => setVerPassword((v) => !v)}
                  />
                }
                error={!!errors.password}
              />
              {errors.password ? (
                <HelperText type="error" visible>
                  {errors.password.message}
                </HelperText>
              ) : null}
            </View>
          )}
        />

        {errorGeneral ? (
          <HelperText type="error" visible style={styles.errorGeneral}>
            {errorGeneral}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={enviando}
          disabled={enviando}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Iniciar sesión
        </Button>

        <Button
          mode="text"
          onPress={() => router.push('/(auth)/recuperar')}
          disabled={enviando}
        >
          ¿Olvidaste tu contraseña?
        </Button>

        <View style={styles.registerRow}>
          <Text variant="bodyMedium" style={styles.subtitle}>
            ¿No tenés cuenta?
          </Text>
          <Button
            mode="outlined"
            onPress={() => router.push('/(auth)/register')}
            disabled={enviando}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Crear cuenta
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#ffffff' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontWeight: '700' },
  subtitle: { color: '#6b7280', marginTop: 4, textAlign: 'center' },
  field: { marginBottom: 4 },
  errorGeneral: { textAlign: 'center' },
  button: { borderRadius: 12, marginTop: 8 },
  buttonContent: { paddingVertical: 6 },
  registerRow: { marginTop: 16, alignItems: 'center' },
});
