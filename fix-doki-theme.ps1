# Script para solucionar problemas con Doki Theme en Cursor
# Ejecutar como administrador si es necesario

Write-Host "Solucionando problema con Doki Theme en Cursor..." -ForegroundColor Cyan

# 1. Verificar si la extension esta instalada
$dokiPath = Get-ChildItem -Path "$env:USERPROFILE\.cursor\extensions" -Filter "*doki-theme*" -Directory -ErrorAction SilentlyContinue

if ($dokiPath) {
    Write-Host "`n[OK] Extension encontrada en: $($dokiPath.FullName)" -ForegroundColor Green
    
    # 2. Mostrar informacion de la extension
    $packageJson = Join-Path $dokiPath.FullName "package.json"
    if (Test-Path $packageJson) {
        $package = Get-Content $packageJson | ConvertFrom-Json
        Write-Host "   Version: $($package.version)" -ForegroundColor Yellow
        Write-Host "   Nombre: $($package.displayName)" -ForegroundColor Yellow
    }
    
    # 3. Preguntar si desea eliminar y reinstalar
    Write-Host "`n[ADVERTENCIA] La extension esta instalada pero no se activa correctamente." -ForegroundColor Yellow
    $response = Read-Host "Deseas eliminar y reinstalar la extension? (S/N)"
    
    if ($response -eq "S" -or $response -eq "s") {
        Write-Host "`n[ELIMINANDO] Eliminando extension..." -ForegroundColor Red
        Remove-Item -Recurse -Force $dokiPath.FullName
        Write-Host "[OK] Extension eliminada" -ForegroundColor Green
        Write-Host "`n[INSTRUCCIONES] Ahora:" -ForegroundColor Cyan
        Write-Host "   1. Abre Cursor" -ForegroundColor White
        Write-Host "   2. Presiona Ctrl+Shift+X (Extensiones)" -ForegroundColor White
        Write-Host "   3. Busca 'Doki Theme' e instalala" -ForegroundColor White
        Write-Host "   4. Recarga la ventana (Ctrl+Shift+P -> Developer: Reload Window)" -ForegroundColor White
    } else {
        Write-Host "`n[ALTERNATIVA] Soluciones alternativas:" -ForegroundColor Cyan
        Write-Host "   1. Presiona Ctrl+Shift+P" -ForegroundColor White
        Write-Host "   2. Escribe: Preferences: Color Theme" -ForegroundColor White
        Write-Host "   3. Busca temas de 'Hatsune Miku' o 'Doki' en la lista" -ForegroundColor White
        Write-Host "   4. Selecciona el tema directamente (sin usar comandos)" -ForegroundColor White
    }
} else {
    Write-Host "`n[ERROR] Extension Doki Theme no encontrada" -ForegroundColor Red
    Write-Host "`n[INSTRUCCIONES] Para instalar:" -ForegroundColor Cyan
    Write-Host "   1. Abre Cursor" -ForegroundColor White
    Write-Host "   2. Presiona Ctrl+Shift+X (Extensiones)" -ForegroundColor White
    Write-Host "   3. Busca 'Doki Theme' e instalala" -ForegroundColor White
}

Write-Host "`n[COMPLETADO] Script completado" -ForegroundColor Green
Write-Host "`nPresiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
