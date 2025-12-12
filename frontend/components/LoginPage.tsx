import { View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native'
type LoginPageProps = {
  onLoginPress: () => void;
};

export default function LoginPage({ onLoginPress }: LoginPageProps) {

  return (
    <View style={styles.container}>
      <View style={styles.BloqueVerde}/>
      <Text style={styles.title}>CALENDARIUMS</Text>

      <TouchableOpacity style={styles.myButton} onPress={onLoginPress}>
        <Text style={styles.Btext}>Iniciar sesión</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.myButton} onPress={() => alert("Modo invitado no implementado (*)")}>
        <Text style={styles.Btext}>Entrar sin sesión</Text>
      </TouchableOpacity>

      <Image
        source={require('../assets/michi1.png')}
        style={styles.michiImage}
      />
    </View>
  )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#FEFAE0'
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 50,
        marginTop: 40,
        fontFamily: 'monospace'
    },
    myButton: {
        backgroundColor: '#6A7441',
        width: 220,
        height: 55,
        justifyContent: 'center',
        borderRadius: 50,
        alignItems: 'center',
        marginVertical: 10,
    },
    Btext: {
        color: '#FFFFFF',
        fontSize: 18,
    },
    BloqueVerde:{
        backgroundColor: '#6A7441',
        width: '100%',
        height: '25%',

    },
    michiImage: {
        position: 'absolute',
        bottom: 40,
        width: 275,
        height: 275,
        resizeMode: 'contain',
    }
});