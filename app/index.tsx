import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, useWindowDimensions, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

type Device = {
  id: string;
  nombre: string;
  estado_actual: Record<string, any>;
};

export default function MainScreen() {
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    const isPC = width >= 768;

    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDevices();

        const subscription = supabase
            .channel('public:dispositivos')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dispositivos' }, handleRealtimeEvent)
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    async function fetchDevices() {
        try {
            const { data, error } = await supabase
                .from('dispositivos')
                .select('id, nombre, estado_actual');
            
            if (error) throw error;
            if (data) setDevices(data);
        } catch (error) {
            console.error('Error fetching devices', error);
        } finally {
            setLoading(false);
        }
    }

    function handleRealtimeEvent(payload: any) {
        console.log('Realtime Event Received:', payload);
        
        if (payload.eventType === 'INSERT') {
            setDevices(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
            setDevices(prev => prev.map(dev => dev.id === payload.new.id ? payload.new : dev));
        } else if (payload.eventType === 'DELETE') {
            setDevices(prev => prev.filter(dev => dev.id !== payload.old.id));
        }
    }

    async function toggleDeviceState(device: Device) {
        const currentState = device.estado_actual?.encendido || false;
        const newState = { ...device.estado_actual, encendido: !currentState };

        const { error } = await supabase
            .from('dispositivos')
            .update({ estado_deseado: newState })
            .eq('id', device.id);

        if (error) console.error('Failed to update device', error);
    }

    async function handleSignOut() {
        await supabase.auth.signOut();
    }

    return (
        <View style={styles.container}>
            {/* Header / Nav */}
            <View style={[styles.header, isPC ? styles.headerPC : styles.headerMobile]}>
                <Text style={styles.title}>Mi Hogar Inteligente</Text>
                
                <View style={[styles.userInfo, isPC ? styles.userInfoPC : styles.userInfoMobile]}>
                    <Text style={styles.userEmail}>Hola, {user?.email}</Text>
                    <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
                        <Text style={styles.logoutText}>Cerrar Sesión</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Dashboard Content */}
            <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { padding: isPC ? 32 : 16 }]}>
                
                <Text style={styles.sectionTitle}>Mis Dispositivos</Text>
                
                {loading ? (
                    <ActivityIndicator size="large" color="#3B82F6" style={styles.loader} />
                ) : devices.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No se encontraron dispositivos registrados.</Text>
                    </View>
                ) : (
                    <View style={[styles.devicesGrid, isPC ? styles.devicesGridPC : styles.devicesGridMobile]}>
                        {devices.map(device => {
                            const isEncendido = device.estado_actual?.encendido === true;

                            return (
                                <TouchableOpacity 
                                    key={device.id}
                                    onPress={() => toggleDeviceState(device)}
                                    activeOpacity={0.7}
                                    style={[
                                        styles.deviceCard,
                                        isPC ? styles.deviceCardPC : styles.deviceCardMobile,
                                        isEncendido ? styles.deviceCardActive : styles.deviceCardInactive
                                    ]}
                                >
                                    <View style={styles.deviceIconContainer}>
                                        <View style={[styles.deviceIcon, isEncendido ? styles.deviceIconBgActive : styles.deviceIconBgInactive]}>
                                            <Text style={styles.deviceIconText}>{isEncendido ? '💡' : '🔌'}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.deviceName}>{device.nombre}</Text>
                                    <Text style={styles.deviceStatus}>
                                        {isEncendido ? 'Encendido' : 'Apagado'}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030712', // gray-950
    },
    header: {
        backgroundColor: '#111827', // gray-900
        borderBottomWidth: 1,
        borderBottomColor: '#1F2937', // gray-800
    },
    headerPC: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 24,
    },
    headerMobile: {
        paddingHorizontal: 16,
        paddingTop: 40,
        paddingBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    userInfo: {
        alignItems: 'center',
    },
    userInfoPC: {
        flexDirection: 'row',
        gap: 24,
    },
    userInfoMobile: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    userEmail: {
        color: '#9CA3AF', // gray-400
        fontWeight: '500',
    },
    logoutButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)', // red-500/10
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)', // red-500/20
    },
    logoutText: {
        color: '#F87171', // red-400
        fontWeight: 'bold',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        // padding dynamic based on isPC
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#E5E7EB', // gray-200
        marginBottom: 24,
    },
    loader: {
        marginTop: 80,
    },
    emptyContainer: {
        backgroundColor: '#111827', // gray-900
        padding: 32,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1F2937', // gray-800
    },
    emptyText: {
        color: '#9CA3AF', // gray-400
        fontSize: 18,
    },
    devicesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    devicesGridPC: {
        flexDirection: 'row',
    },
    devicesGridMobile: {
        justifyContent: 'space-between',
    },
    deviceCard: {
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
    },
    deviceCardPC: {
        width: 250,
    },
    deviceCardMobile: {
        width: '48%',
    },
    deviceCardActive: {
        backgroundColor: 'rgba(37, 99, 235, 0.2)', // blue-600/20
        borderColor: 'rgba(59, 130, 246, 0.5)', // blue-500/50
    },
    deviceCardInactive: {
        backgroundColor: '#111827', // gray-900
        borderColor: '#1F2937', // gray-800
    },
    deviceIconContainer: {
        marginBottom: 16,
    },
    deviceIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deviceIconBgActive: {
        backgroundColor: '#3B82F6', // blue-500
    },
    deviceIconBgInactive: {
        backgroundColor: '#1F2937', // gray-800
    },
    deviceIconText: {
        fontSize: 20,
    },
    deviceName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    deviceStatus: {
        fontSize: 14,
        color: '#9CA3AF', // gray-400
        fontWeight: '500',
    }
});
