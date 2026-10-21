/** Request and response contracts for Flight Operations settings. */
export type FlightOperationsSettingsCreateDto = {
  setting_key: string;
  value_json: string;
  description?: string | null;
};
export type FlightOperationsSettingsUpdateDto = Partial<{
  setting_key: string;
  value_json: string;
  description: string | null;
}>;
export type FlightOperationsSettingsResponseDto = {
  id: number | string;
  setting_key: string;
  value_json: string;
  description: string | null;
  updated_at: string | null;
  setting: string;
  setting_description: string | null;
};
export type FlightOperationsSettingsCollectionResponseDto = {
  resource: "flight-operations-settings";
  label: string;
  writable: boolean;
  columns: readonly string[];
  displayColumns: string[];
  rows: FlightOperationsSettingsResponseDto[];
  options: Record<string, { value: string | number; label: string }[]>;
};
export type FlightOperationsSettingsMutationResponseDto = {
  ok: true;
  id?: string;
};
