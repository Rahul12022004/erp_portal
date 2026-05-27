<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { BarChart3, Trash2 } from 'lucide-svelte';

  type Survey = {
    _id: string;
    type?: 'Survey' | 'Feedback';
    title: string;
    description: string;
    recipientType: 'Teacher' | 'Student';
    questions: { prompt: string; type: 'Text' | 'Multiple Choice'; options: string[] }[];
    status: 'Active' | 'Closed';
    responseCount: number;
    createdAt: string;
  };
  type QuestionForm = { prompt: string; type: 'Text' | 'Multiple Choice'; options: string[] };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  let surveys = $state<Survey[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');
  let showForm = $state(false);
  let createType = $state<'Survey' | 'Feedback'>('Survey');
  let formData = $state({
    title: '',
    description: '',
    recipientType: 'Student' as 'Teacher' | 'Student',
    questions: [{ prompt: '', type: 'Text' as 'Text' | 'Multiple Choice', options: ['', ''] }] as QuestionForm[],
    status: 'Active' as 'Active' | 'Closed',
  });

  onMount(async () => {
    if (!schoolId) { error = 'School not found.'; loading = false; return; }
    try {
      const res = await fetch(`/api/surveys/${schoolId}`);
      if (!res.ok) throw new Error(`Failed to load surveys (${res.status})`);
      const data = await res.json();
      surveys = Array.isArray(data) ? data : [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load surveys';
      surveys = [];
    } finally { loading = false; }
  });

  function resetForm() {
    formData = { title: '', description: '', recipientType: 'Student', questions: [{ prompt: '', type: 'Text', options: ['', ''] }], status: 'Active' };
    showForm = false;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!schoolId) { alert('School not found.'); return; }
    try {
      saving = true;
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: createType,
          ...formData,
          questions: formData.questions.map(q => ({
            prompt: q.prompt.trim(),
            type: q.type,
            options: q.options.map(o => o.trim()).filter(Boolean),
          })),
          schoolId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to create survey');
      surveys = [data.data, ...surveys];
      resetForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to create ${createType.toLowerCase()}`);
    } finally { saving = false; }
  }

  function updateQuestionPrompt(index: number, value: string) {
    formData = { ...formData, questions: formData.questions.map((q, i) => i === index ? { ...q, prompt: value } : q) };
  }

  function updateQuestionType(index: number, value: 'Text' | 'Multiple Choice') {
    formData = {
      ...formData,
      questions: formData.questions.map((q, i) =>
        i === index ? { ...q, type: value, options: value === 'Multiple Choice' ? (q.options.length >= 2 ? q.options : ['', '']) : [] } : q
      ),
    };
  }

  function updateOption(qIdx: number, oIdx: number, value: string) {
    formData = {
      ...formData,
      questions: formData.questions.map((q, i) =>
        i === qIdx ? { ...q, options: q.options.map((o, j) => j === oIdx ? value : o) } : q
      ),
    };
  }

  function addOption(qIdx: number) {
    formData = { ...formData, questions: formData.questions.map((q, i) => i === qIdx ? { ...q, options: [...q.options, ''] } : q) };
  }

  function addQuestion() {
    formData = { ...formData, questions: [...formData.questions, { prompt: '', type: 'Text', options: ['', ''] }] };
  }

  function removeQuestion(index: number) {
    if (formData.questions.length === 1) return;
    formData = { ...formData, questions: formData.questions.filter((_, i) => i !== index) };
  }

  function removeOption(qIdx: number, oIdx: number) {
    formData = {
      ...formData,
      questions: formData.questions.map((q, i) =>
        i === qIdx ? { ...q, options: q.options.length <= 2 ? q.options : q.options.filter((_, j) => j !== oIdx) } : q
      ),
    };
  }

  async function updateStatus(surveyId: string, status: 'Active' | 'Closed') {
    try {
      const res = await fetch(`/api/surveys/${surveyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to update survey');
      surveys = surveys.map(s => s._id === surveyId ? { ...s, status: data.data.status } : s);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update survey');
    }
  }

  async function handleDelete(surveyId: string) {
    if (!confirm('Are you sure you want to delete this survey?')) return;
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to delete survey');
      surveys = surveys.filter(s => s._id !== surveyId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete survey');
    }
  }
</script>

<svelte:head><title>Survey — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div class="flex flex-wrap gap-2">
      <button onclick={() => { createType = 'Survey'; showForm = true; }} class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Create Survey</button>
      <button onclick={() => { createType = 'Feedback'; showForm = true; }} class="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">Create Feedback</button>
      {#if showForm}
        <button onclick={() => (showForm = false)} class="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">Close Form</button>
      {/if}
    </div>
  </div>

  {#if showForm}
    <div class="stat-card p-6">
      <h3 class="mb-4 text-lg font-semibold">Create {createType}</h3>
      <form onsubmit={handleSubmit} class="space-y-4">
        <input type="text" placeholder="Survey Title" class="w-full rounded border p-2" bind:value={formData.title} required />
        <textarea placeholder="Survey description or question" class="w-full rounded border p-2" rows={4} bind:value={formData.description} required></textarea>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <select class="w-full rounded border p-2" bind:value={formData.recipientType}>
            <option value="Student">Student</option>
            <option value="Teacher">Teacher</option>
          </select>
          <select class="w-full rounded border p-2" bind:value={formData.status}>
            <option value="Active">Active</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="font-medium">Form Questions</h4>
            <button type="button" onclick={addQuestion} class="text-sm text-blue-600 hover:text-blue-800">Add Question</button>
          </div>

          {#each formData.questions as question, index}
            <div class="space-y-3 rounded-lg border border-border p-4">
              <div class="flex gap-2">
                <input
                  type="text"
                  placeholder="Question {index + 1}"
                  class="w-full rounded border p-2"
                  value={question.prompt}
                  oninput={(e) => updateQuestionPrompt(index, (e.currentTarget as HTMLInputElement).value)}
                />
                <select
                  class="w-44 rounded border p-2"
                  value={question.type}
                  onchange={(e) => updateQuestionType(index, (e.currentTarget as HTMLSelectElement).value as 'Text' | 'Multiple Choice')}
                >
                  <option value="Text">Text</option>
                  <option value="Multiple Choice">Multiple Choice</option>
                </select>
                <button
                  type="button"
                  onclick={() => removeQuestion(index)}
                  class="rounded bg-red-100 px-3 py-2 text-red-700 disabled:opacity-50"
                  disabled={formData.questions.length === 1}
                >Remove</button>
              </div>

              {#if question.type === 'Multiple Choice'}
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-medium">Answer Options</p>
                    <button type="button" onclick={() => addOption(index)} class="text-sm text-blue-600 hover:text-blue-800">Add Option</button>
                  </div>
                  {#each question.options as option, optIdx}
                    <div class="flex gap-2">
                      <input
                        type="text"
                        placeholder="Option {optIdx + 1}"
                        class="w-full rounded border p-2"
                        value={option}
                        oninput={(e) => updateOption(index, optIdx, (e.currentTarget as HTMLInputElement).value)}
                      />
                      <button
                        type="button"
                        onclick={() => removeOption(index, optIdx)}
                        class="rounded bg-red-100 px-3 py-2 text-red-700 disabled:opacity-50"
                        disabled={question.options.length <= 2}
                      >Remove</button>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <div class="flex gap-2">
          <button type="submit" class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700" disabled={saving}>
            {saving ? 'Saving...' : `Save ${createType}`}
          </button>
          <button type="button" onclick={resetForm} class="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">Cancel</button>
        </div>
      </form>
    </div>
  {/if}

  {#if loading}
    <p class="text-center text-gray-500">Loading surveys...</p>
  {:else if error}
    <p class="text-center text-red-600">{error}</p>
  {:else if surveys.length === 0}
    <p class="text-center text-gray-500">No surveys created yet.</p>
  {:else}
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {#each surveys as survey}
        <div class="stat-card space-y-4 p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold">{survey.title}</h3>
              <p class="text-sm text-muted-foreground">{new Date(survey.createdAt).toLocaleDateString()}</p>
            </div>
            <span class="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">{survey.type || 'Survey'}</span>
            <button onclick={() => handleDelete(survey._id)} class="text-red-600 hover:text-red-800" title="Delete survey">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <div class="rounded-lg bg-muted/40 p-3">
            <p class="text-sm">{survey.description}</p>
          </div>

          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-lg bg-muted/30 p-3">
              <p class="text-xs uppercase tracking-wide text-muted-foreground">Send To</p>
              <p class="mt-1 font-medium">{survey.recipientType}</p>
            </div>
            <div class="rounded-lg bg-muted/30 p-3">
              <p class="text-xs uppercase tracking-wide text-muted-foreground">Responses</p>
              <p class="mt-1 inline-flex items-center gap-2 font-medium">
                <BarChart3 class="h-4 w-4" />{survey.responseCount}
              </p>
            </div>
          </div>

          <div class="rounded-lg bg-muted/30 p-3">
            <p class="text-xs uppercase tracking-wide text-muted-foreground">Form Questions</p>
            <div class="mt-2 space-y-1">
              {#if survey.questions.length > 0}
                {#each survey.questions as q, i}
                  <div class="space-y-1 text-sm">
                    <p>{i + 1}. {q.prompt}</p>
                    <p class="text-xs text-muted-foreground">Type: {q.type}</p>
                    {#if q.type === 'Multiple Choice' && q.options.length > 0}
                      <p class="text-xs text-muted-foreground">Options: {q.options.join(', ')}</p>
                    {/if}
                  </div>
                {/each}
              {:else}
                <p class="text-sm text-muted-foreground">No questions added.</p>
              {/if}
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span class="rounded-full px-3 py-1 text-xs font-medium {survey.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}">
              {survey.status}
            </span>
            <button
              onclick={() => updateStatus(survey._id, survey.status === 'Active' ? 'Closed' : 'Active')}
              class="text-sm text-blue-600 hover:text-blue-800"
            >
              Mark as {survey.status === 'Active' ? 'Closed' : 'Active'}
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
