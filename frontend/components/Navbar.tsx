'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { items } = useCartStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-blue-600">Total Lakay</span>
          </Link>

          {/* Navigation */}
          <div className="hidden md:flex space-x-8">
            <Link href="/" className="text-gray-600 hover:text-blue-600">
              Home
            </Link>
            <Link href="/shop" className="text-gray-600 hover:text-blue-600">
              Shop
            </Link>
            {isAuthenticated && user?.role === 'admin' && (
              <Link href="/admin" className="text-gray-600 hover:text-blue-600">
                Dashboard
              </Link>
            )}
            {isAuthenticated && user?.role === 'delivery' && (
              <Link href="/delivery" className="text-gray-600 hover:text-blue-600">
                Deliveries
              </Link>
            )}
          </div>

          {/* Right side - Cart and Auth */}
          <div className="flex items-center space-x-4">
            {!isAuthenticated ? (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Register
                </Link>
              </>
            ) : (
              <>
                {user?.role === 'client' && (
                  <Link
                    href="/cart"
                    className="relative px-4 py-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Cart
                    {items.length > 0 && (
                      <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {items.length}
                      </span>
                    )}
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="px-4 py-2 text-gray-600 hover:text-blue-600"
                >
                  {user?.firstName}
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
