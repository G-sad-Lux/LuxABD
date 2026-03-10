import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, useWindowDimensions, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { width } = useWindowDimensions();
    const isPC = width >= 768; 

    async function signInWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) Alert.alert(error.message);
        setLoading(false);
    }

    async function signUpWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) Alert.alert(error.message);
        else Alert.alert('Revisa tu correo para el link de inicio!');
        setLoading(false);
    }

    return (
        <View style={styles.container}>
            <View style={[styles.loginBox, isPC ? styles.pcBox : styles.mobileBox]}>
                <View style={styles.header}>
                    <Text style={styles.title}>Smart Home</Text>
                    <Text style={styles.subtitle}>Inicia sesión para controlar tu casa.</Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="tu@email.com"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                    />

                    <Text style={styles.label}>Contraseña</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.primaryButton, loading && styles.disabledButton]}
                        disabled={loading}
                        onPress={signInWithEmail}
                    >
                        <Text style={styles.primaryButtonText}>Iniciar Sesión</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        disabled={loading}
                        onPress={signUpWithEmail}
                    >
                        <Text style={styles.secondaryButtonText}>Registrarte</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827', // gray-900
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginBox: {
        backgroundColor: '#1F2937', // gray-800
        padding: 32,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 5,
        width: '100%',
    },
    pcBox: {
        maxWidth: 448, // max-w-md
    },
    mobileBox: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        borderRadius: 0,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    subtitle: {
        color: '#9CA3AF', // gray-400
    },
    inputContainer: {
        marginBottom: 24,
    },
    label: {
        color: '#D1D5DB', // gray-300
        fontWeight: '500',
        marginBottom: 4,
    },
    input: {
        backgroundColor: '#374151', // gray-700
        color: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#4B5563', // gray-600
        marginBottom: 16,
    },
    buttonContainer: {
        gap: 16,
    },
    primaryButton: {
        backgroundColor: '#2563EB', // blue-600
        borderRadius: 12,
        paddingVertical: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.7,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 18,
    },
    secondaryButton: {
        backgroundColor: '#374151', // gray-700
        borderRadius: 12,
        paddingVertical: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#60A5FA', // blue-400
        fontWeight: 'bold',
        fontSize: 18,
    }
});
