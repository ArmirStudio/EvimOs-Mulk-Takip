import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  StatusBar, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { tr } from '../../app/translations';
import { supabase } from '../../services/supabase';
import { useUserData } from '../../hooks/useUserData';
import AnimatedScreen from './AnimatedScreen';

type EventType = 'rent' | 'dues' | 'maintenance' | 'reminder';
type EventStatus = 'pending' | 'paid' | 'overdue';

interface CalendarEvent {
  id: string;
  property_id: string;
  tenant_id: string | null;
  event_type: EventType;
  event_date: string;
  amount: number;
  description: string;
  status: EventStatus;
  property_address?: string;
  tenant_name?: string;
}

const MONTH_NAMES_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAY_NAMES_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const toDateStr = (d: Date) => d.toISOString().split('T')[0];

function generateCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

const getEventColor = (theme: any, type: EventType) => {
  switch (type) {
    case 'rent': return { bg: theme.calendar.rentDayLight, fg: theme.calendar.rentDay };
    case 'dues': return { bg: theme.calendar.duesDayLight, fg: theme.calendar.duesDay };
    case 'maintenance': return { bg: theme.calendar.maintenanceDayLight, fg: theme.calendar.maintenanceDay };
    case 'reminder': return { bg: theme.calendar.reminderDayLight, fg: theme.calendar.reminderDay };
  }
};

const getEventIcon = (type: EventType): any => {
  switch (type) {
    case 'rent': return 'cash-outline';
    case 'dues': return 'receipt-outline';
    case 'maintenance': return 'construct-outline';
    case 'reminder': return 'notifications-outline';
  }
};

const getStatusBadge = (theme: any, status: EventStatus) => {
  switch (status) {
    case 'paid': return { label: tr.calendar.paid, color: theme.colors.success };
    case 'overdue': return { label: tr.calendar.overdue, color: theme.colors.error };
    default: return { label: tr.calendar.pending, color: theme.colors.warning };
  }
};

export default function CalendarScreen() {
  const theme = useAppTheme();
  const s = useStyles();
  const { userData, loading: userLoading } = useUserData();
  const today = new Date();
  const todayStr = toDateStr(today);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const userRole = userData?.role || 'tenant';

  const fetchEvents = useCallback(async () => {
    if (!userData) return;
    try {
      const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${new Date(currentYear, currentMonth + 1, 0).getDate()}`;

      let query = supabase
        .from('calendar_events')
        .select('*, properties(address), users!calendar_events_tenant_id_fkey(full_name)')
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: true });

      if (userRole === 'tenant') query = query.eq('tenant_id', userData.id);
      else if (userRole === 'landlord') {
        const { data: props } = await supabase.from('properties').select('id').eq('landlord_id', userData.id);
        const ids = (props || []).map(p => p.id);
        if (ids.length > 0) query = query.in('property_id', ids);
        else { setEvents([]); return; }
      } else {
         query = query.eq('agent_id', userData.id);
      }

      const { data, error } = await query;
      if (!error && data) {
        setEvents(data.map((e: any) => ({
          ...e,
          property_address: e.properties?.address || '',
          tenant_name: e.users?.full_name || '',
        })));
      }
    } catch (err) {
      console.error('Error fetching calendar:', err);
    } finally {
      setRefreshing(false);
    }
  }, [currentMonth, currentYear, userData, userRole]);

  useEffect(() => {
    if (!userLoading && userData) {
      fetchEvents();
    }
  }, [fetchEvents, userData, userLoading]);

  const calendarDays = useMemo(() => generateCalendarDays(currentYear, currentMonth), [currentYear, currentMonth]);
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(e => {
      if (!map[e.event_date]) map[e.event_date] = [];
      map[e.event_date].push(e);
    });
    return map;
  }, [events]);

  const selectedEvents = useMemo(() => eventsByDate[selectedDate] || [], [eventsByDate, selectedDate]);

  const handleMarkPaid = async (eventId: string) => {
    await supabase.from('calendar_events').update({ status: 'paid' }).eq('id', eventId);
    fetchEvents();
  };

  const renderEventItem = ({ item, index }: { item: CalendarEvent; index: number }) => {
    const color = getEventColor(theme, item.event_type)!;
    const statusBadge = getStatusBadge(theme, item.status);
    const canMarkPaid = (userRole === 'agent' || userRole === 'landlord' || userRole === 'employee') && item.status === 'pending';

    const eventLabel = tr.calendar[item.event_type as keyof typeof tr.calendar] || item.event_type;

    return (
      <Animated.View entering={FadeInDown.delay(index * 80)} style={[s.eventCard, { borderLeftColor: color.fg }]}>
        <View style={s.eventHeader}>
          <View style={[s.eventIconWrap, { backgroundColor: color.bg }]}>
            <Ionicons name={getEventIcon(item.event_type)} size={20} color={color.fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.eventTitle}>{eventLabel}</Text>
            {item.property_address ? <Text style={s.eventSubtitle}>{item.property_address}</Text> : null}
            {item.tenant_name ? <Text style={s.eventTenant}>{item.tenant_name}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.eventAmount}>₺{item.amount?.toLocaleString('tr-TR')}</Text>
            <View style={[s.statusPill, { backgroundColor: statusBadge.color + '18' }]}>
              <Text style={[s.statusPillText, { color: statusBadge.color }]}>{statusBadge.label}</Text>
            </View>
          </View>
        </View>
        {canMarkPaid && (
          <TouchableOpacity style={s.markPaidBtn} onPress={() => handleMarkPaid(item.id)}>
            <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.success} />
            <Text style={s.markPaidText}>{tr.calendar.markPaid}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  return (
    <AnimatedScreen type="fade">
      <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
        <Text style={s.headerTitle}>{tr.calendar.title}</Text>
        <TouchableOpacity onPress={() => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); setSelectedDate(todayStr); }}><Text style={s.todayBtn}>{tr.calendar.today}</Text></TouchableOpacity>
      </View>
      <FlatList
        data={selectedEvents}
        keyExtractor={item => item.id}
        renderItem={renderEventItem}
        ListHeaderComponent={
          <>
            <View style={s.monthNav}>
              <TouchableOpacity onPress={() => currentMonth === 0 ? (setCurrentMonth(11), setCurrentYear(y => y-1)) : setCurrentMonth(m => m-1)}><Ionicons name="chevron-back" size={26} /></TouchableOpacity>
              <Text style={s.monthTitle}>{MONTH_NAMES_TR[currentMonth]} {currentYear}</Text>
              <TouchableOpacity onPress={() => currentMonth === 11 ? (setCurrentMonth(0), setCurrentYear(y => y+1)) : setCurrentMonth(m => m+1)}><Ionicons name="chevron-forward" size={26} /></TouchableOpacity>
            </View>
            <View style={s.dayNamesRow}>{DAY_NAMES_TR.map(d => <Text key={d} style={s.dayName}>{d}</Text>)}</View>
            <View style={s.calendarGrid}>
              {calendarDays.map((day, i) => {
                if (day === null) return <View key={i} style={s.dayCell} />;
                const ds = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const sel = ds === selectedDate;
                const tod = ds === todayStr;
                const has = eventsByDate[ds]?.length > 0;
                return (
                  <TouchableOpacity key={i} style={[s.dayCell, sel && s.selectedCell, tod && !sel && s.todayCell]} onPress={() => setSelectedDate(ds)}>
                    <Text style={[s.dayText, sel && s.selectedText, tod && !sel && s.todayText]}>{day}</Text>
                    {has && <View style={s.dotRow}>{eventsByDate[ds].slice(0,3).map((e,idx) => <View key={idx} style={[s.eventDot, {backgroundColor: getEventColor(theme, e.event_type)!.fg}]} />)}</View>}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={s.eventsHeader}><Text style={s.eventsTitle}>{selectedDate.split('-').reverse().join('.')}</Text></View>
          </>
        }
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchEvents} />}
      />
      </SafeAreaView>
    </AnimatedScreen>
  );
}

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  todayBtn: { color: theme.colors.primary, fontWeight: '600' },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  monthTitle: { fontSize: 20, fontWeight: '700' },
  dayNamesRow: { flexDirection: 'row', marginBottom: 4 },
  dayName: { flex: 1, textAlign: 'center', fontSize: 12, color: theme.colors.textMuted },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  selectedCell: { backgroundColor: theme.calendar.selectedDayBg, borderRadius: 8 },
  todayCell: { backgroundColor: theme.colors.purpleLight, borderRadius: 8 },
  dayText: { fontSize: 15 },
  selectedText: { color: theme.calendar.selectedDayText, fontWeight: '700' },
  todayText: { color: theme.colors.purple, fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  eventDot: { width: 4, height: 4, borderRadius: 2 },
  eventsHeader: { marginTop: 20, marginBottom: 12 },
  eventsTitle: { fontSize: 16, fontWeight: '700' },
  eventCard: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 4, ...theme.shadows.sm },
  eventHeader: { flexDirection: 'row', gap: 12 },
  eventIconWrap: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  eventTitle: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  eventSubtitle: { fontSize: 12, color: theme.colors.textSecondary },
  eventTenant: { fontSize: 12, color: theme.colors.textMuted },
  eventAmount: { fontSize: 16, fontWeight: '700' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  statusPillText: { fontSize: 10, fontWeight: '600' },
  markPaidBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border },
  markPaidText: { fontSize: 13, fontWeight: '600', color: theme.colors.success }
}));
