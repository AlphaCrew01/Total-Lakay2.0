'use client';

import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/router';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import axios from 'axios';

export default function Cart() {
  const { items, removeItem, updateQuantity, clearCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders`,
        {
          items: items.map(item => ({
            productId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          shippingAddress: {
            street: '123 Main St',
            city: 'Port-au-Prince',
            zipCode: '00000',
            country: 'Haiti'
          },
          billingAddress: {
            street: '123 Main St',
            city: 'Port-au-Prince',
            zipCode: '00000',
            country: 'Haiti'
          },
          paymentMethod: 'stripe'
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      router.push(`/checkout/${response.data.data.id}`);
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error creating order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>

          {items.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center">
              <p className="text-xl text-gray-600 mb-4">Your cart is empty</p>
              <a
                href="/shop"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Continue Shopping
              </a>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left">Product</th>
                      <th className="px-6 py-3 text-left">Price</th>
                      <th className="px-6 py-3 text-left">Quantity</th>
                      <th className="px-6 py-3 text-left">Total</th>
                      <th className="px-6 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} className="border-t hover:bg-gray-50">
                        <td className="px-6 py-4">{item.name}</td>
                        <td className="px-6 py-4">${item.price.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(item.id, parseInt(e.target.value))
                            }
                            className="w-16 px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-6 py-4">
                          ${(item.price * item.quantity).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-800 font-bold"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 bg-white p-8 rounded-lg shadow">
                <div className="flex justify-between items-center mb-8">
                  <span className="text-xl font-bold">Total:</span>
                  <span className="text-3xl font-bold text-blue-600">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {loading ? 'Processing...' : 'Proceed to Checkout'}
                  </button>
                  <button
                    onClick={() => router.push('/shop')}
                    className="flex-1 bg-gray-200 text-gray-800 py-3 rounded font-bold hover:bg-gray-300"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
