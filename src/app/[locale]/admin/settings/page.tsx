import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Database } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres système</h1>
        <p className="text-gray-600">Configuration et maintenance de la plateforme</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Base de données */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Base de données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span>Base de données non connectée</span>
            </div>
            <p className="text-sm text-gray-600">
              Pour utiliser pleinement l&apos;application, connectez-vous à une base de données PostgreSQL.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Instructions Docker</h4>
              <div className="text-sm space-y-1 font-mono">
                <div>docker-compose up -d</div>
                <div>npx prisma migrate dev</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom de l&apos;application</label>
              <input 
                type="text" 
                defaultValue="Billetterie" 
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email de contact</label>
              <input 
                type="email" 
                placeholder="admin@example.com" 
                className="w-full p-2 border rounded-md"
              />
            </div>
            <Button>Sauvegarder</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
