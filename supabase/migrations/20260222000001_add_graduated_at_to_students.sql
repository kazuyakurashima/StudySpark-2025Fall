-- Add graduated_at column to students table
-- App-layer defense: graduated students are filtered out by
-- .is("students.graduated_at", null) in coach queries.
-- NULL = active student (no backfill needed at migration time).
-- Graduation processing sets this value via operational SQL.
-- See: docs/2026-cutover/03_data_strategy.md Section 7.1

ALTER TABLE students ADD COLUMN graduated_at TIMESTAMPTZ;

COMMENT ON COLUMN students.graduated_at
  IS 'Timestamp when the student graduated. NULL = active student.';
