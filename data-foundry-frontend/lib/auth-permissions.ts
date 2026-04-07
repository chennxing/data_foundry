export type UserRole = "DATA_BA" | "DATA_ENGINEER" | "BUSINESS_EXPERT" | "ADMIN";

export type UserStatus = "ACTIVE" | "DISABLED";

export type PermissionUser = {
  account: string;
  name: string;
  status: UserStatus;
  role: UserRole;
};

export const ROLE_LABEL: Record<UserRole, string> = {
  DATA_BA: "数据BA",
  DATA_ENGINEER: "数据工程师",
  BUSINESS_EXPERT: "业务专家",
  ADMIN: "管理员",
};

export const STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: "启用",
  DISABLED: "停用",
};

const STORAGE_KEYS = {
  users: "dataFoundry.permissions.users.v1",
  currentUserAccount: "dataFoundry.permissions.currentUserAccount.v1",
} as const;

export const DEFAULT_PERMISSION_USERS: PermissionUser[] = [
  { account: "ba_zhangsan", name: "张三", status: "ACTIVE", role: "DATA_BA" },
  { account: "engineer_lisi", name: "李四", status: "ACTIVE", role: "DATA_ENGINEER" },
  { account: "expert_wangwu", name: "王五", status: "ACTIVE", role: "BUSINESS_EXPERT" },
  { account: "admin", name: "管理员", status: "ACTIVE", role: "ADMIN" },
];

const PERMISSIONS_CHANGED_EVENT = "datafoundry:permissions-changed";

export function subscribePermissionsChanged(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = () => listener();
  window.addEventListener(PERMISSIONS_CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(PERMISSIONS_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function notifyPermissionsChanged() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(PERMISSIONS_CHANGED_EVENT));
}

export function loadPermissionUsers(): PermissionUser[] {
  if (typeof window === "undefined") {
    return DEFAULT_PERMISSION_USERS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.users);
    if (!raw) {
      return DEFAULT_PERMISSION_USERS;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return DEFAULT_PERMISSION_USERS;
    }
    return parsed as PermissionUser[];
  } catch {
    return DEFAULT_PERMISSION_USERS;
  }
}

export function savePermissionUsers(users: PermissionUser[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  notifyPermissionsChanged();
}

export function loadCurrentUserAccount(): string {
  if (typeof window === "undefined") {
    return "admin";
  }
  return window.localStorage.getItem(STORAGE_KEYS.currentUserAccount) || "admin";
}

export function saveCurrentUserAccount(account: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEYS.currentUserAccount, account);
  notifyPermissionsChanged();
}

export function getCurrentUser(users: PermissionUser[] = loadPermissionUsers()): PermissionUser {
  const account = loadCurrentUserAccount();
  return users.find((user) => user.account === account) ?? DEFAULT_PERMISSION_USERS[DEFAULT_PERMISSION_USERS.length - 1];
}

export function canViewCollectionTasks(role: UserRole) {
  return role === "DATA_ENGINEER" || role === "ADMIN";
}

