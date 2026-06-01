<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { MapPin, Lock, Unlock, Navigation, ChevronDown } from 'lucide-svelte';
  import type { Map, Marker, Circle } from 'leaflet';
  import { api } from '$lib/api/client';

  let { schoolId }: { schoolId: string } = $props();

  let open = $state(true);
  let latitude = $state('');
  let longitude = $state('');
  let radius = $state('200');
  let locked = $state(false);
  let saving = $state(false);
  let message = $state('');
  let mapDiv = $state<HTMLDivElement | undefined>();

  let mapInstance: Map | null = null;
  let marker: Marker | null = null;
  let circle: Circle | null = null;
  let mapReady = $state(false);
  let geofenceLoaded = $state(false);

  onMount(async () => {
    await fetchGeofence();
    geofenceLoaded = true;   // triggers $effect below only after coords are set
  });

  onDestroy(() => {
    mapInstance?.remove();
    mapInstance = null;
  });

  // Init map only after geofence coords are fetched — avoids India fallback flash
  $effect(() => {
    if (!open || !mapDiv || !geofenceLoaded || mapReady) return;
    initMap();
  });

  // Update marker/circle reactively when coords change.
  // `void mapReady` makes Svelte track it — effect re-fires when map finishes init.
  $effect(() => {
    void mapReady;
    if (!mapInstance || !marker || !circle) return;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseFloat(radius) || 200;
    if (!isFinite(lat) || !isFinite(lng)) return;
    marker.setLatLng([lat, lng]);
    circle.setLatLng([lat, lng]);
    circle.setRadius(rad);
    mapInstance.setView([lat, lng], 15);
  });

  async function initMap() {
    const L = (await import('leaflet')).default;

    // Fix bundler icon path issue
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const lat = parseFloat(latitude) || 20.5937;
    const lng = parseFloat(longitude) || 78.9629;
    const zoom = latitude ? 15 : 5;
    const rad = parseFloat(radius) || 200;

    mapInstance = L.map(mapDiv!).setView([lat, lng], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapInstance);

    marker = L.marker([lat, lng], { draggable: !locked }).addTo(mapInstance);
    circle = L.circle([lat, lng], {
      radius: rad,
      color: '#0b9e71',
      fillColor: '#0b9e71',
      fillOpacity: 0.12,
      weight: 2,
    }).addTo(mapInstance);

    // Click to set location and auto-save
    mapInstance.on('click', async (e) => {
      if (locked) return;
      latitude = String(e.latlng.lat.toFixed(6));
      longitude = String(e.latlng.lng.toFixed(6));
      await saveGeofence();
    });

    // Drag marker to set location and auto-save
    marker.on('dragend', async () => {
      const pos = marker!.getLatLng();
      latitude = String(pos.lat.toFixed(6));
      longitude = String(pos.lng.toFixed(6));
      await saveGeofence();
    });

    mapReady = true;
  }

  async function fetchGeofence() {
    if (!schoolId) return;
    try {
      const raw = await api.get<{ success: boolean; data: { schoolInfo?: { location?: { latitude?: number; longitude?: number; radius?: number; radiusMeters?: number; locked?: boolean } } } }>(`/api/schools/${schoolId}`);
      const loc = (raw as any)?.data?.schoolInfo?.location ?? (raw as any)?.schoolInfo?.location;
      if (!loc) return;
      if (typeof loc.latitude === 'number') latitude = String(loc.latitude);
      if (typeof loc.longitude === 'number') longitude = String(loc.longitude);
      const r = loc.radius ?? loc.radiusMeters;
      if (typeof r === 'number' && r > 0) radius = String(r);
      locked = Boolean(loc.locked);
    } catch (e) {
      console.error('Geofence fetch error:', e);
    }
  }

  async function useGPS() {
    if (!navigator.geolocation) { message = 'Geolocation not supported by your browser.'; return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        latitude = String(pos.coords.latitude.toFixed(6));
        longitude = String(pos.coords.longitude.toFixed(6));
        if (mapInstance) mapInstance.setView([pos.coords.latitude, pos.coords.longitude], 15);
        await saveGeofence();
      },
      () => { message = 'Could not get your location. Check browser permissions.'; }
    );
  }

  async function saveGeofence() {
    const lat = Number(latitude);
    const lng = Number(longitude);
    const rad = Number(radius);
    if (!isFinite(lat) || !isFinite(lng)) { message = 'Enter valid latitude and longitude.'; return; }
    if (!isFinite(rad) || rad <= 0) { message = 'Enter a valid radius (> 0 meters).'; return; }
    if (locked) { message = 'Unlock the geofence before saving changes.'; return; }
    try {
      saving = true; message = '';
      await api.put(`/api/schools/${schoolId}/location`, { latitude: lat, longitude: lng, radiusMeters: rad });
      message = 'Geofence saved successfully.';
    } catch (e) {
      message = e instanceof Error ? e.message : 'Failed to save geofence';
    } finally { saving = false; }
  }

  async function toggleLock() {
    try {
      saving = true; message = '';
      await api.patch(`/api/schools/${schoolId}/location-lock`, { locked: !locked });
      locked = !locked;
      if (marker) marker.options.draggable = !locked;
      message = locked ? 'Geofence locked in place.' : 'Geofence unlocked. You can edit values now.';
    } catch (e) {
      message = e instanceof Error ? e.message : 'Failed to update lock';
    } finally { saving = false; }
  }
</script>

<svelte:head>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div class="isolate rounded-xl border border-border bg-card shadow-sm">
  <!-- Collapsible header -->
  <button
    type="button"
    onclick={() => (open = !open)}
    class="flex w-full items-center justify-between px-5 py-4 text-left"
  >
    <div class="flex items-center gap-2">
      <MapPin class="h-4 w-4 text-primary" />
      <span class="font-display text-base font-semibold text-foreground">School Geofence</span>
      <span class="hidden text-xs text-muted-foreground sm:inline">
        — Teachers outside this zone will be flagged
      </span>
    </div>
    <div class="flex items-center gap-2">
      <span class={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        locked ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
      }`}>
        {locked ? 'Locked' : 'Editable'}
      </span>
      <ChevronDown class={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
    </div>
  </button>

  {#if open}
    <div class="border-t border-border px-5 pb-5 pt-4">
      <div class="flex gap-4">

        <!-- Map (left, takes remaining width) -->
        <div class="min-w-0 flex-1">
          <div bind:this={mapDiv} class="h-96 w-full overflow-hidden rounded-xl border border-border"></div>
          <p class="mt-2 text-xs text-muted-foreground">
            Click map or drag the pin to set location. The green circle shows the geofence radius.
          </p>
        </div>

        <!-- Controls panel (right, fixed width) -->
        <div class="flex w-56 shrink-0 flex-col gap-4">

          <!-- Radius input -->
          <div>
            <label for="geo-radius" class="mb-1.5 block text-xs font-medium text-foreground">Radius (meters)</label>
            <input
              id="geo-radius"
              type="number" min={10}
              value={radius}
              oninput={(e) => (radius = (e.currentTarget as HTMLInputElement).value)}
              onchange={saveGeofence}
              disabled={locked || saving}
              placeholder="200"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <!-- GPS button -->
          <button
            type="button"
            onclick={useGPS}
            disabled={locked || saving}
            class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-border disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Navigation class="h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Use My Location'}
          </button>

          <!-- Lock/Unlock button -->
          <button
            type="button"
            onclick={toggleLock}
            disabled={saving}
            class={`flex w-full items-center justify-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${
              locked ? 'bg-yellow-500' : 'bg-green-600'
            }`}
          >
            {#if locked}
              <Unlock class="h-3.5 w-3.5" />
            {:else}
              <Lock class="h-3.5 w-3.5" />
            {/if}
            {locked ? 'Unlock Geofence' : 'Lock Geofence'}
          </button>

          {#if message}
            <p class={`text-sm ${message.includes('ailed') || message.includes('valid') || message.includes('ould') ? 'text-red-600' : 'text-primary'}`}>
              {message}
            </p>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
