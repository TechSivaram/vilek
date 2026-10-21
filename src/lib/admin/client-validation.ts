import { z } from "zod";
import type { AdminField } from "@/lib/admin/resources";

const datetimeLocal = z
  .string()
  .refine(
    (value) =>
      value === "" ||
      (!Number.isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)),
    "Enter a valid date and time.",
  );

export function makeFormSchema(fields: AdminField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    if (field.readOnly) continue;
    let schema: z.ZodTypeAny;
    if (field.kind === "boolean") {
      schema = z.boolean();
    } else if (field.kind === "number") {
      if (["airlineId", "originAirportId", "destinationAirportId", "userId"].includes(field.name)) {
        schema = z.preprocess(
          (value) =>
            value === "" || value === undefined
              ? undefined
              : typeof value === "string"
                ? Number(value)
                : value,
          z
            .number({ error: `${field.label} is required` })
            .int(`${field.label} must be selected`)
            .positive(`${field.label} must be selected`),
        );
      } else if (field.name === "minorUnits") {
        schema = z.preprocess(
          (value) =>
            value === "" || value === undefined
              ? undefined
              : typeof value === "string"
                ? Number(value)
                : value,
          z
            .number({ error: `${field.label} is required` })
            .int("Minor units must be a whole number")
            .min(0, "Minor units cannot be negative")
            .max(4, "Minor units cannot exceed 4"),
        );
      } else {
        schema = z.preprocess(
          (value) =>
            value === "" || value === undefined
              ? undefined
              : typeof value === "string"
                ? Number(value)
                : value,
          field.required
            ? z
                .number({ error: `${field.label} is required` })
                .finite(`${field.label} must be a valid number`)
            : z.number().finite().optional(),
        );
      }
    } else if (field.kind === "email") {
      schema = z.string().trim().email("Enter a valid email address.");
    } else if (field.kind === "datetime-local") {
      schema = field.required
        ? z.string().trim().min(1, `${field.label} is required`).pipe(datetimeLocal)
        : z.union([z.literal(""), datetimeLocal]).optional();
    } else {
      schema = z.string().trim();
      if (field.required) schema = (schema as z.ZodString).min(1, `${field.label} is required`);
      if (field.name === "flightNumber") {
        schema = (schema as z.ZodString)
          .min(3, "Enter a valid flight number, e.g. AI 543.")
          .max(8, "Flight number is too long.")
          .regex(
            /^[A-Z0-9]{2,3}\s?\d{1,4}[A-Z]?$/i,
            "Use an airline code followed by a flight number, e.g. AI 543 or 6E 6214.",
          );
      }
      if (field.name === "iataCode") {
        schema = (schema as z.ZodString).regex(
          /^[A-Z]{2,3}$/i,
          "Enter a valid IATA code (2 letters for airlines, 3 for airports).",
        );
      }
      if (field.name === "icaoCode") {
        schema = (schema as z.ZodString).regex(
          /^[A-Z]{3,4}$/i,
          "Enter a valid ICAO code (3 letters for airlines, 4 for airports).",
        );
      }
      if (field.name === "timeZone") {
        schema = (schema as z.ZodString).refine((v) => {
          try {
            new Intl.DateTimeFormat("en-US", { timeZone: v });
            return true;
          } catch {
            return false;
          }
        }, "Enter a valid IANA time zone, e.g. Asia/Kolkata.");
      }
      if (!field.required) schema = schema.optional();
    }
    shape[field.name] = schema;
  }

  const result = z.object(shape);
  if (
    fields.some((f) => f.name === "scheduledDeparture") &&
    fields.some((f) => f.name === "scheduledArrival")
  ) {
    return result.superRefine((values, ctx) => {
      const data = values as Record<string, unknown>;
      const checkPair = (startName: string, endName: string, label: string) => {
        const start = data[startName];
        const end = data[endName];
        if (
          typeof start === "string" &&
          start &&
          typeof end === "string" &&
          end &&
          Date.parse(start) >= Date.parse(end)
        ) {
          ctx.addIssue({
            code: "custom",
            path: [endName],
            message: `${label} must be later than ${startName === "scheduledDeparture" ? "scheduled departure" : "actual departure"}.`,
          });
        }
      };
      if (
        data.originAirportId != null &&
        data.destinationAirportId != null &&
        String(data.originAirportId) === String(data.destinationAirportId)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["destinationAirportId"],
          message: "Origin and destination airports must be different.",
        });
      }
      checkPair("scheduledDeparture", "scheduledArrival", "Scheduled arrival");
      checkPair("actualDeparture", "actualArrival", "Actual arrival");
    });
  }
  return result;
}
