import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, Button, TextInput, HelperText, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { resetPasswordSchema } from '@chronic-covid19/api-client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../src/lib/api';
import { mensajeDeError } from '../../src/lib/errors';

// Se reutiliza el esquema compartido y se agrega la confirmación (solo UI).
const formSchema = resetPasswordSchema
  .extend({ confirmar: z.string().min(1, 'Repetí la contraseña') })
  .refine((d) => d.new_password === d.confirmar, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar'],
  });

type FormData = z.infer<typeof formSchema>;

export default function Restablecer() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [verPassword, setVerPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { token: '', new_password: '', confirmar: '' },
  });

  const onSubmit = async (data: FormData) => {
    setErrorGeneral(null);
    setEnviando(true);
    try {
      await apiClient.resetPassword(data.token.trim(), data.new_password);
      setOk(true);
    } catch (e) {
      setErrorGeneral(mensajeDeError(e, 'No pudimos restablecer la contraseña. Revisá el código.'));
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
          Restablecer contraseña
        </Text>

        {ok ? (
          <>
            <Text variant="bodyMedium" style={styles.info}>
              Tu contraseña fue actualizada correctamente. Ya podés iniciar sesión con la nueva
              contraseña.
            </Text>
            <Button
              mode="contained"
              onPress={() => router.replace('/(auth)/login')}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Ir a iniciar sesión
            </Button>
          </>
        ) : (
          <>
            <Text variant="bodyMedium" style={styles.info}>
              Ingresá el código que recibiste por email y tu nueva contraseña.
            </Text>

            <Controller
              control={control}
              name="token"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.field}>
                  <TextInput
                    mode="outlined"
                    label="Código de recuperación"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="none"
                    error={!!errors.token}
                  />
                  {errors.token ? (
                    <HelperText type="error" visible>
                      {errors.token.message}
                    </HelperText>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="new_password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.field}>
                  <TextInput
                    mode="outlined"
                    label="Nueva contraseña"
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
                    error={!!errors.new_password}
                  />
                  {errors.new_password ? (
                    <HelperText type="error" visible>
                      {errors.new_password.message}
                    </HelperText>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="confirmar"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.field}>
                  <TextInput
                    mode="outlined"
                    label="Repetir contraseña"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry={!verPassword}
                    autoCapitalize="none"
                    error={!!errors.confirmar}
                  />
                  {errors.confirmar ? (
                    <HelperText type="error" visible>
                      {errors.confirmar.message}
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
              Restablecer contraseña
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
