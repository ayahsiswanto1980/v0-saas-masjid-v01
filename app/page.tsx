import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Mosque Management SaaS
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A comprehensive multi-tenant solution for managing mosque operations, schedules, and communities
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Multi-Tenant</CardTitle>
              <CardDescription>Support multiple mosques with isolated data</CardDescription>
            </CardHeader>
            <CardContent>
              Each mosque has its own workspace with complete data isolation and role-based access control.
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Schedule Management</CardTitle>
              <CardDescription>Manage prayer times and events</CardDescription>
            </CardHeader>
            <CardContent>
              Easily schedule prayers, classes, and events with automated notifications for the community.
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Offline Ready</CardTitle>
              <CardDescription>Works without internet connection</CardDescription>
            </CardHeader>
            <CardContent>
              Built with IndexedDB for offline support, syncs automatically when connection is restored.
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="bg-card rounded-lg shadow-md p-8 text-center border border-border">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            This is a foundational SaaS architecture ready for implementation. Check the ARCHITECTURE.md file for the complete technical design.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button className="px-8">
              View Documentation
            </Button>
            <Button variant="outline" className="px-8">
              Contact Sales
            </Button>
          </div>
        </div>

        {/* Info section */}
        <div className="mt-16 p-6 bg-card rounded-lg border border-border">
          <h3 className="font-semibold text-foreground mb-2">Architecture Foundation Ready</h3>
          <p className="text-muted-foreground text-sm">
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
