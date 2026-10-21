import type {
  FlightOperationsSettingsCreateDto,
  FlightOperationsSettingsUpdateDto,
  FlightOperationsSettingsResponseDto,
} from "./dto";

export interface FlightOperationsSettingsRepository {
  listWithMetadata(): {
    rows: unknown[];
    options: Record<string, { value: string | number; label: string }[]>;
    displayColumns?: string[];
  };
  create(input: FlightOperationsSettingsCreateDto): string;
  update(id: string, input: FlightOperationsSettingsUpdateDto): boolean;
}
