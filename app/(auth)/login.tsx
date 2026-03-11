import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, useWindowDimensions, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useThemeContext } from '../../hooks/useTheme';

// Theme variables updated to match the new image design
const Colors = {
    light: {
        background: '#FAFBFD', // very light gray/blue off-white
        box: '#FFFFFF',
        text: '#111827',
        textMuted: '#6B7280',
        inputBg: '#EAF6FF', 
        inputBorder: '#B1E3FA', 
        inputIcon: '#0EA5E9',
        inputText: '#0369A1',
        inputPlaceholder: '#7DD3FC',
        btnPrimary: '#0EA5E9', 
        btnPrimaryText: '#FFFFFF',
        linkText: '#0EA5E9',
        errorBg: 'rgba(239, 68, 68, 0.1)',
        errorBorder: 'rgba(239, 68, 68, 0.4)',
        errorText: '#DC2626',
    },
    dark: {
        background: '#111827',
        box: '#1F2937',
        text: '#F9FAFB',
        textMuted: '#9CA3AF',
        inputBg: '#1E3A5F', // Darker blue tint
        inputBorder: '#3B82F6', 
        inputIcon: '#60A5FA',
        inputText: '#E0F2FE',
        inputPlaceholder: '#7DD3FC',
        btnPrimary: '#0EA5E9', 
        btnPrimaryText: '#FFFFFF',
        linkText: '#38BDF8',
        errorBg: 'rgba(239, 68, 68, 0.2)',
        errorBorder: 'rgba(239, 68, 68, 0.5)',
        errorText: '#F87171',
    }
};

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const { width } = useWindowDimensions();
    const isPC = width >= 768; 
    
    // Theme logic using context
    const { activeTheme, mode, setMode } = useThemeContext();
    const theme = activeTheme === 'dark' ? Colors.dark : Colors.light;

    function toggleTheme() {
        if (mode === 'dark') setMode('light');
        else if (mode === 'light') setMode('system');
        else setMode('dark'); // cycle: system -> dark -> light
    }

    async function signInWithEmail() {
        setErrorMessage('');
        
        if (!email || !password) {
            setErrorMessage('Por favor ingresa tu email y contraseña.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                setErrorMessage('El usuario o la contraseña no es válido.');
            } else {
                setErrorMessage(error.message);
            }
        }
        setLoading(false);
    }

    async function signUpWithEmail() {
        setErrorMessage('');

        if (!email || !password) {
            setErrorMessage('Por favor llena todos los campos.');
            return;
        }

        if (password.length < 8) {
            setErrorMessage('La contraseña debe tener un mínimo de 8 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            setErrorMessage(error.message);
        } else if (data.user) {
            await supabase.from('users').insert([{ id: data.user.id, email: email, full_name: email.split('@')[0] }]);
            await supabase.from('perfiles').insert([{ id: data.user.id, email: email, nombre_completo: email.split('@')[0] }]);
            
            Alert.alert('¡Éxito!', 'Revisa tu correo para confirmar tu cuenta y luego inicia sesión.');
            setIsRegistering(false); 
            setPassword('');
            setConfirmPassword('');
        }
        setLoading(false);
    }

    function toggleAuthMode() {
        setIsRegistering(!isRegistering);
        setErrorMessage('');
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            
            {/* Theme Toggle Button */}
            <TouchableOpacity 
                style={styles.themeToggle} 
                onPress={toggleTheme}
            >
                <Feather 
                    name={mode === 'system' ? 'monitor' : (mode === 'dark' ? 'moon' : 'sun')} 
                    size={24} 
                    color={theme.textMuted} 
                />
            </TouchableOpacity>

            <View style={[
                styles.loginBox, 
                isPC ? styles.pcBox : styles.mobileBox,
                { backgroundColor: theme.box, shadowColor: mode === 'dark' ? '#000' : '#E0E0E0' }
            ]}>
                
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.text }]}>Smart Home</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                        {isRegistering ? 'Crea una cuenta para continuar.' : 'Inicia sesión para controlar tu casa.'}
                    </Text>
                </View>

                {errorMessage ? (
                    <View style={[styles.errorContainer, { backgroundColor: theme.errorBg, borderColor: theme.errorBorder }]}>
                        <Text style={[styles.errorText, { color: theme.errorText }]}>{errorMessage}</Text>
                    </View>
                ) : null}

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                        <Feather name="mail" size={20} color={theme.inputIcon} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: theme.inputText }]}
                            placeholder="Enter your email"
                            placeholderTextColor={theme.inputPlaceholder}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>

                    <Text style={[styles.label, { color: theme.text }]}>Password</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                        <Feather name="lock" size={20} color={theme.inputIcon} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: theme.inputText }]}
                            placeholder="Enter your password"
                            placeholderTextColor={theme.inputPlaceholder}
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                            <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={theme.inputIcon} />
                        </TouchableOpacity>
                    </View>

                    {isRegistering && (
                        <>
                            <Text style={[styles.label, { color: theme.text }]}>Confirm Password</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                                <Feather name="lock" size={20} color={theme.inputIcon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.inputText }]}
                                    placeholder="Confirm your password"
                                    placeholderTextColor={theme.inputPlaceholder}
                                    secureTextEntry={!showPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={theme.inputIcon} />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>

                {!isRegistering && (
                    <TouchableOpacity style={styles.forgotPasswordContainer} disabled={loading}>
                        <Text style={[styles.linkText, { color: theme.linkText }]}>Forgot Password?</Text>
                    </TouchableOpacity>
                )}

                <View style={[styles.buttonContainer, { marginTop: isRegistering ? 16 : 8 }]}>
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: theme.btnPrimary }, loading && styles.disabledButton]}
                        disabled={loading}
                        onPress={isRegistering ? signUpWithEmail : signInWithEmail}
                    >
                        <Text style={[styles.primaryButtonText, { color: theme.btnPrimaryText }]}>
                            {isRegistering ? 'Sign Up' : 'Sign In'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.toggleAuthContainer}>
                        <Text style={{ color: theme.textMuted }}>
                            {isRegistering ? "Already have an account?" : "Don't have an account?"}
                        </Text>
                        <TouchableOpacity disabled={loading} onPress={toggleAuthMode}>
                            <Text style={[styles.linkText, { color: theme.linkText, marginLeft: 6, fontWeight: 'bold' }]}>
                                {isRegistering ? 'Sign In' : 'Sign Up'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    themeToggle: {
        position: 'absolute',
        top: 40,
        right: 40,
        padding: 12,
        borderRadius: 50,
        backgroundColor: 'rgba(0,0,0,0.05)',
        zIndex: 10,
    },
    loginBox: {
        padding: 40,
        borderRadius: 24,
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
        elevation: 10,
        width: '100%',
    },
    pcBox: {
        maxWidth: 480, 
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
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontWeight: '400',
        fontSize: 15,
    },
    errorContainer: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
    inputContainer: {
        marginBottom: 8,
    },
    label: {
        fontWeight: '600',
        marginBottom: 8,
        fontSize: 14,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1.5,
        marginBottom: 20,
        paddingHorizontal: 16,
        height: 54,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    eyeIcon: {
        padding: 8,
        marginLeft: 4,
    },
    forgotPasswordContainer: {
        alignItems: 'flex-end',
        marginBottom: 24,
    },
    linkText: {
        fontSize: 14,
        fontWeight: '500',
    },
    buttonContainer: {
        gap: 20,
    },
    primaryButton: {
        borderRadius: 16,
        paddingVertical: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    disabledButton: {
        opacity: 0.7,
        shadowOpacity: 0,
    },
    primaryButtonText: {
        fontWeight: '700',
        fontSize: 16,
    },
    toggleAuthContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    }
});
