# Billetterie Production Security Automation and Orchestration Script
# This PowerShell script provides Windows-compatible security automation

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('deploy', 'monitor', 'secure', 'backup', 'disaster', 'incident', 'status')]
    [string]$Action = 'status',
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = 'production',
    
    [Parameter(Mandatory=$false)]
    [string]$Version = (Get-Date -Format 'yyyyMMdd-HHmmss'),
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('minimal', 'standard', 'strict')]
    [string]$SecurityLevel = 'strict'
)

# Configuration
$SCRIPT_ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent $SCRIPT_ROOT
$LOG_DIR = "C:\logs\billetterie"
$TEMP_DIR = "$env:TEMP\billetterie-ops"
$BACKUP_DIR = "F:\backups\billetterie"

# Ensure directories exist
New-Item -ItemType Directory -Force -Path $LOG_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $TEMP_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $BACKUP_DIR | Out-Null

# Logging functions
function Write-SecurityLog {
    param(
        [ValidateSet('INFO', 'WARN', 'ERROR', 'CRITICAL', 'SUCCESS')]
        [string]$Level = 'INFO',
        [string]$Message,
        [string]$Component = 'SYSTEM'
    )
    
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logEntry = "[$timestamp] [$Level] [$Component] $Message"
    
    # Color coding for console
    switch ($Level) {
        'INFO' { Write-Host $logEntry -ForegroundColor Cyan }
        'WARN' { Write-Host $logEntry -ForegroundColor Yellow }
        'ERROR' { Write-Host $logEntry -ForegroundColor Red }
        'CRITICAL' { Write-Host $logEntry -ForegroundColor Red -BackgroundColor White }
        'SUCCESS' { Write-Host $logEntry -ForegroundColor Green }
    }
    
    # Write to log file
    $logFile = "$LOG_DIR\security-operations-$(Get-Date -Format 'yyyyMMdd').log"
    Add-Content -Path $logFile -Value $logEntry
}

function Send-Alert {
    param(
        [string]$Severity,
        [string]$Title,
        [string]$Message
    )
    
    Write-SecurityLog -Level 'INFO' -Message "Sending $Severity alert: $Title" -Component 'ALERTING'
    
    # Slack notification (if webhook configured)
    if ($env:SLACK_WEBHOOK) {
        $payload = @{
            text = "🚨 Billetterie Security Alert"
            attachments = @(@{
                color = if ($Severity -eq 'CRITICAL') { 'danger' } else { 'warning' }
                title = $Title
                text = $Message
                fields = @(
                    @{ title = 'Environment'; value = $Environment; short = $true }
                    @{ title = 'Timestamp'; value = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'); short = $true }
                )
            })
        } | ConvertTo-Json -Depth 3
        
        try {
            Invoke-RestMethod -Uri $env:SLACK_WEBHOOK -Method Post -Body $payload -ContentType 'application/json' | Out-Null
        }
        catch {
            Write-SecurityLog -Level 'WARN' -Message "Failed to send Slack alert: $($_.Exception.Message)" -Component 'ALERTING'
        }
    }
    
    # Email notification (if configured)
    if ($env:SMTP_SERVER -and $env:ALERT_EMAIL) {
        try {
            $emailParams = @{
                SmtpServer = $env:SMTP_SERVER
                Port = $env:SMTP_PORT ?? 587
                UseSsl = $true
                Credential = New-Object System.Management.Automation.PSCredential($env:SMTP_USER, (ConvertTo-SecureString $env:SMTP_PASSWORD -AsPlainText -Force))
                From = $env:SMTP_FROM ?? 'alerts@billetterie.com'
                To = $env:ALERT_EMAIL
                Subject = "[$Severity] Billetterie Alert: $Title"
                Body = @"
Billetterie Security Alert

Severity: $Severity
Environment: $Environment
Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

Message: $Message

This is an automated alert from the Billetterie security system.
"@
            }
            Send-MailMessage @emailParams
        }
        catch {
            Write-SecurityLog -Level 'WARN' -Message "Failed to send email alert: $($_.Exception.Message)" -Component 'ALERTING'
        }
    }
}

function Test-Prerequisites {
    Write-SecurityLog -Level 'INFO' -Message 'Checking system prerequisites...' -Component 'PREREQ'
    
    $missingTools = @()
    
    # Check Docker
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        $missingTools += 'docker'
    }
    
    # Check Docker Compose
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        $missingTools += 'docker-compose'
    }
    
    # Check Git
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        $missingTools += 'git'
    }
    
    # Check PowerShell version
    if ($PSVersionTable.PSVersion.Major -lt 5) {
        Write-SecurityLog -Level 'ERROR' -Message 'PowerShell 5.0 or higher required' -Component 'PREREQ'
        return $false
    }
    
    if ($missingTools.Count -gt 0) {
        Write-SecurityLog -Level 'ERROR' -Message "Missing required tools: $($missingTools -join ', ')" -Component 'PREREQ'
        return $false
    }
    
    # Check Docker daemon
    try {
        docker info | Out-Null
        Write-SecurityLog -Level 'SUCCESS' -Message 'Docker daemon is running' -Component 'PREREQ'
    }
    catch {
        Write-SecurityLog -Level 'ERROR' -Message 'Docker daemon is not running or accessible' -Component 'PREREQ'
        return $false
    }
    
    # Check disk space (minimum 10GB)
    $freeSpace = (Get-WmiObject -Class Win32_LogicalDisk | Where-Object DeviceID -eq 'C:').FreeSpace
    $freeSpaceGB = [math]::Round($freeSpace / 1GB, 2)
    
    if ($freeSpaceGB -lt 10) {
        Write-SecurityLog -Level 'ERROR' -Message "Insufficient disk space: ${freeSpaceGB}GB (minimum 10GB required)" -Component 'PREREQ'
        return $false
    }
    
    Write-SecurityLog -Level 'SUCCESS' -Message 'All prerequisites met' -Component 'PREREQ'
    return $true
}

function Invoke-SecurityScan {
    Write-SecurityLog -Level 'INFO' -Message 'Starting comprehensive security scan...' -Component 'SECURITY'
    
    $scanResults = @{
        VulnerabilityResults = $null
        SecretResults = $null
        ComplianceResults = $null
        OverallStatus = 'UNKNOWN'
    }
    
    # Container vulnerability scanning with Trivy
    if (Get-Command trivy -ErrorAction SilentlyContinue) {
        Write-SecurityLog -Level 'INFO' -Message 'Running Trivy vulnerability scan...' -Component 'SECURITY'
        
        try {
            $trivyOutput = trivy filesystem --security-checks vuln,config,secret --format json --output "$TEMP_DIR\trivy-results.json" $PROJECT_ROOT 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                $trivyResults = Get-Content "$TEMP_DIR\trivy-results.json" | ConvertFrom-Json
                $scanResults.VulnerabilityResults = $trivyResults
                Write-SecurityLog -Level 'SUCCESS' -Message 'Trivy scan completed successfully' -Component 'SECURITY'
            }
            else {
                Write-SecurityLog -Level 'WARN' -Message "Trivy scan completed with warnings: $trivyOutput" -Component 'SECURITY'
            }
        }
        catch {
            Write-SecurityLog -Level 'ERROR' -Message "Trivy scan failed: $($_.Exception.Message)" -Component 'SECURITY'
        }
    }
    else {
        Write-SecurityLog -Level 'WARN' -Message 'Trivy not installed, skipping vulnerability scan' -Component 'SECURITY'
    }
    
    # Secret detection with gitleaks
    if (Get-Command gitleaks -ErrorAction SilentlyContinue) {
        Write-SecurityLog -Level 'INFO' -Message 'Running gitleaks secret detection...' -Component 'SECURITY'
        
        try {
            $gitleaksOutput = gitleaks detect --source $PROJECT_ROOT --report-format json --report-path "$TEMP_DIR\gitleaks-results.json" 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                $gitleaksResults = Get-Content "$TEMP_DIR\gitleaks-results.json" -ErrorAction SilentlyContinue | ConvertFrom-Json
                $scanResults.SecretResults = $gitleaksResults
                Write-SecurityLog -Level 'SUCCESS' -Message 'Gitleaks scan completed - no secrets detected' -Component 'SECURITY'
            }
            else {
                Write-SecurityLog -Level 'WARN' -Message 'Gitleaks detected potential secrets' -Component 'SECURITY'
                if (Test-Path "$TEMP_DIR\gitleaks-results.json") {
                    $secretCount = (Get-Content "$TEMP_DIR\gitleaks-results.json" | ConvertFrom-Json).Count
                    Write-SecurityLog -Level 'WARN' -Message "$secretCount potential secrets found" -Component 'SECURITY'
                }
            }
        }
        catch {
            Write-SecurityLog -Level 'ERROR' -Message "Gitleaks scan failed: $($_.Exception.Message)" -Component 'SECURITY'
        }
    }
    else {
        Write-SecurityLog -Level 'WARN' -Message 'Gitleaks not installed, skipping secret detection' -Component 'SECURITY'
    }
    
    # Determine overall status
    if ($scanResults.VulnerabilityResults -and $scanResults.VulnerabilityResults.Results) {
        $criticalVulns = 0
        $highVulns = 0
        
        foreach ($result in $scanResults.VulnerabilityResults.Results) {
            foreach ($vuln in $result.Vulnerabilities) {
                switch ($vuln.Severity) {
                    'CRITICAL' { $criticalVulns++ }
                    'HIGH' { $highVulns++ }
                }
            }
        }
        
        if ($criticalVulns -gt 0) {
            $scanResults.OverallStatus = 'CRITICAL'
            Send-Alert -Severity 'CRITICAL' -Title 'Critical Vulnerabilities Detected' -Message "$criticalVulns critical vulnerabilities found in security scan"
        }
        elseif ($highVulns -gt 0) {
            $scanResults.OverallStatus = 'HIGH'
            Send-Alert -Severity 'WARNING' -Title 'High Severity Vulnerabilities' -Message "$highVulns high severity vulnerabilities found"
        }
        else {
            $scanResults.OverallStatus = 'CLEAN'
            Write-SecurityLog -Level 'SUCCESS' -Message 'No critical or high severity vulnerabilities detected' -Component 'SECURITY'
        }
    }
    
    return $scanResults
}

function Start-ProductionDeployment {
    param(
        [string]$DeploymentVersion = $Version,
        [switch]$SkipSecurityScan = $false
    )
    
    Write-SecurityLog -Level 'INFO' -Message "Starting production deployment version $DeploymentVersion" -Component 'DEPLOYMENT'
    
    try {
        # Pre-deployment checks
        if (-not (Test-Prerequisites)) {
            throw "Prerequisites check failed"
        }
        
        # Security scan
        if (-not $SkipSecurityScan) {
            $scanResults = Invoke-SecurityScan
            
            if ($SecurityLevel -eq 'strict' -and $scanResults.OverallStatus -eq 'CRITICAL') {
                throw "Critical security issues detected, deployment blocked"
            }
        }
        
        # Create backup
        Write-SecurityLog -Level 'INFO' -Message 'Creating pre-deployment backup...' -Component 'DEPLOYMENT'
        $backupPath = New-Backup -Type 'pre-deployment'
        
        # Build and deploy
        Write-SecurityLog -Level 'INFO' -Message 'Building production images...' -Component 'DEPLOYMENT'
        
        Push-Location $PROJECT_ROOT
        
        # Build main application
        $buildArgs = @(
            '--target', 'production'
            '--build-arg', "BUILD_DATE=$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')"
            '--build-arg', "VERSION=$DeploymentVersion"
            '--build-arg', "VCS_REF=$(git rev-parse HEAD)"
            '--tag', "billetterie:$DeploymentVersion"
            '--tag', 'billetterie:latest'
            '--file', 'docker/Dockerfile.prod'
            '.'
        )
        
        & docker build @buildArgs
        
        if ($LASTEXITCODE -ne 0) {
            throw "Docker build failed"
        }
        
        Write-SecurityLog -Level 'SUCCESS' -Message 'Docker images built successfully' -Component 'DEPLOYMENT'
        
        # Deploy with zero-downtime strategy
        Write-SecurityLog -Level 'INFO' -Message 'Executing zero-downtime deployment...' -Component 'DEPLOYMENT'
        
        # Update services one by one
        $services = @('app1', 'app2')
        foreach ($service in $services) {
            Write-SecurityLog -Level 'INFO' -Message "Updating service: $service" -Component 'DEPLOYMENT'
            
            & docker-compose stop $service
            & docker-compose rm -f $service
            & docker-compose up -d $service
            
            # Wait for health check
            $healthCheckAttempts = 0
            $maxHealthCheckAttempts = 30
            
            do {
                Start-Sleep -Seconds 10
                $healthCheckAttempts++
                
                $isHealthy = & docker-compose exec -T $service curl -f http://localhost:3000/api/health 2>$null
                
                if ($LASTEXITCODE -eq 0) {
                    Write-SecurityLog -Level 'SUCCESS' -Message "$service is healthy" -Component 'DEPLOYMENT'
                    break
                }
                
                Write-SecurityLog -Level 'INFO' -Message "Waiting for $service to become healthy... ($healthCheckAttempts/$maxHealthCheckAttempts)" -Component 'DEPLOYMENT'
                
            } while ($healthCheckAttempts -lt $maxHealthCheckAttempts)
            
            if ($healthCheckAttempts -ge $maxHealthCheckAttempts) {
                throw "$service failed to become healthy"
            }
        }
        
        # Post-deployment verification
        Write-SecurityLog -Level 'INFO' -Message 'Running post-deployment verification...' -Component 'DEPLOYMENT'
        
        $verificationUrls = @(
            'http://localhost/api/health'
            'http://localhost/api/events'
            'http://localhost/metrics'
        )
        
        foreach ($url in $verificationUrls) {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-SecurityLog -Level 'SUCCESS' -Message "Verification passed: $url" -Component 'DEPLOYMENT'
            }
            else {
                throw "Verification failed for $url (Status: $($response.StatusCode))"
            }
        }
        
        Write-SecurityLog -Level 'SUCCESS' -Message "Deployment $DeploymentVersion completed successfully" -Component 'DEPLOYMENT'
        Send-Alert -Severity 'INFO' -Title 'Deployment Successful' -Message "Version $DeploymentVersion deployed successfully to $Environment"
        
    }
    catch {
        Write-SecurityLog -Level 'ERROR' -Message "Deployment failed: $($_.Exception.Message)" -Component 'DEPLOYMENT'
        Send-Alert -Severity 'CRITICAL' -Title 'Deployment Failed' -Message "Deployment version $DeploymentVersion failed: $($_.Exception.Message)"
        
        # Attempt rollback if backup exists
        if ($backupPath -and (Test-Path $backupPath)) {
            Write-SecurityLog -Level 'INFO' -Message 'Attempting automatic rollback...' -Component 'DEPLOYMENT'
            try {
                Restore-Backup -BackupPath $backupPath
                Write-SecurityLog -Level 'SUCCESS' -Message 'Rollback completed successfully' -Component 'DEPLOYMENT'
            }
            catch {
                Write-SecurityLog -Level 'ERROR' -Message "Rollback failed: $($_.Exception.Message)" -Component 'DEPLOYMENT'
            }
        }
        
        throw
    }
    finally {
        Pop-Location
    }
}

function New-Backup {
    param(
        [string]$Type = 'manual'
    )
    
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupPath = "$BACKUP_DIR\$Type-$timestamp"
    
    Write-SecurityLog -Level 'INFO' -Message "Creating $Type backup at $backupPath" -Component 'BACKUP'
    
    New-Item -ItemType Directory -Force -Path $backupPath | Out-Null
    
    try {
        Push-Location $PROJECT_ROOT
        
        # Database backup
        Write-SecurityLog -Level 'INFO' -Message 'Backing up database...' -Component 'BACKUP'
        & docker-compose exec -T db pg_dump $env:DATABASE_URL | gzip > "$backupPath\database.sql.gz"
        
        # Application data backup
        Write-SecurityLog -Level 'INFO' -Message 'Backing up application data...' -Component 'BACKUP'
        if (docker-compose exec -T app test -d /app/uploads) {
            & docker-compose exec -T app tar -czf - /app/uploads > "$backupPath\uploads.tar.gz"
        }
        
        # Configuration backup
        Copy-Item -Path ".env*" -Destination $backupPath -ErrorAction SilentlyContinue
        Copy-Item -Path "docker-compose*.yml" -Destination $backupPath -ErrorAction SilentlyContinue
        
        # Create backup manifest
        $manifest = @{
            timestamp = $timestamp
            type = $Type
            version = if (Get-Command git -ErrorAction SilentlyContinue) { git rev-parse HEAD } else { 'unknown' }
            environment = $Environment
            created_by = $env:USERNAME
        } | ConvertTo-Json -Depth 2
        
        $manifest | Out-File -FilePath "$backupPath\manifest.json" -Encoding UTF8
        
        Write-SecurityLog -Level 'SUCCESS' -Message "Backup created successfully at $backupPath" -Component 'BACKUP'
        return $backupPath
    }
    catch {
        Write-SecurityLog -Level 'ERROR' -Message "Backup failed: $($_.Exception.Message)" -Component 'BACKUP'
        throw
    }
    finally {
        Pop-Location
    }
}

function Restore-Backup {
    param(
        [string]$BackupPath
    )
    
    if (-not (Test-Path $BackupPath)) {
        throw "Backup path does not exist: $BackupPath"
    }
    
    Write-SecurityLog -Level 'INFO' -Message "Restoring backup from $BackupPath" -Component 'RESTORE'
    
    try {
        Push-Location $PROJECT_ROOT
        
        # Stop services
        & docker-compose down
        
        # Restore database
        if (Test-Path "$BackupPath\database.sql.gz") {
            Write-SecurityLog -Level 'INFO' -Message 'Restoring database...' -Component 'RESTORE'
            & docker-compose up -d db
            Start-Sleep -Seconds 30 # Wait for database to be ready
            
            Get-Content "$BackupPath\database.sql.gz" | gunzip | docker-compose exec -T db psql $env:DATABASE_URL
        }
        
        # Restore application data
        if (Test-Path "$BackupPath\uploads.tar.gz") {
            Write-SecurityLog -Level 'INFO' -Message 'Restoring application data...' -Component 'RESTORE'
            & docker-compose exec -T app tar -xzf - -C / < "$BackupPath\uploads.tar.gz"
        }
        
        # Start all services
        & docker-compose up -d
        
        Write-SecurityLog -Level 'SUCCESS' -Message 'Backup restored successfully' -Component 'RESTORE'
    }
    catch {
        Write-SecurityLog -Level 'ERROR' -Message "Restore failed: $($_.Exception.Message)" -Component 'RESTORE'
        throw
    }
    finally {
        Pop-Location
    }
}

function Start-SecurityMonitoring {
    Write-SecurityLog -Level 'INFO' -Message 'Starting continuous security monitoring...' -Component 'MONITOR'
    
    $monitoringActive = $true
    
    # Register Ctrl+C handler
    [Console]::TreatControlCAsInput = $false
    $null = Register-EngineEvent PowerShell.Exiting -Action {
        $script:monitoringActive = $false
        Write-SecurityLog -Level 'INFO' -Message 'Stopping security monitoring...' -Component 'MONITOR'
    }
    
    while ($monitoringActive) {
        try {
            # Check system health
            $systemHealth = Test-SystemHealth
            
            # Check for security threats
            $threatStatus = Test-SecurityThreats
            
            # Check application health
            $appHealth = Test-ApplicationHealth
            
            # Log monitoring status
            Write-SecurityLog -Level 'INFO' -Message "Monitoring cycle completed - System: $($systemHealth.Status), Threats: $($threatStatus.Status), App: $($appHealth.Status)" -Component 'MONITOR'
            
            # Alert on issues
            if ($systemHealth.Status -eq 'CRITICAL' -or $threatStatus.Status -eq 'CRITICAL' -or $appHealth.Status -eq 'CRITICAL') {
                $issues = @()
                if ($systemHealth.Status -eq 'CRITICAL') { $issues += $systemHealth.Issues }
                if ($threatStatus.Status -eq 'CRITICAL') { $issues += $threatStatus.Issues }
                if ($appHealth.Status -eq 'CRITICAL') { $issues += $appHealth.Issues }
                
                Send-Alert -Severity 'CRITICAL' -Title 'Critical System Issues Detected' -Message ($issues -join '; ')
            }
            
            Start-Sleep -Seconds 60
        }
        catch {
            Write-SecurityLog -Level 'ERROR' -Message "Monitoring error: $($_.Exception.Message)" -Component 'MONITOR'
            Start-Sleep -Seconds 30
        }
    }
}

function Test-SystemHealth {
    $health = @{
        Status = 'OK'
        Issues = @()
    }
    
    # Check CPU usage
    $cpuUsage = (Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
    if ($cpuUsage -gt 80) {
        $health.Status = 'CRITICAL'
        $health.Issues += "High CPU usage: $cpuUsage%"
    }
    
    # Check memory usage
    $memory = Get-WmiObject -Class Win32_OperatingSystem
    $memoryUsage = [math]::Round((($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / $memory.TotalVisibleMemorySize) * 100, 2)
    if ($memoryUsage -gt 90) {
        $health.Status = 'CRITICAL'
        $health.Issues += "High memory usage: $memoryUsage%"
    }
    
    # Check disk space
    $disk = Get-WmiObject -Class Win32_LogicalDisk | Where-Object DeviceID -eq 'C:'
    $diskUsage = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2)
    if ($diskUsage -gt 90) {
        $health.Status = 'CRITICAL'
        $health.Issues += "High disk usage: $diskUsage%"
    }
    
    return $health
}

function Test-SecurityThreats {
    $threatStatus = @{
        Status = 'OK'
        Issues = @()
    }
    
    # Check for suspicious processes
    $suspiciousProcesses = Get-Process | Where-Object { $_.ProcessName -match 'hack|exploit|malware|virus' }
    if ($suspiciousProcesses) {
        $threatStatus.Status = 'CRITICAL'
        $threatStatus.Issues += "Suspicious processes detected: $($suspiciousProcesses.ProcessName -join ', ')"
    }
    
    # Check for unusual network connections
    $connections = Get-NetTCPConnection | Where-Object State -eq 'Established'
    $suspiciousConnections = $connections | Where-Object RemotePort -in @(6667, 6668, 6669, 1337, 31337) # Common malware ports
    if ($suspiciousConnections) {
        $threatStatus.Status = 'CRITICAL'
        $threatStatus.Issues += "Suspicious network connections detected"
    }
    
    return $threatStatus
}

function Test-ApplicationHealth {
    $appHealth = @{
        Status = 'OK'
        Issues = @()
    }
    
    try {
        # Test main application endpoint
        $response = Invoke-WebRequest -Uri 'http://localhost/api/health' -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -ne 200) {
            $appHealth.Status = 'CRITICAL'
            $appHealth.Issues += "Application health check failed (Status: $($response.StatusCode))"
        }
    }
    catch {
        $appHealth.Status = 'CRITICAL'
        $appHealth.Issues += "Application health check failed: $($_.Exception.Message)"
    }
    
    # Check Docker containers
    try {
        $containers = docker ps --format "table {{.Names}}\t{{.Status}}" | ConvertFrom-Csv -Delimiter "`t"
        $unhealthyContainers = $containers | Where-Object Status -notmatch 'Up|healthy'
        if ($unhealthyContainers) {
            $appHealth.Status = 'CRITICAL'
            $appHealth.Issues += "Unhealthy containers: $($unhealthyContainers.Names -join ', ')"
        }
    }
    catch {
        $appHealth.Status = 'CRITICAL'
        $appHealth.Issues += "Failed to check container status: $($_.Exception.Message)"
    }
    
    return $appHealth
}

function Show-SystemStatus {
    Write-Host "`n=== BILLETTERIE SYSTEM STATUS ===" -ForegroundColor Cyan
    Write-Host "Environment: $Environment" -ForegroundColor White
    Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
    Write-Host ""
    
    # System Health
    Write-Host "SYSTEM HEALTH:" -ForegroundColor Yellow
    $systemHealth = Test-SystemHealth
    Write-Host "  Status: $($systemHealth.Status)" -ForegroundColor $(if ($systemHealth.Status -eq 'OK') { 'Green' } else { 'Red' })
    foreach ($issue in $systemHealth.Issues) {
        Write-Host "  - $issue" -ForegroundColor Red
    }
    
    # Application Health
    Write-Host "`nAPPLICATION HEALTH:" -ForegroundColor Yellow
    $appHealth = Test-ApplicationHealth
    Write-Host "  Status: $($appHealth.Status)" -ForegroundColor $(if ($appHealth.Status -eq 'OK') { 'Green' } else { 'Red' })
    foreach ($issue in $appHealth.Issues) {
        Write-Host "  - $issue" -ForegroundColor Red
    }
    
    # Security Status
    Write-Host "`nSECURITY STATUS:" -ForegroundColor Yellow
    $threatStatus = Test-SecurityThreats
    Write-Host "  Status: $($threatStatus.Status)" -ForegroundColor $(if ($threatStatus.Status -eq 'OK') { 'Green' } else { 'Red' })
    foreach ($issue in $threatStatus.Issues) {
        Write-Host "  - $issue" -ForegroundColor Red
    }
    
    # Docker Status
    Write-Host "`nDOCKER CONTAINERS:" -ForegroundColor Yellow
    try {
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    }
    catch {
        Write-Host "  Failed to retrieve container status" -ForegroundColor Red
    }
    
    # Recent Logs
    Write-Host "`nRECENT LOG ENTRIES:" -ForegroundColor Yellow
    $logFile = "$LOG_DIR\security-operations-$(Get-Date -Format 'yyyyMMdd').log"
    if (Test-Path $logFile) {
        Get-Content $logFile | Select-Object -Last 5 | ForEach-Object {
            Write-Host "  $_" -ForegroundColor Gray
        }
    }
    else {
        Write-Host "  No log file found" -ForegroundColor Gray
    }
    
    Write-Host "`n=== END STATUS REPORT ===" -ForegroundColor Cyan
}

# Main execution logic
try {
    Write-SecurityLog -Level 'INFO' -Message "Starting Billetterie Security Operations - Action: $Action" -Component 'MAIN'
    
    switch ($Action.ToLower()) {
        'deploy' {
            if ($DryRun) {
                Write-SecurityLog -Level 'INFO' -Message 'DRY RUN MODE - No actual deployment will be performed' -Component 'MAIN'
                $null = Test-Prerequisites
                $null = Invoke-SecurityScan
                Write-SecurityLog -Level 'SUCCESS' -Message 'Dry run completed successfully' -Component 'MAIN'
            }
            else {
                Start-ProductionDeployment -DeploymentVersion $Version
            }
        }
        
        'monitor' {
            Start-SecurityMonitoring
        }
        
        'secure' {
            $scanResults = Invoke-SecurityScan
            Write-SecurityLog -Level 'INFO' -Message "Security scan completed with status: $($scanResults.OverallStatus)" -Component 'MAIN'
        }
        
        'backup' {
            $backupPath = New-Backup -Type 'manual'
            Write-SecurityLog -Level 'SUCCESS' -Message "Manual backup created: $backupPath" -Component 'MAIN'
        }
        
        'disaster' {
            Write-SecurityLog -Level 'INFO' -Message 'Disaster recovery mode not yet implemented in PowerShell version' -Component 'MAIN'
            # TODO: Implement disaster recovery procedures
        }
        
        'incident' {
            Write-SecurityLog -Level 'INFO' -Message 'Security incident response mode not yet implemented in PowerShell version' -Component 'MAIN'
            # TODO: Implement incident response procedures
        }
        
        'status' {
            Show-SystemStatus
        }
        
        default {
            Write-SecurityLog -Level 'ERROR' -Message "Unknown action: $Action" -Component 'MAIN'
            Write-Host "`nUsage: .\security-operations.ps1 -Action <deploy|monitor|secure|backup|disaster|incident|status> [options]"
            Write-Host "`nExamples:"
            Write-Host "  .\security-operations.ps1 -Action deploy -Version 1.2.3"
            Write-Host "  .\security-operations.ps1 -Action monitor"
            Write-Host "  .\security-operations.ps1 -Action secure -SecurityLevel strict"
            Write-Host "  .\security-operations.ps1 -Action status"
            exit 1
        }
    }
    
    Write-SecurityLog -Level 'SUCCESS' -Message "Operation '$Action' completed successfully" -Component 'MAIN'
}
catch {
    Write-SecurityLog -Level 'ERROR' -Message "Operation failed: $($_.Exception.Message)" -Component 'MAIN'
    Send-Alert -Severity 'CRITICAL' -Title 'Operation Failed' -Message "Billetterie operation '$Action' failed: $($_.Exception.Message)"
    exit 1
}
