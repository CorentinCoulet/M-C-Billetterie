'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Activity, AlertTriangle, CheckCircle2, Clock, PlayCircle, RefreshCw, StopCircle, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface QRRotationStats {
  totalProcessed: number;
  regenerated: number;
  skipped: number;
  errors: number;
  lastRun: string | null;
  isJobRunning: boolean;
  jobScheduled: boolean;
  lastJobRun: string | null;
}

export default function QRAdminPage() {
  const [stats, setStats] = useState<QRRotationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/qr-rotation');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
        setLastUpdate(new Date());
      } else {
        console.error('Failed to fetch QR rotation stats:', data.error);
      }
    } catch (error) {
      console.error('Error fetching QR rotation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger rotation manually
  const triggerRotation = async () => {
    setTriggering(true);
    try {
      const response = await fetch('/api/qr-rotation', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('QR rotation triggered successfully:', data.data);
        // Refresh stats after delay
        setTimeout(() => {
          fetchStats();
        }, 1000);
      } else {
        console.error('Failed to trigger QR rotation:', data.error);
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error triggering QR rotation:', error);
      alert('Error while triggering QR code rotation');
    } finally {
      setTriggering(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const getStatusColor = (isRunning: boolean, isScheduled: boolean) => {
    if (isRunning) return 'bg-yellow-500';
    if (isScheduled) return 'bg-green-500';
    return 'bg-red-500';
  };

  const getStatusText = (isRunning: boolean, isScheduled: boolean) => {
    if (isRunning) return 'En cours';
    if (isScheduled) return 'Programmé';
    return 'Arrêté';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="animate-spin h-8 w-8" />
          <span className="ml-2">Chargement des statistiques...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Administration QR Codes</h1>
          <p className="text-muted-foreground">
            Gestion et monitoring de la rotation automatique des QR codes
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={fetchStats} 
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button 
            onClick={triggerRotation}
            disabled={triggering || stats?.isJobRunning}
            size="sm"
          >
            {triggering ? (
              <RefreshCw className="animate-spin h-4 w-4 mr-2" />
            ) : (
              <PlayCircle className="h-4 w-4 mr-2" />
            )}
            Lancer maintenant
          </Button>
        </div>
      </div>

      {/* Statut du service */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Statut du Service
          </CardTitle>
          <CardDescription>
            État actuel du service de rotation des QR codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge 
                className={`${getStatusColor(stats?.isJobRunning || false, stats?.jobScheduled || false)} text-white`}
              >
                {getStatusText(stats?.isJobRunning || false, stats?.jobScheduled || false)}
              </Badge>
              {stats?.isJobRunning && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <RefreshCw className="animate-spin h-4 w-4 mr-1" />
                  Rotation en cours...
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques générales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Traités</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProcessed || 0}</div>
            <p className="text-xs text-muted-foreground">
              Billets analysés lors de la dernière rotation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Régénérés</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.regenerated || 0}</div>
            <p className="text-xs text-muted-foreground">
              QR codes mis à jour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ignorés</CardTitle>
            <StopCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.skipped || 0}</div>
            <p className="text-xs text-muted-foreground">
              Billets non éligibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erreurs</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.errors || 0}</div>
            <p className="text-xs text-muted-foreground">
              Erreurs rencontrées
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Informations détaillées */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Informations de Planification
          </CardTitle>
          <CardDescription>
            Détails sur la planification automatique des rotations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Dernière exécution</h4>
              <p className="text-lg">{formatDate(stats?.lastJobRun || null)}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Prochaine exécution</h4>
              <p className="text-lg">
                {stats?.jobScheduled ? 'Programmée (00:00 et 12:00)' : 'Non programmée'}
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Configuration</h4>
            <ul className="text-sm space-y-1">
              <li>• Fréquence: Toutes les 12 heures (00:00 et 12:00)</li>
              <li>• Fuseau horaire: Europe/Paris</li>
              <li>• QR codes expirés après: 12 heures</li>
              <li>• Traitement par lot: 100 billets</li>
            </ul>
          </div>

          {stats?.errors && stats.errors > 0 && (
            <>
              <Separator />
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Erreurs détectées</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  {stats.errors} erreur(s) lors de la dernière rotation. 
                  Consultez les logs pour plus de détails.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
          <CardDescription>
            Outils de gestion et de maintenance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={triggerRotation}
              disabled={triggering || stats?.isJobRunning}
              variant="default"
            >
              {triggering ? (
                <RefreshCw className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-2" />
              )}
              Rotation manuelle
            </Button>
            
            <Button 
              onClick={fetchStats}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser les stats
            </Button>
            
            <Button 
              onClick={() => window.open('/api/qr-rotation', '_blank')}
              variant="outline"
            >
              Voir les données brutes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
