# Script simple para eliminar Doki Theme
$dokiPath = Get-ChildItem -Path "$env:USERPROFILE\.cursor\extensions" -Filter "*doki-theme*" -Directory -ErrorAction SilentlyContinue

if ($dokiPath) {
    Write-Host "Eliminando extension Doki Theme..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $dokiPath.FullName
    Write-Host "Extension eliminada exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ahora:" -ForegroundColor Cyan
    Write-Host "1. Abre Cursor" -ForegroundColor White
    Write-Host "2. Presiona Ctrl+Shift+X (Extensiones)" -ForegroundColor White
    Write-Host "3. Busca 'Doki Theme' e instalala" -ForegroundColor White
    Write-Host "4. Recarga la ventana (Ctrl+Shift+P -> Developer: Reload Window)" -ForegroundColor White
} else {
    Write-Host "Extension no encontrada" -ForegroundColor Red
}


















