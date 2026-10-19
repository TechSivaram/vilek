import "server-only";
import { identity_providerRepository } from "./repository";
import type { IdentityProviderListQuery } from "./dto";
export const identity_providerService = {
  list(query: IdentityProviderListQuery) {
    return identity_providerRepository.list(query);
  },
};
