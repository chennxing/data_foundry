"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Project, Requirement, WideTable } from "@/lib/types";
import { fetchProjects, fetchRequirementWideTables } from "@/lib/api-client";
import { ClipboardList } from "lucide-react";

export default function RequirementsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [wideTables, setWideTables] = useState<WideTable[]>([]);

  useEffect(() => {
    fetchProjects()
      .then((ps) => {
        setProjects(ps);
        return Promise.all(
          ps.map((p) =>
            fetchRequirementWideTables(p.id).catch(() => ({
              requirements: [] as Requirement[],
              wideTables: [] as WideTable[],
            })),
          ),
        );
      })
      .then((results) => {
        setRequirements(results.flatMap((r) => r.requirements));
        setWideTables(results.flatMap((r) => r.wideTables));
      })
      .catch(() => {});
  }, []);

  const projectById = useMemo(() => {
    const map = new Map<string, Project>();
    for (const project of projects) {
      map.set(project.id, project);
    }
    return map;
  }, [projects]);

  const wideTableByRequirementId = useMemo(() => {
    const map = new Map<string, WideTable>();
    for (const wideTable of wideTables) {
      map.set(wideTable.requirementId, wideTable);
    }
    return map;
  }, [wideTables]);

  const statusLabel = (status: Requirement["status"]) => {
    if (status === "running") return "运行中";
    return "未运行";
  };

  return (
    <div className="p-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          需求清单
        </h1>
        <p className="text-sm text-muted-foreground">直接查看需求列表与关联宽表信息。</p>
      </header>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold">需求列表</h2>
          <div className="text-xs text-muted-foreground">共 {requirements.length} 条</div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3 pr-4 font-medium">需求</th>
                <th className="py-3 pr-4 font-medium">所属项目</th>
                <th className="py-3 pr-4 font-medium">负责人/执行人</th>
                <th className="py-3 pr-4 font-medium">关联宽表</th>
                <th className="py-3 pr-4 font-medium">状态流转</th>
                <th className="py-3 pr-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((req) => {
                const project = projectById.get(req.projectId);
                const reqWideTable = req.wideTable ?? wideTableByRequirementId.get(req.id);
                const wideTableLabel = reqWideTable ? `${reqWideTable.name} (${reqWideTable.id})` : "-";

                return (
                  <tr key={req.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="py-4 pr-4 align-top">
                      <div className="space-y-1">
                        <div className="max-w-[320px] truncate font-medium text-foreground" title={req.title}>
                          {req.title}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">{req.id}</div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 align-top">
                      <div className="max-w-[200px] truncate" title={project?.name ?? "-"}>
                        {project?.name ?? "-"}
                      </div>
                    </td>
                    <td className="py-4 pr-4 align-top">
                      <div className="space-y-1 text-muted-foreground">
                        <div>业务：{req.owner || "-"}</div>
                        <div>执行：{req.assignee || "-"}</div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 align-top">
                      <div className="max-w-[320px] truncate" title={reqWideTable ? wideTableLabel : "-"}>
                        {wideTableLabel}
                      </div>
                      {reqWideTable ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {reqWideTable.schema.columns.length} 列，{reqWideTable.recordCount} 条记录
                        </div>
                      ) : null}
                    </td>
                    <td className="py-4 pr-4 align-top">{statusLabel(req.status)}</td>
                    <td className="py-4 pr-2 align-top">
                      <Link
                        href={`/projects/${req.projectId}/requirements/${req.id}?nav=requirements&view=requirement&tab=requirement`}
                        className="text-primary hover:underline"
                      >
                        进入需求
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
