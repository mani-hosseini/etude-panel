ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "days" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Course"
SET "days" = ARRAY(
  SELECT trim(both from x)
  FROM unnest(string_to_array(replace("day", '،', ','), ',')) AS x
  WHERE trim(both from x) <> ''
)
WHERE COALESCE(array_length("days", 1), 0) = 0
  AND "day" IS NOT NULL
  AND btrim("day") <> '';

UPDATE "Course"
SET "days" = ARRAY(
  SELECT trim(both from x)
  FROM unnest(string_to_array(replace(array_to_string("days", '،'), '،', ','), ',')) AS x
  WHERE trim(both from x) <> ''
)
WHERE array_length("days", 1) = 1
  AND "days"[1] LIKE '%،%';

ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "classDays" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Enrollment" AS e
SET "classDays" = c."days"
FROM "Course" AS c
WHERE e."courseId" = c.id
  AND COALESCE(array_length(e."classDays", 1), 0) = 0;
