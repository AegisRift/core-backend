export type UserType = 'buyer' | 'seller' | 'agent' | 'investor';

const COMMON_SELF_SESSION_PERMISSIONS = [
  'self:auth:sessions:read',
  'self:auth:sessions:logout',
  'self:auth:sessions:logout:remote',
  'self:auth:sessions:logout:others',
];

const USER_TYPE_PERMISSIONS: Record<UserType, string[]> = {
  buyer: [...COMMON_SELF_SESSION_PERMISSIONS],
  seller: [...COMMON_SELF_SESSION_PERMISSIONS],
  investor: [...COMMON_SELF_SESSION_PERMISSIONS],
  agent: [...COMMON_SELF_SESSION_PERMISSIONS],
};

export function resolvePermissionsByUserType(userType: UserType): string[] {
  return USER_TYPE_PERMISSIONS[userType] ?? [];
}
