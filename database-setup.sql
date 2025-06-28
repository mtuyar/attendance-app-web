-- Yoklama Uygulaması Veritabanı Kurulumu
-- Bu komutları Supabase Dashboard > SQL Editor'da çalıştırın

-- programs tablosu
CREATE TABLE programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- students tablosu
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- attendances tablosu
CREATE TABLE attendances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Geldi', 'Gelmedi')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndeksler (performans için)
CREATE INDEX idx_attendances_student_id ON attendances(student_id);
CREATE INDEX idx_attendances_program_id ON attendances(program_id);
CREATE INDEX idx_attendances_date ON attendances(date);

-- Row Level Security (RLS) ayarları
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- Tüm tablolar için public erişim politikaları
CREATE POLICY "Public read access" ON programs FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON programs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON programs FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON programs FOR DELETE USING (true);

CREATE POLICY "Public read access" ON students FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON students FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON students FOR DELETE USING (true);

CREATE POLICY "Public read access" ON attendances FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON attendances FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON attendances FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON attendances FOR DELETE USING (true);

-- Örnek veriler (opsiyonel)
INSERT INTO programs (name, day_of_week) VALUES 
  ('Salı Dersi', 'Tuesday'),
  ('Perşembe Dersi', 'Thursday'),
  ('Cumartesi Dersi', 'Saturday');

INSERT INTO students (name, phone_number) VALUES 
  ('Ahmet Yılmaz', '0532 123 45 67'),
  ('Ayşe Demir', '0533 234 56 78'),
  ('Mehmet Kaya', '0534 345 67 89'); 