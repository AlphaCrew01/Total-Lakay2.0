'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import ProtectedLayout from '@/components/ProtectedLayout';
import Navbar from '@/components/Navbar';
import axios from 'axios';

interface Delivery {
  id: string;
  orderId: string;
  status: string;
  estimatedDeliveryDate: string;
}

export default function DeliveryDashboard() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    pending: 0,
    inDelivery: 0,
    failed: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.role === 'delivery') {
      fetchDeliveries();
    }
  }, [user]);

  const fetchDeliveries = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/deliveries`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setDeliveries(response.data.data.deliveries);

      // Fetch stats
      const statsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/deliveries/stats`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setStats(statsResponse.data.data);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDelivery = async (deliveryId: string) => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/deliveries/${deliveryId}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      alert('Delivery accepted!');
      fetchDeliveries();
    } catch (error) {
      console.error('Error accepting delivery:', error);
      alert('Error accepting delivery');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <main>
      <Navbar />
      <ProtectedLayout requiredRole="delivery">
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold mb-8">Delivery Dashboard</h1>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 mb-2">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 mb-2">Delivered</p>
                <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 mb-2">In Delivery</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inDelivery}</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 mb-2">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 mb-2">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
            </div>

            {/* Deliveries List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <h2 className="text-2xl font-bold p-6 border-b">My Deliveries</h2>
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left">Order ID</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Est. Delivery</th>
                    <th className="px-6 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map(delivery => (
                    <tr key={delivery.id} className="border-t hover:bg-gray-50">
                      <td className="px-6 py-4">{delivery.orderId.substring(0, 8)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded ${
                          delivery.status === 'delivered'
                            ? 'bg-green-100 text-green-800'
                            : delivery.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {delivery.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {new Date(delivery.estimatedDeliveryDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {delivery.status === 'pending' && (
                          <button
                            onClick={() => handleAcceptDelivery(delivery.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            Accept
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ProtectedLayout>
    </main>
  );
}
