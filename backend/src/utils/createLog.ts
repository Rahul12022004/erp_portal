import Log from "../models/Logs";

export const createLog = async ({
  action,
  message,
  user = "Super Admin",
  schoolId = "",
}: any) => {
  try {
    await Log.create({
      action,
      message,
      user,
      schoolId,
    });
  } catch (err) {
    console.error("LOG ERROR:", err);
  }
};