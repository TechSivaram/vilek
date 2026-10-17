import { z } from "zod";
import { resourceConfigs } from "@/lib/admin/resources";
export type PayloadResult =
  { ok: true; values: Record<string, unknown> } | { ok: false; error: string };
export function validateResourcePayload(
  resource: string,
  body: unknown,
  mode: "create" | "update",
): PayloadResult {
  const config = resourceConfigs[resource];
  if (!config) return { ok: false, error: "Unknown admin resource." };
  if (!body || typeof body !== "object" || Array.isArray(body))
    return { ok: false, error: "Expected a JSON object." };
  const objectResult = z.record(z.string(), z.unknown()).safeParse(body);
  if (!objectResult.success)
    return { ok: false, error: "Expected a JSON object." };
  const input = objectResult.data;
  const values: Record<string, unknown> = {};
  for (const field of config.fields) {
    if (field.readOnly || (mode === "update" && !(field.name in input)))
      continue;
    let value = input[field.name];
    if (typeof value === "string") value = value.trim();
    if (field.kind === "boolean")
      value = value === true || value === 1 || value === "true";
    if (
      field.kind === "number" &&
      value !== "" &&
      value !== null &&
      value !== undefined
    )
      value = Number(value);
    if ((value === "" || value === undefined) && !field.required) continue;
    if (
      field.required &&
      (value === "" || value === null || value === undefined)
    )
      return { ok: false, error: `${field.label} is required.` };
    if (value !== undefined && value !== null) {
      const fieldSchema =
        field.kind === "number"
          ? z.number().finite()
          : field.kind === "boolean"
            ? z.boolean()
            : z.string();
      const checked = fieldSchema.safeParse(value);
      if (!checked.success)
        return {
          ok: false,
          error:
            field.kind === "number"
              ? `${field.label} must be a number.`
              : `${field.label} has an invalid value.`,
        };
      value = checked.data;
    }
    values[field.name] = value;
  }
  if (mode === "update" && !Object.keys(values).length)
    return { ok: false, error: "No editable fields supplied." };
  if (resource === "flights") {
    const idFields = [
      "airlineId",
      "originAirportId",
      "destinationAirportId",
    ] as const;
    for (const name of idFields) {
      if (!(name in values)) continue;
      const value = values[name];
      if (
        typeof value !== "number" ||
        !Number.isSafeInteger(value) ||
        value <= 0
      ) {
        const label =
          config.fields.find((field) => field.name === name)?.label ?? name;
        return { ok: false, error: `${label} must be selected.` };
      }
    }
    if (
      typeof values.flightNumber === "string" &&
      !/^[A-Z0-9]{2,3}\s?\d{1,4}[A-Z]?$/i.test(values.flightNumber)
    ) {
      return {
        ok: false,
        error: "Enter a valid flight number, e.g. AI 543 or 6E 6214.",
      };
    }
    if (
      "originAirportId" in values &&
      "destinationAirportId" in values &&
      values.originAirportId === values.destinationAirportId
    ) {
      return {
        ok: false,
        error: "Origin and destination airports must be different.",
      };
    }
    const validateDate = (name: string, label: string): number | null => {
      if (!(name in values)) return null;
      const value = values[name];
      if (typeof value !== "string" || !value.trim()) return null;
      const timestamp = Date.parse(value);
      if (!Number.isFinite(timestamp))
        throw new Error(`${label} must be a valid date and time.`);
      return timestamp;
    };
    try {
      const scheduledDeparture = validateDate(
        "scheduledDeparture",
        "Scheduled departure",
      );
      const scheduledArrival = validateDate(
        "scheduledArrival",
        "Scheduled arrival",
      );
      const actualDeparture = validateDate(
        "actualDeparture",
        "Actual departure",
      );
      const actualArrival = validateDate("actualArrival", "Actual arrival");
      if (
        scheduledDeparture !== null &&
        scheduledArrival !== null &&
        scheduledDeparture >= scheduledArrival
      ) {
        return {
          ok: false,
          error: "Scheduled arrival must be later than scheduled departure.",
        };
      }
      if (
        actualDeparture !== null &&
        actualArrival !== null &&
        actualDeparture >= actualArrival
      ) {
        return {
          ok: false,
          error: "Actual arrival must be later than actual departure.",
        };
      }
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Enter valid date and time values.",
      };
    }
  }
  return { ok: true, values };
}
