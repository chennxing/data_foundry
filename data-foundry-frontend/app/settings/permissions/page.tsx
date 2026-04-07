"use client";

import { useEffect, useMemo, useState } from "react";

import {
  DEFAULT_PERMISSION_USERS,
  ROLE_LABEL,
  STATUS_LABEL,
  loadCurrentUserAccount,
  loadPermissionUsers,
  saveCurrentUserAccount,
  savePermissionUsers,
  subscribePermissionsChanged,
  type PermissionUser,
  type UserRole,
  type UserStatus,
} from "@/lib/auth-permissions";
import { cn } from "@/lib/utils";

export default function PermissionsPage() {
  const [users, setUsers] = useState<PermissionUser[]>(DEFAULT_PERMISSION_USERS);
  const [currentAccount, setCurrentAccount] = useState<string>("admin");

  useEffect(() => {
    const refresh = () => {
      setUsers(loadPermissionUsers());
      setCurrentAccount(loadCurrentUserAccount());
    };

    refresh();
    return subscribePermissionsChanged(refresh);
  }, []);

  const currentUser = useMemo(
    () => users.find((user) => user.account === currentAccount) ?? users[users.length - 1],
    [currentAccount, users],
  );

  const updateUser = (account: string, patch: Partial<Pick<PermissionUser, "status" | "role">>) => {
    const nextUsers = users.map((user) => (user.account === account ? { ...user, ...patch } : user));
    setUsers(nextUsers);
    savePermissionUsers(nextUsers);
  };

  const resetToDefaults = () => {
    setUsers(DEFAULT_PERMISSION_USERS);
    setCurrentAccount("admin");
    savePermissionUsers(DEFAULT_PERMISSION_USERS);
    saveCurrentUserAccount("admin");
  };

  const roleOptions: { value: UserRole; label: string }[] = useMemo(
    () => (Object.keys(ROLE_LABEL) as UserRole[]).map((role) => ({ value: role, label: ROLE_LABEL[role] })),
    [],
  );

  const statusOptions: { value: UserStatus; label: string }[] = useMemo(
    () => (Object.keys(STATUS_LABEL) as UserStatus[]).map((status) => ({ value: status, label: STATUS_LABEL[status] })),
    [],
  );

  return (
    <div className="max-w-5xl space-y-6 p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">权限配置</h1>
          <p className="text-sm text-muted-foreground">
            维护用户的状态与角色。系统会根据当前登录用户角色控制菜单展示：数据BA/业务专家不显示“采集任务管理”，数据工程师/管理员显示全部菜单。
          </p>
        </div>

        <button
          type="button"
          onClick={resetToDefaults}
          className="inline-flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium transition hover:bg-muted"
        >
          恢复样例数据
        </button>
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">当前登录用户</h2>
            <p className="text-sm text-muted-foreground">用于快速验证不同角色下的菜单展示差异（前端模拟）。</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={currentAccount}
              onChange={(event) => {
                const nextAccount = event.target.value;
                setCurrentAccount(nextAccount);
                saveCurrentUserAccount(nextAccount);
              }}
              className="flex h-10 min-w-72 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              {users.map((user) => (
                <option key={user.account} value={user.account}>
                  {user.account} · {user.name} · {ROLE_LABEL[user.role]}
                </option>
              ))}
            </select>

            <span className="text-xs text-muted-foreground">
              当前：{currentUser?.name}（{ROLE_LABEL[currentUser.role]}）
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">用户权限列表</h2>
          <p className="text-sm text-muted-foreground">账号与姓名为展示字段；状态与角色可调整并保存到本地浏览器。</p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">账号</th>
                <th className="py-2 pr-4 font-medium">姓名</th>
                <th className="py-2 pr-4 font-medium">状态</th>
                <th className="py-2 pr-4 font-medium">角色</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.account} className="border-b last:border-b-0">
                  <td className="py-3 pr-4 font-mono text-xs">{user.account}</td>
                  <td className="py-3 pr-4">{user.name}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          user.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-600",
                        )}
                      >
                        {STATUS_LABEL[user.status]}
                      </span>
                      <select
                        value={user.status}
                        onChange={(event) => updateUser(user.account, { status: event.target.value as UserStatus })}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/20"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={user.role}
                      onChange={(event) => updateUser(user.account, { role: event.target.value as UserRole })}
                      className="h-9 w-44 rounded-md border border-input bg-background px-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/20"
                    >
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

