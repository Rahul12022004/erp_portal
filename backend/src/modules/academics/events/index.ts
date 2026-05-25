import { eventBus } from "../../../core/events";
import Assignment from "../models/Assignment";
import Attendance from "../models/Attendance";
import ClassModel from "../models/Class";
import Exam from "../models/Exam";
import Mark from "../models/Mark";

type SchoolDeletedPayload = {
  schoolId: string;
};

eventBus.subscribe<SchoolDeletedPayload>("school.deleted", async ({ schoolId }) => {
  await Promise.all([
    Assignment.deleteMany({ schoolId }),
    Attendance.deleteMany({ schoolId }),
    ClassModel.deleteMany({ schoolId }),
    Exam.deleteMany({ schoolId }),
    Mark.deleteMany({ schoolId }),
  ]);
});
