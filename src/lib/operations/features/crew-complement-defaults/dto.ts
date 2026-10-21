/** Stable response contract for crew-complement-default maintenance rows. */
export type CrewComplementDefaultsCreateDto = {
  designation_id: number;
  required_count: number;
};
export type CrewComplementDefaultsUpdateDto =
  Partial<CrewComplementDefaultsCreateDto>;
export type CrewComplementDefaultsResponseDto = {
  id: number | string;
  designation_id: number | string;
  required_count: number;
  created_at?: string | null;
  updated_at?: string | null;
  designation_name?: string | null;
};
