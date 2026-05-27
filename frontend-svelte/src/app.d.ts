import type { User } from '$lib/types';

declare global {
  namespace App {
    interface Locals {
      user?: User;
      token?: string;
    }
    interface PageData {
      user?: User;
      token?: string | null;
    }
  }
}

export {};
