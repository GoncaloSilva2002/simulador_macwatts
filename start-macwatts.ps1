# Arranca a MacWatts em Node.js com as mesmas credenciais Supabase da app Comunidade Energia.
# As chaves permanecem no .env da outra app e nunca sao escritas neste projeto.
param(
  [string]$SupabaseEnvPath = (Join-Path (Split-Path $PSScriptRoot -Parent) "comunidade energia\.env")
)

if (!(Test-Path -LiteralPath $SupabaseEnvPath)) {
  throw "Nao encontrei o .env da Comunidade Energia em: $SupabaseEnvPath"
}

Get-Content -LiteralPath $SupabaseEnvPath | ForEach-Object {
  if ($_ -match '^\s*(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|RESEND_FROM|RESEND_ENABLED|MAIL_HOST|MAIL_PORT|MAIL_USERNAME|MAIL_PASSWORD|MAIL_FROM|APP_COMPANY_EMAIL|APP_MAPS_STATIC_KEY|APP_MAPS_BROWSER_KEY)=(.*)$') {
    Set-Item -Path "Env:$($matches[1])" -Value $matches[2].Trim()
  }
}

if ([string]::IsNullOrWhiteSpace($env:SUPABASE_URL) -or [string]::IsNullOrWhiteSpace($env:SUPABASE_SERVICE_ROLE_KEY)) {
  throw "Faltam SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env da Comunidade Energia."
}

if (!(Test-Path -LiteralPath (Join-Path $PSScriptRoot "node_modules"))) {
  npm install
}

npm start
