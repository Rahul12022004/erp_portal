import type { User } from '$lib/types';

declare global {
  namespace App {
    interface Locals {
      user?: User;
    }
    interface PageData {
      user?: User;
    }
  }
}

export {};
