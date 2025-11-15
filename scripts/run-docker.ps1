param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('dev','prod')]
  [string]$Env,

  [Parameter(Mandatory=$false)]
  [ValidateSet('up','down','restart','logs','status','down-v','clean','rebuild','pull','prune','doctor','seed','migrate')]
  [string]$Action = 'up',

  [switch]$Monitoring,
  [switch]$Build
)

$ErrorActionPreference = 'Stop'

function Fail($msg) { Write-Error "[run-docker] $msg"; exit 1 }

$Root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Set-Location $Root

if ($Env -eq 'dev') {
  $env:COMPOSE_ENV = 'dev'
  $env:COMPOSE_NETWORK = 'billetterie-dev-network'
  $envFile = '.env.dev'
  $composeFiles = @('-f','docker-compose.dev.yml')
}
else {
  $env:COMPOSE_ENV = 'prod'
  $env:COMPOSE_NETWORK = 'billetterie-network'
  $envFile = '.env.prod'
  $composeFiles = @('-f','docker-compose.yml','-f','docker-compose.prod.yml')
}

if ($Monitoring) {
  $composeFiles += @('-f','docker-compose.monitoring.yml')
}

if (!(Test-Path $envFile)) { Fail "Fichier d'environnement manquant: $envFile" }

$baseCmd = @('compose') + $composeFiles + @('--env-file', $envFile)

switch ($Action) {
  'up' {
    if ($Build) { & docker @($baseCmd + 'build') }
    & docker @($baseCmd + @('up','-d'))
  }
  'down' {
    & docker @($baseCmd + 'down')
  }
  'down-v' {
    & docker @($baseCmd + @('down','-v','--remove-orphans'))
  }
  'clean' {
    try { & docker @($baseCmd + @('down','-v','--remove-orphans')) } catch {}
    & docker @('system','prune','-f')
  }
  'restart' {
    & docker @($baseCmd + 'down')
    if ($Build) { & docker @($baseCmd + 'build') }
    & docker @($baseCmd + @('up','-d'))
  }
  'rebuild' {
    try { & docker @($baseCmd + 'down') } catch {}
    & docker @($baseCmd + 'build')
    & docker @($baseCmd + @('up','-d'))
  }
  'pull' {
    & docker @($baseCmd + 'pull')
  }
  'prune' {
    & docker @('system','prune','-f')
  }
  'doctor' {
    & docker @($baseCmd + 'config')
  }
  'seed' {
    if ($Env -ne 'dev') { Fail "L'action 'seed' est disponible uniquement en environnement dev" }
    & docker @('compose','-f','docker-compose.dev.yml','--env-file','.env.dev','exec','web-dev','yarn','prisma','db','seed')
  }
  'migrate' {
    if ($Env -ne 'prod') { Fail "L'action 'migrate' est prévue pour la production" }
    & docker @($baseCmd + @('run','--rm','migrate'))
  }
  'logs' {
    & docker @($baseCmd + @('logs','-f'))
  }
  'status' {
    & docker @($baseCmd + 'ps')
  }
  default { Fail "Unknown action: $Action" }
}

Write-Host "[run-docker] Done ($Env, monitoring=$Monitoring, action=$Action)." -ForegroundColor Green
