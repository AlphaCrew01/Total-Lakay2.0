import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';

export default function Home() {
  const { getCurrentUser, loading } = useAuthStore();

  useEffect(() => {
    getCurrentUser();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <main>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Total Lakay - Virtual E-commerce Platform
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Professional platform for buying and selling digital products and services
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              {/* Features */}
              <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="text-4xl mb-4">🛍️</div>
                <h3 className="text-xl font-bold mb-4">Easy Shopping</h3>
                <p className="text-gray-600">Browse thousands of digital products and services</p>
              </div>

              <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="text-4xl mb-4">🚚</div>
                <h3 className="text-xl font-bold mb-4">Real-time Tracking</h3>
                <p className="text-gray-600">Track your orders with real-time delivery updates</p>
              </div>

              <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-xl font-bold mb-4">Secure Payments</h3>
                <p className="text-gray-600">Safe and encrypted payment processing</p>
              </div>
            </div>

            <div className="mt-12">
              <a
                href="/shop"
                className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition"
              >
                Start Shopping
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
