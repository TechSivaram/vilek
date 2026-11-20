"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProfileMenu } from "@/components/workspaces/profile-menu";
import { WorkspaceSwitcher } from "@/components/workspaces/workspace-switcher";
import "./crew-expenses.css";

type Assignment = {
  id: string;
  flightNumber: string;
  airlineIata: string;
  departure: string;
  origin: string;
  destination: string;
};
type Option = { id: number; name: string };
type Currency = { id: number; code: string; name: string; minorUnits: number };
type Expense = {
  id: string;
  assignmentId: string;
  amount: string;
  expenseDate: string;
  location: string | null;
  description: string;
  categoryId: number;
  category: string;
  currencyId: number;
  currencyCode: string;
  flightNumber: string;
  airlineIata: string;
  departure: string;
  claimId: string | null;
  claimStatus: string | null;
  documentCount: number;
  documents: { id: string; fileName: string; contentType: string }[];
};
type Data = {
  expenses: Expense[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  summary: {
    total: number;
    thisMonth: number;
    unclaimed: number;
    recent: {
      description: string;
      amount: string;
      expenseDate: string;
      currencyCode: string;
    } | null;
    amountByCurrency: { code: string; amount: string }[];
  };
};
type Meta = { assignments: Assignment[]; categories: Option[]; currencies: Currency[] };
type Filters = {
  search: string;
  categoryId: string;
  currencyId: string;
  fromDate: string;
  toDate: string;
  status: string;
  sortBy: "date" | "amount" | "category";
  sortOrder: "asc" | "desc";
  pageSize: number;
};
const emptyForm = {
  assignmentId: "",
  amount: "",
  currencyId: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  categoryId: "",
  description: "",
  location: "",
};
function dateLabel(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}
function money(value: string, currency: string) {
  const amount = Number(value);
  return `${currency} ${Number.isFinite(amount) ? amount.toFixed(2) : value}`;
}
function flightLabel(item: { airlineIata: string; flightNumber: string }) {
  const n = item.flightNumber.trim();
  return n.toUpperCase().startsWith(item.airlineIata.toUpperCase())
    ? n
    : `${item.airlineIata} ${n}`;
}

function claimStatusLabel(status: string | null) {
  if (!status) return "Unclaimed";
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function canUploadReceipt(item: Expense) {
  return !item.claimId || item.claimStatus === "DRAFT" || item.claimStatus === "REVISION_REQUIRED";
}

export function CrewExpensesPage({
  roleCodes,
  firstName,
  lastName,
  email,
}: {
  roleCodes: string[];
  firstName: string;
  lastName: string;
  email: string;
}) {
  const client = useQueryClient();
  const [filters, setFilters] = useState<Filters>({
    search: "",
    categoryId: "",
    currencyId: "",
    fromDate: "",
    toDate: "",
    status: "",
    sortBy: "date",
    sortOrder: "desc",
    pageSize: 20,
  });
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const meta = useQuery<Meta>({
    queryKey: ["crew-expense-meta"],
    queryFn: async () => {
      const r = await fetch("/api/crew/expenses?meta=1", { cache: "no-store" });
      const p = await r.json();
      if (!r.ok) throw new Error(p.error ?? "Unable to load expense options.");
      return p;
    },
  });
  const query = useQuery<Data>({
    queryKey: ["crew-expenses", filters, page],
    queryFn: async () => {
      const p = new URLSearchParams({
        ...Object.fromEntries(Object.entries(filters).map(([k, v]) => [k, String(v)])),
        page: String(page),
      });
      const r = await fetch(`/api/crew/expenses?${p}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Unable to load expenses.");
      return d;
    },
    placeholderData: (old) => old,
  });
  const data = query.data;
  const totalAmount = useMemo(
    () => data?.summary.amountByCurrency.map((x) => money(x.amount, x.code)).join(" · ") ?? "—",
    [data],
  );
  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((old) => ({ ...old, [key]: value }));
    setPage(1);
  }
  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      assignmentId: meta.data?.assignments[0]?.id ?? "",
      categoryId: String(meta.data?.categories[0]?.id ?? ""),
      currencyId: String(
        meta.data?.currencies.find((c) => c.code === "INR")?.id ??
          meta.data?.currencies[0]?.id ??
          "",
      ),
    });
    setShowForm(true);
    setError("");
    setNotice("");
  }
  function openEdit(item: Expense) {
    setEditing(item.id);
    setForm({
      assignmentId: item.assignmentId,
      amount: item.amount,
      currencyId: String(item.currencyId),
      expenseDate: item.expenseDate.slice(0, 10),
      categoryId: String(item.categoryId),
      description: item.description,
      location: item.location ?? "",
    });
    setShowForm(true);
    setError("");
  }
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["crew-expenses"] }),
      client.invalidateQueries({ queryKey: ["crew-expense-meta"] }),
    ]);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch(editing ? `/api/crew/expenses/${editing}` : "/api/crew/expenses", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          currencyId: Number(form.currencyId),
          categoryId: Number(form.categoryId),
          ...(editing ? {} : {}),
        }),
      });
      const p = await r.json();
      if (!r.ok) throw new Error(p.error ?? "Unable to save expense.");
      setShowForm(false);
      setNotice(editing ? "Expense updated." : "Expense saved.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save expense.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: Expense) {
    if (!window.confirm(`Delete expense “${item.description}”?`)) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/crew/expenses/${item.id}`, { method: "DELETE" });
      const p = await r.json();
      if (!r.ok) throw new Error(p.error ?? "Unable to delete expense.");
      setNotice("Expense deleted.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete expense.");
    } finally {
      setBusy(false);
    }
  }
  async function removeDocument(doc: Expense["documents"][number]) {
    if (!window.confirm(`Remove receipt “${doc.fileName}”?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch(`/api/crew/expense-documents/${doc.id}`, { method: "DELETE" });
      const p = await r.json();
      if (!r.ok) throw new Error(p.error ?? "Unable to remove receipt.");
      setNotice("Receipt removed.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove receipt.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(item: Expense, file?: File) {
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/crew/expenses/${item.id}/documents`, { method: "POST", body });
      const p = await r.json();
      if (!r.ok) throw new Error(p.error ?? "Receipt upload failed.");
      setNotice("Receipt uploaded.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Receipt upload failed.");
    } finally {
      setBusy(false);
    }
  }
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div
      className={`role-dashboard role-dashboard--crew crew-expenses-shell${sidebarCollapsed ? " crew-sidebar-collapsed" : ""}${mobileNavOpen ? " crew-mobile-nav-open" : ""}`}
    >
      <aside className="role-dashboard-sidebar">
        <button
          type="button"
          className="crew-sidebar-toggle"
          onClick={() => setSidebarCollapsed((value) => !value)}
          aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!sidebarCollapsed}
          title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
        >
          <span aria-hidden="true">{sidebarCollapsed ? "›" : "‹"}</span>
        </button>
        <Link href="/crew" className="role-dashboard-brand" aria-label="ViLek dashboard">
          <Image src="/Branding/logo.png" alt="ViLek" width={118} height={48} priority />
        </Link>
        <div className="role-dashboard-sidebar-label">WORKSPACE</div>
        <div className="role-dashboard-current" title="Crew workspace">
          <span>♙</span>
          <strong>Crew workspace</strong>
        </div>
        <nav className="role-dashboard-nav" aria-label="Crew navigation">
          <Link href="/crew" onClick={() => setMobileNavOpen(false)}>
            <span className="crew-nav-icon">◫</span>
            <span className="crew-nav-label">Overview</span>
          </Link>
          <Link href="/crew/flights" onClick={() => setMobileNavOpen(false)}>
            <span className="crew-nav-icon">✈</span>
            <span className="crew-nav-label">My flights</span>
          </Link>
          <Link
            href="/crew/expenses"
            className="is-active"
            aria-current="page"
            onClick={() => setMobileNavOpen(false)}
          >
            <span className="crew-nav-icon">₹</span>
            <span className="crew-nav-label">My expenses</span>
          </Link>
          <Link href="/crew/claims" onClick={() => setMobileNavOpen(false)}>
            <span className="crew-nav-icon">▤</span>
            <span className="crew-nav-label">My claims</span>
          </Link>
        </nav>
        <div className="role-dashboard-sidebar-bottom">
          <div className="role-dashboard-help">
            <strong>Need a hand?</strong>
            <p>Contact your ViLek administrator if you need help with this workspace.</p>
          </div>
        </div>
      </aside>
      <div className="role-dashboard-main">
        <header className="role-dashboard-topbar">
          <Link href="/crew" className="crew-topbar-brand" aria-label="ViLek home">
            <Image src="/Branding/logo.png" alt="ViLek" width={42} height={42} priority />
          </Link>
          <button
            type="button"
            className="crew-mobile-nav-toggle"
            onClick={() => setMobileNavOpen((value) => !value)}
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileNavOpen}
          >
            <span aria-hidden="true">{mobileNavOpen ? "×" : "☰"}</span>
          </button>
          <div className="role-dashboard-breadcrumb">
            <Link href="/crew">Crew workspace</Link>
            <span>/</span>
            <strong>My expenses</strong>
          </div>
          <div className="role-dashboard-topbar-actions">
            <WorkspaceSwitcher roleCodes={roleCodes} currentRole="CREW" />
            <ProfileMenu firstName={firstName} lastName={lastName} email={email} />
          </div>
        </header>
        <main className="role-dashboard-content crew-expenses-content">
          <div className="role-dashboard-heading">
            <div>
              <span className="role-dashboard-eyebrow">EXPENSES · RECEIPTS · REIMBURSEMENTS</span>
              <h1>My expenses</h1>
              <p>Record and track expenses against your flight assignments.</p>
            </div>
            <span className="role-dashboard-heading-icon" aria-hidden="true">
              ₹
            </span>
          </div>
          {error && (
            <div className="crew-expenses-alert" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="crew-expenses-notice" role="status">
              {notice}
            </div>
          )}
          <section className="crew-expenses-summary">
            <article>
              <span>Total expenses</span>
              <strong>{data?.summary.total ?? "—"}</strong>
            </article>
            <article>
              <span>This month</span>
              <strong>{data?.summary.thisMonth ?? "—"}</strong>
            </article>
            <article>
              <span>Not yet claimed</span>
              <strong>{data?.summary.unclaimed ?? "—"}</strong>
            </article>
            <article>
              <span>Total recorded amount</span>
              <strong className="crew-expenses-total">{totalAmount}</strong>
            </article>
            <article>
              <span>Recent expense</span>
              <strong className="crew-expenses-total">
                {data?.summary.recent
                  ? money(data.summary.recent.amount, data.summary.recent.currencyCode)
                  : "—"}
              </strong>
              <small>{data?.summary.recent?.description ?? "No expenses yet"}</small>
            </article>
          </section>
          <section className="crew-expenses-panel">
            <div className="crew-expenses-panel-heading">
              <div>
                <h2>Expense register</h2>
                <p>
                  {data
                    ? `${data.pagination.total} expense${data.pagination.total === 1 ? "" : "s"} found`
                    : "Your flight-related expenses"}
                </p>
              </div>
              <div className="crew-expenses-actions">
                <button
                  type="button"
                  onClick={() => {
                    void query.refetch();
                  }}
                  disabled={query.isFetching}
                >
                  ↻ {query.isFetching ? "Refreshing…" : "Refresh"}
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={openCreate}
                  disabled={!meta.data?.assignments.length}
                >
                  + Add expense
                </button>
              </div>
            </div>
            <div className="crew-expenses-toolbar">
              <label className="wide">
                <span>Search</span>
                <input
                  value={filters.search}
                  onChange={(e) => updateFilter("search", e.target.value)}
                  placeholder="Description or location"
                />
              </label>
              <label>
                <span>Category</span>
                <select
                  value={filters.categoryId}
                  onChange={(e) => updateFilter("categoryId", e.target.value)}
                >
                  <option value="">All categories</option>
                  {meta.data?.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Currency</span>
                <select
                  value={filters.currencyId}
                  onChange={(e) => updateFilter("currencyId", e.target.value)}
                >
                  <option value="">All currencies</option>
                  {meta.data?.currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Status</span>
                <select
                  value={filters.status}
                  onChange={(e) => updateFilter("status", e.target.value)}
                >
                  <option value="">All</option>
                  <option value="UNCLAIMED">Unclaimed</option>
                  <option value="CLAIMED">Claimed</option>
                </select>
              </label>
              <label>
                <span>From date</span>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => updateFilter("fromDate", e.target.value)}
                />
              </label>
              <label>
                <span>To date</span>
                <input
                  type="date"
                  value={filters.toDate}
                  min={filters.fromDate || undefined}
                  onChange={(e) => updateFilter("toDate", e.target.value)}
                />
              </label>
              <label>
                <span>Sort by</span>
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilter("sortBy", e.target.value as Filters["sortBy"])}
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="category">Category</option>
                </select>
              </label>
              <label>
                <span>Order</span>
                <select
                  value={filters.sortOrder}
                  onChange={(e) =>
                    updateFilter("sortOrder", e.target.value as Filters["sortOrder"])
                  }
                >
                  <option value="desc">Newest / highest</option>
                  <option value="asc">Oldest / lowest</option>
                </select>
              </label>
            </div>
            {query.isPending || meta.isPending ? (
              <div className="crew-expenses-empty">Loading your expenses…</div>
            ) : !data?.expenses.length ? (
              <div className="crew-expenses-empty">
                {data?.pagination.total === 0
                  ? "No expenses match your filters. Add an expense to get started."
                  : "No expenses have been recorded yet."}
              </div>
            ) : (
              <>
                <div className="crew-expenses-table-wrap">
                  <table className="crew-expenses-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Expense</th>
                        <th>Flight</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Claim</th>
                        <th>Receipt</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.expenses.map((item) => (
                        <tr key={item.id}>
                          <td>{dateLabel(item.expenseDate)}</td>
                          <td>
                            <strong>{item.description}</strong>
                            <span>{item.location || "—"}</span>
                          </td>
                          <td>
                            <strong>{flightLabel(item)}</strong>
                            <span>{item.departure ? dateLabel(item.departure) : ""}</span>
                          </td>
                          <td>{item.category}</td>
                          <td>
                            <strong>{money(item.amount, item.currencyCode)}</strong>
                          </td>
                          <td>
                            <span
                              className={`crew-expenses-status ${item.claimId ? "claimed" : "unclaimed"}`}
                            >
                              {claimStatusLabel(item.claimStatus)}
                            </span>
                          </td>
                          <td>
                            {item.documents.length ? (
                              item.documents.map((doc) => (
                                <div className="crew-expense-document-row" key={doc.id}>
                                  <a
                                    className="crew-expenses-doc-link"
                                    href={`/api/crew/expense-documents/${doc.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {doc.fileName}
                                  </a>
                                  {canUploadReceipt(item) && (
                                    <button
                                      type="button"
                                      onClick={() => void removeDocument(doc)}
                                      disabled={busy}
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <span>No receipt</span>
                            )}
                          </td>
                          <td>
                            <div className="crew-expenses-row-actions">
                              {(!item.claimId ||
                                item.claimStatus === "DRAFT" ||
                                item.claimStatus === "REVISION_REQUIRED") && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEdit(item)}
                                    disabled={busy}
                                  >
                                    Edit
                                  </button>
                                  {!item.claimId && (
                                    <button
                                      type="button"
                                      onClick={() => void remove(item)}
                                      disabled={busy}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </>
                              )}
                              {canUploadReceipt(item) && (
                                <label className="receipt-upload">
                                  Upload
                                  <input
                                    type="file"
                                    accept="application/pdf,image/jpeg,image/png"
                                    disabled={busy}
                                    onChange={(e) => {
                                      void upload(item, e.target.files?.[0]);
                                      e.currentTarget.value = "";
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="crew-expenses-mobile-list">
                  {data.expenses.map((item) => (
                    <article className="crew-expense-card" key={item.id}>
                      <div className="crew-expense-card-top">
                        <div>
                          <strong>{item.description}</strong>
                          <span>
                            {flightLabel(item)} · {item.category}
                          </span>
                        </div>
                        <b>{money(item.amount, item.currencyCode)}</b>
                      </div>
                      <div className="crew-expense-card-meta">
                        <span>{dateLabel(item.expenseDate)}</span>
                        <span>{claimStatusLabel(item.claimStatus)}</span>
                        <span>{item.documents.length} receipt(s)</span>
                      </div>
                      {item.location && <p>{item.location}</p>}
                      {item.documents.map((doc) => (
                        <div className="crew-expense-document-row" key={doc.id}>
                          <a
                            className="crew-expenses-doc-link"
                            href={`/api/crew/expense-documents/${doc.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View {doc.fileName}
                          </a>
                          {canUploadReceipt(item) && (
                            <button
                              type="button"
                              onClick={() => void removeDocument(doc)}
                              disabled={busy}
                            >
                              Remove receipt
                            </button>
                          )}
                        </div>
                      ))}
                      <div className="crew-expenses-row-actions">
                        {(!item.claimId ||
                          item.claimStatus === "DRAFT" ||
                          item.claimStatus === "REVISION_REQUIRED") && (
                          <>
                            <button type="button" onClick={() => openEdit(item)} disabled={busy}>
                              Edit
                            </button>
                            {!item.claimId && (
                              <button
                                type="button"
                                onClick={() => void remove(item)}
                                disabled={busy}
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                        {canUploadReceipt(item) && (
                          <label className="receipt-upload">
                            Upload receipt
                            <input
                              type="file"
                              accept="application/pdf,image/jpeg,image/png"
                              disabled={busy}
                              onChange={(e) => {
                                void upload(item, e.target.files?.[0]);
                                e.currentTarget.value = "";
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                <div className="crew-expenses-pagination">
                  <span>
                    Showing {(page - 1) * filters.pageSize + 1}–
                    {Math.min(page * filters.pageSize, data.pagination.total)} of{" "}
                    {data.pagination.total}
                  </span>
                  <div>
                    <label>
                      Rows{" "}
                      <select
                        value={filters.pageSize}
                        onChange={(e) => updateFilter("pageSize", Number(e.target.value))}
                      >
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={page <= 1 || query.isFetching}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </button>
                    <span>
                      Page {page} of {data.pagination.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= data.pagination.totalPages || query.isFetching}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
          {showForm && (
            <div className="crew-expenses-modal-backdrop" role="presentation">
              <form className="crew-expenses-modal" onSubmit={save}>
                <div className="crew-expenses-modal-heading">
                  <div>
                    <span className="role-dashboard-eyebrow">EXPENSE REGISTER</span>
                    <h2>{editing ? "Edit expense" : "Add expense"}</h2>
                  </div>
                  <button type="button" onClick={() => setShowForm(false)} aria-label="Close">
                    ×
                  </button>
                </div>
                {!editing && (
                  <label>
                    <span>Flight assignment *</span>
                    <select
                      required
                      value={form.assignmentId}
                      onChange={(e) => setForm((f) => ({ ...f, assignmentId: e.target.value }))}
                    >
                      <option value="">Select assignment</option>
                      {meta.data?.assignments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {flightLabel(a)} · {a.origin} → {a.destination} · {dateLabel(a.departure)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="crew-expenses-form-grid">
                  <label>
                    <span>Amount *</span>
                    <input
                      required
                      inputMode="decimal"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="0.00"
                    />
                  </label>
                  <label>
                    <span>Currency *</span>
                    <select
                      required
                      value={form.currencyId}
                      onChange={(e) => setForm((f) => ({ ...f, currencyId: e.target.value }))}
                    >
                      <option value="">Select currency</option>
                      {meta.data?.currencies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Expense date *</span>
                    <input
                      required
                      type="date"
                      value={form.expenseDate}
                      onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Category *</span>
                    <select
                      required
                      value={form.categoryId}
                      onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                    >
                      <option value="">Select category</option>
                      {meta.data?.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  <span>Description *</span>
                  <input
                    required
                    maxLength={500}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Location</span>
                  <input
                    maxLength={200}
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  />
                </label>
                <div className="crew-expenses-modal-actions">
                  <button type="button" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary" disabled={busy}>
                    {busy ? "Saving…" : editing ? "Save changes" : "Save expense"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
        <footer className="role-dashboard-footer">
          <span>© {new Date().getFullYear()} ViLek</span>
          <span>Crew workspace</span>
        </footer>
      </div>
    </div>
  );
}
