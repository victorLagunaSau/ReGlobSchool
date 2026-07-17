'use client';

export default function Home() {
  const handleLogoutSimulado = () => {
    // Borramos la cookie de prueba expirándola de inmediato
    document.cookie = "regoschol_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = '/login'; // Redirección limpia al Login
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">

        {/* Encabezado */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            RegoSchol
          </h1>
          <p className="text-sm text-slate-500">
            Control de escuelas, pagos y automatización con IA
          </p>
        </div>

        {/* Estatus Seguro */}
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-4 text-center text-sm font-medium">
          🚀 Dashboard Protegido por Servidor (Sin parpadeo)
        </div>

        {/* Botón Salir */}
        <button
          onClick={handleLogoutSimulado}
          className="w-full py-2 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl transition-colors text-sm active:scale-[0.98] transform"
        >
          Cerrar Sesión
        </button>
      </div>
    </main>
  );
}