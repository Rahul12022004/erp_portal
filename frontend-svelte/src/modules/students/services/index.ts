import { api } from '$lib/api/client';
import { ENDPOINTS } from '$lib/api/endpoints';
import type { GoEnvelope } from '$lib/api/normalize';
import type { Student, CreateStudentInput } from '../types';

// Go: GET /api/students/:schoolId → { success, data: { students, total, page, limit } }
interface StudentListData {
  students: Student[];
  total: number;
  page: number;
  limit: number;
}

export const studentsService = {
  /** List all students for a school. */
  async list(schoolId: string): Promise<Student[]> {
    const json = await api.get<GoEnvelope<StudentListData>>(ENDPOINTS.students.bySchool(schoolId));
    return json?.data?.students ?? [];
  },

  /** Create a new student. */
  create(body: CreateStudentInput): Promise<GoEnvelope<Student>> {
    return api.post<GoEnvelope<Student>>(ENDPOINTS.students.create, body);
  },

  /** Update an existing student by id. */
  update(id: string, body: Partial<CreateStudentInput>): Promise<GoEnvelope<Student>> {
    return api.put<GoEnvelope<Student>>(ENDPOINTS.students.update(id), body);
  },

  /** Delete a student by id. Go returns 204 No Content, so there is no body. */
  async delete(id: string): Promise<void> {
    await api.delete<void>(ENDPOINTS.students.delete(id));
  },
};
