import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "admin") {
      navigate("/");
      return;
    }

    fetch("/api/admin/stats", {
      headers: {
        Authorization: `Bearer ${token}`
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setStats(data.stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [navigate]);

  if (loading) return <div className="text-white p-6">Chargement...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard Administrateur</h1>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-semibold">Utilisateurs</h2>
            <p className="text-3xl mt-2">{stats.totalUsers}</p>
          </div>

          <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-semibold">Administrateurs</h2>
            <p className="text-3xl mt-2">{stats.admins}</p>
          </div>

          <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-semibold">Comptes vérifiés</h2>
            <p className="text-3xl mt-2">{stats.verifiedUsers}</p>
          </div>

          <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-semibold">Non vérifiés</h2>
            <p className="text-3xl mt-2">{stats.unverifiedUsers}</p>
          </div>
        </div>
      )}
    </div>
  );
}
