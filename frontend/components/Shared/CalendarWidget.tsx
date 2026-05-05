import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { supabase } from '../../services/supabase';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type CalendarRole = 'agent' | 'landlord' | 'tenant' | 'employee' | 'staff' | 'manager' | 'admin';
type EventType = 'rent' | 'dues' | 'renewal';

interface CalendarEvent {
  id: string;
  type: EventType;
  date: Date;
  propertyName: string;
  tenantName?: string;
  amount?: number;
}

interface PropertyRow {
  id: string;
  description: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  rent_day: number | null;
  dues_day: number | null;
  contract_duration: number | null;
  contract_start: string | null;
  created_at: string | null;
  monthly_rent: number | null;
  dues_amount: number | null;
  tenant_user?: { full_name: string } | { full_name: string }[] | null;
}

interface CalendarWidgetProps {
  role: CalendarRole;
  userId: string;
  propertyId?: string;
  hideHeader?: boolean;
}

type Theme = ReturnType<typeof useAppTheme>;

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
const DAY_NAMES_TR = ['PT', 'SA', 'ÇAR', 'PER', 'CU', 'CM', 'PA'];

const EVENT_TITLE: Record<EventType, string> = {
  rent: 'Kira Ödemesi',
  dues: 'Aidat Ödemesi',
  renewal: 'Sözleşme Bitiş',
};

const EVENT_ICON: Record<EventType, keyof typeof MaterialIcons.glyphMap> = {
  rent: 'payments',
  dues: 'receipt',
  renewal: 'assignment',
};

function getDotColor(theme: Theme, type: EventType): string {
  if (type === 'rent') return theme.calendar.rentDay;
  if (type === 'dues') return theme.calendar.reminderDay;
  return theme.colors.warning;
}

function getEventBg(theme: Theme, type: EventType): string {
  if (type === 'rent') return theme.calendar.rentDayLight;
  if (type === 'dues') return theme.calendar.reminderDayLight;
  return theme.colors.warningLight;
}

function getLegendItems(theme: Theme): { label: string; color: string }[] {
  return [
    { label: 'Kira', color: theme.calendar.rentDay },
    { label: 'Aidat', color: theme.calendar.reminderDay },
    { label: 'Sözleşme', color: theme.colors.warning },
  ];
}

// â”€â”€â”€ Pure Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function generateCalendarDays(year: number, month: number): { day: number; isOverflow: boolean }[] {
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const days: { day: number; isOverflow: boolean }[] = [];

  for (let i = startDow - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, isOverflow: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, isOverflow: false });
  }
  let nextDay = 1;
  while (days.length % 7 !== 0) {
    days.push({ day: nextDay++, isOverflow: true });
  }

  return days;
}

function toDateKey(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function buildMonthEvents(properties: PropertyRow[], year: number, month: number): CalendarEvent[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const events: CalendarEvent[] = [];

  for (const prop of properties) {
    const propLabel = [prop.city, prop.district, prop.description]
      .filter(Boolean)
      .join(' â€“ ')
      .slice(0, 32) || prop.address || 'Mülk';

    const tenant_user_data = Array.isArray(prop.tenant_user) ? prop.tenant_user[0] : prop.tenant_user;
    const tenantName = tenant_user_data?.full_name ?? undefined;
    const contractStartDate = prop.contract_start ? new Date(prop.contract_start) : null;

    if (prop.rent_day) {
      const day = Math.min(prop.rent_day, daysInMonth);
      const eventDate = new Date(year, month, day);
      if (!contractStartDate || eventDate >= contractStartDate) {
        events.push({
          id: `rent-${prop.id}-${year}-${month}`,
          type: 'rent',
          date: eventDate,
          propertyName: propLabel,
          tenantName,
          amount: prop.monthly_rent ?? undefined,
        });
      }
    }

    if (prop.dues_day) {
      const day = Math.min(prop.dues_day, daysInMonth);
      const eventDate = new Date(year, month, day);
      if (!contractStartDate || eventDate >= contractStartDate) {
        events.push({
          id: `dues-${prop.id}-${year}-${month}`,
          type: 'dues',
          date: eventDate,
          propertyName: propLabel,
          tenantName,
          amount: prop.dues_amount ?? undefined,
        });
      }
    }

    if (prop.contract_duration && prop.contract_start) {
      const endDate = new Date(prop.contract_start);
      endDate.setMonth(endDate.getMonth() + prop.contract_duration);
      if (endDate.getFullYear() === year && endDate.getMonth() === month) {
        events.push({
          id: `renewal-${prop.id}`,
          type: 'renewal',
          date: endDate,
          propertyName: propLabel,
          tenantName,
        });
      }
    }
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}

function buildEventMap(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const map: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    const key = toDateKey(ev.date.getFullYear(), ev.date.getMonth(), ev.date.getDate());
    if (!map[key]) map[key] = [];
    map[key].push(ev);
  }
  return map;
}

function getDotColors(theme: Theme, eventsForDay: CalendarEvent[]): string[] {
  const seen = new Set<EventType>();
  const colors: string[] = [];
  for (const ev of eventsForDay) {
    if (!seen.has(ev.type)) {
      seen.add(ev.type);
      colors.push(getDotColor(theme, ev.type));
      if (colors.length === 3) break;
    }
  }
  return colors;
}

function getStatusBadge(theme: Theme, eventDate: Date): { label: string; color: string; bg: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const evDay = new Date(eventDate);
  evDay.setHours(0, 0, 0, 0);
  const diff = Math.round((evDay.getTime() - today.getTime()) / 86400000);

  if (diff < 0) return { label: 'GECİKTİ', color: theme.colors.error, bg: theme.colors.errorLight };
  if (diff === 0) return { label: 'BUGÜN', color: theme.colors.primary, bg: theme.colors.primaryLight };
  if (diff <= 7) return { label: 'YAKLAŞIYOR', color: theme.colors.warning, bg: theme.colors.warningLight };
  return { label: 'PLANLI', color: theme.colors.textMuted, bg: theme.colors.surface2 };
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function CalendarWidget({ role, userId, propertyId, hideHeader }: CalendarWidgetProps) {
  const theme = useAppTheme();
  const s = useStyles();
  const today = new Date();
  const [displayedMonth, setDisplayedMonth] = useState(today.getMonth());
  const [displayedYear, setDisplayedYear] = useState(today.getFullYear());
  const [rawProperties, setRawProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const collapsibleOpacity = useSharedValue(1);

  const fetchProperties = useCallback(async () => {
    try {
      let query = supabase
        .from('properties')
        .select('id, description, address, city, district, rent_day, dues_day, contract_duration, contract_start, created_at, monthly_rent, dues_amount, tenant_user:users!tenant_id(full_name)')
        .eq('status', 'occupied');

      if (role === 'landlord') query = query.eq('landlord_id', userId);
      else if (role === 'tenant') query = query.eq('tenant_id', userId);
      else if (role === 'agent') query = query.eq('agent_id', userId);
      else if (role === 'employee') query = query.eq('employee_id', userId);

      if (propertyId) {
        query = query.eq('id', propertyId);
      }

      const { data, error } = await query;
      if (!error && data) setRawProperties(data as PropertyRow[]);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [role, userId, propertyId]);

  useEffect(() => {
    if (userId || propertyId) fetchProperties();
  }, [fetchProperties, userId, propertyId]);

  const calendarDays = useMemo(() => generateCalendarDays(displayedYear, displayedMonth), [displayedYear, displayedMonth]);
  const monthEvents = useMemo(() => buildMonthEvents(rawProperties, displayedYear, displayedMonth), [rawProperties, displayedYear, displayedMonth]);
  const eventMap = useMemo(() => buildEventMap(monthEvents), [monthEvents]);

  const goToPrevMonth = () => {
    if (displayedMonth === 0) {
      setDisplayedMonth(11);
      setDisplayedYear(y => y - 1);
    } else {
      setDisplayedMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (displayedMonth === 11) {
      setDisplayedMonth(0);
      setDisplayedYear(y => y + 1);
    } else {
      setDisplayedMonth(m => m + 1);
    }
  };

  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    collapsibleOpacity.value = withTiming(newCollapsed ? 0 : 1, { duration: 300 });
  };

  const collapsibleAnimStyle = useAnimatedStyle(() => ({
    opacity: collapsibleOpacity.value,
  }));

  if (loading) {
    return (
      <View style={s.container}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  return (
    <View style={s.container}>
      {!hideHeader && (
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.headerTitle}>Takvim</Text>
              <TouchableOpacity onPress={toggleCollapse} hitSlop={8}>
                <MaterialIcons
                  name={isCollapsed ? 'chevron-right' : 'chevron-down'}
                  size={20}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            {!isCollapsed && <Text style={s.headerSubtitle}>Yaklaşan ödeme ve sözleşme tarihleri</Text>}
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity onPress={goToPrevMonth} hitSlop={8} style={s.navBtn}>
              <MaterialIcons name="chevron-left" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <View style={s.monthYearBox}>
              <Text style={s.monthText}>{MONTH_NAMES_TR[displayedMonth]}</Text>
              <Text style={s.yearText}>{displayedYear}</Text>
            </View>
            <TouchableOpacity onPress={goToNextMonth} hitSlop={8} style={s.navBtn}>
              <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {hideHeader && (
        <View style={[s.header, { justifyContent: 'center', marginBottom: 12 }]}>
          <View style={s.headerRight}>
            <TouchableOpacity onPress={goToPrevMonth} hitSlop={8} style={s.navBtn}>
              <MaterialIcons name="chevron-left" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <View style={s.monthYearBox}>
              <Text style={s.monthText}>{MONTH_NAMES_TR[displayedMonth]}</Text>
              <Text style={s.yearText}>{displayedYear}</Text>
            </View>
            <TouchableOpacity onPress={goToNextMonth} hitSlop={8} style={s.navBtn}>
              <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!isCollapsed && (
        <Animated.View style={[collapsibleAnimStyle, { originY: 0 }]}>
          <View style={s.dayNamesRow}>
          {DAY_NAMES_TR.map(name => (
            <Text key={name} style={s.dayName}>{name}</Text>
          ))}
        </View>

        <View style={s.calendarGrid}>
        {calendarDays.map((cell, idx) => {
          const { day, isOverflow } = cell;

          if (isOverflow) {
            return (
              <View key={`ov-${idx}`} style={s.dayCell}>
                <Text style={s.overflowDayText}>{day}</Text>
              </View>
            );
          }

          const isToday = day === todayDay && displayedMonth === todayMonth && displayedYear === todayYear;
          const isSelected = selectedDay === day;
          const dateKey = toDateKey(displayedYear, displayedMonth, day);
          const eventsForDay = eventMap[dateKey] ?? [];
          const dotColors = getDotColors(theme, eventsForDay);

          return (
            <TouchableOpacity
              key={dateKey}
              style={s.dayCell}
              onPress={() => setSelectedDay(isSelected ? null : day)}
              activeOpacity={0.7}
            >
              <View style={[s.dayInner, isToday && s.todayCell, isSelected && { backgroundColor: theme.colors.primary + '2E', borderWidth: 2, borderColor: theme.colors.primary }]}>
                <Text style={[s.dayText, isToday && s.todayText, isSelected && { color: theme.colors.primary, fontWeight: '800' }]}>{day}</Text>
              </View>
              {dotColors.length > 0 && (
                <View style={s.dotRow}>
                  {dotColors.map((color, di) => (
                    <View key={di} style={[s.eventDot, { backgroundColor: color }]} />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

        <View style={s.legend}>
          {getLegendItems(theme).map(item => (
            <View key={item.label} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: item.color }]} />
              <Text style={s.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {!hideHeader && (
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{selectedDay ? `${selectedDay} ${MONTH_NAMES_TR[displayedMonth]} İşlemleri` : 'Yaklaşan İşlemler'}</Text>
          <TouchableOpacity onPress={() => router.push(`/${role}/calendar` as any)}>
            <Text style={s.seeAllBtn}>Tümünü Gör</Text>
          </TouchableOpacity>
        </View>
      )}

        {(() => {
          const displayedEvents = selectedDay
            ? monthEvents.filter(e => e.date.getDate() === selectedDay)
            : monthEvents;

          return displayedEvents.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>{selectedDay ? 'Bu gün planlanmış işlem yok' : 'Bu ay planlanmış işlem yok'}</Text>
          </View>
        ) : (
          <View style={s.eventList}>
            {displayedEvents.map(event => {
              const badge = getStatusBadge(theme, event.date);
              const dateLabel = `${event.date.getDate()} ${MONTH_NAMES_TR[event.date.getMonth()]} ${event.date.getFullYear()}`;
              return (
                <View key={event.id} style={s.eventCard}>
                  <View style={[s.eventIconBox, { backgroundColor: getEventBg(theme, event.type) }]}>
                    <MaterialIcons name={EVENT_ICON[event.type]} size={20} color={getDotColor(theme, event.type)} />
                  </View>

                  <View style={s.eventCardBody}>
                    <View style={s.eventCardTop}>
                      <Text style={s.eventCardTitle} numberOfLines={1}>
                        {EVENT_TITLE[event.type]}
                      </Text>
                      <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[s.statusBadgeText, { color: badge.color }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={s.eventCardSub} numberOfLines={1}>
                      {event.propertyName}
                    </Text>

                    <View style={s.eventCardFooter}>
                      {event.tenantName && role !== 'tenant' && (
                        <View style={s.footerItem}>
                          <MaterialIcons name="person" size={13} color={theme.colors.textMuted} />
                          <Text style={s.footerText}>{event.tenantName}</Text>
                        </View>
                      )}
                      <View style={s.footerItem}>
                        <MaterialIcons name="calendar-today" size={13} color={theme.colors.textMuted} />
                        <Text style={s.footerText}>{dateLabel}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        );
        })()}
        </Animated.View>
      )}
    </View>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const useStyles = createThemedStyles((theme) => StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    ...theme.shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    maxWidth: 160,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearBox: {
    alignItems: 'center',
    minWidth: 64,
  },
  monthText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  yearText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontWeight: theme.fontWeight.medium,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dayName: {
    width: '14.285%',
    textAlign: 'center',
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    fontWeight: theme.fontWeight.semibold,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCell: {
    backgroundColor: theme.calendar.todayCircle,
    borderRadius: 16,
  },
  dayText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
  },
  todayText: {
    color: theme.calendar.todayCircleText,
    fontWeight: theme.fontWeight.bold,
  },
  overflowDayText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.border,
    fontWeight: theme.fontWeight.normal,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  seeAllBtn: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  eventList: {
    gap: theme.spacing.sm,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  eventIconBox: {
    width: 42,
    height: 42,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  eventCardBody: {
    flex: 1,
    gap: 2,
  },
  eventCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  eventCardTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 0.3,
  },
  eventCardSub: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  eventCardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: 2,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  footerText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
}));
