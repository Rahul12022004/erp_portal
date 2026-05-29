import { describe, it, expect } from 'vitest';
import { ApiError } from '$lib/types';
import {
  unwrapGo,
  normalizeClasses,
  normalizeAnnouncements,
  normalizeFeeTrend,
  normalizeExams,
  normalizeLeaves,
} from './normalize';

describe('unwrapGo', () => {
  it('returns data on success', () => {
    expect(unwrapGo({ success: true, data: { x: 1 } })).toEqual({ x: 1 });
  });
  it('returns data when success flag is absent', () => {
    expect(unwrapGo({ data: [1, 2] })).toEqual([1, 2]);
  });
  it('throws ApiError when success is false', () => {
    expect(() => unwrapGo({ success: false, error: 'boom' })).toThrowError(ApiError);
  });
});

describe('normalizeClasses', () => {
  it('maps Go class rows to ClassData with section suffix', () => {
    const json = { success: true, data: [
      { _id: '1', name: 'Grade 1', section: 'A', studentCount: 30 },
      { _id: '2', name: 'Grade 2', section: '', studentCount: 25 },
    ]};
    expect(normalizeClasses(json)).toEqual([
      { name: 'Grade 1-A', students: 30 },
      { name: 'Grade 2', students: 25 },
    ]);
  });
  it('returns [] on a non-array data field', () => {
    expect(normalizeClasses({ success: true, data: null })).toEqual([]);
  });
});

describe('normalizeAnnouncements', () => {
  it('maps Go announcement rows', () => {
    const json = { success: true, data: [
      { _id: 'a1', title: 'Hi', message: 'Body', author: 'Admin', createdAt: '2026-05-01T00:00:00Z' },
    ]};
    const out = normalizeAnnouncements(json);
    expect(out[0].id).toBe('a1');
    expect(out[0].title).toBe('Hi');
    expect(out[0].desc).toBe('Body');
    expect(out[0].author).toBe('Admin');
  });
  it('returns empty time string for a malformed createdAt', () => {
    const json = { success: true, data: [
      { _id: 'a2', title: 'X', message: 'Y', author: 'Z', createdAt: 'not-a-date' },
    ]};
    expect(normalizeAnnouncements(json)[0].time).toBe('');
  });
});

describe('normalizeFeeTrend', () => {
  it('derives fees/expense/profit from collected+pending', () => {
    const json = { success: true, data: [
      { _id: '2026-05', collected: 800, pending: 200 },
    ]};
    expect(normalizeFeeTrend(json)).toEqual([
      { month: '2026-05', fees: 1000, expense: 200, profit: 800 },
    ]);
  });
});

describe('normalizeExams', () => {
  it('passes through Go exam fields', () => {
    const json = { success: true, data: [
      { _id: 'e1', className: 'Grade 1', title: 'Midterm', examType: 'Written',
        subject: 'Math', examDate: '2026-06-01', startTime: '09:00', endTime: '10:00' },
    ]};
    const out = normalizeExams(json);
    expect(out[0]._id).toBe('e1');
    expect(out[0].subject).toBe('Math');
    expect(out[0].className).toBe('Grade 1');
  });
});

describe('normalizeLeaves', () => {
  it('maps Go leave rows and tolerates string teacherId', () => {
    const json = { success: true, data: [
      { _id: 'l1', teacherId: 'tid', title: 'Sick', description: 'flu',
        leaveType: 'Paid', status: 'Pending', createdAt: '2026-05-01T00:00:00Z' },
    ]};
    const out = normalizeLeaves(json);
    expect(out[0]._id).toBe('l1');
    expect(out[0].leaveType).toBe('Paid');
    expect(out[0].status).toBe('Pending');
    // teacherId is a bare string from Go → no populated object
    expect(out[0].teacherId).toBeUndefined();
  });
  it('maps a populated teacherId object when Go provides one', () => {
    const json = { success: true, data: [
      { _id: 'l2', title: 'T', description: 'D', leaveType: 'Paid', status: 'Pending',
        createdAt: '2026-05-01T00:00:00Z',
        teacherId: { _id: 't1', name: 'Mr A', email: 'a@x.com', position: 'Teacher' } },
    ]};
    const out = normalizeLeaves(json);
    expect(out[0].teacherId).toEqual({ _id: 't1', name: 'Mr A', email: 'a@x.com', position: 'Teacher' });
  });
});
