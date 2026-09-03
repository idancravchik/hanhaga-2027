import React, { useState, useMemo } from 'react';
import { Search, Filter, Trash2, Edit2, UserPlus, FileText, Download, Eye } from 'lucide-react';
import { UserProfile, UserRole } from '@/types/user';
import { TAGS_CATALOG, getTagColorClasses, getUserAvatar, SCHOOL_LIST } from '@/config/constants';

interface UserManagementTableProps {
    usersList: UserProfile[];
    currentRole?: UserRole;
    onSelectStudent: (student: UserProfile) => void;
    onEditUser?: (user: UserProfile) => void;
    onDeleteUser?: (userId: string) => void;
    onOpenAddModal?: () => void;
    onImportCSV?: () => void;
    onExportCSV?: () => void;
}

export const UserManagementTable: React.FC<UserManagementTableProps> = ({
    usersList,
    currentRole = 'admin',
    onSelectStudent,
    onEditUser,
    onDeleteUser,
    onOpenAddModal,
    onImportCSV,
    onExportCSV,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSchoolFilter, setSelectedSchoolFilter] = useState('');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
    const [selectedTagFilter, setSelectedTagFilter] = useState('');

    const isAdmin = currentRole === 'admin' || currentRole === 'inspector';

    const filteredUsers = useMemo(() => {
        return (usersList || []).filter((u) => {
            const nameMatch = (u.name || u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase());
            const phoneMatch = (u.phone || u.id || '').includes(searchQuery);
            const matchesSearch = nameMatch || phoneMatch;

            const matchesSchool = !selectedSchoolFilter || u.school === selectedSchoolFilter;
            const matchesRole = !selectedRoleFilter || (u.role || 'student').toLowerCase() === selectedRoleFilter.toLowerCase();

            let matchesTag = true;
            if (selectedTagFilter) {
                const userTags = u.tags || [];
                matchesTag = userTags.some((t: any) => (typeof t === 'string' ? t === selectedTagFilter : t.id === selectedTagFilter));
            }

            return matchesSearch && matchesSchool && matchesRole && matchesTag;
        });
    }, [usersList, searchQuery, selectedSchoolFilter, selectedRoleFilter, selectedTagFilter]);

    return (
        <div className="space-y-4 text-[#202124]" dir="rtl">
            {/* Top Toolbar: Search & Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-[24px] border border-[#dadce0]">
                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                    <input
                        type="text"
                        placeholder="חיפוש לפי שם או טלפון..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-4 pr-10 h-10 bg-white rounded border border-[#dadce0] text-[13px] font-normal text-[#202124] outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-all"
                    />
                    <Search className="absolute right-3 top-3 text-[#5f6368]" size={16} />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
                    <select
                        value={selectedSchoolFilter}
                        onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                        className="h-10 px-3 bg-white border border-[#dadce0] rounded text-[13px] font-normal text-[#3c4043] outline-none focus:border-[#1a73e8] w-full sm:w-auto"
                    >
                        <option value="">כל בתי הספר</option>
                        {SCHOOL_LIST.map((s, idx) => (
                            <option key={idx} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedRoleFilter}
                        onChange={(e) => setSelectedRoleFilter(e.target.value)}
                        className="h-10 px-3 bg-white border border-[#dadce0] rounded text-[13px] font-normal text-[#3c4043] outline-none focus:border-[#1a73e8] w-full sm:w-auto"
                    >
                        <option value="">כל התפקידים</option>
                        <option value="student">חניך</option>
                        <option value="instructor">מדריך</option>
                        <option value="assistant">מנהלן</option>
                        <option value="inspector">מפקח</option>
                        <option value="admin">מנהל</option>
                    </select>

                    <select
                        value={selectedTagFilter}
                        onChange={(e) => setSelectedTagFilter(e.target.value)}
                        className="h-10 px-3 bg-white border border-[#dadce0] rounded text-[13px] font-normal text-[#3c4043] outline-none focus:border-[#1a73e8] w-full sm:w-auto"
                    >
                        <option value="">כל התגיות</option>
                        {TAGS_CATALOG.map((tc) => (
                            <option key={tc.id} value={tc.id}>
                                {tc.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Action Buttons */}
                {isAdmin && (
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-stretch sm:justify-end">
                        {onImportCSV && (
                            <button
                                onClick={onImportCSV}
                                className="flex-1 sm:flex-initial h-10 px-4 bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] rounded-full font-medium text-[13px] flex items-center justify-center gap-1.5 transition-all"
                                title="ייבוא משתמשים מ-CSV"
                            >
                                <FileText size={16} /> ייבוא CSV
                            </button>
                        )}
                        {onExportCSV && (
                            <button
                                onClick={onExportCSV}
                                className="flex-1 sm:flex-initial h-10 px-4 bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] rounded-full font-medium text-[13px] flex items-center justify-center gap-1.5 transition-all"
                                title="ייצוא משתמשים ל-CSV"
                            >
                                <Download size={16} /> ייצוא CSV
                            </button>
                        )}
                        {onOpenAddModal && (
                            <button
                                onClick={onOpenAddModal}
                                className="w-full sm:w-auto h-10 px-5 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full font-medium text-[13px] flex items-center justify-center gap-1.5 transition-all"
                            >
                                <UserPlus size={16} /> הוסף משתמש
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* User List Cards / Table */}
            <div className="bg-white rounded-[24px] border border-[#dadce0] overflow-hidden">
                <div className="p-4 bg-[#f8f9fa] border-b border-[#dadce0] text-[13px] font-medium text-[#5f6368] flex items-center justify-between">
                    <span>סה"כ משתמשים: {filteredUsers.length}</span>
                </div>

                <div className="divide-y divide-[#dadce0]">
                    {filteredUsers.length === 0 ? (
                        <div className="p-8 text-center text-[#5f6368] text-[13px] font-normal">לא נמצאו משתמשים התואמים את המסננים</div>
                    ) : (
                        filteredUsers.map((u) => {
                            const isStudent = (u.role || 'student') === 'student';
                            const roleDisplay =
                                u.role === 'admin'
                                    ? 'מנהל'
                                    : u.role === 'inspector'
                                    ? 'מפקח'
                                    : u.role === 'instructor'
                                    ? 'מדריך'
                                    : u.role === 'assistant'
                                    ? 'מנהלן'
                                    : 'חניך';

                            return (
                                <div
                                    key={u.id || u.phone}
                                    className="p-4 hover:bg-[#f8f9fa] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={getUserAvatar(u.role)}
                                            alt={u.name}
                                            className="w-10 h-10 rounded-full object-cover border border-[#dadce0]"
                                        />
                                        <div>
                                            <div className="font-medium text-[15px] text-[#202124] flex items-center gap-2">
                                                <span>{u.name || u.fullName}</span>
                                                <span className="text-[11px] bg-[#f8f9fa] border border-[#dadce0] text-[#3c4043] px-2.5 py-0.5 rounded-full font-normal">
                                                    {roleDisplay}
                                                </span>
                                            </div>
                                            <div className="text-[12px] text-[#5f6368] font-normal">
                                                {u.school || 'לא שויך'} • מחלקה {u.group || 0} • <span className="dir-ltr">{u.phone || u.id}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tags preview */}
                                    <div className="flex flex-wrap gap-1">
                                        {(u.tags || []).slice(0, 3).map((t: any, idx: number) => {
                                            const tagId = typeof t === 'string' ? t : t.id;
                                            const catalogItem = TAGS_CATALOG.find((tc) => tc.id === tagId);
                                            const colorClass = getTagColorClasses(catalogItem?.color);
                                            return (
                                                <span key={idx} className={`px-2.5 py-0.5 rounded-full text-[11px] font-normal border border-[#dadce0] bg-white text-[#3c4043] ${colorClass}`}>
                                                    {catalogItem?.label || tagId}
                                                </span>
                                            );
                                        })}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 justify-end">
                                        {isStudent && (
                                            <button
                                                onClick={() => onSelectStudent(u)}
                                                className="h-8 px-3 rounded-full bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] font-medium text-[12px] flex items-center gap-1 transition-all"
                                            >
                                                <Eye size={14} /> תיק חניך
                                            </button>
                                        )}
                                        {isAdmin && onEditUser && (
                                            <button
                                                onClick={() => onEditUser(u)}
                                                className="p-1.5 hover:bg-[#f8f9fa] text-[#5f6368] hover:text-[#202124] rounded-full transition-colors"
                                                title="ערוך משתמש"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        )}
                                        {isAdmin && onDeleteUser && (
                                            <button
                                                onClick={() => onDeleteUser(u.id || u.phone || '')}
                                                className="p-1.5 hover:bg-[#fce8e6] text-[#d93025] rounded-full transition-colors"
                                                title="מחק משתמש"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
