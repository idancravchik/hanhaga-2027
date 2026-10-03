import React, { useState, useEffect } from 'react';
import { X, Tag, Plus, BookOpen, Award, Calendar, AlertCircle } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { auth, db, appId } from '@/config/firebase';
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
    const studentId = student?.id || student?.phone || '';
    const noteData = notes[studentId] || notes[student?.phone || ''] || notes[student?.firestoreId || ''] || {};
    const initialNote = noteData?.content || noteData?.text || '';

    const [personalNote, setPersonalNote] = useState(initialNote);
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [addingTag, setAddingTag] = useState(false);
    const [selectedTagId, setSelectedTagId] = useState('');
    const [tagDetail, setTagDetail] = useState('');

    useEffect(() => {
        const currentContent = noteData?.content || noteData?.text || '';
        setPersonalNote(currentContent);
    }, [studentId, noteData?.content, noteData?.text]);

    if (!student) return null;

    const studentAtt = attendance[studentId] || {};
    const isStaff = ['admin', 'instructor', 'assistant', 'inspector'].includes((currentProfile?.role || '').toLowerCase());

    const handleSavePersonalNote = async () => {
        if (!studentId) return;
        setIsSavingNote(true);
        try {
            if (!auth.currentUser) {
                await signInAnonymously(auth);
            }
            const authorName = currentProfile?.name || currentProfile?.fullName || 'איש צוות';
            const payload = {
                studentId,
                content: personalNote.trim(),
                author: authorName,
                updatedAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', studentId), payload, { merge: true });
            showToast('נשמר בתיק האישי!');
        } catch (err) {
            console.error('Error saving personal note:', err);
            showToast('שגיאה בשמירת התיק האישי', 'error');
        } finally {
            setIsSavingNote(false);
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
        <div role="dialog" aria-modal="true" aria-labelledby="student-profile-title" className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#202124]/50" dir="rtl">
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
                        <h2 id="student-profile-title" className="text-[22px] font-medium text-[#202124]">{student.name || student.fullName}</h2>
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
                                        key={`student_tag_${tagId}_${idx}`}
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
                            exams.map((exam, idx) => {
                                const g = grades[`${studentId}_${exam.id}`];
                                const totalScore = g
                                    ? Object.values(g.scores || {}).reduce((a: any, b: any) => (parseInt(a) || 0) + (parseInt(b) || 0), 0)
                                    : null;

                                return (
                                    <div key={`student_exam_${exam.id || idx}`} className="p-3.5 bg-[#f8f9fa] rounded-lg border border-[#dadce0] flex items-center justify-between">
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

                {/* Personal File / Notes Section */}
                {isStaff && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[16px] font-medium text-[#202124] flex items-center gap-2">
                                <BookOpen size={18} className="text-[#1a73e8]" />
                                תיק אישי - מעקב מדריך וצוות
                            </h3>
                            {noteData?.updatedAt && (
                                <span className="text-[11px] text-[#5f6368] font-normal">
                                    עודכן {new Date(noteData.updatedAt).toLocaleDateString('he-IL')} {noteData.author ? `על ידי ${noteData.author}` : ''}
                                </span>
                            )}
                        </div>
                        <p className="text-[13px] font-normal text-[#5f6368] mb-3 leading-relaxed">
                            כאן מתועדות כל הערות המעקב, נקודות לשימור ולשיפור של החניך לאורך הקורס (שדה תיק אישי יחיד ומשותף).
                        </p>
                        <textarea
                            className="w-full p-4 border border-[#dadce0] rounded-xl bg-white min-h-[160px] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none transition-all font-normal text-[#202124] text-right leading-relaxed resize-y text-[14px]"
                            placeholder="כתוב כאן על ההתקדמות, התפקוד והמעקב של החניך..."
                            value={personalNote}
                            onChange={(e) => setPersonalNote(e.target.value)}
                        />
                        <div className="flex justify-end mt-2.5">
                            <button
                                type="button"
                                onClick={handleSavePersonalNote}
                                disabled={isSavingNote}
                                className="h-10 px-6 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full text-[13px] font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <BookOpen size={16} />
                                {isSavingNote ? 'שומר...' : 'שמור תיק אישי'}
                            </button>
                        </div>
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
                            .map((ev: any, idx: number) => {
                                const isPresent = !!studentAtt[ev.id];
                                return (
                                    <span
                                        key={`student_att_${ev.id || idx}`}
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
