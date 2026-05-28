'use client';

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '@/components/Navbar';

export default function Checkout() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setOrder(response.data.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      router.push('/cart');
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${id}/payment`,
        {
          stripeTokenId: 'tok_visa' // Replace with actual Stripe token
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      alert('Payment processed successfully!');
      router.push('/orders');
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!order) return <div>Loading...</div>;

  return (
    <main>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-8">Checkout</h1>

          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold mb-4">Order Summary</h2>

            <div className="mb-6 pb-6 border-b">
              <p><span className="font-bold">Order Number:</span> {order.orderNumber}</p>
              <p><span className="font-bold">Subtotal:</span> ${order.subtotal}</p>
              <p><span className="font-bold">Tax:</span> ${order.tax}</p>
              <p className="text-xl"><span className="font-bold">Total:</span> <span className="text-blue-600">${order.total}</span></p>
            </div>

            <h2 className="text-2xl font-bold mb-4">Shipping Address</h2>
            <div className="mb-6 pb-6 border-b bg-gray-50 p-4 rounded">
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.zipCode}</p>
              <p>{order.shippingAddress.country}</p>
            </div>

            <h2 className="text-2xl font-bold mb-4">Payment Method</h2>
            <div className="mb-6">
              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Processing...' : 'Pay with Stripe'}
              </button>
            </div>

            <p className="text-sm text-gray-600">
              This is a secure payment. Your payment information is encrypted.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
