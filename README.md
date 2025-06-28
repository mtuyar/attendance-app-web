# 📋 Mobil Odaklı Yoklama Uygulaması

Next.js, Tailwind CSS ve Supabase kullanılarak geliştirilmiş mobil odaklı yoklama takip sistemi.

## 🚀 Özellikler

- **🔐 Güvenli Giriş**: Şifre korumalı giriş sistemi
- **📱 Mobil Uyumlu**: Responsive tasarım
- **📅 Yoklama Girişi**: Kolay yoklama alma
- **📊 Geçmiş Takibi**: Yoklama geçmişi görüntüleme
- **📈 Analiz ve Grafikler**: Katılım oranları ve istatistikler
- **👥 Öğrenci Yönetimi**: Öğrenci ekleme, düzenleme, silme
- **🎯 Program Yönetimi**: Program oluşturma ve yönetimi
- **📥 CSV Export**: Yoklama verilerini CSV olarak indirme

## 🛠️ Teknolojiler

- **Frontend**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Charts**: react-chartjs-2
- **State Management**: Zustand
- **Icons**: Lucide React

## 📋 Veritabanı Yapısı

### programs
- `id` (UUID, PK)
- `name` (string) - Program adı
- `day_of_week` (string) - Haftanın günü
- `created_at` (timestamp)

### students
- `id` (UUID, PK)
- `name` (string) - Öğrenci adı
- `phone_number` (string) - Veli telefonu
- `created_at` (timestamp)

### attendances
- `id` (UUID, PK)
- `student_id` (UUID, FK) - students.id
- `program_id` (UUID, FK) - programs.id
- `date` (date) - Yoklama tarihi
- `status` (string) - "Geldi" veya "Gelmedi"
- `created_at` (timestamp)

## 🚀 Kurulum

1. **Projeyi klonlayın**
```bash
git clone <repository-url>
cd attendance-app-web
```

2. **Bağımlılıkları yükleyin**
```bash
npm install
```

3. **Supabase projesini hazırlayın**
   - Supabase projeniz: `https://tuivwlhwwrtboaprxtit.supabase.co`
   - Supabase Dashboard'a gidin
   - Settings > API bölümünden anon/public key'i kopyalayın

4. **Environment değişkenlerini ayarlayın**
```bash
# .env.local dosyasını düzenleyin
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

5. **Veritabanı tablolarını oluşturun**
   - Supabase Dashboard > SQL Editor'a gidin
   - `database-setup.sql` dosyasındaki komutları çalıştırın

6. **Uygulamayı çalıştırın**
```bash
npm run dev
```

## 🔐 Giriş Bilgileri

- **Demo Şifre**: `admin1234`

## 📱 Kullanım

### 1. Giriş
- Uygulamaya giriş yapmak için demo şifresini kullanın
- Şifre localStorage'da saklanır

### 2. Öğrenci Yönetimi
- "Öğrenciler" sekmesinden öğrenci ekleyin
- Öğrenci bilgilerini düzenleyin veya silin

### 3. Program Yönetimi
- "Programlar" sekmesinden program oluşturun
- Program adı ve gününü belirtin

### 4. Yoklama Alma
- "Yoklama Gir" sekmesinden program seçin
- Öğrencilerin durumunu işaretleyin
- Yoklamayı kaydedin

### 5. Geçmiş Görüntüleme
- "Geçmiş Yoklamalar" sekmesinden geçmiş yoklamaları görüntüleyin
- Program ve tarih filtrelerini kullanın
- CSV olarak indirin

### 6. Analiz
- "Analiz" sekmesinden katılım oranlarını görüntüleyin
- Grafikleri inceleyin

## 🚀 Deployment

### Vercel ile Deploy
```bash
npm run build
```

1. [Vercel](https://vercel.com) hesabı oluşturun
2. GitHub repository'nizi bağlayın
3. Environment değişkenlerini ayarlayın:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key'iniz
4. Deploy edin

### Diğer Platformlar
- Netlify
- Railway
- Render

## 📝 Notlar

- Uygulama tamamen client-side çalışır
- Veriler Supabase'de saklanır
- Mobil öncelikli tasarım
- Offline çalışmaz (Supabase bağlantısı gerekli)

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

Sorularınız için issue açabilirsiniz. 