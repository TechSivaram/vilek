import "server-only";
import { system_settingsRepository } from "./repository";
export const system_settingsService = {
  get() {
    return system_settingsRepository.get();
  },
  currencyOptions() {
    return system_settingsRepository.currencyOptions();
  },
  currencyExists(id: number) {
    return system_settingsRepository.currencyExists(id);
  },
  save(currencyId: number, size: number) {
    return system_settingsRepository.save(currencyId, size);
  },
};
