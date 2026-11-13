import React from 'react';
import { UserProfile, UserRole } from '@/types/user';

const UserManagementTable = React.lazy(() =>
    import('@/components/users/UserManagementTable').then((m) => ({ default: m.UserManagementTable }))
);

export interface AdminUsersViewProps {
    uniqueUsersList: UserProfile[];
    currentRole: UserRole;
    onSelectStudent: (student: UserProfile) => void;
    onEditUser: (user: UserProfile) => void;
    onDeleteUser: (userId: string) => Promise<void> | void;
    onOpenAddModal: () => void;
    onExportCSV: () => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleImportCSV: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({
    uniqueUsersList,
    currentRole,
    onSelectStudent,
    onEditUser,
    onDeleteUser,
    onOpenAddModal,
    onExportCSV,
    fileInputRef,
    handleImportCSV,
}) => {
    return (
        <div className="space-y-6">
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
            <React.Suspense fallback={<div className="p-8 text-center text-[#5f6368] text-sm animate-pulse">טוען נתוני משתמשים...</div>}>
                <UserManagementTable
                    usersList={uniqueUsersList}
                    currentRole={currentRole}
                    onSelectStudent={onSelectStudent}
                    onEditUser={onEditUser}
                    onDeleteUser={onDeleteUser}
                    onOpenAddModal={onOpenAddModal}
                    onImportCSV={() => fileInputRef.current?.click()}
                    onExportCSV={onExportCSV}
                />
            </React.Suspense>
        </div>
    );
};
