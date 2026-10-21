import type {
  CrewComplementDefaultsCreateDto,
  CrewComplementDefaultsUpdateDto,
  CrewComplementDefaultsResponseDto,
} from "./dto";

export interface CrewComplementDefaultsRepository {
  list(): {
    rows: CrewComplementDefaultsResponseDto[];
    options: Record<string, { value: string | number; label: string }[]>;
  };
  create(input: CrewComplementDefaultsCreateDto): string;
  update(id: string, input: CrewComplementDefaultsUpdateDto): boolean;
}
