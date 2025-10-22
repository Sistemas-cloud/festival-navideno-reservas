<?php
// ============================================
// Script de Migración Completa: MySQL → Supabase
// Tablas: alumno, alumno_detalles, alumno_familiar
// ============================================

// ============================================
// Configuración MySQL
// ============================================
$mysql_host = "localhost";
$mysql_user = "winston_richard";
$mysql_pass = "101605";
$mysql_db   = "winston_general"; // ⚠️ IMPORTANTE: Especifica tu base de datos

// ============================================
// Configuración Supabase
// ============================================
$supabase_url = "https://nmxrccrbnoenkahefrrw.supabase.co";
$supabase_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5teHJjY3Jibm9lbmthaGVmcnJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE1MTg0OCwiZXhwIjoyMDY5NzI3ODQ4fQ._SIR3rmq7TWukuym30cCP4BAKGe-dhnillDV0Bz6Hf0";

// Configuración de tablas a migrar
$tablas = [
    [
        'nombre' => 'alumno',
        'pk' => 'alumno_id',
        'query' => 'SELECT * FROM alumno',
        'enriquecer' => true // Agregar alumno_nombre_completo
    ],
    [
        'nombre' => 'alumno_detalles',
        'pk' => 'detalle_id',
        'query' => 'SELECT * FROM alumno_detalles',
        'enriquecer' => false
    ],
    [
        'nombre' => 'alumno_familiar',
        'pk' => 'familiar_id',
        'query' => 'SELECT * FROM alumno_familiar',
        'enriquecer' => false
    ]
];

// ============================================
// Configuración de salida (Web o CLI)
// ============================================
$is_web = (php_sapi_name() !== 'cli');
$redirect_url = ''; // URL a redirigir después (vacío = no redirigir)

if ($is_web) {
    if (!headers_sent()) {
        header('Content-Type: text/html; charset=UTF-8');
    }
    echo '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<title>🎄 Migración Festival Navideño → Supabase</title>';
    echo '<style>
        :root { --bg:#0f172a; --card:#111827; --muted:#94a3b8; --ok:#10b981; --err:#ef4444; --warn:#f59e0b; --border:#1f2937; }
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:linear-gradient(135deg,#0f172a,#0b1022);color:#e5e7eb;font-family:system-ui,-apple-system,sans-serif;padding:20px}
        .wrap{max-width:900px;margin:0 auto}
        .card{background:rgba(17,24,39,.85);backdrop-filter:blur(10px);border:1px solid var(--border);border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.4);overflow:hidden;margin-bottom:20px}
        h1{padding:24px;font-size:24px;text-align:center;background:linear-gradient(90deg,#60a5fa,#34d399);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:bold}
        table{width:100%;border-collapse:collapse}
        td{padding:12px 20px;border-top:1px solid var(--border);font-size:14px}
        td.info{color:#cbd5e1}
        td.ok{color:var(--ok)}
        td.error{color:var(--err)}
        td.warn{color:var(--warn)}
        .progress{padding:20px;text-align:center;font-size:16px;font-weight:600}
    </style></head><body><div class="wrap"><div class="card"><h1>🎄 Migración Festival Navideño → Supabase 🎄</h1><table>';
}

function out_line($message, $type = 'info') {
    global $is_web;
    if ($is_web) {
        $safe = htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        echo '<tr><td class="' . $type . '">' . $safe . '</td></tr>';
        @ob_flush(); @flush();
    } else {
        echo $message . PHP_EOL;
    }
}

function close_html() {
    global $is_web, $redirect_url;
    if ($is_web) {
        if (!empty($redirect_url)) {
            echo '<script>setTimeout(function(){ window.location.href = ' . json_encode($redirect_url) . ' }, 3000);</script>';
        }
        echo '</table></div></div></body></html>';
    }
}

// ============================================
// Conectar a MySQL
// ============================================
out_line("🔌 Conectando a MySQL...", 'info');
$mysqli = new mysqli($mysql_host, $mysql_user, $mysql_pass, $mysql_db);

if ($mysqli->connect_errno) {
    out_line("❌ Error MySQL: " . $mysqli->connect_error, 'error');
    close_html();
    exit(1);
}

if (!$mysqli->set_charset('utf8mb4')) {
    out_line("⚠️ Advertencia: No se pudo establecer charset utf8mb4", 'warn');
}

out_line("✅ Conectado a MySQL: $mysql_db", 'ok');

// ============================================
// Funciones de Supabase
// ============================================

function vaciarTablaSupabase($supabase_url, $tabla, $supabase_token, $pk_column) {
    $url = "$supabase_url/rest/v1/$tabla?" . rawurlencode($pk_column) . "=not.is.null";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Accept: application/json",
        "apikey: $supabase_token",
        "Authorization: Bearer $supabase_token",
        "Prefer: return=minimal"
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
    
    $response = curl_exec($ch);
    if ($response === false) {
        $error = curl_error($ch);
        curl_close($ch);
        return ['ok' => false, 'error' => "cURL: $error"];
    }
    
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code >= 200 && $http_code < 300) {
        return ['ok' => true, 'http_code' => $http_code];
    } else {
        return ['ok' => false, 'http_code' => $http_code, 'response' => $response];
    }
}

function enviarLoteSupabase($lote, $supabase_url, $tabla, $supabase_token) {
    $payload = json_encode($lote, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    
    if ($payload === false) {
        return ['ok' => false, 'error' => "JSON: " . json_last_error_msg()];
    }
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "$supabase_url/rest/v1/$tabla");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Content-Type: application/json",
        "Accept: application/json",
        "apikey: $supabase_token",
        "Authorization: Bearer $supabase_token",
        "Prefer: resolution=merge-duplicates"
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
    
    $response = curl_exec($ch);
    if ($response === false) {
        $error = curl_error($ch);
        curl_close($ch);
        return ['ok' => false, 'error' => "cURL: $error"];
    }
    
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code >= 200 && $http_code < 300) {
        return ['ok' => true, 'http_code' => $http_code];
    } else {
        return ['ok' => false, 'http_code' => $http_code, 'response' => $response];
    }
}

// ============================================
// Migrar cada tabla
// ============================================
$total_tablas = count($tablas);
$tablas_exitosas = 0;

foreach ($tablas as $idx => $tabla_config) {
    $tabla_nombre = $tabla_config['nombre'];
    $tabla_pk = $tabla_config['pk'];
    $tabla_query = $tabla_config['query'];
    $enriquecer = $tabla_config['enriquecer'];
    
    out_line("", 'info');
    out_line("📋 [" . ($idx + 1) . "/$total_tablas] Procesando tabla: $tabla_nombre", 'info');
    out_line("─────────────────────────────────────────────", 'info');
    
    // Obtener datos de MySQL
    out_line("📥 Obteniendo datos de MySQL...", 'info');
    $result = $mysqli->query($tabla_query);
    
    if (!$result) {
        out_line("❌ Error en query: " . $mysqli->error, 'error');
        continue;
    }
    
    $num_rows = $result->num_rows;
    
    if ($num_rows === 0) {
        out_line("⚠️ Tabla vacía, saltando...", 'warn');
        continue;
    }
    
    out_line("✅ Obtenidos $num_rows registros", 'ok');
    
    // Pasar a array
    $datos = [];
    while ($row = $result->fetch_assoc()) {
        $datos[] = $row;
    }
    
    // Enriquecer datos si es necesario (alumno_nombre_completo para tabla alumno)
    if ($enriquecer) {
        out_line("🔧 Enriqueciendo datos (nombre completo)...", 'info');
        for ($i = 0; $i < count($datos); $i++) {
            $nombre = isset($datos[$i]['alumno_nombre']) ? trim($datos[$i]['alumno_nombre']) : '';
            $app = isset($datos[$i]['alumno_app']) ? trim($datos[$i]['alumno_app']) : '';
            $apm = isset($datos[$i]['alumno_apm']) ? trim($datos[$i]['alumno_apm']) : '';
            
            $partes = [];
            if ($nombre !== '') $partes[] = $nombre;
            if ($app !== '') $partes[] = $app;
            if ($apm !== '') $partes[] = $apm;
            
            $completo = implode(' ', $partes);
            $completo = preg_replace('/\s+/u', ' ', trim($completo));
            
            $datos[$i]['alumno_nombre_completo'] = $completo;
        }
    }
    
    // Vaciar tabla en Supabase
    out_line("🧹 Vaciando tabla en Supabase...", 'info');
    $resultado_vaciado = vaciarTablaSupabase($supabase_url, $tabla_nombre, $supabase_token, $tabla_pk);
    
    if ($resultado_vaciado['ok']) {
        out_line("✅ Tabla vaciada correctamente", 'ok');
    } else {
        $detalle = isset($resultado_vaciado['error']) 
            ? $resultado_vaciado['error'] 
            : "HTTP " . ($resultado_vaciado['http_code'] ?? '???');
        out_line("⚠️ Advertencia al vaciar: $detalle", 'warn');
    }
    
    // Enviar en lotes
    $chunk_size = 500;
    $chunks = array_chunk($datos, $chunk_size);
    $num_chunks = count($chunks);
    
    out_line("📦 Enviando $num_chunks lotes de máximo $chunk_size registros...", 'info');
    
    $lotes_exitosos = 0;
    foreach ($chunks as $i => $lote) {
        $resultado = enviarLoteSupabase($lote, $supabase_url, $tabla_nombre, $supabase_token);
        
        if ($resultado['ok']) {
            $lotes_exitosos++;
            out_line("  ✓ Lote " . ($i + 1) . "/$num_chunks (" . count($lote) . " registros): OK", 'ok');
        } else {
            $detalle = isset($resultado['error']) 
                ? $resultado['error'] 
                : "HTTP " . ($resultado['http_code'] ?? '???') . " - " . substr($resultado['response'] ?? '', 0, 100);
            out_line("  ✗ Lote " . ($i + 1) . "/$num_chunks: ERROR - $detalle", 'error');
        }
    }
    
    if ($lotes_exitosos === $num_chunks) {
        out_line("✅ Tabla '$tabla_nombre' migrada exitosamente ($num_rows registros)", 'ok');
        $tablas_exitosas++;
    } else {
        out_line("⚠️ Tabla '$tabla_nombre' migrada con errores ($lotes_exitosos/$num_chunks lotes exitosos)", 'warn');
    }
}

// ============================================
// Cerrar conexión MySQL
// ============================================
$mysqli->close();

// ============================================
// Resumen final
// ============================================
out_line("", 'info');
out_line("═════════════════════════════════════════════", 'info');
out_line("🎉 Migración completada", 'info');
out_line("═════════════════════════════════════════════", 'info');
out_line("📊 Resumen:", 'info');
out_line("   • Tablas procesadas: $tablas_exitosas/$total_tablas", $tablas_exitosas === $total_tablas ? 'ok' : 'warn');
out_line("   • Base de datos: $mysql_db → Supabase", 'info');
out_line("   • Estado: " . ($tablas_exitosas === $total_tablas ? "✅ ÉXITO TOTAL" : "⚠️ COMPLETADO CON ADVERTENCIAS"), $tablas_exitosas === $total_tablas ? 'ok' : 'warn');
out_line("", 'info');
out_line("🔄 Próximo paso: Verificar datos en Supabase Dashboard", 'info');

close_html();
?>

