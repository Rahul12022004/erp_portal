import { writable } from 'svelte/store';

export type SchoolStoreData = {
  name: string;
  logo: string;
  adminPhoto: string;
  modules: string[];
  subscriptionPlan: string;
  loaded: boolean;
};

export const schoolStore = writable<SchoolStoreData>({
  name: '',
  logo: '',
  adminPhoto: '',
  modules: [],
  subscriptionPlan: '',
  loaded: false,
});
