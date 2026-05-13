import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { createThemedStyles, useAppTheme } from '../../app/theme';
import { supabase } from '../../services/supabase';

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

const MONTH_NAMES_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
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

function generateCalendarDays(year: number, month: number): { day: number; isOverflow: boolean }[] {
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const days: { day: number; isOverflow: boolean }[] = [];

  for (let i = startDow - 1; i >= 0; i -= 1) {
    days.push({ day: prevMonthDays - i, isOverflow: true });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({ day, isOverflow: false });
  }

  let nextDay = 1;
  while (days.length % 7 !== 0) {
    days.push({ day: nextDay, isOverflow: true });
    nextDay += 1;
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

  for (const property of properties) {
    const propertyName =
      [property.city, property.district, property.description].filter(Boolean).join(' - ').slice(0, 32) ||
      property.address ||
      'Mülk';
    const tenantUser = Array.isArray(property.tenant_user)
      ? property.tenant_user[0]
      : property.tenant_user;
    const tenantName = tenantUser?.full_name ?? undefined;
    const contractStartDate = property.contract_start ? new Date(property.contract_start) : null;

    if (property.rent_day) {
      const day = Math.min(property.rent_day, daysInMonth);
      const eventDate = new Date(year, month, day);
      if (!contractStartDate || eventDate >= contractStartDate) {
        events.push({
          id: `rent-${property.id}-${year}-${month}`,
          type: 'rent',
          date: eventDate,
          propertyName,
          tenantName,
          amount: property.monthly_rent ?? undefined,
        });
      }
    }

    if (property.dues_day) {
      const day = Math.min(property.dues_day, daysInMonth);
      const eventDate = new Date(year, month, day);
      if (!contractStartDate || eventDate >= contractStartDate) {
        events.push({
          id: `dues-${property.id}-${year}-${month}`,
          type: 'dues',
          date: eventDate,
          propertyName,
          tenantName,
          amount: property.dues_amount ?? undefined,
        });
      }
    }

    if (property.contract_duration && property.contract_start) {
      const endDate = new Date(property.contract_start);
      endDate.setMonth(endDate.getMonth() + property.contract_duration);
      if (endDate.getFullYear() === year && endDate.getMonth() === month) {
        events.push({
          id: `renewal-${property.id}`,
          type: 'renewal',
          date: endDate,
          propertyName,
          tenantName,
        });
      }
    }
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function buildEventMap(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const map: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    const key = toDateKey(event.date.getFullYear(), event.date.getMonth(), event.date.getDate());
    map[key] = [...(map[key] ?? []), event];
  }
  return map;
}

function getDotColors(theme: Theme, eventsForDay: CalendarEvent[]): string[] {
  const seen = new Set<EventType>();
  const colors: string[] = [];

  for (const event of eventsForDay) {
    if (!seen.has(event.type)) {
      seen.add(event.type);
      colors.push(getDotColor(theme, event.type));
      if (colors.length === 3) break;
    }
  }

  return colors;
}

function getStatusBadge(theme: Theme, eventDate: Date): { label: string; color: string; bg: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDay = new Date(eventDate);
  eventDay.setHours(0, 0, 0, 0);
  const diff = Math.round((eventDay.getTime() - today.getTime()) / 86400000);

  if (diff < 0) return { label: 'GECİKTİ', color: theme.colors.error, bg: theme.colors.errorLight };
  if (diff === 0) return { label: 'BUGÜN', color: theme.colors.primary, bg: theme.colors.primaryLight };
  if (diff <= 7) return { label: 'YAKLAŞIYOR', color: theme.colors.warning, bg: theme.colors.warningLight };
  return { label: 'PLANLI', color: theme.colors.textMuted, bg: theme.colors.surface2 };
}

export default function CalendarWidget({ role, userId, propertyId, hideHeader }: CalendarWidgetProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const today = new Date();
  const [displayedMonth, setDisplayedMonth] = useState(today.getMonth());
  const [displayedYear, setDisplayedYear] = useState(today.getFullYear());
  const [rawProperties, setRawProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const collapsibleOpacity = useSharedValue(1);

  const fetchProperties = useCallback(async () => {
    if (!userId && !propertyId) {
      setRawProperties([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('properties')
        .select(
          'id, description, address, city, district, rent_day, dues_day, contract_duration, contract_start, created_at, monthly_rent, dues_amount, tenant_user:users!tenant_id(full_name)',
        )
        .eq('status', 'occupied');

      if (role === 'landlord') query = query.eq('landlord_id', userId);
      else if (role === 'tenant') query = query.eq('tenant_id', userId);
      else if (role === 'agent') query = query.eq('agent_id', userId);
      else if (role === 'employee') query = query.eq('employee_id', userId);

      if (propertyId) {
        query = query.eq('id', propertyId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error loading calendar properties:', error);
        setRawProperties([]);
        return;
      }

      setRawProperties((data ?? []) as PropertyRow[]);
    } catch (error) {
      console.error('Error loading calendar properties:', error);
      setRawProperties([]);
    } finally {
      setLoading(false);
    }
  }, [propertyId, role, userId]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const calendarDays = useMemo(
    () => generateCalendarDays(displayedYear, displayedMonth),
    [displayedMonth, displayedYear],
  );
  const monthEvents = useMemo(
    () => buildMonthEvents(rawProperties, displayedYear, displayedMonth),
    [displayedMonth, displayedYear, rawProperties],
  );
  const eventMap = useMemo(() => buildEventMap(monthEvents), [monthEvents]);

  const goToPrevMonth = () => {
    if (displayedMonth === 0) {
      setDisplayedMonth(11);
      setDisplayedYear((year) => year - 1);
    } else {
      setDisplayedMonth((month) => month - 1);
    }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (displayedMonth === 11) {
      setDisplayedMonth(0);
      setDisplayedYear((year) => year + 1);
    } else {
      setDisplayedMonth((month) => month + 1);
    }
    setSelectedDay(null);
  };

  const toggleCollapse = () => {
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);
    collapsibleOpacity.value = withTiming(nextCollapsed ? 0 : 1, { duration: 300 });
  };

  const collapsibleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: collapsibleOpacity.value,
  }));

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();
  const selectedEvents = selectedDay
    ? monthEvents.filter((event) => event.date.getDate() === selectedDay)
    : monthEvents;

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.headerTitle}>Takvim</Text>
              <TouchableOpacity onPress={toggleCollapse} hitSlop={8}>
                <MaterialIcons
                  name={isCollapsed ? 'chevron-right' : 'expand-more'}
                  size={20}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            {!isCollapsed && (
              <Text style={styles.headerSubtitle}>Yaklaşan ödeme ve sözleşme tarihleri</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={goToPrevMonth} hitSlop={8} style={styles.navBtn}>
              <MaterialIcons name="chevron-left" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.monthYearBox}>
              <Text style={styles.monthText}>{MONTH_NAMES_TR[displayedMonth]}</Text>
              <Text style={styles.yearText}>{displayedYear}</Text>
            </View>
            <TouchableOpacity onPress={goToNextMonth} hitSlop={8} style={styles.navBtn}>
              <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {hideHeader && (
        <View style={[styles.header, { justifyContent: 'center', marginBottom: 12 }]}>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={goToPrevMonth} hitSlop={8} style={styles.navBtn}>
              <MaterialIcons name="chevron-left" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.monthYearBox}>
              <Text style={styles.monthText}>{MONTH_NAMES_TR[displayedMonth]}</Text>
              <Text style={styles.yearText}>{displayedYear}</Text>
            </View>
            <TouchableOpacity onPress={goToNextMonth} hitSlop={8} style={styles.navBtn}>
              <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!isCollapsed && (
        <Animated.View style={collapsibleAnimatedStyle}>
          <View style={styles.dayNamesRow}>
            {DAY_NAMES_TR.map((name) => (
              <Text key={name} style={styles.dayName}>
                {name}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((cell, index) => {
              const { day, isOverflow } = cell;

              if (isOverflow) {
                return (
                  <View key={`overflow-${index}`} style={styles.dayCell}>
                    <Text style={styles.overflowDayText}>{day}</Text>
                  </View>
                );
              }

              const isToday =
                day === todayDay && displayedMonth === todayMonth && displayedYear === todayYear;
              const isSelected = selectedDay === day;
              const dateKey = toDateKey(displayedYear, displayedMonth, day);
              const eventsForDay = eventMap[dateKey] ?? [];
              const dotColors = getDotColors(theme, eventsForDay);

              return (
                <TouchableOpacity
                  key={dateKey}
                  style={styles.dayCell}
                  activeOpacity={0.7}
                  onPress={() => setSelectedDay(isSelected ? null : day)}
                >
                  <View
                    style={[
                      styles.dayInner,
                      isToday && styles.todayCell,
                      isSelected && {
                        backgroundColor: `${theme.colors.primary}2E`,
                        borderColor: theme.colors.primary,
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isToday && styles.todayText,
                        isSelected && { color: theme.colors.primary, fontWeight: '800' },
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                  {dotColors.length > 0 && (
                    <View style={styles.dotRow}>
                      {dotColors.map((color, dotIndex) => (
                        <View key={`${dateKey}-${dotIndex}`} style={[styles.eventDot, { backgroundColor: color }]} />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.legend}>
            {getLegendItems(theme).map((item) => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          {!hideHeader && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedDay ? `${selectedDay} ${MONTH_NAMES_TR[displayedMonth]} İşlemleri` : 'Yaklaşan İşlemler'}
              </Text>
              <TouchableOpacity onPress={() => router.push(`/${role}/calendar` as never)}>
                <Text style={styles.seeAllBtn}>Tümünü Gör</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedEvents.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {selectedDay ? 'Bu gün planlanmış işlem yok' : 'Bu ay planlanmış işlem yok'}
              </Text>
            </View>
          ) : (
            <View style={styles.eventList}>
              {selectedEvents.map((event) => {
                const badge = getStatusBadge(theme, event.date);
                const dateLabel = `${event.date.getDate()} ${
                  MONTH_NAMES_TR[event.date.getMonth()]
                } ${event.date.getFullYear()}`;

                return (
                  <View key={event.id} style={styles.eventCard}>
                    <View style={[styles.eventIconBox, { backgroundColor: getEventBg(theme, event.type) }]}>
                      <MaterialIcons
                        name={EVENT_ICON[event.type]}
                        size={20}
                        color={getDotColor(theme, event.type)}
                      />
                    </View>
                    <View style={styles.eventCardBody}>
                      <View style={styles.eventCardTop}>
                        <Text style={styles.eventCardTitle} numberOfLines={1}>
                          {EVENT_TITLE[event.type]}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.eventCardSub} numberOfLines={1}>
                        {event.propertyName}
                      </Text>
                      <View style={styles.eventCardFooter}>
                        {event.tenantName && role !== 'tenant' && (
                          <View style={styles.footerItem}>
                            <MaterialIcons name="person" size={13} color={theme.colors.textMuted} />
                            <Text style={styles.footerText}>{event.tenantName}</Text>
                          </View>
                        )}
                        <View style={styles.footerItem}>
                          <MaterialIcons name="calendar-today" size={13} color={theme.colors.textMuted} />
                          <Text style={styles.footerText}>{dateLabel}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const useStyles = createThemedStyles((theme) => StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
    paddingVertical: theme.spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.divider,
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
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
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
