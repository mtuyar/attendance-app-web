-- Programs tablosuna time sütunu ekleme
ALTER TABLE programs 
ADD COLUMN time VARCHAR(10);

-- Mevcut kayıtlar için varsayılan değer (opsiyonel)
UPDATE programs 
SET time = '09:00' 
WHERE time IS NULL;

-- Sütunun nullable olmasını sağla
ALTER TABLE programs 
ALTER COLUMN time DROP NOT NULL;

-- Değişiklikleri kontrol et
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'programs' 
ORDER BY ordinal_position; 

-- Ders-Öğrenci üyelik tablosu
CREATE TABLE IF NOT EXISTS program_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (program_id, student_id)
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_program_students_program_id ON program_students(program_id);
CREATE INDEX IF NOT EXISTS idx_program_students_student_id ON program_students(student_id);

-- RLS ve politikalar (demo ile tutarlı olacak şekilde açık)
ALTER TABLE program_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access" ON program_students;
DROP POLICY IF EXISTS "Public insert access" ON program_students;
DROP POLICY IF EXISTS "Public delete access" ON program_students;
CREATE POLICY "Public read access" ON program_students FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON program_students FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete access" ON program_students FOR DELETE USING (true); 