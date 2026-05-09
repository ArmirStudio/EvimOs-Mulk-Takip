import type { UserData } from '../services/userSession';

export type EmployeeAccessLevel = 'full' | 'limited';

type EmployeeAccessUser = Pick<UserData, 'id' | 'role' | 'created_by' | 'employee_access_level'>;

export function normalizeEmployeeAccessLevel(
  accessLevel?: string | null
): EmployeeAccessLevel {
  return accessLevel === 'full' ? 'full' : 'limited';
}

export function hasFullEmployeeAccess(user?: EmployeeAccessUser | null): boolean {
  return user?.role === 'employee' && normalizeEmployeeAccessLevel(user.employee_access_level) === 'full';
}

export function hasLimitedEmployeeAccess(user?: EmployeeAccessUser | null): boolean {
  return user?.role === 'employee' && normalizeEmployeeAccessLevel(user.employee_access_level) === 'limited';
}

export function canManageOfficeRecords(user?: EmployeeAccessUser | null): boolean {
  return user?.role === 'agent' || hasFullEmployeeAccess(user);
}

export function canViewOfficeDirectory(user?: EmployeeAccessUser | null): boolean {
  return user?.role === 'agent' || user?.role === 'employee';
}

export function canManageOfficeContacts(user?: EmployeeAccessUser | null): boolean {
  return user?.role === 'agent' || user?.role === 'employee';
}

export function canUploadPropertyDocuments(user?: EmployeeAccessUser | null): boolean {
  return user?.role === 'agent' || hasFullEmployeeAccess(user);
}

export function canDeletePropertyDocuments(user?: EmployeeAccessUser | null): boolean {
  return user?.role === 'agent' || hasFullEmployeeAccess(user);
}

export function canReviewReceipt(user?: EmployeeAccessUser | null): boolean {
  return user?.role === 'landlord';
}

export function canWithdrawReceipt(user?: EmployeeAccessUser | null, uploadedBy?: string | null): boolean {
  return user?.role === 'tenant' && !!user.id && uploadedBy === user.id;
}

export function canRevokeReceiptReview(user?: EmployeeAccessUser | null): boolean {
  return user?.role === 'landlord';
}

export function getOfficeOwnerId(user?: EmployeeAccessUser | null): string | null {
  if (!user) return null;
  if (user.role === 'employee') return user.created_by || user.id;
  return user.id;
}

export function getEmployeeAccessLabel(accessLevel?: string | null): string {
  return normalizeEmployeeAccessLevel(accessLevel) === 'full' ? 'Tam Yetki' : 'Sinirli Yetki';
}
