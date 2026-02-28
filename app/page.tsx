import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Sistem Manajemen Masjid SaaS
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Solusi multi-tenant komprehensif untuk mengelola operasional masjid, jadwal, dan komunitas
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Multi-Tenant</CardTitle>
              <CardDescription>Dukung beberapa masjid dengan isolasi data terpisah</CardDescription>
            </CardHeader>
            <CardContent>
              Setiap masjid memiliki ruang kerja sendiri dengan isolasi data lengkap dan kontrol akses berbasis peran.
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Manajemen Jadwal</CardTitle>
              <CardDescription>Kelola waktu shalat dan acara</CardDescription>
            </CardHeader>
            <CardContent>
              Jadwalkan shalat, kelas, dan acara dengan mudah dengan notifikasi otomatis untuk komunitas.
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Siap Offline</CardTitle>
              <CardDescription>Bekerja tanpa koneksi internet</CardDescription>
            </CardHeader>
            <CardContent>
              Dibangun dengan IndexedDB untuk dukungan offline, sinkronisasi otomatis saat koneksi dipulihkan.
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="bg-card rounded-lg shadow-md p-8 text-center border border-border">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Siap untuk memulai?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Ini adalah arsitektur SaaS dasar yang siap untuk diimplementasikan. Periksa file ARCHITECTURE.md untuk desain teknis lengkap.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button className="px-8">
              Lihat Dokumentasi
            </Button>
            <Button variant="outline" className="px-8">
              Hubungi Penjualan
            </Button>
          </div>
        </div>

        {/* Info section */}
        <div className="mt-16 p-6 bg-card rounded-lg border border-border">
          <h3 className="font-semibold text-foreground mb-2">Fondasi Arsitektur Siap</h3>
          <p className="text-muted-foreground text-sm">
            Proyek ini mencakup desain arsitektur lengkap dengan:
            <br />• Arsitektur layer 3-Tier (Presentasi → Layanan → Data)
            <br />• Pola Repository untuk migrasi mulus IndexedDB → PostgreSQL
            <br />• Dukungan multi-tenant dengan isolasi tenant_id
            <br />• Offline-first dengan kemampuan sinkronisasi
            <br />• Model data yang aman tipe kompatibel dengan skema PostgreSQL
          </p>
        </div>
      </div>
    </main>
  );
}
