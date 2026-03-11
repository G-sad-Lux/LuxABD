import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeContext } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';

const Colors = {
    light: {
        background: '#F0F9FF', card: '#FFFFFF', cardBorder: '#BAE6FD',
        text: '#0C4A6E', textMuted: '#0369A1', textSubtle: '#7DD3FC',
        accent: '#0EA5E9', accentBg: '#E0F2FE',
        danger: '#DC2626', dangerBg: 'rgba(220,38,38,0.08)', dangerBorder: 'rgba(220,38,38,0.25)',
        headerBg: '#FFFFFF', headerBorder: '#BAE6FD',
        userCardBg: '#F0F9FF', userCardBorder: '#BAE6FD',
        activeDot: '#22C55E', inactiveDot: '#9CA3AF',
    },
    dark: {
        background: '#030712', card: '#0D1526', cardBorder: '#1E3A5F',
        text: '#E0F2FE', textMuted: '#7DD3FC', textSubtle: '#38BDF8',
        accent: '#0EA5E9', accentBg: '#1E3A5F',
        danger: '#F87171', dangerBg: 'rgba(248,113,113,0.1)', dangerBorder: 'rgba(248,113,113,0.3)',
        headerBg: '#0D1526', headerBorder: '#1E3A5F',
        userCardBg: '#111827', userCardBorder: '#1E3A5F',
        activeDot: '#22C55E', inactiveDot: '#6B7280',
    }
};

type User = { id: string; email: string; full_name: string; is_active: boolean; created_at: string };
type Historial = { id: string; fecha_hora: string; datos_lectura: any; dispositivo_id: string };

const ACTION_CARDS = [
    { id: 'permisos',   icon: 'user-check', title: 'Modificar',  subtitle: 'Permisos',        color: '#0EA5E9' },
    { id: 'hist_en',    icon: 'clock',      title: 'Historial',  subtitle: 'Energía',          color: '#0EA5E9' },
    { id: 'eliminar',   icon: 'user-minus', title: 'Eliminar',   subtitle: 'Usuarios',         color: '#F87171' },
    { id: 'hist_horas', icon: 'bar-chart-2',title: 'Historial',  subtitle: 'Horas de Uso',     color: '#0EA5E9' },
];

export default function AdminScreen() {
    const { activeTheme } = useThemeContext();
    const theme = Colors[activeTheme];
    const { width } = useWindowDimensions();
    const isPC = width >= 768;

    const [users, setUsers]           = useState<User[]>([]);
    const [historial, setHistorial]   = useState<Historial[]>([]);
    const [loadingU, setLoadingU]     = useState(true);
    const [loadingH, setLoadingH]     = useState(true);
    const [activePanel, setActivePanel] = useState<string | null>(null);

    useEffect(() => { fetchUsers(); fetchHistorial(); }, []);

    async function fetchUsers() {
        const { data } = await supabase.from('users').select('id, email, full_name, is_active, created_at').order('created_at', { ascending: false });
        if (data) setUsers(data);
        setLoadingU(false);
    }

    async function fetchHistorial() {
        const since = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
        const { data } = await supabase.from('historial_mediciones')
            .select('id, fecha_hora, datos_lectura, dispositivo_id')
            .gte('fecha_hora', since)
            .order('fecha_hora', { ascending: false })
            .limit(20);
        if (data) setHistorial(data);
        setLoadingH(false);
    }

    async function toggleUserActive(user: User) {
        const newState = !user.is_active;
        Alert.alert(
            newState ? 'Activar usuario' : 'Desactivar usuario',
            `¿Seguro que deseas ${newState ? 'activar' : 'desactivar'} a ${user.full_name || user.email}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    style: newState ? 'default' : 'destructive',
                    onPress: async () => {
                        await supabase.from('users').update({ is_active: newState }).eq('id', user.id);
                        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: newState } : u));
                    },
                }
            ]
        );
    }

    function handleAction(id: string) {
        setActivePanel(activePanel === id ? null : id);
    }

    return (
        <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ padding: isPC ? 40 : 20 }}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={[styles.badge, { backgroundColor: theme.accentBg }]}>
                        <Feather name="shield" size={13} color={theme.accent} />
                        <Text style={[styles.badgeText, { color: theme.accent }]}>Administrador</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: theme.accentBg }]}>
                        <Feather name="settings" size={13} color={theme.accent} />
                        <Text style={[styles.badgeText, { color: theme.accent }]}>Ajustes</Text>
                    </View>
                </View>
            </View>

            <Text style={[styles.pageTitle, { color: theme.text }]}>Panel de Control</Text>

            {/* Action Grid — 2x2 */}
            {(() => {
                const GAP = 14;
                const CARD_W = (width - (isPC ? 80 : 40) - GAP) / 2;
                return (
                    <View style={[styles.actionGrid, { gap: GAP, marginBottom: 28 }]}>
                        {ACTION_CARDS.map(ac => (
                            <TouchableOpacity
                                key={ac.id}
                                onPress={() => handleAction(ac.id)}
                                activeOpacity={0.8}
                                style={[
                                    styles.actionCard,
                                    {
                                        width: isPC ? 240 : CARD_W,
                                        backgroundColor: theme.card,
                                        borderColor: activePanel === ac.id ? ac.color : theme.cardBorder,
                                        borderWidth: activePanel === ac.id ? 2 : 1.5,
                                    }
                                ]}
                            >
                                <View style={[styles.actionIconCircle, { backgroundColor: ac.id === 'eliminar' ? theme.dangerBg : theme.accentBg }]}>
                                    <Feather name={ac.icon as any} size={26} color={ac.id === 'eliminar' ? theme.danger : ac.color} />
                                </View>
                                <Text style={[styles.actionTitle, { color: ac.id === 'eliminar' ? theme.danger : theme.text }]}>{ac.title}</Text>
                                <Text style={[styles.actionSubtitle, { color: theme.textMuted }]}>{ac.subtitle}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            })()}

            {/* Panel: Usuarios (Modificar Permisos / Eliminar) */}
            {(activePanel === 'permisos' || activePanel === 'eliminar') && (
                <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.panelTitle, { color: theme.text }]}>
                        {activePanel === 'permisos' ? '🔑 Modificar Permisos' : '🗑️ Gestión de Usuarios'}
                    </Text>
                    {loadingU ? <ActivityIndicator color="#0EA5E9" style={{ margin: 20 }} /> : (
                        users.map(u => (
                            <View key={u.id} style={[styles.userRow, { borderBottomColor: theme.cardBorder }]}>
                                <View style={[styles.userAvatar, { backgroundColor: theme.accentBg }]}>
                                    <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 16 }}>
                                        {(u.full_name || u.email).charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.userName, { color: theme.text }]}>{u.full_name || '—'}</Text>
                                    <Text style={[styles.userEmail, { color: theme.textMuted }]} numberOfLines={1}>{u.email}</Text>
                                </View>
                                <View style={styles.userRight}>
                                    <View style={[styles.statusPill, { backgroundColor: u.is_active ? 'rgba(34,197,94,0.1)' : theme.dangerBg }]}>
                                        <View style={[styles.statusDot, { backgroundColor: u.is_active ? theme.activeDot : theme.inactiveDot }]} />
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: u.is_active ? '#16A34A' : theme.danger }}>
                                            {u.is_active ? 'Activo' : 'Inactivo'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => toggleUserActive(u)}
                                        style={[styles.actionBtn, { backgroundColor: u.is_active ? theme.dangerBg : theme.accentBg, borderColor: u.is_active ? theme.dangerBorder : theme.cardBorder }]}
                                    >
                                        <Feather name={u.is_active ? 'user-x' : 'user-check'} size={15} color={u.is_active ? theme.danger : theme.accent} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            )}

            {/* Panel: Historial de Energía */}
            {activePanel === 'hist_en' && (
                <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.panelTitle, { color: theme.text }]}>⚡ Historial de Energía (últimos 7 días)</Text>
                    {loadingH ? <ActivityIndicator color="#0EA5E9" style={{ margin: 20 }} /> : (
                        historial.map(h => {
                            const kwh = h.datos_lectura?.kwh ?? '—';
                            const hora = h.datos_lectura?.hora;
                            const date = new Date(h.fecha_hora);
                            return (
                                <View key={h.id} style={[styles.histRow, { borderBottomColor: theme.cardBorder }]}>
                                    <View style={[styles.histIconBox, { backgroundColor: theme.accentBg }]}>
                                        <Feather name="zap" size={14} color={theme.accent} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.histLabel, { color: theme.text }]}>
                                            {date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} · {hora !== undefined ? `${hora}:00` : date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                        <Text style={[styles.histSub, { color: theme.textMuted }]}>Modo: {h.datos_lectura?.modo ?? '—'}</Text>
                                    </View>
                                    <Text style={[styles.histValue, { color: theme.accent }]}>{kwh} kWh</Text>
                                </View>
                            );
                        })
                    )}
                </View>
            )}

            {/* Panel: Historial Horas de Uso */}
            {activePanel === 'hist_horas' && (
                <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.panelTitle, { color: theme.text }]}>🕐 Historial de Horas de Uso</Text>
                    {loadingH ? <ActivityIndicator color="#0EA5E9" style={{ margin: 20 }} /> : (
                        historial.filter(h => h.datos_lectura?.horas_uso != null).map(h => {
                            const date = new Date(h.fecha_hora);
                            return (
                                <View key={h.id} style={[styles.histRow, { borderBottomColor: theme.cardBorder }]}>
                                    <View style={[styles.histIconBox, { backgroundColor: theme.accentBg }]}>
                                        <Feather name="clock" size={14} color={theme.accent} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.histLabel, { color: theme.text }]}>
                                            {date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} · {date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                        <Text style={[styles.histSub, { color: theme.textMuted }]}>Dispositivo: {h.dispositivo_id.substring(0, 8)}…</Text>
                                    </View>
                                    <Text style={[styles.histValue, { color: theme.accent }]}>{h.datos_lectura?.horas_uso ?? 0} h</Text>
                                </View>
                            );
                        })
                    )}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    header:         { flexDirection: 'row', marginBottom: 16 },
    badge:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 6 },
    badgeText:      { fontSize: 12, fontWeight: '700' },
    pageTitle:      { fontSize: 30, fontWeight: '800', marginBottom: 28, letterSpacing: -0.5 },
    actionGrid:     { flexDirection: 'row', flexWrap: 'wrap' },
    actionCard:     { padding: 24, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    actionIconCircle:{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    actionTitle:    { fontSize: 18, fontWeight: '700', marginBottom: 2 },
    actionSubtitle: { fontSize: 13, fontWeight: '500' },
    panel:          { borderRadius: 20, borderWidth: 1.5, padding: 20, marginBottom: 20 },
    panelTitle:     { fontSize: 16, fontWeight: '700', marginBottom: 18 },
    userRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
    userAvatar:     { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    userName:       { fontSize: 14, fontWeight: '700' },
    userEmail:      { fontSize: 12, marginTop: 2 },
    userRight:      { alignItems: 'flex-end', gap: 8 },
    statusPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusDot:      { width: 6, height: 6, borderRadius: 3 },
    actionBtn:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    histRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
    histIconBox:    { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    histLabel:      { fontSize: 14, fontWeight: '600' },
    histSub:        { fontSize: 11, marginTop: 2 },
    histValue:      { fontSize: 15, fontWeight: '700' },
});
