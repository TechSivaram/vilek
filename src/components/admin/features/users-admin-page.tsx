"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  UsersListRow,
  UsersListResult,
  UsersFormDto,
  UsersStatusFormDto,
} from "@/lib/admin/features/users/dto";
import {
  userFormSchema as formSchema,
  userStatusFormSchema as statusSchema,
} from "@/lib/admin/features/users/schema";
async function requestJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Request failed.");
  return d as T;
}
const dateText = (v: string | null | undefined) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};
const toLocal = (v: string | null | undefined) => {
  if (!v) return "";
  const d = new Date(v);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const PAGE = "/api/admin/users";
export function UsersAdminPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<UsersListRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const createForm = useForm<UsersFormDto>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", firstName: "", lastName: "" },
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const statusForm = useForm<UsersStatusFormDto>({
    resolver: zodResolver(statusSchema),
    defaultValues: { isActive: true },
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const list = useQuery<UsersListResult>({
    queryKey: ["admin-users", search, page, pageSize],
    queryFn: () =>
      requestJson(`${PAGE}?q=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}`),
  });

  const save = useMutation({
    mutationFn: (args: { id?: string | number; values: unknown }) =>
      requestJson<{ success?: boolean; message?: string }>(
        args.id ? `${PAGE}/${encodeURIComponent(String(args.id))}` : PAGE,
        {
          method: args.id ? "PATCH" : "POST",
          body: JSON.stringify(args.values),
        },
      ),
    onSuccess: async (d) => {
      setMessage(
        creating
          ? (d.message ?? "User created and setup email requested.")
          : (d.message ?? "User updated in ViLek and the identity provider."),
      );
      setError("");
      setCreating(false);
      setEditing(null);
      createForm.reset({ email: "", firstName: "", lastName: "" });
      statusForm.reset({ isActive: true });
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
  const deactivate = useMutation({
    mutationFn: (row: UsersListRow) =>
      requestJson(`${PAGE}/${encodeURIComponent(String(row.id))}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      setMessage("Record deactivated.");
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
  const sync = useMutation({
    mutationFn: () =>
      requestJson<{ message?: string }>("/api/admin/users/sync", {
        method: "POST",
      }),
    onMutate: () => {
      setMessage("");
      setError("");
    },
    onSuccess: async (result) => {
      setMessage(result.message ?? "Identity synchronization completed.");
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (cause) => {
      setError(cause instanceof Error ? cause.message : "Identity synchronization failed.");
    },
  });
  const options = list.data?.options ?? {};
  const busy = list.isFetching || save.isPending || deactivate.isPending || sync.isPending;
  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);
  useEffect(() => {
    const e = list.error ?? save.error ?? deactivate.error ?? sync.error;
    if (e) setError(e.message);
  }, [list.error, save.error, deactivate.error, sync.error]);
  const pagination = list.data?.pagination ?? {
    page,
    pageSize,
    total: 0,
    totalPages: 1,
  };
  const beginCreate = () => {
    setEditing(null);
    setCreating(true);
    setMessage("");
    setError("");
    createForm.reset({ email: "", firstName: "", lastName: "" });
    statusForm.reset({ isActive: true });
  };
  const beginEdit = (row: UsersListRow) => {
    setEditing(row);
    setCreating(false);
    setMessage("");
    setError("");
    statusForm.reset({ isActive: row.isActive });
  };
  const cancel = () => {
    setCreating(false);
    setEditing(null);
    createForm.reset({ email: "", firstName: "", lastName: "" });
    statusForm.reset({ isActive: true });
  };
  const submit = creating
    ? createForm.handleSubmit(async (values) => {
        try {
          await save.mutateAsync({ values: formSchema.parse(values) });
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Save failed");
        }
      })
    : statusForm.handleSubmit(async (values) => {
        try {
          await save.mutateAsync({
            id: editing?.id,
            values: statusSchema.parse(values),
          });
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Save failed");
        }
      });
  return (
    <>
      <section className="admin-page-heading">
        <div>
          <div className="admin-eyebrow">ADMINISTRATION</div>
          <h1>Users</h1>
          <p>
            Manage ViLek user accounts and synchronize account changes with the configured identity
            provider.
          </p>
        </div>
        <div className="admin-heading-actions">
          <button
            className="admin-secondary-button"
            type="button"
            onClick={() => sync.mutate()}
            disabled={busy}
          >
            {sync.isPending ? "Syncing identities…" : "Sync identities"}
          </button>
          {true && (
            <button
              type="button"
              className="admin-primary-button"
              onClick={beginCreate}
              disabled={busy}
            >
              ＋ Add record
            </button>
          )}
        </div>
      </section>
      {message && (
        <div className="admin-alert admin-alert-success" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="admin-alert admin-alert-error" role="alert">
          {error}
        </div>
      )}
      {(creating || editing) && (
        <section className="admin-panel admin-editor">
          <div className="admin-panel-heading">
            <div>
              <h2>{editing ? "Edit " : "Add "}Users</h2>
              <p>Create the ViLek account and provision it to the configured identity provider.</p>
            </div>
            <button className="admin-icon-button" type="button" onClick={cancel}>
              ×
            </button>
          </div>
          <form className="admin-record-form" onSubmit={submit} noValidate>
            {creating ? (
              <>
                <label className="admin-field">
                  <span>Email address *</span>
                  <input type="email" {...createForm.register("email")} />
                </label>
                <label className="admin-field">
                  <span>First name *</span>
                  <input {...createForm.register("firstName")} />
                </label>
                <label className="admin-field">
                  <span>Last name *</span>
                  <input {...createForm.register("lastName")} />
                  <small>
                    The configured identity provider will send the password setup email.
                  </small>
                </label>
              </>
            ) : (
              <>
                <label className="admin-field">
                  <span>Email</span>
                  <input value={editing?.email ?? ""} readOnly />
                </label>
                <label className="admin-field">
                  <span>First name</span>
                  <input value={editing?.firstName ?? ""} readOnly />
                </label>
                <label className="admin-field">
                  <span>Last name</span>
                  <input value={editing?.lastName ?? ""} readOnly />
                </label>
                <label className="admin-field">
                  <span>Identity subject</span>
                  <input value={editing?.oidcSubject ?? "Not linked"} readOnly />
                </label>
                <label className="admin-field admin-field-checkbox">
                  <input type="checkbox" {...statusForm.register("isActive")} />
                  <span>Active</span>
                </label>
              </>
            )}
            <div className="admin-form-actions">
              <button type="button" className="admin-secondary-button" onClick={cancel}>
                Cancel
              </button>
              <button type="submit" className="admin-primary-button" disabled={busy}>
                {busy ? "Saving…" : creating ? "Create user & send setup email" : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      )}
      <section className="admin-panel admin-records-panel">
        <div className="admin-record-toolbar">
          <div>
            <h2>
              Records <span className="admin-count-badge">{pagination.total}</span>
            </h2>
            <p>
              {pagination.total
                ? `Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total} records`
                : "No records to display"}
            </p>
          </div>
          <div className="admin-record-tools">
            <input
              aria-label="Search Users"
              placeholder="Search records…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => void list.refetch()}
              disabled={busy}
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th key="email">Email</th>
                <th key="firstName">First name</th>
                <th key="lastName">Last name</th>
                <th key="oidcSubject">Identity subject</th>
                <th key="isActive">Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(list.data?.rows ?? []).map((row: UsersListRow) => (
                <tr key={String(row.id)}>
                  <td key="email" data-label="Email">
                    {row.email ?? "—"}
                  </td>
                  <td key="firstName" data-label="First name">
                    {row.firstName ?? "—"}
                  </td>
                  <td key="lastName" data-label="Last name">
                    {row.lastName ?? "—"}
                  </td>
                  <td key="oidcSubject" data-label="Identity subject">
                    {row.oidcSubject ?? "—"}
                  </td>
                  <td key="isActive" data-label="Status">
                    {row.isActive ? (
                      <span className="admin-status-pill is-active">Active</span>
                    ) : (
                      <span className="admin-status-pill is-inactive">Inactive</span>
                    )}
                  </td>
                  <td data-label="Actions">
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-table-action"
                        onClick={() => beginEdit(row)}
                        disabled={busy}
                      >
                        Edit
                      </button>
                      {row.isActive && (
                        <button
                          type="button"
                          className="admin-table-action is-danger"
                          onClick={() => {
                            if (window.confirm(`Deactivate this users record?`))
                              deactivate.mutate(row);
                          }}
                          disabled={busy}
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!list.data?.rows.length && (
                <tr>
                  <td colSpan={6} className="admin-table-empty">
                    {busy ? "Loading records…" : "No records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-pagination">
          <label>
            Rows per page{" "}
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <div className="admin-pagination-controls">
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || busy}
            >
              Previous
            </button>
            <span>
              Page {pagination.page} of {Math.max(1, pagination.totalPages)}
            </span>
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages || busy}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
