-- Migration to fix attendance logging and session tracking (UUID Compatible)
-- This script adds the necessary columns and resolves legacy constraints using UUIDs.

-- 1. Add/Fix tracking columns with UUID technical types
-- The entire DB has been modernized to UUID.
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS "date" DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS "course_catalog_id" UUID REFERENCES course_catalog(id) ON DELETE CASCADE;

-- section_id MUST be UUID.
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_logs' AND column_name='section_id' AND data_type='bigint') THEN
        ALTER TABLE attendance_logs DROP COLUMN section_id;
    END IF;
END $$;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS "section_id" UUID REFERENCES sections(id) ON DELETE CASCADE;

-- teacher_id MUST be UUID.
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_logs' AND column_name='teacher_id' AND data_type='bigint') THEN
        ALTER TABLE attendance_logs DROP COLUMN teacher_id;
    END IF;
END $$;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS "teacher_id" UUID REFERENCES teachers(id) ON DELETE SET NULL;

-- 2. Ensure existing student_id is UUID compatible
-- If the original schema had it as BIGINT but the live DB is UUID, we need to ensure this matches.
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_logs' AND column_name='student_id' AND data_type='bigint') THEN
        ALTER TABLE attendance_logs ALTER COLUMN student_id TYPE UUID USING student_id::text::uuid;
    END IF;
END $$;

-- 3. Clean up legacy columns that cause constraint violations
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS subject_id;

-- 5. Data Consistency: Populate new columns for legacy records
-- This ensures that logs created before this migration still show up in history.

-- Populate 'date' with current date if it's missing (fallback since created_at might be missing)
UPDATE attendance_logs SET "date" = CURRENT_DATE WHERE "date" IS NULL;

-- Populate teacher, catalog, and section from joined routines for legacy logs
UPDATE attendance_logs al
SET 
    teacher_id = r.teacher_id,
    course_catalog_id = r.course_catalog_id,
    section_id = r.section_id
FROM routines r
WHERE al.routine_id = r.id
AND (al.teacher_id IS NULL OR al.course_catalog_id IS NULL OR al.section_id IS NULL);

-- 6. Make routine_id nullable (important for flexible attendance logging)
ALTER TABLE attendance_logs 
ALTER COLUMN routine_id DROP NOT NULL;
