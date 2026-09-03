import React, { useState } from 'react';
import { X, Tag, Plus, MessageSquare, Award, Calendar, AlertCircle } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, appId } from '@/config/firebase';
import { UserProfile } from '@/types/user';
import { TAGS_CATALOG, getTagColorClasses, getUserAvatar } from '@/config/constants';

interface StudentProfileModalProps {
    student: UserProfile | null;
    onClose: () => void;
    currentProfile: UserProfile | null;
    exams: any[];
    grades: Record<string, any>;
    attendance: Record<string, any>;
    notes: Record<string, any>;
    eventsList: any[];
    showToast: (message: string, type?: 'success' | 'error') => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
    student,
    onClose,
    currentProfile,
    exams,
    grades,
    attendance,
    notes,
    eventsList,
    showToast,
}) => {
    const [newNote, setNewNote] = useState('');
    const [addingTag, setAddingTag] = useState(false);
    const [selectedTagId, setSelectedTagId] = useState('');
    const [tagDetail, setTagDetail] = useState('');

    if (!student) return null;

    const studentId = student.id || student.phone || '';
    const studentAtt = attendance[studentId] || {};
    const studentNotes = Object.values(notes || {}).filter((n: any) => n.studentId === studentId);
    const isStaff = ['admin', 'instructor', 'assistant', 'inspector'].includes((currentProfile?.role || '').toLowerCase());

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        try {
            const noteId = `${studentId}_${Date.now()}`;
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', noteId), {
                id: noteId,
                studentId,
                text: newNote.trim(),
                author: currentProfile?.name || currentProfile?.fullName || 'איש צוות',
                createdAt: new Date().toISOString(),
            });
            setNewNote('');
            showToast('הערה נוספה בהצלחה!');
        } catch (err) {
            showToast('שגיאה בהוספת הערה', 'error');
        }
    };

    const handleToggleTag = async (tagId: string, detail?: string) => {
        if (!isStaff) return;
        const currentTags: any[] = student.tags || [];
        const exists = currentTags.some((t: any) => (typeof t === 'string' ? t === tagId : t.id === tagId));

        let updatedTags: any[];
        if (exists) {
            updatedTags = currentTags.filter((t: any) => (typeof t === 'string' ? t !== tagId : t.id !== tagId));
        } else {
            const catalogItem = TAGS_CATALOG.find((tc) => tc.id === tagId);
            const newTagObj = catalogItem?.requiresDetail ? { id: tagId, detail: detail || '' } : { id: tagId };
            updatedTags = [...currentTags, newTagObj];
        }

        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', studentId), { tags: updatedTags }, { merge: true });
            student.tags = updatedTags;
            setAddingTag(false);
            setSelectedTagId('');
            setTagDetail('');
            showToast('תגיות עודכנו בהצלחה!');
        } catch (err) {
            showToast('שגיאה בעדכון תגיות', 'error');
        }
    };

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#202124]/50" dir="rtl">
            <div className="bg-white rounded-[24px] border border-[#dadce0] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 relative text-right text-[#202124]" dir="rtl">
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="סגור חלון"
                    className="absolute top-6 left-6 p-2 rounded-full text-[#5f6368] hover:text-[#202124] hover:bg-[#f8f9fa] transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Header Profile Info */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#dadce0]">
                    <img
                        src={getUserAvatar(student.role)}
                        alt={student.name}
                        className="w-16 h-16 rounded-full object-cover border border-[#dadce0]"
                    />
                    <div>
                        <h2 className="text-[22px] font-medium text-[#202124]">{student.name || student.fullName}</h2>
                        <div className="flex items-center gap-2 text-[13px] text-[#5f6368] font-normal mt-1">
                            <span>{student.school}</span>
                            <span>•</span>
                            <span>מחלקה {student.group || 0}</span>
                            <span>•</span>
                            <span className="text-[#1a73e8] dir-ltr">{student.phone || student.id}</span>
                        </div>
                    </div>
                </div>

                {/* Tags Catalog Section */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[16px] font-medium text-[#202124] flex items-center gap-2">
                            <Tag size={18} className="text-[#1a73e8]" />
                            תגיות ומאפיינים
                        </h3>
                        {isStaff && (
                            <button
                                onClick={() => setAddingTag(!addingTag)}
                                className="text-[12px] font-medium text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] px-3 py-1 rounded-full flex items-center gap-1 transition-colors"
                            >
                                <Plus size={14} /> הוסף תגית
                            </button>
                        )}
                    </div>

                    {/* Tags List */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        {(student.tags || []).length === 0 ? (
                            <span className="text-[12px] text-[#5f6368] italic">אין תגיות מוגדרות</span>
                        ) : (
                            (student.tags || []).map((t: any, idx: number) => {
                                const tagId = typeof t === 'string' ? t : t.id;
                                const catalogItem = TAGS_CATALOG.find((tc) => tc.id === tagId);
                                const label = catalogItem?.label || tagId;
                                const colorClass = getTagColorClasses(catalogItem?.color);

                                return (
                                    <span
                                        key={idx}
                                        className={`px-3 py-1 rounded-full text-[12px] font-normal border border-[#dadce0] bg-[#f8f9fa] text-[#3c4043] flex items-center gap-1.5 ${colorClass}`}
                                    >
                                        {label}
                                        {t.detail && <span className="opacity-80">({t.detail})</span>}
                                        {isStaff && (
                                            <button
                                                onClick={() => handleToggleTag(tagId)}
                                                className="hover:opacity-75 mr-1 text-[#5f6368]"
                                                title="הסר תגית"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </span>
                                );
                            })
                        )}
                    </div>

                    {/* Add Tag Select */}
                    {addingTag && (
                        <div className="p-4 bg-[#f8f9fa] rounded-lg border border-[#dadce0] space-y-3">
                            <select
                                value={selectedTagId}
                                onChange={(e) => setSelectedTagId(e.target.value)}
                                className="w-full h-10 px-3 border border-[#dadce0] rounded text-[13px] font-normal text-[#3c4043] bg-white outline-none focus:border-[#1a73e8]"
                            >
                                <option value="">בחר תגית מהקטלוג...</option>
                                {TAGS_CATALOG.map((tc) => (
                                    <option key={tc.id} value={tc.id}>
                                        {tc.label}
                                    </option>
                                ))}
                            </select>

                            {TAGS_CATALOG.find((tc) => tc.id === selectedTagId)?.requiresDetail && (
                                <input
                                    type="text"
                                    placeholder="פירוט נוסף (חובה לתגית זו)"
                                    value={tagDetail}
                                    onChange={(e) => setTagDetail(e.target.value)}
                                    className="w-full h-10 px-3 border border-[#dadce0] rounded text-[13px] bg-white text-[#202124] outline-none focus:border-[#1a73e8]"
                                />
                            )}

                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setAddingTag(false)}
                                    className="px-4 py-1.5 bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#3c4043] rounded-full text-[13px] font-medium transition-colors"
                                >
                                    ביטול
                                </button>
                                <button
                                    onClick={() => handleToggleTag(selectedTagId, tagDetail)}
                                    disabled={!selectedTagId}
                                    className="px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full text-[13px] font-medium disabled:opacity-50"
                                >
                                    שמור תגית
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Grades Summary */}
                <div className="mb-6">
                    <h3 className="text-[16px] font-medium text-[#202124] flex items-center gap-2 mb-3">
                        <Award size={18} className="text-[#1a73e8]" />
                        ציונים והערכות
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {exams.length === 0 ? (
                            <div className="text-[12px] text-[#5f6368] italic">אין מבחנים במערכת</div>
                        ) : (
                            exams.map((exam) => {
                                const g = grades[`${studentId}_${exam.id}`];
                                const totalScore = g
                                    ? Object.values(g.scores || {}).reduce((a: any, b: any) => (parseInt(a) || 0) + (parseInt(b) || 0), 0)
                                    : null;

                                return (
                                    <div key={exam.id} className="p-3.5 bg-[#f8f9fa] rounded-lg border border-[#dadce0] flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-[13px] text-[#202124]">{exam.title}</div>
                                            <div className="text-[11px] text-[#5f6368] font-normal">{exam.date || 'ללא תאריך'}</div>
                                        </div>
                                        <div className="text-[13px] font-medium text-[#1a73e8] bg-white px-3 py-1 rounded-full border border-[#dadce0]">
                                            {totalScore !== null ? `${totalScore} / 100` : 'טרם הוזן'}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Notes Feed Section */}
                {isStaff && (
                    <div className="mb-6">
                        <h3 className="text-[16px] font-medium text-[#202124] flex items-center gap-2 mb-3">
                            <MessageSquare size={18} className="text-[#1a73e8]" />
                            הערות מעקב צוות
                        </h3>

                        {/* Notes Feed List */}
                        <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                            {studentNotes.length === 0 ? (
                                <div className="text-[12px] text-[#5f6368] italic">אין הערות מעקב רשומות</div>
                            ) : (
                                studentNotes.map((n: any) => (
                                    <div key={n.id} className="p-3 bg-[#f8f9fa] rounded-lg border border-[#dadce0] text-[13px]">
                                        <div className="flex items-center justify-between font-medium text-[#3c4043] mb-1">
                                            <span>{n.author}</span>
                                            <span className="text-[11px] text-[#5f6368]">
                                                {n.createdAt ? new Date(n.createdAt).toLocaleDateString('he-IL') : ''}
                                            </span>
                                        </div>
                                        <p className="text-[#202124] font-normal">{n.text}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add Note Form */}
                        <form onSubmit={handleAddNote} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="הוסף הערת מעקב חדשה..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                className="flex-1 h-10 px-3 border border-[#dadce0] rounded text-[13px] bg-white text-[#202124] focus:border-[#1a73e8] outline-none"
                            />
                            <button
                                type="submit"
                                disabled={!newNote.trim()}
                                className="h-10 px-5 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full text-[13px] font-medium disabled:opacity-50 transition-all"
                            >
                                הוסף
                            </button>
                        </form>
                    </div>
                )}

                {/* Attendance Summary */}
                <div>
                    <h3 className="text-[16px] font-medium text-[#202124] flex items-center gap-2 mb-3">
                        <Calendar size={18} className="text-[#1a73e8]" />
                        סיכום נוכחות
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {(eventsList || [])
                            .filter((e: any) => e.type !== 'יום חשיפה')
                            .map((ev: any) => {
                                const isPresent = !!studentAtt[ev.id];
                                return (
                                    <span
                                        key={ev.id}
                                        className={`px-3 py-1 rounded-full text-[12px] font-medium border ${
                                            isPresent
                                                ? 'bg-white text-[#188038] border-[#188038]/40'
                                                : 'bg-white text-[#d93025] border-[#d93025]/40'
                                        }`}
                                    >
                                        {ev.title}: {isPresent ? 'נכח' : 'נעדר'}
                                    </span>
                                );
                            })}
                    </div>
                </div>
            </div>
        </div>
    );
};
