'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import ProtectedLayout from '@/components/ProtectedLayout';
import Navbar from '@/components/Navbar';
import axios from 'axios';

interface AdminStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalDeliveries: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // In a real application, you'd fetch these from the API
      // For now, we'll set dummy data
      setStats({
        totalUsers: 250,
        totalOrders: 1250,
        totalRevenue: 45000,
        totalDeliveries: 1200
      });
      setRecentOrders([
        {
          id: '1',
          orderNumber: 'ORD-001',
          status: 'delivered',
          total: 150,
          createdAt: new Date().toISOString()
        }
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <main>
      <Navbar />
      <ProtectedLayout requiredRole="admin">
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 mb-2">Total Users</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.totalUsers || 0}</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 mb-2">Total Orders</p>
                <p className="text-3xl font-bold text-green-600">{stats?.totalOrders || 0}</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 mb-2">Total Revenue</p>
                <p className="text-3xl font-bold text-purple-600">
                  ${stats?.totalRevenue.toLocaleString() || 0}
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 mb-2">Deliveries</p>
                <p className="text-3xl font-bold text-orange-600">{stats?.totalDeliveries || 0}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6 mb-12">
              <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <a
                  href="/admin/users"
                  className="p-4 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-center font-bold"
                >
                  Manage Users
                </a>
                <a
                  href="/admin/products"
                  className="p-4 bg-green-50 text-green-600 rounded hover:bg-green-100 text-center font-bold"
                >
                  Manage Products
                </a>
                <a
                  href="/admin/orders"
                  className="p-4 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 text-center font-bold"
                >
                  View Orders
                </a>
                <a
                  href="/admin/deliveries"
                  className="p-4 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 text-center font-bold"
                >
                  Manage Deliveries
                </a>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <h2 className="text-2xl font-bold p-6 border-b">Recent Orders</h2>
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left">Order Number</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Total</th>
                    <th className="px-6 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.id} className="border-t hover:bg-gray-50">
                      <td className="px-6 py-4">{order.orderNumber}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">${order.total}</td>
                      <td className="px-6 py-4">
                        {new Date(order.createdAt).toLocaleDateString()}
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
