import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the api client BEFORE importing the service.
vi.mock('$lib/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const { api } = await import('$lib/api/client');
const { studentsService } = await import('./index');

beforeEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  vi.mocked(api.put).mockReset();
  vi.mocked(api.delete).mockReset();
});

describe('studentsService.list', () => {
  it('unwraps Go { data: { students } } into a Student array', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      success: true,
      data: { students: [{ _id: 's1', name: 'Asha', class: 'Grade 1' }], total: 1 },
    });

    const out = await studentsService.list('school-1');

    expect(api.get).toHaveBeenCalledWith('/api/students/school-1');
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Asha');
  });

  it('returns [] when students field is missing', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ success: true, data: {} });
    const out = await studentsService.list('school-1');
    expect(out).toEqual([]);
  });
});

describe('studentsService.create', () => {
  it('posts the body to the create endpoint', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ success: true, data: { _id: 's2' } });
    await studentsService.create({
      name: 'Ravi', email: 'r@x.com', class: 'Grade 2', rollNumber: '5', schoolId: 'school-1',
    });
    expect(api.post).toHaveBeenCalledWith('/api/students', expect.objectContaining({ name: 'Ravi' }));
  });
});

describe('studentsService.delete', () => {
  it('calls delete with the student id path', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ success: true });
    await studentsService.delete('s9');
    expect(api.delete).toHaveBeenCalledWith('/api/students/s9');
  });
});

describe('studentsService.update', () => {
  it('puts the body to the update endpoint with the id in the path', async () => {
    vi.mocked(api.put).mockResolvedValueOnce({ success: true, data: { _id: 's3' } });
    await studentsService.update('s3', { phone: '99999' });
    expect(api.put).toHaveBeenCalledWith('/api/students/s3', { phone: '99999' });
  });
});
