import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, Button, TextInput, HelperText, Divider, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  registerPacienteSchema,
  type RegisterPacienteFormData,
} from '@chronic-covid19/api-client';
import type { RegisterPacienteData } from '@chronic-covid19/shared-types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { registrarPaciente, RolNoPermitidoError } from '../../src/lib/auth';
import { useAuthStore } from '../../src/store/authStore';
import { mensajeDeError } from '../../src/lib/errors';
import { GeneroSelector } from '../../src/components/GeneroSelector';
import { DateField } from '../../src/components/DateField';
import { LocationField } from '../../src/components/LocationField';
import type { Coordenadas } from '../../src/hooks/useCurrentLocation';

// Campo de texto controlado reutilizable dentro de esta pantalla.
function CampoTexto(props: {
  control: any;
  name: keyof RegisterPacienteFormData;
  label: string;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  secure?: boolean;
}) {
  return (
    <Controller
      control={props.control}
      name={props.name}
      render={({ field: { onChange, onBlur, value } }) => (
        <View style={styles.field}>
          <TextInput
            mode="outlined"
            label={props.label}
            value={(value as string) ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType={props.keyboardType}
            autoCapitalize={props.autoCapitalize}
            secureTextEntry={props.secure}
            error={!!props.error}
          />
          {props.error ? (
            <HelperText type="error" visible>
              {props.error}
            </HelperText>
          ) : null}
        </View>
      )}
    />
  );
}

export default function Register() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const setSession = useAuthStore((s) => s.setSession);

  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coordenadas | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterPacienteFormData>({
    resolver: zodResolver(registerPacienteSchema),
    defaultValues: {
      documento: '',
      nombre: '',
      fecha_nacimiento: '',
      email: '',
      telefono: '',
      direccion: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterPacienteFormData) => {
    setErrorGeneral(null);
    setEnviando(true);
    try {
      const payload: RegisterPacienteData = {
        documento: data.documento.trim(),
        nombre: data.nombre.trim(),
        fecha_nacimiento: data.fecha_nacimiento,
        genero: data.genero,
        email: data.email.trim(),
        password: data.password,
        direccion: data.direccion?.trim() || undefined,
        telefono: data.telefono?.trim() || undefined,
        latitud: coords?.latitud,
        longitud: coords?.longitud,
      };
      const sesion = await registrarPaciente(payload);
      await setSession(sesion);
      // El gate de sesión redirige automáticamente a las tabs.
    } catch (e) {
      if (e instanceof RolNoPermitidoError) {
        setErrorGeneral(e.message);
      } else {
        setErrorGeneral(mensajeDeError(e, 'No pudimos crear tu cuenta. Revisá los datos.'));
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
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
          Crear cuenta
        </Text>

        <CampoTexto control={control} name="documento" label="Documento" error={errors.documento?.message} keyboardType="default" autoCapitalize="none" />
        <CampoTexto control={control} name="nombre" label="Nombre completo" error={errors.nombre?.message} autoCapitalize="words" />

        <Controller
          control={control}
          name="fecha_nacimiento"
          render={({ field: { onChange, value } }) => (
            <DateField
              value={value}
              onChange={onChange}
              error={errors.fecha_nacimiento?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="genero"
          render={({ field: { onChange, value } }) => (
            <GeneroSelector value={value} onChange={onChange} error={errors.genero?.message} />
          )}
        />

        <CampoTexto control={control} name="email" label="Email" error={errors.email?.message} keyboardType="email-address" autoCapitalize="none" />
        <CampoTexto control={control} name="telefono" label="Teléfono (opcional)" error={errors.telefono?.message} keyboardType="phone-pad" />
        <CampoTexto control={control} name="direccion" label="Dirección (opcional)" error={errors.direccion?.message} autoCapitalize="sentences" />
        <CampoTexto control={control} name="password" label="Contraseña" error={errors.password?.message} autoCapitalize="none" secure />

        <Divider style={styles.divider} />
        <Text variant="titleMedium" style={styles.seccion}>
          Ubicación de mi domicilio
        </Text>
        <LocationField
          value={coords}
          onChange={setCoords}
          descripcion="Opcional. Usamos tu ubicación para asignarte hospitales cercanos."
          onAddressResolved={(dir) => setValue('direccion', dir)}
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
          Crear cuenta
        </Button>
        <Button mode="text" onPress={() => router.replace('/(auth)/login')} disabled={enviando}>
          Ya tengo cuenta
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#ffffff' },
  container: { paddingHorizontal: 24, gap: 4 },
  title: { fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  field: { marginBottom: 2 },
  divider: { marginVertical: 16 },
  seccion: { marginBottom: 8 },
  errorGeneral: { textAlign: 'center' },
  button: { borderRadius: 12, marginTop: 16 },
  buttonContent: { paddingVertical: 6 },
});
