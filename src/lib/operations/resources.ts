import {
  crewMembers,
  airlines,
  airports,
  flights,
  crewDesignations,
} from "@/lib/db/schema";

export type FieldKind =
  | "text"
  | "email"
  | "number"
  | "datetime-local"
  | "date"
  | "boolean"
  | "select";
export type OperationsField = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  readOnly?: boolean;
  options?: { value: string; label: string }[];
  help?: string;
};
export type OperationsResourceConfig = {
  title: string;
  description: string;
  table: unknown;
  fields: OperationsField[];
  search: string[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDeactivate?: boolean;
  listOnly?: boolean;
};

export const resourceConfigs: Record<string, OperationsResourceConfig> = {
  "crew-members": {
    title: "Crew Members",
    description: "Crew records linked to local user accounts.",
    table: crewMembers,
    search: ["badgeNumber", "userId"],
    canCreate: true,
    canEdit: true,
    canDeactivate: true,
    fields: [
      {
        name: "userId",
        label: "Local user ID",
        kind: "select",
        required: true,
        help: "Select the existing ViLek user to link.",
      },
      {
        name: "badgeNumber",
        label: "Badge number",
        kind: "text",
        required: true,
      },
      { name: "isActive", label: "Active", kind: "boolean" },
    ],
  },
  airlines: {
    title: "Airlines",
    description: "Maintain airline reference data used by flight records.",
    table: airlines,
    search: ["iataCode", "icaoCode", "name"],
    canCreate: true,
    canEdit: true,
    canDeactivate: true,
    fields: [
      {
        name: "iataCode",
        label: "IATA code (2 letters)",
        kind: "text",
        required: true,
      },
      {
        name: "icaoCode",
        label: "ICAO code (3 letters)",
        kind: "text",
        required: true,
      },
      { name: "name", label: "Airline name", kind: "text", required: true },
      { name: "isActive", label: "Active", kind: "boolean" },
    ],
  },
  airports: {
    title: "Airports",
    description: "Maintain airport codes, locations and time zones.",
    table: airports,
    search: ["iataCode", "icaoCode", "name", "city", "country"],
    canCreate: true,
    canEdit: true,
    canDeactivate: true,
    fields: [
      {
        name: "iataCode",
        label: "IATA code (3 letters)",
        kind: "text",
        required: true,
      },
      {
        name: "icaoCode",
        label: "ICAO code (4 letters)",
        kind: "text",
        required: true,
      },
      { name: "name", label: "Airport name", kind: "text", required: true },
      { name: "city", label: "City", kind: "text", required: true },
      { name: "country", label: "Country", kind: "text", required: true },
      {
        name: "timeZone",
        label: "IANA time zone",
        kind: "text",
        required: true,
        help: "Example: Asia/Kolkata",
      },
      { name: "isActive", label: "Active", kind: "boolean" },
    ],
  },
  "crew-designations": {
    title: "Crew Designations",
    description: "Manage designations available for flight crew assignments.",
    table: crewDesignations,
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
  flights: {
    title: "Flights",
    description: "Maintain scheduled flight records and operational details.",
    table: flights,
    search: ["flightNumber"],
    canCreate: true,
    canEdit: true,
    canDeactivate: true,
    fields: [
      { name: "airlineId", label: "Airline", kind: "number", required: true },
      {
        name: "flightNumber",
        label: "Flight number",
        kind: "text",
        required: true,
      },
      {
        name: "originAirportId",
        label: "Origin airport",
        kind: "number",
        required: true,
      },
      {
        name: "destinationAirportId",
        label: "Destination airport",
        kind: "number",
        required: true,
      },
      {
        name: "scheduledDeparture",
        label: "Scheduled departure (ISO date/time)",
        kind: "datetime-local",
        required: true,
      },
      {
        name: "scheduledArrival",
        label: "Scheduled arrival (ISO date/time)",
        kind: "datetime-local",
        required: true,
      },
      {
        name: "actualDeparture",
        label: "Actual departure (optional)",
        kind: "datetime-local",
      },
      {
        name: "actualArrival",
        label: "Actual arrival (optional)",
        kind: "datetime-local",
      },
      { name: "isActive", label: "Active", kind: "boolean" },
    ],
  },
};
