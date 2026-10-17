"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formSchema } from "@/lib/admin/features/expense_categories/schema";
import type { ExpenseCategoriesFormDto } from "@/lib/admin/features/expense_categories/dto";
import type {
  ExpenseCategoriesListRow,
  ExpenseCategoriesListResult,
} from "@/lib/admin/features/expense_categories/dto";

async function requestJson<T = any>(
  url: string,
  init?: RequestInit,
): Promise<T> {
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
const PAGE = "/api/admin/expense-categories";
export function ExpenseCategoriesAdminPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<ExpenseCategoriesListRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const form = useForm<ExpenseCategoriesFormDto>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: "", name: "", isActive: true },
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const list = useQuery<ExpenseCategoriesListResult>({
    queryKey: ["admin-expense_categories", search, page, pageSize],
    queryFn: () =>
      requestJson(
        `${PAGE}?q=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}`,
      ),
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
      setMessage("Changes saved.");
      setError("");
      setCreating(false);
      setEditing(null);
      form.reset({});
      await qc.invalidateQueries({ queryKey: ["admin-expense_categories"] });
    },
  });
  const deactivate = useMutation({
    mutationFn: (row: ExpenseCategoriesListRow) =>
      requestJson(`${PAGE}/${encodeURIComponent(String(row.id))}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      setMessage("Record deactivated.");
      await qc.invalidateQueries({ queryKey: ["admin-expense_categories"] });
    },
  });

  const options = list.data?.options ?? {};
  const busy = list.isFetching || save.isPending || deactivate.isPending;
  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);
  useEffect(() => {
    const e = list.error ?? save.error ?? deactivate.error;
    if (e) setError(e.message);
  }, [list.error, save.error, deactivate.error]);
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
    form.reset({ code: "", name: "", isActive: true });
  };
  const beginEdit = (row: ExpenseCategoriesListRow) => {
    setEditing(row);
    setCreating(false);
    setMessage("");
    setError("");
    form.reset({ code: row.code, name: row.name, isActive: row.isActive });
  };
  const cancel = () => {
    setCreating(false);
    setEditing(null);
    form.reset({});
  };
  const submit = form.handleSubmit(async (values) => {
    try {
      const payload = formSchema.parse(values);
      await save.mutateAsync({ id: editing?.id, values: payload });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  });
  return (
    <>
      <section className="admin-page-heading">
        <div>
          <div className="admin-eyebrow">ADMINISTRATION</div>
          <h1>Expense Categories</h1>
          <p>Manage categories used when recording crew expenses.</p>
        </div>
        <div className="admin-heading-actions">
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
              <h2>{editing ? "Edit " : "Add "}Expense Categories</h2>
              <p>Manage categories used when recording crew expenses.</p>
            </div>
            <button
              className="admin-icon-button"
              type="button"
              onClick={cancel}
            >
              ×
            </button>
          </div>
          <form className="admin-record-form" onSubmit={submit} noValidate>
            <label className="admin-field">
              <span>Code *</span>
              <input type="text" {...form.register("code")} />
              {form.formState.errors.code?.message && (
                <small className="admin-field-error">
                  {String(form.formState.errors.code?.message)}
                </small>
              )}
            </label>
            <label className="admin-field">
              <span>Name *</span>
              <input type="text" {...form.register("name")} />
              {form.formState.errors.name?.message && (
                <small className="admin-field-error">
                  {String(form.formState.errors.name?.message)}
                </small>
              )}
            </label>
            <label className="admin-field admin-field-checkbox">
              <input type="checkbox" {...form.register("isActive")} />
              <span>Active</span>
            </label>
            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-secondary-button"
                onClick={cancel}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="admin-primary-button"
                disabled={busy}
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      )}
      <section className="admin-panel admin-records-panel">
        <div className="admin-record-toolbar">
          <div>
            <h2>
              Records{" "}
              <span className="admin-count-badge">{pagination.total}</span>
            </h2>
            <p>
              {pagination.total
                ? `Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total} records`
                : "No records to display"}
            </p>
          </div>
          <div className="admin-record-tools">
            <input
              aria-label="Search Expense Categories"
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
                <th key="code">Code</th>
                <th key="name">Name</th>
                <th key="isActive">Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(list.data?.rows ?? []).map((row: ExpenseCategoriesListRow) => (
                <tr key={String(row.id)}>
                  <td key="code" data-label="Code">
                    {row.code ?? "—"}
                  </td>
                  <td key="name" data-label="Name">
                    {row.name ?? "—"}
                  </td>
                  <td key="isActive" data-label="Status">
                    {row.isActive ? (
                      <span className="admin-status-pill is-active">
                        Active
                      </span>
                    ) : (
                      <span className="admin-status-pill is-inactive">
                        Inactive
                      </span>
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
                            if (
                              window.confirm(
                                `Deactivate this expense categories record?`,
                              )
                            )
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
                  <td colSpan={4} className="admin-table-empty">
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
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
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
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
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
