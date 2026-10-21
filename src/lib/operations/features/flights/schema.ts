import { z } from "zod";
import type { ListQueryParams } from "./dto";
import type {
  FlightFormDto,
  FlightListRow,
  FlightOptionDto,
  FlightOptionsResponseDto,
  FlightsListResponseDto,
  FlightMutationResponseDto,
} from "./dto";

export const listQuerySchema: z.ZodType<ListQueryParams> = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.string().trim().max(80).optional(),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

/** Runtime validator explicitly checked against the feature DTO. */
export const formSchema: z.ZodType<FlightFormDto, FlightFormDto> = z
  .object({
    airlineId: z.number().int().positive(),
    flightNumber: z.string().trim().min(1),
    originAirportId: z.number().int().positive(),
    destinationAirportId: z.number().int().positive(),
    scheduledDeparture: z.string().min(1),
    scheduledArrival: z.string().min(1),
    actualDeparture: z.string().nullable().optional(),
    actualArrival: z.string().nullable().optional(),
    isActive: z.boolean(),
  })
  .strict()
  .refine((v) => new Date(v.scheduledArrival) > new Date(v.scheduledDeparture), {
    path: ["scheduledArrival"],
    message: "Arrival must be later than departure.",
  });

const flightListRowSchema: z.ZodType<FlightListRow> = z
  .object({
    id: z.string(),
    airlineId: z.number(),
    airlineCode: z.string().nullable(),
    airlineIcaoCode: z.string().nullable(),
    airlineName: z.string().nullable(),
    flightNumber: z.string(),
    originAirportId: z.number(),
    originAirportCode: z.string().nullable(),
    originAirportName: z.string().nullable(),
    originAirportCity: z.string().nullable(),
    destinationAirportId: z.number(),
    destinationAirportCode: z.string().nullable(),
    destinationAirportName: z.string().nullable(),
    destinationAirportCity: z.string().nullable(),
    scheduledDeparture: z.string(),
    scheduledArrival: z.string(),
    actualDeparture: z.string().nullable(),
    actualArrival: z.string().nullable(),
    isActive: z.boolean(),
  })
  .strict();

const flightOptionSchema: z.ZodType<FlightOptionDto> = z
  .object({
    id: z.number(),
    name: z.string(),
    iataCode: z.string().nullable(),
    icaoCode: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
  })
  .strict();

export const flightsListResponseSchema: z.ZodType<FlightsListResponseDto> = z
  .object({
    rows: z.array(flightListRowSchema),
    pagination: z
      .object({
        page: z.number(),
        pageSize: z.number(),
        total: z.number(),
        totalPages: z.number(),
      })
      .strict(),
  })
  .strict();

export const flightOptionsResponseSchema: z.ZodType<FlightOptionsResponseDto> = z
  .object({
    options: z
      .object({
        airlines: z.array(flightOptionSchema),
        airports: z.array(flightOptionSchema),
      })
      .strict(),
  })
  .strict();

export const flightMutationResponseSchema: z.ZodType<FlightMutationResponseDto> = z
  .object({ ok: z.boolean() })
  .strict();
