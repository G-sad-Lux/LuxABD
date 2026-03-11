import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeContext } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';

const Colors = {
    light: {
        background: '#F0F9FF', card: '#FFFFFF', cardBorder: '#BAE6FD',
        text: '#0C4A6E', textMuted: '#0369A1', textLight: '#7DD3FC',
        accent: '#0EA5E9', accentBg: '#E0F2FE',
        btnPrimary: '#0EA5E9', btnOff: '#E0F2FE', btnOffText: '#0369A1',
        modeActive: '#0EA5E9', modeActiveTxt: '#FFFFFF',
        modeInactive: '#E0F2FE', modeInactiveTxt: '#0369A1',
        adminBadgeBg: '#E0F2FE', adminBadgeText: '#0369A1',
    },
    dark: {
        background: '#0C1624', card: '#132035', cardBorder: '#1E3A5F',
        text: '#E0F2FE', textMuted: '#7DD3FC', textLight: '#38BDF8',
        accent: '#0EA5E9', accentBg: '#1E3A5F',
        btnPrimary: '#0EA5E9', btnOff: '#1E3A5F', btnOffText: '#7DD3FC',
        modeActive: '#0EA5E9', modeActiveTxt: '#FFFFFF',
        modeInactive: '#1E3A5F', modeInactiveTxt: '#7DD3FC',
        adminBadgeBg: '#1E3A5F', adminBadgeText: '#38BDF8',
    }
};

type Termostato = {
    id: string;
    nombre: string;
    estado_actual: { temperatura: number; humedad: number; modo: string; encendido: boolean };
    estado_deseado: { temperatura: number; modo: string; encendido: boolean };
};

export default function TernostatoScreen() {
    const { activeTheme } = useThemeContext();
    const theme = Colors[activeTheme];
    const { width } = useWindowDimensions();
    const isPC = width >= 768;

    const [device, setDevice] = useState<Termostato | null>(null);
    const [loading, setLoading] = useState(true);
    const [targetTemp, setTargetTemp] = useState(22);

    useEffect(() => {
        fetchTermostato();
        const sub = supabase.channel('termostato:disp')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dispositivos' }, (p) => {
                setDevice(prev => prev && prev.id === p.new.id ? { ...prev, ...p.new } : prev);
            })
            .subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    async function fetchTermostato() {
        const { data } = await supabase
            .from('dispositivos')
            .select('id, nombre, estado_actual, estado_deseado')
            .eq('tipo_id', 1)   // tipo_id 1 = Termostato
            .limit(1)
            .single();
        if (data) {
            setDevice(data as any);
            setTargetTemp(data.estado_deseado?.temperatura ?? 22);
        }
        setLoading(false);
    }

    async function updateTemp(delta: number) {
        if (!device) return;
        const newTemp = Math.min(30, Math.max(16, targetTemp + delta));
        setTargetTemp(newTemp);
        await supabase.from('dispositivos')
            .update({ estado_deseado: { ...device.estado_deseado, temperatura: newTemp } })
            .eq('id', device.id);
    }

    async function togglePower() {
        if (!device) return;
        const newState = { ...device.estado_deseado, encendido: !device.estado_actual?.encendido };
        await supabase.from('dispositivos').update({ estado_deseado: newState }).eq('id', device.id);
        setDevice({ ...device, estado_actual: { ...device.estado_actual, encendido: !device.estado_actual?.encendido } });
    }

    async function setModo(modo: string) {
        if (!device) return;
        await supabase.from('dispositivos')
            .update({ estado_deseado: { ...device.estado_deseado, modo } })
            .eq('id', device.id);
        setDevice({ ...device, estado_actual: { ...device.estado_actual, modo } });
    }

    if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color="#0EA5E9" /></View>;
    if (!device)  return <View style={[styles.center, { backgroundColor: theme.background }]}><Text style={{ color: theme.textMuted }}>No se encontró termostato</Text></View>;

    const actualTemp  = device.estado_actual?.temperatura ?? '--';
    const humedad     = device.estado_actual?.humedad ?? '--';
    const modo        = device.estado_actual?.modo ?? 'Calefacción';
    const encendido   = device.estado_actual?.encendido ?? false;

    // Circular gauge arc: calculate progress angle from 16–30°C range
    const progress = Math.min(1, Math.max(0, (Number(actualTemp) - 16) / (30 - 16)));
    const arcColor = encendido ? theme.accent : theme.textLight;

    return (
        <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: isPC ? 40 : 20 }}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Feather name="thermometer" size={24} color={theme.accent} />
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Termostato</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: theme.adminBadgeBg }]}>
                    <Feather name="shield" size={14} color={theme.adminBadgeText} />
                    <Text style={[styles.badgeText, { color: theme.adminBadgeText }]}>Administrador</Text>
                </View>
            </View>

            <View style={[styles.mainCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }, isPC && styles.mainCardPC]}>
                {/* Circular Temperature Display */}
                <View style={styles.gaugeContainer}>
                    <View style={[styles.gaugeOuter, { borderColor: arcColor, opacity: encendido ? 1 : 0.4 }]}>
                        <View style={[styles.gaugeInner, { borderColor: arcColor + '50' }]}>
                            <Text style={[styles.tempValue, { color: theme.text }]}>{actualTemp}</Text>
                            <Text style={[styles.tempUnit,  { color: theme.textMuted }]}>°C</Text>
                        </View>
                    </View>
                </View>

                {/* Current reading label */}
                <Text style={[styles.currentLabel, { color: theme.textMuted }]}>
                    Temperatura actual · {actualTemp}°C en casa
                </Text>

                {/* Target temperature controls */}
                <View style={styles.tempControls}>
                    <TouchableOpacity onPress={() => updateTemp(-1)} style={[styles.tempBtn, { backgroundColor: theme.accentBg }]}>
                        <Feather name="minus" size={22} color={theme.accent} />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={[styles.targetTemp, { color: theme.text }]}>{targetTemp}°C</Text>
                        <Text style={[styles.targetLabel, { color: theme.textMuted }]}>deseado</Text>
                    </View>
                    <TouchableOpacity onPress={() => updateTemp(+1)} style={[styles.tempBtn, { backgroundColor: theme.accentBg }]}>
                        <Feather name="plus" size={22} color={theme.accent} />
                    </TouchableOpacity>
                </View>

                {/* Mode + Power + Humidity row */}
                <View style={styles.infoRow}>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Modo</Text>
                        <Text style={[styles.infoValue, { color: theme.text }]}>{modo}</Text>
                    </View>

                    <TouchableOpacity onPress={togglePower}
                        style={[styles.powerBtn, { backgroundColor: encendido ? theme.btnPrimary : theme.btnOff }]}>
                        <Feather name="power" size={22} color={encendido ? '#fff' : theme.btnOffText} />
                        <Text style={[styles.powerText, { color: encendido ? '#fff' : theme.btnOffText }]}>
                            {encendido ? 'Encendido' : 'Apagado'}
                        </Text>
                    </TouchableOpacity>

                    <View style={{ alignItems: 'center' }}>
                        <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Humedad</Text>
                        <Text style={[styles.infoValue, { color: theme.text }]}>{humedad}%</Text>
                    </View>
                </View>

                {/* Mode selector */}
                <View style={styles.modeRow}>
                    {['Calefacción', 'Enfriamiento', 'Ventilación'].map(m => (
                        <TouchableOpacity key={m} onPress={() => setModo(m)}
                            style={[styles.modeChip, { backgroundColor: modo === m ? theme.modeActive : theme.modeInactive }]}>
                            <Text style={[styles.modeText, { color: modo === m ? theme.modeActiveTxt : theme.modeInactiveTxt }]}>{m}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    headerTitle: { fontSize: 22, fontWeight: '700' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    badgeText: { fontSize: 13, fontWeight: '600' },
    mainCard: { borderRadius: 28, borderWidth: 1.5, padding: 28, alignItems: 'center' },
    mainCardPC: { maxWidth: 480, alignSelf: 'center', width: '100%' },
    // Gauge
    gaugeContainer: { marginBottom: 20 },
    gaugeOuter: { width: 200, height: 200, borderRadius: 100, borderWidth: 10, alignItems: 'center', justifyContent: 'center' },
    gaugeInner: { width: 160, height: 160, borderRadius: 80, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
    tempValue: { fontSize: 64, fontWeight: '800', lineHeight: 70 },
    tempUnit: { fontSize: 20, fontWeight: '500' },
    currentLabel: { fontSize: 14, marginBottom: 24 },
    // Controls
    tempControls: { flexDirection: 'row', alignItems: 'center', gap: 32, marginBottom: 28 },
    tempBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    targetTemp: { fontSize: 32, fontWeight: '700' },
    targetLabel: { fontSize: 12, marginTop: 2 },
    // Info row
    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 24 },
    infoLabel: { fontSize: 12, marginBottom: 4 },
    infoValue: { fontSize: 16, fontWeight: '600' },
    powerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 20 },
    powerText: { fontSize: 15, fontWeight: '700' },
    // Mode chips
    modeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
    modeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    modeText: { fontSize: 13, fontWeight: '600' },
});
