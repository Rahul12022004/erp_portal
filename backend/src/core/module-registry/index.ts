export interface ModuleManifest {
  name: string;
  version: string;
  routes?: string;
  dependencies?: string[];
}

class ModuleRegistry {
  private readonly modules = new Map<string, ModuleManifest>();

  register(manifest: ModuleManifest): void {
    this.modules.set(manifest.name, manifest);
  }

  get(name: string): ModuleManifest | undefined {
    return this.modules.get(name);
  }

  list(): ModuleManifest[] {
    return Array.from(this.modules.values());
  }
}

export const moduleRegistry = new ModuleRegistry();
