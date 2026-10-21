import type {
  AuditRetentionPolicyCreateDto,
  AuditRetentionPolicyUpdateDto,
  AuditRetentionPolicyResponseDto,
} from "./dto";

export interface AuditRetentionPolicyRepository {
  listWithMetadata(): {
    rows: unknown[];
    options: Record<string, { value: string | number; label: string }[]>;
    displayColumns?: string[];
  };
  create(input: AuditRetentionPolicyCreateDto): string;
  update(id: string, input: AuditRetentionPolicyUpdateDto): boolean;
}
