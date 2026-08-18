import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, Button, TextInput, HelperText, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from '@chronic-covid19/api-client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../src/lib/api';
import { mensajeDeError } from '../../src/lib/errors';

export default function Recuperar() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setErrorGeneral(null);
    setEnviando(true);
    try {
      await apiClient.forgotPassword(data.email.trim());
      // Respuesta genérica por seguridad (no revela si el email existe).
      setEnviado(true);
    } catch (e) {
      setErrorGeneral(mensajeDeError(e, 'No pudimos procesar la solicitud. Intentá de nuevo.'));
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
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
          Recuperar contraseña
        </Text>

        {enviado ? (
          <>
            <Text variant="bodyMedium" style={styles.info}>
              Si el email está registrado, te enviamos un código con instrucciones para
              restablecer tu contraseña. Revisá tu correo (y la carpeta de spam).
            </Text>
            <Button
              mode="contained"
              onPress={() => router.push('/(auth)/restablecer')}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Ya tengo un código
            </Button>
            <Button mode="text" onPress={() => router.replace('/(auth)/login')}>
              Volver al inicio
            </Button>
          </>
        ) : (
          <>
            <Text variant="bodyMedium" style={styles.info}>
              Ingresá tu email y te enviaremos un código para restablecer tu contraseña.
            </Text>

            <Controller
              control={control}
              name="email"
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
                    error={!!errors.email}
                  />
                  {errors.email ? (
                    <HelperText type="error" visible>
                      {errors.email.message}
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
              Enviar instrucciones
            </Button>
            <Button mode="text" onPress={() => router.push('/(auth)/restablecer')} disabled={enviando}>
              Ya tengo un código
            </Button>
            <Button mode="text" onPress={() => router.replace('/(auth)/login')} disabled={enviando}>
              Volver al inicio
            </Button>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#ffffff' },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  info: { color: '#6b7280', textAlign: 'center', marginBottom: 16 },
  field: { marginBottom: 4 },
  errorGeneral: { textAlign: 'center' },
  button: { borderRadius: 12, marginTop: 8 },
  buttonContent: { paddingVertical: 6 },
});
