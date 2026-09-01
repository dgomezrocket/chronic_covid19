import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Button,
  TextInput,
  HelperText,
  ActivityIndicator,
  Card,
  Divider,
  Snackbar,
  useTheme,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  updatePacienteSchema,
  type UpdatePacienteFormData,
  cambiarPasswordSchema,
  type CambiarPasswordFormData,
} from '@chronic-covid19/api-client';
import type { Paciente } from '@chronic-covid19/shared-types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/authStore';
import { mensajeDeError } from '../../src/lib/errors';
import { GeneroSelector } from '../../src/components/GeneroSelector';
import { DateField } from '../../src/components/DateField';
import { LocationField } from '../../src/components/LocationField';
import type { Coordenadas } from '../../src/hooks/useCurrentLocation';

type Estado = 'cargando' | 'error' | 'listo';

export default function Datos() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [estado, setEstado] = useState<Estado>('cargando');
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [coords, setCoords] = useState<Coordenadas | null>(null);
  const [direccionUbicacion, setDireccionUbicacion] = useState('');
  const [guardandoUbicacion, setGuardandoUbicacion] = useState(false);
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdatePacienteFormData>({
    resolver: zodResolver(updatePacienteSchema),
  });

  // Form independiente del de perfil: se envía a otro endpoint y se limpia solo.
  const {
    control: controlPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: erroresPassword },
  } = useForm<CambiarPasswordFormData>({
    resolver: zodResolver(cambiarPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const seedForm = useCallback(
    (p: Paciente) => {
      // La dirección se maneja en la tarjeta de ubicación, no en este form.
      reset({
        documento: p.documento ?? '',
        nombre: p.nombre ?? '',
        fecha_nacimiento: p.fecha_nacimiento ?? '',
        genero: p.genero,
        telefono: p.telefono ?? '',
        email: p.email ?? '',
      });
    },
    [reset],
  );

  const cargar = useCallback(async () => {
    if (!user?.id) return;
    setEstado('cargando');
    try {
      const p = await apiClient.getPaciente(user.id);
      setPaciente(p);
      seedForm(p);
      setCoords(
        p.latitud != null && p.longitud != null
          ? { latitud: p.latitud, longitud: p.longitud }
          : null,
      );
      setDireccionUbicacion(p.direccion ?? '');
      setEstado('listo');
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('cargar paciente', e);
      }
      setEstado('error');
    }
  }, [user?.id, seedForm]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const onGuardarPerfil = async (data: UpdatePacienteFormData) => {
    if (!user?.id) return;
    setGuardando(true);
    try {
      const payload: Partial<Paciente> = {
        documento: data.documento?.trim() || undefined,
        nombre: data.nombre?.trim() || undefined,
        fecha_nacimiento: data.fecha_nacimiento || undefined,
        genero: data.genero,
        telefono: data.telefono?.trim() || undefined,
        email: data.email?.trim() || undefined,
      };
      const actualizado = await apiClient.updatePaciente(user.id, payload);
      setPaciente(actualizado);
      seedForm(actualizado);
      setEditando(false);
      setSnackbar('Datos actualizados correctamente.');
    } catch (e) {
      setSnackbar(mensajeDeError(e, 'No pudimos guardar los cambios.'));
    } finally {
      setGuardando(false);
    }
  };

  const onGuardarUbicacion = async () => {
    if (!user?.id) return;
    setGuardandoUbicacion(true);
    try {
      const payload: Partial<Paciente> = {
        direccion: direccionUbicacion.trim() || undefined,
      };
      if (coords) {
        payload.latitud = coords.latitud;
        payload.longitud = coords.longitud;
      }
      const actualizado = await apiClient.updatePaciente(user.id, payload);
      setPaciente(actualizado);
      setDireccionUbicacion(actualizado.direccion ?? '');
      setSnackbar('Ubicación actualizada correctamente.');
    } catch (e) {
      setSnackbar(mensajeDeError(e, 'No pudimos guardar la ubicación.'));
    } finally {
      setGuardandoUbicacion(false);
    }
  };

  const onCambiarPassword = async (data: CambiarPasswordFormData) => {
    setCambiandoPassword(true);
    try {
      // El backend identifica al usuario por el token: no se envía ningún id.
      await apiClient.cambiarMiPassword(data.password);
      resetPassword();
      setSnackbar('Tu contraseña se actualizó correctamente.');
    } catch (e) {
      setSnackbar(mensajeDeError(e, 'No pudimos actualizar la contraseña.'));
    } finally {
      setCambiandoPassword(false);
    }
  };

  // ----- Estados de carga / error -----
  if (estado === 'cargando') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} accessibilityLabel="Cargando" />
        <Text variant="bodyMedium" style={styles.mutedText}>
          Cargando tus datos…
        </Text>
      </View>
    );
  }

  if (estado === 'error' || !paciente) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium" style={styles.mutedText}>
          No pudimos cargar tus datos.
        </Text>
        <Button mode="contained" onPress={cargar} style={styles.button} contentStyle={styles.buttonContent}>
          Reintentar
        </Button>
        <Button mode="text" onPress={logout} textColor={theme.colors.error}>
          Cerrar sesión
        </Button>
      </View>
    );
  }

  const filas: Array<[string, string]> = [
    ['Documento', paciente.documento],
    ['Nombre', paciente.nombre],
    ['Fecha de nacimiento', paciente.fecha_nacimiento],
    ['Género', paciente.genero === 'femenino' ? 'Femenino' : 'Masculino'],
    ['Email', paciente.email],
    ['Teléfono', paciente.telefono || '—'],
    ['Dirección', paciente.direccion || '—'],
  ];

  const puedeGuardarUbicacion = !!coords || direccionUbicacion.trim().length > 0;

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* ----- Perfil ----- */}
      {!editando ? (
        <Card mode="outlined" style={styles.card}>
          <Card.Content>
            {filas.map(([label, valor]) => (
              <View key={label} style={styles.row}>
                <Text variant="labelMedium" style={styles.rowLabel}>
                  {label}
                </Text>
                <Text variant="bodyMedium" style={styles.rowValue}>
                  {valor}
                </Text>
              </View>
            ))}
            <Button
              mode="contained"
              onPress={() => setEditando(true)}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Editar datos
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <Card mode="outlined" style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.seccion}>
              Editar datos
            </Text>

            <Controller
              control={control}
              name="documento"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.field}>
                  <TextInput mode="outlined" label="Cédula / Documento" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} autoCapitalize="none" error={!!errors.documento} />
                  {errors.documento ? <HelperText type="error" visible>{errors.documento.message}</HelperText> : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="nombre"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.field}>
                  <TextInput mode="outlined" label="Nombre" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} autoCapitalize="words" error={!!errors.nombre} />
                  {errors.nombre ? <HelperText type="error" visible>{errors.nombre.message}</HelperText> : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="fecha_nacimiento"
              render={({ field: { onChange, value } }) => (
                <DateField value={value} onChange={onChange} error={errors.fecha_nacimiento?.message} />
              )}
            />

            <Controller
              control={control}
              name="genero"
              render={({ field: { onChange, value } }) => (
                <GeneroSelector value={value} onChange={onChange} error={errors.genero?.message} />
              )}
            />

            <Controller
              control={control}
              name="telefono"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.field}>
                  <TextInput mode="outlined" label="Teléfono" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" error={!!errors.telefono} />
                  {errors.telefono ? <HelperText type="error" visible>{errors.telefono.message}</HelperText> : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.field}>
                  <TextInput mode="outlined" label="Email" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} autoCapitalize="none" keyboardType="email-address" error={!!errors.email} />
                  {errors.email ? <HelperText type="error" visible>{errors.email.message}</HelperText> : null}
                </View>
              )}
            />

            <Button
              mode="contained"
              onPress={handleSubmit(onGuardarPerfil)}
              loading={guardando}
              disabled={guardando}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Guardar cambios
            </Button>
            <Button
              mode="text"
              onPress={() => {
                seedForm(paciente);
                setEditando(false);
              }}
              disabled={guardando}
            >
              Cancelar
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* ----- Ubicación ----- */}
      <Card mode="outlined" style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.seccion}>
            Mi ubicación
          </Text>
          <LocationField
            value={coords}
            onChange={setCoords}
            descripcion="Actualizá tu domicilio con el GPS o eligiendo el punto en el mapa. La dirección se completa sola y podés ajustarla."
            onAddressResolved={setDireccionUbicacion}
          />

          <View style={styles.field}>
            <TextInput
              mode="outlined"
              label="Dirección"
              value={direccionUbicacion}
              onChangeText={setDireccionUbicacion}
              multiline
            />
            <HelperText type="info" visible>
              Se completa automáticamente según el punto del mapa. Podés editarla.
            </HelperText>
          </View>

          <Button
            mode="contained"
            onPress={onGuardarUbicacion}
            loading={guardandoUbicacion}
            disabled={guardandoUbicacion || !puedeGuardarUbicacion}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Guardar ubicación
          </Button>
        </Card.Content>
      </Card>

      {/* ----- Seguridad ----- */}
      <Card mode="outlined" style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.seccion}>
            Seguridad
          </Text>
          <Text variant="bodySmall" style={styles.mutedTextLeft}>
            Elegí una contraseña nueva. Se aplica a esta cuenta apenas la guardes.
          </Text>

          <Controller
            control={controlPassword}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <TextInput
                  mode="outlined"
                  label="Nueva contraseña"
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  error={!!erroresPassword.password}
                />
                {erroresPassword.password ? (
                  <HelperText type="error" visible>{erroresPassword.password.message}</HelperText>
                ) : null}
              </View>
            )}
          />

          <Controller
            control={controlPassword}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <TextInput
                  mode="outlined"
                  label="Confirmar contraseña"
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  error={!!erroresPassword.confirmPassword}
                />
                {erroresPassword.confirmPassword ? (
                  <HelperText type="error" visible>{erroresPassword.confirmPassword.message}</HelperText>
                ) : null}
              </View>
            )}
          />

          <Button
            mode="contained"
            onPress={handleSubmitPassword(onCambiarPassword)}
            loading={cambiandoPassword}
            disabled={cambiandoPassword}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Cambiar contraseña
          </Button>
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />

      <Button
        mode="outlined"
        onPress={logout}
        style={[styles.button, { borderColor: theme.colors.error }]}
        contentStyle={styles.buttonContent}
        textColor={theme.colors.error}
      >
        Cerrar sesión
      </Button>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar(null)} duration={3000}>
        {snackbar}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  container: { padding: 16, gap: 16, backgroundColor: '#ffffff' },
  card: { backgroundColor: '#ffffff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  rowLabel: { color: '#6b7280' },
  rowValue: { flexShrink: 1, textAlign: 'right' },
  seccion: { marginBottom: 8 },
  field: { marginBottom: 2 },
  divider: { marginVertical: 4 },
  mutedText: { color: '#6b7280', textAlign: 'center' },
  mutedTextLeft: { color: '#6b7280', marginBottom: 12 },
  button: { borderRadius: 12, marginTop: 12 },
  buttonContent: { paddingVertical: 6 },
});
