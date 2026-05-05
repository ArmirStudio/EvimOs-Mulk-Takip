import type { AppThemeTokens } from '../app/theme';
import { tr } from '../app/translations';
import type {
  TeamAnnouncement,
  TeamReportBar,
  TeamReportRange,
  TeamTask,
  TeamTaskStatus,
  TeamTaskType,
} from '../services/teamTypes';

export const TEAM_TAB_LABELS = {
  team: tr.team.tabs.team,
  tasks: tr.team.tabs.tasks,
  announcements: tr.team.tabs.announcements,
  messages: tr.team.tabs.messages,
  report: tr.team.tabs.report,
} as const;

export const TEAM_REPORT_RANGE_LABELS: Record<TeamReportRange, string> = {
  this_week: tr.team.reportRanges.this_week,
  last_week: tr.team.reportRanges.last_week,
  this_month: tr.team.reportRanges.this_month,
  last_month: tr.team.reportRanges.last_month,
};

export const TEAM_TASK_TYPE_OPTIONS: { key: TeamTaskType; label: string; icon: string }[] = [
  { key: 'property_showing', label: tr.team.taskTypes.property_showing, icon: 'home-work' },
  { key: 'office_meeting', label: tr.team.taskTypes.office_meeting, icon: 'groups' },
  { key: 'client_meeting', label: tr.team.taskTypes.client_meeting, icon: 'handshake' },
  { key: 'document_delivery', label: tr.team.taskTypes.document_delivery, icon: 'description' },
  { key: 'site_visit', label: tr.team.taskTypes.site_visit, icon: 'map' },
];

export const TEAM_TASK_FILTER_LABELS = {
  all: tr.team.taskFilters.all,
  pending: tr.team.taskFilters.pending,
  in_progress: tr.team.taskFilters.in_progress,
  completed: tr.team.taskFilters.completed,
  cancelled: tr.team.taskFilters.cancelled,
  overdue: tr.team.taskFilters.overdue,
} as const;

export function getTaskTypeMeta(taskType: TeamTaskType) {
  return TEAM_TASK_TYPE_OPTIONS.find((item) => item.key === taskType) || TEAM_TASK_TYPE_OPTIONS[0];
}

export function getTaskStatusLabel(status: TeamTaskStatus) {
  switch (status) {
    case 'pending':
      return tr.team.taskStatuses.pending;
    case 'in_progress':
      return tr.team.taskStatuses.in_progress;
    case 'completed':
      return tr.team.taskStatuses.completed;
    case 'cancelled':
      return tr.team.taskStatuses.cancelled;
    default:
      return status;
  }
}

export function isTaskOverdue(task: Pick<TeamTask, 'scheduled_at' | 'status' | 'is_overdue'>) {
  if (typeof task.is_overdue === 'boolean') {
    return task.is_overdue;
  }

  if (!task.scheduled_at) {
    return false;
  }

  if (!['pending', 'in_progress'].includes(task.status)) {
    return false;
  }

  return new Date(task.scheduled_at).getTime() < Date.now();
}

export function getTaskTone(
  theme: AppThemeTokens,
  task: Pick<TeamTask, 'scheduled_at' | 'status' | 'is_overdue'>
) {
  if (isTaskOverdue(task)) {
      return {
        backgroundColor: theme.colors.errorLight,
        borderColor: `${theme.colors.error}66`,
        textColor: theme.colors.error,
        label: tr.team.taskStatuses.overdue,
      };
  }

  switch (task.status) {
    case 'pending':
      return {
        backgroundColor: theme.colors.warningLight,
        borderColor: `${theme.colors.warning}55`,
        textColor: theme.colors.warningText,
        label: getTaskStatusLabel('pending'),
      };
    case 'in_progress':
      return {
        backgroundColor: theme.colors.primaryLight,
        borderColor: `${theme.colors.primary}55`,
        textColor: theme.colors.primary,
        label: getTaskStatusLabel('in_progress'),
      };
    case 'completed':
      return {
        backgroundColor: theme.colors.successLight,
        borderColor: `${theme.colors.success}55`,
        textColor: theme.colors.successText,
        label: getTaskStatusLabel('completed'),
      };
    case 'cancelled':
    default:
      return {
        backgroundColor: theme.colors.surface2,
        borderColor: theme.colors.border,
        textColor: theme.colors.textSecondary,
        label: getTaskStatusLabel('cancelled'),
      };
  }
}

export function formatTaskDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatLongDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getAnnouncementAudienceLabel(announcement: Pick<TeamAnnouncement, 'recipient_count' | 'recipients'>) {
  const recipients = announcement.recipients || [];
  if (recipients.length === 0) {
    return 'Alici bulunamadi';
  }
  if (recipients.length > 3) {
    return `Tum ekip dahil ${recipients.length} kisi`;
  }
  return recipients.map((item) => item.user?.full_name || 'Kullanici').join(', ');
}

export function getReportBarTone(theme: AppThemeTokens, tone?: TeamReportBar['tone']) {
  switch (tone) {
    case 'success':
      return theme.colors.success;
    case 'warning':
      return theme.colors.warning;
    case 'danger':
      return theme.colors.error;
    case 'neutral':
      return theme.colors.textMuted;
    case 'primary':
    default:
      return theme.colors.primary;
  }
}

export function getUserBaseRoute(role?: string | null) {
  if (role === 'employee') {
    return 'agent';
  }
  return role || 'tenant';
}
