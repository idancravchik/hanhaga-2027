import React from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/user';

interface ProtectedRouteProps {
    allowedRoles: UserRole[];
    children: React.ReactNode;
    onUnauthorized?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children, onUnauthorized }) => {
    const { profile, role, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#f8f9fa]">
                <Loader2 className="animate-spin text-[#1a73e8]" size={36} />
            </div>
        );
    }

    if (!profile || !role) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-slate-50" dir="rtl">
                <ShieldAlert className="text-amber-500 mb-4" size={48} />
                <h2 className="text-xl font-bold text-slate-800 mb-2">גישה מוגבלת</h2>
                <p className="text-slate-600 mb-6 font-semibold">עליך להתחבר למערכת כדי לצפות בעמוד זה.</p>
            </div>
        );
    }

    if (!allowedRoles.includes(role)) {
        if (onUnauthorized) {
            onUnauthorized();
        }
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-slate-50" dir="rtl">
                <ShieldAlert className="text-rose-500 mb-4" size={48} />
                <h2 className="text-xl font-bold text-slate-800 mb-2">אין הרשאה מתאימה</h2>
                <p className="text-slate-600 mb-6 font-semibold">
                    תפקידך במערכת ({role}) אינו מורשה לצפות באזור זה.
                </p>
            </div>
        );
    }

    return <>{children}</>;
};
