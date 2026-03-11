import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, ActivityIndicator,
    StyleSheet, useWindowDimensions, TouchableOpacity
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeContext } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';

// -------- Tarifas CFE 2025 --------
const TARIFAS_CFE: Record<string, { nombre: string; bloques: [number, number][]; limite_dac: number }> = {
    '1':   { nombre: 'Tarifa 1 — Zona Templada',  bloques: [[75,1.083],[125,1.315],[Infinity,3.847]], limite_dac: 250 },
    '1A':  { nombre: 'Tarifa 1A — 25°C verano',   bloques: [[75,1.091],[125,1.325],[Infinity,3.875]], limite_dac: 300 },
    '1B':  { nombre: 'Tarifa 1B — 28°C verano',   bloques: [[75,1.099],[125,1.335],[Infinity,3.903]], limite_dac: 400 },
    '1C':  { nombre: 'Tarifa 1C — 30°C verano',   bloques: [[75,1.099],[125,1.335],[Infinity,3.950]], limite_dac: 850 },
    'DAC': { nombre: 'Tarifa DAC — Alto Consumo',  bloques: [[Infinity,6.339]],                        limite_dac: 0 },
};

function calcularCosto(kwh: number, tarifa: string): number {
    const t = TARIFAS_CFE[tarifa];
    if (!t) return kwh * 3.85;
    let remaining = kwh, total = 0;
    for (const [lim, precio] of t.bloques) {
        if (remaining <= 0) break;
        const c = Math.min(remaining, lim === Infinity ? remaining : lim);
        total += c * precio; remaining -= c;
    }
    return total;
}

// -------- Meses disponibles (hoy - 3 meses) --------
function buildMeses() {
    const ahora = new Date();
    const meses = [];
    for (let i = 0; i <= 3; i++) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        meses.push({
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            label: d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
            inicio: new Date(d.getFullYear(), d.getMonth(), 1).toISOString(),
            fin:    new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString(),
            isHoy:  i === 0,
        });
    }
    return meses;
}
const MESES = buildMeses();

// -------- Colores --------
const Colors = {
    light: {
        bg: '#F0F9FF', card: '#FFFFFF', cardBorder: '#BAE6FD',
        text: '#0C4A6E', muted: '#0369A1', accent: '#0EA5E9',
        accentBg: '#E0F2FE', barBg: '#E0F2FE',
        barColors: ['#0EA5E9','#38BDF8','#7DD3FC','#BAE6FD'],
        dotActive: '#0EA5E9', dotInactive: '#E0F2FE',
        green: '#16A34A', greenBg: 'rgba(22,163,74,0.1)',
        warn: '#D97706', warnBg: 'rgba(217,119,6,0.1)',
        danger: '#DC2626', dangerBg: 'rgba(220,38,38,0.08)', dangerBorder: 'rgba(220,38,38,0.3)',
        tabActive: '#0EA5E9', tabActiveBg: '#E0F2FE', tabInactive: '#7DD3FC',
    },
    dark: {
        bg: '#0C1624', card: '#132035', cardBorder: '#1E3A5F',
        text: '#E0F2FE', muted: '#7DD3FC', accent: '#0EA5E9',
        accentBg: '#1E3A5F', barBg: '#1E3A5F',
        barColors: ['#0EA5E9','#38BDF8','#7DD3FC','#BAE6FD'],
        dotActive: '#38BDF8', dotInactive: '#1E3A5F',
        green: '#4ADE80', greenBg: 'rgba(74,222,128,0.1)',
        warn: '#FBBF24', warnBg: 'rgba(251,191,36,0.1)',
        danger: '#F87171', dangerBg: 'rgba(248,113,113,0.1)', dangerBorder: 'rgba(248,113,113,0.3)',
        tabActive: '#38BDF8', tabActiveBg: '#1E3A5F', tabInactive: '#38BDF8',
    }
};

type Medicion = { datos_lectura: { hora?: number; kwh?: number; horas_uso?: number }; fecha_hora: string; dispositivo_id: string };
type Dispositivo = { id: string; nombre: string; estado_actual: { kwh_total?: number; horas_uso?: number } };

// ---- Aggregation ----
function aggregateByDay(mediciones: Medicion[]): { dia: string; kwh: number }[] {
    const map: Record<string, number> = {};
    mediciones.forEach(m => {
        const d = m.fecha_hora.substring(0, 10);
        map[d] = (map[d] ?? 0) + (m.datos_lectura?.kwh ?? 0);
    });
    return Object.entries(map).map(([dia, kwh]) => ({ dia, kwh })).sort((a, b) => a.dia.localeCompare(b.dia));
}

export default function EnergiaScreen() {
    const { activeTheme } = useThemeContext();
    const th = Colors[activeTheme];
    const { width } = useWindowDimensions();
    const isPC = width >= 768;

    const [modo,          setModo]         = useState<'hoy' | 'historial'>('hoy');
    const [mesSelIdx,     setMesSelIdx]    = useState(1); // empieza en el mes pasado (indice 1)
    const [historico,     setHistorico]    = useState<Medicion[]>([]);
    const [minisplits,    setMinisplits]   = useState<Dispositivo[]>([]);
    const [loading,       setLoading]      = useState(true);
    const [tarifaKey,     setTarifaKey]    = useState('1');
    const [showTarifas,   setShowTarifas]  = useState(false);

    const mesSel = MESES[mesSelIdx];

    const fetchData = useCallback(async () => {
        setLoading(true);
        const since = modo === 'hoy'
            ? new Date(Date.now() - 24 * 3600000).toISOString()
            : mesSel.inicio;
        const hasta = modo === 'hoy' ? new Date().toISOString() : mesSel.fin;

        const [{ data: h }, { data: ms }] = await Promise.all([
            supabase.from('historial_mediciones')
                .select('datos_lectura, fecha_hora, dispositivo_id')
                .gte('fecha_hora', since)
                .lte('fecha_hora', hasta)
                .order('fecha_hora'),
            supabase.from('dispositivos')
                .select('id, nombre, estado_actual')
                .eq('tipo_id', 2),
        ]);
        if (h)  setHistorico(h);
        if (ms) setMinisplits(ms as any);
        setLoading(false);
    }, [modo, mesSelIdx]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ---- Calcular totales ----
    const totalKwh = historico.reduce((s, m) => s + (m.datos_lectura?.kwh ?? 0), 0);
    const costoDia = calcularCosto(totalKwh, tarifaKey);
    const costoMes = modo === 'hoy' ? calcularCosto(totalKwh * 30, tarifaKey) : costoDia;
    const tarifa   = TARIFAS_CFE[tarifaKey];
    const isDanger = (modo === 'hoy' ? totalKwh * 30 : totalKwh) > tarifa.limite_dac && tarifa.limite_dac > 0;

    // Hora chart (hoy)
    const kwhByHour: Record<number, number> = {};
    if (modo === 'hoy') historico.forEach(m => {
        const h = m.datos_lectura?.hora ?? new Date(m.fecha_hora).getHours();
        kwhByHour[h] = (kwhByHour[h] ?? 0) + (m.datos_lectura?.kwh ?? 0);
    });
    const hoursToShow = [0, 4, 8, 10, 12, 14, 16, 18, 20, 22];
    const maxKwhHora  = Math.max(...hoursToShow.map(h => kwhByHour[h] ?? 0), 0.1);

    // Day chart (historial)
    const byDay    = modo === 'historial' ? aggregateByDay(historico) : [];
    // Show every N-th day label to avoid crowding
    const dayStep  = byDay.length > 15 ? 5 : byDay.length > 7 ? 3 : 1;
    const maxDayKwh = Math.max(...byDay.map(d => d.kwh), 0.1);

    // Per-minisplit
    const kwhPorMs: Record<string, number>   = {};
    const horasPorMs: Record<string, number> = {};
    historico.forEach(m => {
        if (m.datos_lectura?.kwh)       kwhPorMs[m.dispositivo_id]   = (kwhPorMs[m.dispositivo_id] ?? 0) + m.datos_lectura.kwh;
        if (m.datos_lectura?.horas_uso) horasPorMs[m.dispositivo_id] = (horasPorMs[m.dispositivo_id] ?? 0) + m.datos_lectura.horas_uso;
    });
    minisplits.forEach(ms => {
        if (!kwhPorMs[ms.id])   kwhPorMs[ms.id]   = ms.estado_actual?.kwh_total ?? 0;
        if (!horasPorMs[ms.id]) horasPorMs[ms.id] = ms.estado_actual?.horas_uso ?? 0;
    });
    const maxKwhMs   = Math.max(...minisplits.map(ms => kwhPorMs[ms.id] ?? 0), 0.1);
    const maxHorasMs = Math.max(...minisplits.map(ms => horasPorMs[ms.id] ?? 0), 0.1);

    return (
        <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: isPC ? 40 : 20 }}>

            {/* Header */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={[styles.badge, { backgroundColor: th.accentBg }]}>
                        <Feather name="shield" size={13} color={th.accent} />
                        <Text style={[styles.badgeText, { color: th.accent }]}>Administrador</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: th.accentBg }]}>
                        <Feather name="zap" size={13} color={th.accent} />
                        <Text style={[styles.badgeText, { color: th.accent }]}>Energía</Text>
                    </View>
                </View>
            </View>
            <Text style={[styles.pageTitle, { color: th.text }]}>Consumo de Energía</Text>

            {/* ---- Modo toggle ---- */}
            <View style={[styles.modoToggle, { backgroundColor: th.card, borderColor: th.cardBorder }]}>
                {(['hoy', 'historial'] as const).map(m => (
                    <TouchableOpacity
                        key={m}
                        onPress={() => setModo(m)}
                        style={[styles.modoTab, modo === m && { backgroundColor: th.tabActiveBg }]}
                    >
                        <Feather
                            name={m === 'hoy' ? 'zap' : 'calendar'}
                            size={15}
                            color={modo === m ? th.tabActive : th.muted}
                        />
                        <Text style={[styles.modoTabText, { color: modo === m ? th.tabActive : th.muted, fontWeight: modo === m ? '700' : '500' }]}>
                            {m === 'hoy' ? 'Hoy (24h)' : 'Historial'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ---- Selector de mes (solo en historial) ---- */}
            {modo === 'historial' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                        {MESES.filter(m => !m.isHoy).map((m, idx) => {
                            const realIdx = idx + 1; // compensar el "hoy" filtrado
                            const selected = mesSelIdx === realIdx;
                            return (
                                <TouchableOpacity
                                    key={m.key}
                                    onPress={() => setMesSelIdx(realIdx)}
                                    style={[
                                        styles.mesPill,
                                        { borderColor: selected ? th.accent : th.cardBorder, backgroundColor: selected ? th.accentBg : th.card }
                                    ]}
                                >
                                    <Feather name="calendar" size={13} color={selected ? th.accent : th.muted} />
                                    <Text style={[styles.mesPillText, { color: selected ? th.accent : th.muted }]}>
                                        {m.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            )}

            {/* ---- Tarifa selector ---- */}
            <View style={[styles.card, { backgroundColor: th.card, borderColor: th.cardBorder, marginBottom: 16 }]}>
                <TouchableOpacity onPress={() => setShowTarifas(!showTarifas)} style={styles.tarifaRow}>
                    <Feather name="sliders" size={18} color={th.accent} />
                    <View style={{ flex: 1 }}>
                        <Text style={[{ fontSize: 11, fontWeight: '600', marginBottom: 2 }, { color: th.muted }]}>Tarifa CFE</Text>
                        <Text style={[{ fontSize: 14, fontWeight: '700' }, { color: th.text }]}>{tarifa.nombre}</Text>
                    </View>
                    <Feather name={showTarifas ? 'chevron-up' : 'chevron-down'} size={20} color={th.muted} />
                </TouchableOpacity>
                {showTarifas && (
                    <View style={[styles.tarifaList, { borderTopColor: th.cardBorder }]}>
                        {Object.entries(TARIFAS_CFE).map(([k, t]) => (
                            <TouchableOpacity key={k} onPress={() => { setTarifaKey(k); setShowTarifas(false); }}
                                style={[styles.tarifaOption, tarifaKey === k && { backgroundColor: th.accentBg }]}>
                                <View style={[styles.radioCircle, { borderColor: tarifaKey === k ? th.accent : th.muted }]}>
                                    {tarifaKey === k && <View style={[styles.radioDot, { backgroundColor: th.accent }]} />}
                                </View>
                                <View>
                                    <Text style={[{ fontSize: 13, fontWeight: '600' }, { color: th.text }]}>{t.nombre}</Text>
                                    {t.limite_dac > 0 && <Text style={{ fontSize: 11, color: th.muted }}>Límite DAC: {t.limite_dac} kWh/mes</Text>}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {loading ? (
                <View style={[styles.center, { minHeight: 200, backgroundColor: th.bg }]}>
                    <ActivityIndicator size="large" color={th.accent} />
                    <Text style={{ color: th.muted, marginTop: 12 }}>Cargando {modo === 'historial' ? mesSel.label : 'datos de hoy'}…</Text>
                </View>
            ) : (
                <>
                    {/* ---- KPIs ---- */}
                    <View style={[styles.kpiRow, isPC && { flexDirection: 'row', gap: 14 }]}>
                        <View style={[styles.kpiCard, { backgroundColor: th.card, borderColor: th.cardBorder }, isPC && { flex: 1 }]}>
                            <View style={[styles.kpiIcon, { backgroundColor: th.accentBg }]}>
                                <Feather name="zap" size={20} color={th.accent} />
                            </View>
                            <Text style={[styles.kpiValue, { color: th.text }]}>{totalKwh.toFixed(2)} kWh</Text>
                            <Text style={[styles.kpiLabel, { color: th.muted }]}>{modo === 'hoy' ? 'Consumo hoy' : `Consumo ${mesSel.label}`}</Text>
                        </View>
                        <View style={[styles.kpiCard, { backgroundColor: th.card, borderColor: th.cardBorder }, isPC && { flex: 1 }]}>
                            <View style={[styles.kpiIcon, { backgroundColor: th.greenBg }]}>
                                <Feather name="dollar-sign" size={20} color={th.green} />
                            </View>
                            <Text style={[styles.kpiValue, { color: th.text }]}>${costoDia.toFixed(2)} MXN</Text>
                            <Text style={[styles.kpiLabel, { color: th.muted }]}>{modo === 'hoy' ? 'Costo estimado hoy' : 'Costo del mes'}</Text>
                        </View>
                        <View style={[styles.kpiCard, { backgroundColor: isDanger ? th.dangerBg : th.card, borderColor: isDanger ? th.dangerBorder : th.cardBorder }, isPC && { flex: 1 }]}>
                            <View style={[styles.kpiIcon, { backgroundColor: isDanger ? th.dangerBg : th.warnBg }]}>
                                <Feather name="trending-up" size={20} color={isDanger ? th.danger : th.warn} />
                            </View>
                            <Text style={[styles.kpiValue, { color: isDanger ? th.danger : th.text }]}>
                                ${(modo === 'hoy' ? costoMes : totalKwh * 1.2).toFixed(0)} MXN
                            </Text>
                            <Text style={[styles.kpiLabel, { color: th.muted }]}>{modo === 'hoy' ? 'Proyección mensual' : 'Prom. mensual est.'}</Text>
                            {isDanger && <Text style={{ fontSize: 11, fontWeight: '700', color: th.danger, marginTop: 4 }}>⚠ Riesgo tarifa DAC</Text>}
                        </View>
                    </View>

                    {/* ---- MODO HOY: Gráfica por Hora ---- */}
                    {modo === 'hoy' && (
                        <View style={[styles.card, { backgroundColor: th.card, borderColor: th.cardBorder }]}>
                            <Text style={[styles.cardTitle, { color: th.text }]}>Energía por Hora del Día</Text>
                            <View style={{ gap: 10 }}>
                                {hoursToShow.map(h => {
                                    const val  = kwhByHour[h] ?? 0;
                                    const pct  = val / maxKwhHora;
                                    const cost = calcularCosto(val, tarifaKey);
                                    return (
                                        <View key={h} style={styles.barRow}>
                                            <Text style={[styles.barLabel, { color: th.muted }]}>{String(h).padStart(2,'0')}:00</Text>
                                            <View style={[styles.barTrack, { backgroundColor: th.barBg }]}>
                                                <View style={[styles.barFill, { width: `${Math.max(2, pct * 100)}%`, backgroundColor: th.accent }]} />
                                            </View>
                                            <Text style={[styles.barVal, { color: th.muted }]}>{val.toFixed(1)}</Text>
                                            <Text style={[styles.barCosto, { color: th.green }]}>${cost.toFixed(2)}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* ---- MODO HISTORIAL: Gráfica por Día ---- */}
                    {modo === 'historial' && byDay.length > 0 && (
                        <View style={[styles.card, { backgroundColor: th.card, borderColor: th.cardBorder }]}>
                            <Text style={[styles.cardTitle, { color: th.text }]}>
                                Consumo Diario — {mesSel.label}
                            </Text>
                            {/* Totales resumen */}
                            <View style={[styles.resumenRow, { backgroundColor: th.accentBg, borderRadius: 12, padding: 12, marginBottom: 16 }]}>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ fontSize: 18, fontWeight: '800', color: th.accent }}>{totalKwh.toFixed(1)} kWh</Text>
                                    <Text style={{ fontSize: 11, color: th.muted }}>Total mes</Text>
                                </View>
                                <View style={{ width: 1, backgroundColor: th.cardBorder }} />
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ fontSize: 18, fontWeight: '800', color: th.green }}>${costoDia.toFixed(0)} MXN</Text>
                                    <Text style={{ fontSize: 11, color: th.muted }}>Costo total</Text>
                                </View>
                                <View style={{ width: 1, backgroundColor: th.cardBorder }} />
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ fontSize: 18, fontWeight: '800', color: th.text }}>{(totalKwh / byDay.length).toFixed(1)}</Text>
                                    <Text style={{ fontSize: 11, color: th.muted }}>kWh/día prom.</Text>
                                </View>
                            </View>
                            {/* Barras por día */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 140, paddingTop: 8 }}>
                                    {byDay.map((d, i) => {
                                        const pct  = d.kwh / maxDayKwh;
                                        const dia  = parseInt(d.dia.split('-')[2]);
                                        const cost = calcularCosto(d.kwh, tarifaKey);
                                        return (
                                            <View key={d.dia} style={{ alignItems: 'center', width: 28, height: '100%', justifyContent: 'flex-end' }}>
                                                {i % dayStep === 0 && (
                                                    <Text style={{ fontSize: 9, color: th.muted, marginBottom: 2 }}>${cost.toFixed(0)}</Text>
                                                )}
                                                <View style={{ width: 20, backgroundColor: i % 2 === 0 ? th.accent : th.barColors[1], borderRadius: 4, height: `${Math.max(4, pct * 85)}%` }} />
                                                {i % dayStep === 0 && (
                                                    <Text style={{ fontSize: 9, color: th.muted, marginTop: 3 }}>{dia}</Text>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </View>
                    )}

                    {/* ---- Minisplits: Horas de uso (dot) ---- */}
                    {minisplits.length > 0 && (
                        <View style={[styles.card, { backgroundColor: th.card, borderColor: th.cardBorder }]}>
                            <Text style={[styles.cardTitle, { color: th.text }]}>Horas de Uso por Minisplit</Text>
                            {minisplits.map(ms => {
                                const horas = horasPorMs[ms.id] ?? 0;
                                const dots  = Math.max(1, Math.round((horas / maxHorasMs) * 6));
                                return (
                                    <View key={ms.id} style={styles.dotRow}>
                                        <Text style={[styles.dotLabel, { color: th.muted }]} numberOfLines={1}>
                                            {ms.nombre.replace('Minisplit ', '')}
                                        </Text>
                                        <View style={styles.dotTrack}>
                                            {[...Array(6)].map((_, i) => (
                                                <View key={i} style={[styles.dot, {
                                                    backgroundColor: i < dots ? th.dotActive : th.dotInactive,
                                                    width:  i < dots ? 14 : 10,
                                                    height: i < dots ? 14 : 10,
                                                }]} />
                                            ))}
                                        </View>
                                        <Text style={[{ width: 40, fontSize: 12, textAlign: 'right' }, { color: th.muted }]}>{horas.toFixed(0)}h</Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* ---- Minisplits: kWh + Costo (barras verticales) ---- */}
                    {minisplits.length > 0 && (
                        <View style={[styles.card, { backgroundColor: th.card, borderColor: th.cardBorder }]}>
                            <Text style={[styles.cardTitle, { color: th.text }]}>Consumo y Costo por Minisplit</Text>
                            <View style={styles.vBarsContainer}>
                                {minisplits.map((ms, i) => {
                                    const kwh  = kwhPorMs[ms.id] ?? 0;
                                    const pct  = kwh / maxKwhMs;
                                    const cost = calcularCosto(kwh, tarifaKey);
                                    return (
                                        <View key={ms.id} style={styles.vBarCol}>
                                            <Text style={[{ fontSize: 11, fontWeight: '700', marginBottom: 2 }, { color: th.green }]}>${cost.toFixed(2)}</Text>
                                            <Text style={[{ fontSize: 10, marginBottom: 4 }, { color: th.muted }]}>{kwh.toFixed(1)} kWh</Text>
                                            <View style={styles.vBarTrack}>
                                                <View style={[styles.vBarFill, {
                                                    height: `${Math.max(4, pct * 100)}%`,
                                                    backgroundColor: th.barColors[i % th.barColors.length],
                                                }]} />
                                            </View>
                                            <Text style={[{ fontSize: 10, marginTop: 4, textAlign: 'center' }, { color: th.muted }]} numberOfLines={1}>
                                                {ms.nombre.replace('Minisplit ', '').substring(0, 7)}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {historico.length === 0 && (
                        <View style={[styles.card, { backgroundColor: th.card, borderColor: th.cardBorder, alignItems: 'center', paddingVertical: 32 }]}>
                            <Feather name="inbox" size={40} color={th.muted} />
                            <Text style={{ color: th.muted, marginTop: 12, fontSize: 15 }}>Sin datos para este período</Text>
                        </View>
                    )}
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    center:     { justifyContent: 'center', alignItems: 'center' },
    header:     { flexDirection: 'row', marginBottom: 12 },
    badge:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
    badgeText:  { fontSize: 12, fontWeight: '700' },
    pageTitle:  { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 16 },
    card:       { borderRadius: 20, borderWidth: 1.5, padding: 20, marginBottom: 16 },
    cardTitle:  { fontSize: 15, fontWeight: '700', marginBottom: 16 },
    // Modo toggle
    modoToggle: { flexDirection: 'row', borderRadius: 16, borderWidth: 1.5, overflow: 'hidden', marginBottom: 16 },
    modoTab:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
    modoTabText:{ fontSize: 14 },
    // Mes pills
    mesPill:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5 },
    mesPillText:{ fontSize: 13, fontWeight: '600' },
    // Tarifa
    tarifaRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
    tarifaList: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, gap: 4 },
    tarifaOption:{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
    radioCircle:{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    radioDot:   { width: 8, height: 8, borderRadius: 4 },
    // KPIs
    kpiRow:     { marginBottom: 0, gap: 12 },
    kpiCard:    { borderRadius: 20, borderWidth: 1.5, padding: 18, marginBottom: 12 },
    kpiIcon:    { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    kpiValue:   { fontSize: 22, fontWeight: '800', marginBottom: 4 },
    kpiLabel:   { fontSize: 12, fontWeight: '500' },
    // Bar charts (horizontal)
    barRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
    barLabel:   { width: 44, fontSize: 11, textAlign: 'right' },
    barTrack:   { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
    barFill:    { height: '100%', borderRadius: 5 },
    barVal:     { width: 44, fontSize: 10, textAlign: 'right' },
    barCosto:   { width: 42, fontSize: 10, fontWeight: '700', textAlign: 'right' },
    // Resumen row
    resumenRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    // Dot chart
    dotRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    dotLabel:   { width: 70, fontSize: 12 },
    dotTrack:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
    dot:        { borderRadius: 99 },
    // Vertical bars
    vBarsContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 140, paddingTop: 8 },
    vBarCol:    { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
    vBarTrack:  { width: '100%', maxWidth: 52, flex: 1, justifyContent: 'flex-end', borderRadius: 8, overflow: 'hidden' },
    vBarFill:   { borderRadius: 8, width: '100%' },
});
