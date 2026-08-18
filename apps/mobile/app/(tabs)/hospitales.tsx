import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export default function Hospitales() {
  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Hospitales
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  title: {
    color: '#1c5891',
  },
});
