'use client';

import { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

interface ProtectedLayoutProps {
  children: ReactNode;
  requiredRole?: string;
}

export default function ProtectedLayout({ children, requiredRole }: ProtectedLayoutProps) {
  const { isAuthenticated, user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
    if (!loading && requiredRole && user?.role !== requiredRole) {
      router.push('/');
    }
  }, [isAuthenticated, loading, requiredRole, user, router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
