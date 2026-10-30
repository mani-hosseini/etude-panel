-- Live Course.day was still VARCHAR(32) from init; 5 weekdays no longer fit.
ALTER TABLE "Course" ALTER COLUMN "day" TYPE VARCHAR(128);
