import { users, roles, currencies, expenseCategories } from "@/lib/db/schema";

export type FieldKind =
  | "text"
  | "email"
  | "number"
  | "datetime-local"
  | "date"
  | "boolean"
  | "select";
export type AdminField = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  readOnly?: boolean;
  options?: { value: string; label: string }[];
  help?: string;
};
export type ResourceConfig = {
  title: string;
  description: string;
  table: unknown;
  fields: AdminField[];
  search: string[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDeactivate?: boolean;
  listOnly?: boolean;
};

export const resourceConfigs: Record<string, ResourceConfig> = {
  users: {
    title: "Users",
    description:
      "Local ViLek identities linked to TSCloak. Identity synchronization never changes local role assignments.",
    table: users,
    search: ["email", "firstName", "lastName", "oidcSubject"],
    canCreate: true,
    canEdit: true,
    canDeactivate: true,
    listOnly: false,
    fields: [
      { name: "email", label: "Email", kind: "email", readOnly: true },
      { name: "firstName", label: "First name", kind: "text", readOnly: true },
      { name: "lastName", label: "Last name", kind: "text", readOnly: true },
      {
        name: "oidcSubject",
        label: "TSCloak subject",
        kind: "text",
        readOnly: true,
      },
      { name: "isActive", label: "Active", kind: "boolean" },
    ],
  },
  roles: {
    title: "Role Management",
    description:
      "Manage the predefined local ViLek roles. Permission grants remain defined by application policy code; TSCloak roles are separate.",
    table: roles,
    search: ["code", "name", "description"],
    canCreate: false,
    canEdit: true,
    canDeactivate: true,
    fields: [
      {
        name: "code",
        label: "Role code",
        kind: "text",
        required: true,
        readOnly: true,
      },
      { name: "name", label: "Name", kind: "text", required: true },
      { name: "description", label: "Description", kind: "text" },
      { name: "isActive", label: "Active", kind: "boolean" },
    ],
  },
  currencies: {
    title: "Currencies",
    description: "Manage supported currencies and minor-unit precision.",
    table: currencies,
    search: ["code", "name"],
    canCreate: true,
    canEdit: true,
    canDeactivate: true,
    fields: [
      {
        name: "code",
        label: "ISO currency code",
        kind: "text",
        required: true,
      },
      { name: "name", label: "Currency name", kind: "text", required: true },
      {
        name: "minorUnits",
        label: "Minor units (0–4)",
        kind: "number",
        required: true,
      },
      { name: "isActive", label: "Active", kind: "boolean" },
    ],
  },
  "expense-categories": {
    title: "Expense Categories",
    description: "Manage categories used when recording crew expenses.",
    table: expenseCategories,
    search: ["code", "name"],
    canCreate: true,
    canEdit: true,
    canDeactivate: true,
    fields: [
      { name: "code", label: "Code", kind: "text", required: true },
      { name: "name", label: "Name", kind: "text", required: true },
      { name: "isActive", label: "Active", kind: "boolean" },
    ],
  },
};
