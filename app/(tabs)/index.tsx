import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, useWindowDimensions, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useThemeContext } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';

type Device = {
  id: string;
  nombre: string;
  estado_actual: Record<string, any>;
};

const Colors = {
    light: {
        background: '#F0F9FF', headerBg: '#FFFFFF', headerBorder: '#BAE6FD',
        text: '#0C4A6E', textMuted: '#0369A1',
        btnLogoutBg: 'rgba(239,68,68,0.08)', btnLogoutBorder: 'rgba(239,68,68,0.3)', btnLogoutText: '#DC2626',
        sectionTitle: '#0369A1',
        cardOnBg: '#EFF6FF', cardOnBorder: '#60A5FA',
        cardOffBg: '#FFFFFF', cardOffBorder: '#BAE6FD',
        iconOnBg: '#0EA5E9', iconOffBg: '#E0F2FE',
    },
    dark: {
        background: '#030712', headerBg: '#0D1526', headerBorder: '#1E3A5F',
        text: '#E0F2FE', textMuted: '#7DD3FC',
        btnLogoutBg: 'rgba(239,68,68,0.1)', btnLogoutBorder: 'rgba(239,68,68,0.3)', btnLogoutText: '#F87171',
        sectionTitle: '#7DD3FC',
        cardOnBg: 'rgba(14,165,233,0.18)', cardOnBorder: 'rgba(56,189,248,0.5)',
        cardOffBg: '#0D1526', cardOffBorder: '#1E3A5F',
        iconOnBg: '#0EA5E9', iconOffBg: '#1E3A5F',
    }
};

function getIcon(nombre: string, on: boolean): any {
    const n = nombre.toLowerCase();
    if (n.includes('termostato')) return 'thermometer';
    if (n.includes('minisplit') || n.includes('ms')) return 'wind';
    if (n.includes('foco') || n.includes('luz')) return 'sun';
    if (n.includes('sensor')) return 'activity';
    if (n.includes('enchufe')) return 'zap';
    return on ? 'zap' : 'power';
}

export default function HogarScreen() {
    const { user }                    = useAuth();
    const { width }                   = useWindowDimensions();
    const { activeTheme, mode, setMode } = useThemeContext();
    const theme                        = Colors[activeTheme];

    // Responsive breakpoints
    const isPC      = width >= 1024;
    const isTablet  = width >= 640;
    const COLS      = isPC ? 4 : isTablet ? 3 : 2;
    const GAP       = 14;
    const PAD       = isPC ? 40 : 20;
    const CARD_W    = (width - PAD * 2 - GAP * (COLS - 1)) / COLS;

    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDevices();
        const sub = supabase.channel('hogar:rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dispositivos' }, handleRT)
            .subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    async function fetchDevices() {
        const { data, error } = await supabase.from('dispositivos').select('id, nombre, estado_actual');
        if (error) {
            console.error('❌ fetchDevices error:', error.message, error.details);
        } else {
            console.log(`✅ Dispositivos cargados: ${data?.length}`);
            setDevices(data ?? []);
        }
        setLoading(false);
    }

    function handleRT(p: any) {
        if (p.eventType === 'INSERT') setDevices(prev => [...prev, p.new]);
        else if (p.eventType === 'UPDATE') setDevices(prev => prev.map(d => d.id === p.new.id ? { ...d, ...p.new } : d));
        else if (p.eventType === 'DELETE') setDevices(prev => prev.filter(d => d.id !== p.old.id));
    }

    async function toggleDevice(device: Device) {
        const on = device.estado_actual?.encendido;
        await supabase.from('dispositivos')
            .update({ estado_deseado: { ...device.estado_actual, encendido: !on } })
            .eq('id', device.id);
        setDevices(prev => prev.map(d => d.id === device.id ? { ...d, estado_actual: { ...d.estado_actual, encendido: !on } } : d));
    }

    const activeCount = devices.filter(d => d.estado_actual?.encendido).length;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.headerBorder }]}>
                <View>
                    <Text style={[styles.title, { color: theme.text }]}>Mi Hogar</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                        {activeCount} de {devices.length} activos
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}
                        style={[styles.iconBtn, { backgroundColor: theme.cardOffBg, borderColor: theme.cardOffBorder }]}
                    >
                        <Feather name={activeTheme === 'dark' ? 'sun' : 'moon'} size={20} color={theme.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => supabase.auth.signOut()}
                        style={[styles.logoutBtn, { backgroundColor: theme.btnLogoutBg, borderColor: theme.btnLogoutBorder }]}
                    >
                        <Feather name="log-out" size={15} color={theme.btnLogoutText} />
                        <Text style={[styles.logoutText, { color: theme.btnLogoutText }]}>Salir</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content */}
            <ScrollView contentContainerStyle={{ padding: PAD }}>
                <Text style={[styles.sectionLabel, { color: theme.sectionTitle }]}>Mis Dispositivos</Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#0EA5E9" style={{ marginTop: 60 }} />
                ) : (
                    <View style={[styles.grid, { gap: GAP }]}>
                        {devices.map(device => {
                            const on   = device.estado_actual?.encendido === true;
                            const icon = getIcon(device.nombre, on);
                            return (
                                <TouchableOpacity
                                    key={device.id}
                                    onPress={() => toggleDevice(device)}
                                    activeOpacity={0.75}
                                    style={[
                                        styles.card,
                                        {
                                            width: CARD_W,
                                            backgroundColor: on ? theme.cardOnBg : theme.cardOffBg,
                                            borderColor: on ? theme.cardOnBorder : theme.cardOffBorder,
                                        }
                                    ]}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: on ? theme.iconOnBg : theme.iconOffBg }]}>
                                        <Feather name={icon} size={24} color={on ? '#FFFFFF' : theme.textMuted} />
                                    </View>
                                    <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={2}>{device.nombre}</Text>
                                    <View style={styles.cardStatusRow}>
                                        <View style={[styles.statusDot, { backgroundColor: on ? '#22C55E' : '#9CA3AF' }]} />
                                        <Text style={[styles.cardStatus, { color: theme.textMuted }]}>
                                            {on ? 'Encendido' : 'Apagado'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container:      { flex: 1 },
    header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 52, paddingBottom: 18, borderBottomWidth: 1 },
    title:          { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    subtitle:       { fontSize: 13, marginTop: 2, fontWeight: '500' },
    headerActions:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBtn:        { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    logoutBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
    logoutText:     { fontWeight: '700', fontSize: 13 },
    sectionLabel:   { fontSize: 16, fontWeight: '700', marginBottom: 18, letterSpacing: 0.3 },
    grid:           { flexDirection: 'row', flexWrap: 'wrap' },
    card:           { padding: 18, borderRadius: 20, borderWidth: 1.5, marginBottom: 0 },
    iconCircle:     { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    cardName:       { fontSize: 15, fontWeight: '700', marginBottom: 8, lineHeight: 20 },
    cardStatusRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusDot:      { width: 7, height: 7, borderRadius: 4 },
    cardStatus:     { fontSize: 12, fontWeight: '600' },
});
