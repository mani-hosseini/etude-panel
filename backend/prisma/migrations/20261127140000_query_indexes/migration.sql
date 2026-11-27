-- CreateIndex
CREATE INDEX "CourseSession_courseId_status_number_idx" ON "CourseSession"("courseId", "status", "number");

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentId_meetingKey_idx" ON "AttendanceRecord"("studentId", "meetingKey");
