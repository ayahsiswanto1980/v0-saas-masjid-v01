import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Mosque Management SaaS
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            A comprehensive multi-tenant solution for managing mosque operations, schedules, and communities
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="border-slate-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-slate-900">Multi-Tenant</CardTitle>
              <CardDescription>Support multiple mosques with isolated data</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-600">
              Each mosque has its own workspace with complete data isolation and role-based access control.
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-slate-900">Schedule Management</CardTitle>
              <CardDescription>Manage prayer times and events</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-600">
              Easily schedule prayers, classes, and events with automated notifications for the community.
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-slate-900">Offline Ready</CardTitle>
              <CardDescription>Works without internet connection</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-600">
              Built with IndexedDB for offline support, syncs automatically when connection is restored.
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="bg-white rounded-lg shadow-md p-8 text-center border border-slate-200">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-slate-600 mb-8 max-w-xl mx-auto">
            This is a foundational SaaS architecture ready for implementation. Check the ARCHITECTURE.md file for the complete technical design.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white px-8">
              View Documentation
            </Button>
            <Button variant="outline" className="border-slate-300 text-slate-900 px-8">
              Contact Sales
            </Button>
          </div>
        </div>

        {/* Info section */}
        <div className="mt-16 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Architecture Foundation Ready</h3>
          <p className="text-blue-800 text-sm">
            This project includes a complete architectural design with:
            <br />• 3-Tier layer architecture (Presentation → Service → Data)
            <br />• Repository pattern for seamless IndexedDB → PostgreSQL migration
            <br />• Multi-tenant support with tenant_id isolation
            <br />• Offline-first with sync capabilities
            <br />• Type-safe data models compatible with PostgreSQL schema
          </p>
        </div>
      </div>
    </main>
  );
}
