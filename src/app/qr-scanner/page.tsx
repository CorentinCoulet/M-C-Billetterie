'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle, Clock, Scan, ShieldCheck, XCircle } from 'lucide-react';
import { useState } from 'react';

interface TicketData {
  ticketId: string;
  eventId: string;
  userId: string;
  issuedAt: string;
  checksum: string;
}

interface VerificationResult {
  valid: boolean;
  ticketData?: TicketData;
  error?: string;
  isScanned?: boolean;
  canBeScanned?: boolean;
  needsRegeneration?: boolean;
  message?: string;
}

export default function QRScannerPage() {
  const [qrContent, setQrContent] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanMode, setScanMode] = useState<'check' | 'validate'>('check');

  const handleVerifyQR = async (markAsUsed = false) => {
    if (!qrContent.trim()) {
      return;
    }

    setIsVerifying(true);
    
    try {
      const response = await fetch('/api/tickets/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrContent: qrContent.trim(),
          markAsUsed,
        }),
      });

      const result = await response.json();
      setVerificationResult(result);
      
    } catch (error) {
      console.error('Error verifying QR code:', error);
      setVerificationResult({
        valid: false,
        error: 'Server communication error',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const generateRotatingQRContent = () => {
    return `{
  "ticketId": "ticket-demo-1",
  "eventId": "event-demo-1",
  "userId": "user-demo-1",
  "rotationToken": "rotation-${Date.now()}",
  "generatedAt": "${new Date().toISOString()}",
  "checksum": "abc123def"
}`;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">QR Code Scanner - Tickets</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Scan and validate ticket QR codes. QR codes regenerate automatically every 12h and become unusable after validation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Scanner/Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                QR Code Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Scanner mode</Label>
                <div className="flex gap-2">
                  <Button
                    variant={scanMode === 'check' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setScanMode('check')}
                  >
                    <Scan className="h-4 w-4 mr-2" />
                    Check
                  </Button>
                  <Button
                    variant={scanMode === 'validate' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setScanMode('validate')}
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Validate (final)
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {scanMode === 'check' 
                    ? "Check mode: verifies validity without marking as used"
                    : "Validation mode: marks ticket as permanently used"
                  }
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="qr-input">QR Code Content (JSON)</Label>
                <textarea
                  id="qr-input"
                  className="w-full min-h-[120px] p-3 border rounded-md resize-y font-mono text-sm"
                  placeholder="Paste the rotating QR code JSON content here..."
                  value={qrContent}
                  onChange={(e) => setQrContent(e.target.value)}
                />
              </div>
              
              <Button 
                onClick={() => handleVerifyQR(scanMode === 'validate')}
                disabled={isVerifying || !qrContent.trim()}
                className="w-full"
                variant={scanMode === 'validate' ? 'destructive' : 'default'}
              >
                {isVerifying ? 'Verifying...' : 
                 scanMode === 'validate' ? 'Validate ticket (final)' : 'Check QR Code'}
              </Button>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Generate a rotating QR code example:
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQrContent(generateRotatingQRContent())}
                  className="w-full"
                >
                  Generate test QR code
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Verification Result */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Result</CardTitle>
            </CardHeader>
            <CardContent>
              {!verificationResult ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Scan className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No verification performed</p>
                  <p className="text-sm">Enter a QR code to begin</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status Badge */}
                  <div className="flex items-center justify-center">
                    {verificationResult.valid ? (
                      <Badge variant="default" className="bg-green-500 text-white flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {verificationResult.isScanned ? 'Ticket Validated' : 'Valid Ticket'}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Invalid Ticket
                      </Badge>
                    )}
                  </div>

                  {/* Message */}
                  {verificationResult.message && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">{verificationResult.message}</p>
                    </div>
                  )}

                  {/* Additional Status Info */}
                  <div className="space-y-2">
                    {verificationResult.needsRegeneration && (
                      <div className="flex items-center gap-2 text-orange-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">QR code expired (&gt; 12h)</span>
                      </div>
                    )}
                    
                    {verificationResult.isScanned && (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">Ticket already used</span>
                      </div>
                    )}

                    {verificationResult.canBeScanned === false && !verificationResult.isScanned && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <XCircle className="h-4 w-4" />
                        <span className="text-sm">Not scannable (expired or invalid)</span>
                      </div>
                    )}
                  </div>

                  {/* Error Display */}
                  {verificationResult.error && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <p className="text-sm text-destructive">
                        {verificationResult.error}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">🔍 Check Mode</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Verifies QR code validity</li>
                  <li>• Does not mark ticket as used</li>
                  <li>• Ideal for access control</li>
                  <li>• Shows ticket information</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">✅ Validation Mode</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Marks ticket as permanently used</li>
                  <li>• Prevents any future reuse</li>
                  <li>• Ideal for event entry</li>
                  <li>• Irreversible action</li>
                </ul>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">🔄 Rotation System</h4>
              <p className="text-muted-foreground">
                QR codes automatically regenerate every 12 hours for security reasons. 
                An expired QR code must be regenerated before use. Once scanned and validated, 
                the ticket becomes permanently unusable.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
