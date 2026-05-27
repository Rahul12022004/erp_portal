<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import {
    AlertTriangle, ArrowLeftRight, Box, ClipboardList,
    MinusCircle, Package, PackageCheck, PackageMinus,
    Search, ShieldAlert, Undo2,
  } from 'lucide-svelte';

  type InventoryLocation = { building?: string; room?: string; rack?: string; shelf?: string };
  type InventoryHistory = {
    actionType: string;
    quantityChange: number;
    previousStock: number;
    newStock: number;
    note?: string;
    actionDate?: string;
    locationSnapshot?: InventoryLocation;
  };
  type InventoryItem = {
    _id: string; name: string; itemCode: string; category: string; subcategory?: string;
    unitType?: string; stockCount: number; minStockLevel: number;
    condition: 'new' | 'good' | 'fair' | 'damaged'; supplier?: string; purchaseDate?: string;
    location: InventoryLocation; description?: string;
    stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
    activityHistory?: InventoryHistory[];
  };
  type ItemForm = {
    name: string; itemCode: string; category: string; subcategory: string; unitType: string;
    stockCount: string; minStockLevel: string; condition: 'new' | 'good' | 'fair' | 'damaged';
    supplier: string; purchaseDate: string; building: string; room: string;
    rack: string; shelf: string; description: string;
  };
  type StockActionType = 'add-stock' | 'issue-item' | 'return-item' | 'mark-damaged' | 'transfer-location';

  const CATEGORY_OPTIONS = ['Stationery','Lab Equipment','Furniture','Sports','IT Equipment','Electrical','Cleaning','Library','Medical','Other'];
  const UNIT_OPTIONS = ['pcs','box','set','kg','litre','meter','pack'];
  const BUILDING_OPTIONS = ['Main Block','Admin Block','Science Block','Sports Block','Hostel Block'];
  const ROOM_OPTIONS = ['Store Room 1','Store Room 2','Lab 1','Lab 2','Office 1','Office 2'];
  const RACK_OPTIONS = ['Rack A','Rack B','Rack C','Rack D','Rack E','Rack F'];
  const SHELF_OPTIONS = ['Shelf 1','Shelf 2','Shelf 3','Shelf 4','Shelf 5','Shelf 6'];

  const emptyForm: ItemForm = {
    name: '', itemCode: '', category: '', subcategory: '', unitType: 'pcs',
    stockCount: '', minStockLevel: '', condition: 'good', supplier: '',
    purchaseDate: '', building: '', room: '', rack: '', shelf: '', description: '',
  };

  function getStockStatus(item: InventoryItem): 'in_stock' | 'low_stock' | 'out_of_stock' {
    if (item.stockStatus) return item.stockStatus;
    if (Number(item.stockCount || 0) <= 0) return 'out_of_stock';
    if (Number(item.stockCount || 0) <= Number(item.minStockLevel || 0)) return 'low_stock';
    return 'in_stock';
  }

  function formatLocation(location?: InventoryLocation) {
    if (!location) return '-';
    const values = [location.building, location.room, location.rack, location.shelf].filter(Boolean);
    return values.length ? values.join(' / ') : '-';
  }

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  let items = $state<InventoryItem[]>([]);
  let formData = $state<ItemForm>({ ...emptyForm });
  let editingItemId = $state<string | null>(null);
  let search = $state('');
  let categoryFilter = $state('');
  let statusFilter = $state('');
  let activeItemId = $state<string | null>(null);
  let actionType = $state<StockActionType>('add-stock');
  let actionQuantity = $state('1');
  let actionNote = $state('');
  let transferBuilding = $state('');
  let transferRoom = $state('');
  let transferRack = $state('');
  let transferShelf = $state('');
  let historyItemId = $state<string | null>(null);
  let loading = $state(true);
  let saving = $state(false);
  let performingAction = $state(false);
  let error = $state('');

  const selectedActionItem = $derived(items.find(i => i._id === activeItemId) ?? null);

  const filteredItems = $derived(
    items.filter(item => {
      const status = getStockStatus(item);
      const matchesSearch = !search.trim() ||
        `${item.name} ${item.itemCode} ${item.category} ${item.subcategory ?? ''} ${item.supplier ?? ''}`
          .toLowerCase().includes(search.trim().toLowerCase());
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      const matchesStatus = !statusFilter || status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    })
  );

  const stats = $derived({
    totalItems: items.length,
    totalStockUnits: items.reduce((sum, i) => sum + Number(i.stockCount || 0), 0),
    lowStockItems: items.filter(i => getStockStatus(i) === 'low_stock').length,
    outOfStockItems: items.filter(i => getStockStatus(i) === 'out_of_stock').length,
  });

  const alerts = $derived({
    lowStock: items.filter(i => getStockStatus(i) === 'low_stock'),
    outOfStock: items.filter(i => getStockStatus(i) === 'out_of_stock'),
  });

  async function fetchInventory() {
    if (!schoolId) { error = 'School not found.'; loading = false; return; }
    try {
      loading = true; error = '';
      const res = await fetch(`/api/inventory/${schoolId}`);
      if (!res.ok) throw new Error(`Failed to load inventory (${res.status})`);
      const data = await res.json();
      items = Array.isArray(data.items) ? data.items : [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load inventory';
      items = [];
    } finally { loading = false; }
  }

  onMount(() => { fetchInventory(); });

  function resetForm() { formData = { ...emptyForm }; editingItemId = null; }

  function startEdit(item: InventoryItem) {
    editingItemId = item._id;
    formData = {
      name: item.name, itemCode: item.itemCode, category: item.category,
      subcategory: item.subcategory ?? '', unitType: item.unitType ?? 'pcs',
      stockCount: String(item.stockCount), minStockLevel: String(item.minStockLevel || 0),
      condition: item.condition ?? 'good', supplier: item.supplier ?? '',
      purchaseDate: item.purchaseDate ?? '', building: item.location?.building ?? '',
      room: item.location?.room ?? '', rack: item.location?.rack ?? '',
      shelf: item.location?.shelf ?? '', description: item.description ?? '',
    };
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!schoolId) { error = 'School not found.'; return; }
    const stockCount = Number(formData.stockCount || 0);
    const minStockLevel = Number(formData.minStockLevel || 0);
    if (!Number.isFinite(stockCount) || stockCount < 0) { error = 'Stock count must be >= 0.'; return; }
    if (!Number.isFinite(minStockLevel) || minStockLevel < 0) { error = 'Min stock level must be >= 0.'; return; }
    try {
      saving = true; error = '';
      const payload = {
        name: formData.name, itemCode: formData.itemCode, category: formData.category,
        subcategory: formData.subcategory, unitType: formData.unitType,
        stockCount, minStockLevel, condition: formData.condition, supplier: formData.supplier,
        purchaseDate: formData.purchaseDate, description: formData.description, schoolId,
        location: { building: formData.building, room: formData.room, rack: formData.rack, shelf: formData.shelf },
      };
      const url = editingItemId ? `/api/inventory/${editingItemId}` : '/api/inventory';
      const method = editingItemId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save inventory item');
      resetForm();
      await fetchInventory();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save inventory item';
    } finally { saving = false; }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this inventory item?')) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to delete inventory item');
      if (editingItemId === id) resetForm();
      if (activeItemId === id) activeItemId = null;
      if (historyItemId === id) historyItemId = null;
      await fetchInventory();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete inventory item';
    }
  }

  function openActionPanel(item: InventoryItem, nextAction: StockActionType) {
    activeItemId = item._id;
    actionType = nextAction;
    actionQuantity = '1';
    actionNote = '';
    transferBuilding = item.location?.building ?? '';
    transferRoom = item.location?.room ?? '';
    transferRack = item.location?.rack ?? '';
    transferShelf = item.location?.shelf ?? '';
  }

  async function performStockAction() {
    if (!selectedActionItem) return;
    try {
      performingAction = true; error = '';
      const endpoint = `/api/inventory/${selectedActionItem._id}/${actionType}`;
      const payload = actionType === 'transfer-location'
        ? { location: { building: transferBuilding, room: transferRoom, rack: transferRack, shelf: transferShelf }, note: actionNote }
        : { quantity: Number(actionQuantity || 0), note: actionNote };
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to perform action');
      actionNote = ''; actionQuantity = '1';
      await fetchInventory();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to perform inventory action';
    } finally { performingAction = false; }
  }
</script>

<svelte:head><title>Inventory — ERP Portal</title></svelte:head>

<div class="space-y-6">
  {#if error}
    <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
  {/if}

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p class="text-sm font-medium text-slate-500">Total Items</p>
      <p class="mt-2 text-3xl font-semibold text-slate-900">{stats.totalItems}</p>
    </div>
    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p class="text-sm font-medium text-slate-500">Total Stock Units</p>
      <p class="mt-2 text-3xl font-semibold text-blue-700">{stats.totalStockUnits}</p>
    </div>
    <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <p class="text-sm font-medium text-amber-700">Low Stock Alerts</p>
      <p class="mt-2 text-3xl font-semibold text-amber-700">{stats.lowStockItems}</p>
    </div>
    <div class="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
      <p class="text-sm font-medium text-rose-700">Out of Stock</p>
      <p class="mt-2 text-3xl font-semibold text-rose-700">{stats.outOfStockItems}</p>
    </div>
  </div>

  {#if alerts.lowStock.length > 0 || alerts.outOfStock.length > 0}
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div class="mb-2 flex items-center gap-2 text-amber-700">
          <AlertTriangle class="h-4 w-4" />
          <p class="text-sm font-semibold">Low Stock Alert</p>
        </div>
        <div class="space-y-1 text-sm text-amber-800">
          {#each alerts.lowStock.slice(0, 5) as item}
            <p>{item.name} ({item.itemCode}) - {item.stockCount} left</p>
          {/each}
        </div>
      </div>
      <div class="rounded-2xl border border-rose-200 bg-rose-50 p-4">
        <div class="mb-2 flex items-center gap-2 text-rose-700">
          <ShieldAlert class="h-4 w-4" />
          <p class="text-sm font-semibold">Out of Stock Alert</p>
        </div>
        <div class="space-y-1 text-sm text-rose-800">
          {#each alerts.outOfStock.slice(0, 5) as item}
            <p>{item.name} ({item.itemCode})</p>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div class="mb-4 flex items-center gap-2">
      <Package class="h-5 w-5 text-teal-600" />
      <h3 class="text-lg font-semibold text-slate-900">{editingItemId ? 'Edit Inventory Item' : 'Add Inventory Item'}</h3>
    </div>

    <form onsubmit={handleSubmit} class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <input type="text" placeholder="Item Name" class="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" bind:value={formData.name} required />
        <input type="text" placeholder="Item Code" class="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" bind:value={formData.itemCode} required />
        <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" bind:value={formData.category} required>
          <option value="">Category</option>
          {#each CATEGORY_OPTIONS as cat}<option value={cat}>{cat}</option>{/each}
        </select>
        <input type="text" placeholder="Subcategory" class="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" bind:value={formData.subcategory} />

        <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" bind:value={formData.unitType}>
          {#each UNIT_OPTIONS as u}<option value={u}>{u}</option>{/each}
        </select>
        <input type="number" min="0" placeholder="Stock Count" class="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" bind:value={formData.stockCount} required />
        <input type="number" min="0" placeholder="Minimum Stock Level" class="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" bind:value={formData.minStockLevel} required />
        <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" bind:value={formData.condition}>
          <option value="new">New</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="damaged">Damaged</option>
        </select>

        <input type="text" placeholder="Supplier" class="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" bind:value={formData.supplier} />
        <input type="date" class="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" bind:value={formData.purchaseDate} />

        <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" bind:value={formData.building} required>
          <option value="">Building</option>
          {#each BUILDING_OPTIONS as b}<option value={b}>{b}</option>{/each}
        </select>
        <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" bind:value={formData.room} required>
          <option value="">Room</option>
          {#each ROOM_OPTIONS as r}<option value={r}>{r}</option>{/each}
        </select>
        <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" bind:value={formData.rack} required>
          <option value="">Rack</option>
          {#each RACK_OPTIONS as r}<option value={r}>{r}</option>{/each}
        </select>
        <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" bind:value={formData.shelf} required>
          <option value="">Shelf</option>
          {#each SHELF_OPTIONS as s}<option value={s}>{s}</option>{/each}
        </select>
      </div>

      <textarea placeholder="Description" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" rows={3} bind:value={formData.description}></textarea>

      <div class="flex gap-2">
        <button type="submit" disabled={saving} class="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
          {saving ? 'Saving...' : editingItemId ? 'Update Item' : 'Add Item'}
        </button>
        <button type="button" onclick={resetForm} class="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Clear</button>
      </div>
    </form>
  </div>

  <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-center gap-2">
        <ClipboardList class="h-5 w-5 text-blue-600" />
        <h3 class="text-lg font-semibold text-slate-900">Inventory Items</h3>
      </div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search items..." class="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none" bind:value={search} />
        </div>
        <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" bind:value={categoryFilter}>
          <option value="">All Categories</option>
          {#each CATEGORY_OPTIONS as cat}<option value={cat}>{cat}</option>{/each}
        </select>
        <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" bind:value={statusFilter}>
          <option value="">All Status</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>
    </div>

    {#if loading}
      <p class="text-sm text-slate-500">Loading inventory...</p>
    {:else if filteredItems.length === 0}
      <p class="text-sm text-slate-500">No inventory items found.</p>
    {:else}
      <div class="space-y-3">
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th class="px-3 py-2">Item</th>
                <th class="px-3 py-2">Code</th>
                <th class="px-3 py-2">Category</th>
                <th class="px-3 py-2">Stock</th>
                <th class="px-3 py-2">Min</th>
                <th class="px-3 py-2">Location</th>
                <th class="px-3 py-2">Status</th>
                <th class="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredItems as item}
                {@const status = getStockStatus(item)}
                <tr class="border-b border-slate-100 text-slate-700">
                  <td class="px-3 py-3">
                    <p class="font-semibold text-slate-900">{item.name}</p>
                    <p class="text-xs text-slate-500">{item.subcategory || '-'}</p>
                  </td>
                  <td class="px-3 py-3 font-medium text-blue-700">{item.itemCode}</td>
                  <td class="px-3 py-3">
                    <span class="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{item.category}</span>
                  </td>
                  <td class="px-3 py-3">{item.stockCount} {item.unitType || 'pcs'}</td>
                  <td class="px-3 py-3">{item.minStockLevel}</td>
                  <td class="px-3 py-3">{formatLocation(item.location)}</td>
                  <td class="px-3 py-3">
                    <span class="rounded-full px-2 py-1 text-xs font-semibold {status === 'in_stock' ? 'bg-emerald-100 text-emerald-700' : status === 'low_stock' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}">
                      {status.replace('_', ' ')}
                    </span>
                  </td>
                  <td class="px-3 py-3">
                    <div class="flex flex-wrap gap-2">
                      <button onclick={() => openActionPanel(item, 'add-stock')} class="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700" title="Add Stock"><PackageCheck class="h-3.5 w-3.5" /></button>
                      <button onclick={() => openActionPanel(item, 'issue-item')} class="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700" title="Issue Item"><PackageMinus class="h-3.5 w-3.5" /></button>
                      <button onclick={() => openActionPanel(item, 'return-item')} class="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs text-cyan-700" title="Return Item"><Undo2 class="h-3.5 w-3.5" /></button>
                      <button onclick={() => openActionPanel(item, 'mark-damaged')} class="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700" title="Mark Damaged"><MinusCircle class="h-3.5 w-3.5" /></button>
                      <button onclick={() => openActionPanel(item, 'transfer-location')} class="rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs text-violet-700" title="Transfer Location"><ArrowLeftRight class="h-3.5 w-3.5" /></button>
                      <button onclick={() => startEdit(item)} class="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">Edit</button>
                      <button onclick={() => handleDelete(item._id)} class="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">Delete</button>
                      <button onclick={() => { historyItemId = historyItemId === item._id ? null : item._id; }} class="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">History</button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        {#if selectedActionItem}
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div class="mb-3 flex items-center justify-between">
              <p class="font-semibold text-slate-900">Action: {actionType.replace('-', ' ')} ({selectedActionItem.name})</p>
              <button onclick={() => (activeItemId = null)} class="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700">Close</button>
            </div>

            {#if actionType === 'transfer-location'}
              <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={transferBuilding}>
                  <option value="">Building</option>
                  {#each BUILDING_OPTIONS as b}<option value={b}>{b}</option>{/each}
                </select>
                <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={transferRoom}>
                  <option value="">Room</option>
                  {#each ROOM_OPTIONS as r}<option value={r}>{r}</option>{/each}
                </select>
                <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={transferRack}>
                  <option value="">Rack</option>
                  {#each RACK_OPTIONS as r}<option value={r}>{r}</option>{/each}
                </select>
                <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={transferShelf}>
                  <option value="">Shelf</option>
                  {#each SHELF_OPTIONS as s}<option value={s}>{s}</option>{/each}
                </select>
              </div>
            {:else}
              <input type="number" min="1" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={actionQuantity} placeholder="Quantity" />
            {/if}

            <textarea class="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" rows={2} bind:value={actionNote} placeholder="Add note"></textarea>

            <button onclick={performStockAction} disabled={performingAction} class="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {performingAction ? 'Processing...' : 'Apply Action'}
            </button>
          </div>
        {/if}

        {#if historyItemId}
          {@const historyItem = items.find(i => i._id === historyItemId)}
          {#if historyItem}
            <div class="rounded-2xl border border-slate-200 bg-white p-4">
              <div class="mb-3 flex items-center gap-2">
                <Box class="h-4 w-4 text-slate-600" />
                <p class="font-semibold text-slate-900">Item Activity History</p>
              </div>
              <div class="space-y-2">
                {#each (historyItem.activityHistory ?? []).slice().reverse() as history, idx}
                  <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="font-semibold text-slate-800">{history.actionType.replace(/_/g, ' ')}</p>
                      <p class="text-xs text-slate-500">{history.actionDate ? new Date(history.actionDate).toLocaleString() : '-'}</p>
                    </div>
                    <p class="mt-1 text-slate-700">Stock: {history.previousStock} → {history.newStock} ({history.quantityChange >= 0 ? '+' : ''}{history.quantityChange})</p>
                    <p class="mt-1 text-slate-600">{history.note || '-'}</p>
                    <p class="mt-1 text-xs text-slate-500">Location: {formatLocation(history.locationSnapshot)}</p>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/if}
      </div>
    {/if}
  </div>
</div>
