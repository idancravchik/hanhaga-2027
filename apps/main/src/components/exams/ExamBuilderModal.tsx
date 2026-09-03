import React, { useState } from 'react';
import { X, Plus, Trash2, ClipboardCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, appId } from '@/config/firebase';
import { Exam, ExamCategory } from '@/types/exam';
import { validateExamWeight } from '@/utils/exams';

interface ExamBuilderModalProps {
    examToEdit?: Exam | null;
    onClose: () => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

export const ExamBuilderModal: React.FC<ExamBuilderModalProps> = ({ examToEdit, onClose, showToast }) => {
    const isEdit = !!examToEdit;

    const [title, setTitle] = useState(examToEdit?.title || '');
    const [showVerbalOnly, setShowVerbalOnly] = useState(examToEdit?.showVerbalOnly || false);
    const [categories, setCategories] = useState<ExamCategory[]>(
        examToEdit?.categories || [{ name: '', maxScore: 50 }, { name: '', maxScore: 50 }]
    );

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const validation = validateExamWeight(categories);

    const handleAddCategory = () => {
        setCategories([...categories, { name: '', maxScore: 10 }]);
    };

    const handleRemoveCategory = (index: number) => {
        if (categories.length <= 1) {
            showToast('מבחן חייב להכיל לפחות קטגוריה אחת', 'error');
            return;
        }
        setCategories(categories.filter((_, idx) => idx !== index));
    };

    const handleCategoryChange = (index: number, field: keyof ExamCategory, value: string | number) => {
        const updated = [...categories];
        if (field === 'maxScore') {
            updated[index].maxScore = Number(value);
        } else {
            updated[index].name = String(value);
        }
        setCategories(updated);
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            setError('שם המבחן הוא שדה חובה');
            return;
        }

        const validRes = validateExamWeight(categories);
        if (!validRes.isValid) {
            setError(`סכום משקלי הקטגוריות חייב להיות בדיוק 100 נקודות (הסכום הנוכחי: ${validRes.totalWeight})`);
            return;
        }

        setError(null);
        setLoading(true);

        const examId = isEdit ? examToEdit.id : Date.now().toString();
        const payload: Exam = {
            id: examId,
            title: title.trim(),
            date: examToEdit?.date || new Date().toISOString().split('T')[0],
            categories: categories.map((c) => ({ name: c.name.trim(), maxScore: Number(c.maxScore) })),
            showVerbalOnly,
        };

        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', examId), payload, { merge: true });
            showToast(isEdit ? 'המבחן עודכן בהצלחה!' : 'המבחן נוצר בהצלחה!');
            setLoading(false);
            onClose();
        } catch (err: any) {
            setLoading(false);
            showToast(`שגיאה בשמירת המבחן: ${err?.message || err}`, 'error');
        }
    };

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#202124]/50" dir="rtl">
            <div className="bg-white rounded-[24px] border border-[#dadce0] w-full max-w-[480px] p-5 sm:p-6 relative text-right text-[#202124] max-h-[90vh] overflow-y-auto" dir="rtl">
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="סגור חלון"
                    className="absolute top-6 left-6 p-2 rounded-full text-[#5f6368] hover:text-[#202124] hover:bg-[#f8f9fa] transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center font-medium border border-[#dadce0]">
                        <ClipboardCheck size={18} />
                    </div>
                    <div>
                        <h2 className="text-[18px] font-medium text-[#202124]">{isEdit ? 'עריכת מבחן' : 'יצירת מבחן חדש'}</h2>
                        <p className="text-[12px] text-[#5f6368] font-normal">הגדרת קטגוריות ניקוד ומשקלים</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Exam Title */}
                    <div className="space-y-1">
                        <label className="text-[13px] font-medium text-[#3c4043] block">שם המבחן</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="למשל: מבחן הנהגה מסכם"
                            className="w-full h-10 px-3 border border-[#dadce0] rounded text-[13px] font-normal bg-white text-[#202124] outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-all"
                            required
                        />
                    </div>

                    {/* Show Verbal Only Toggle */}
                    <div className="flex items-center justify-between p-3 bg-[#f8f9fa] rounded border border-[#dadce0] text-[13px] font-normal text-[#3c4043]">
                        <span>הצג לחניכים הערכה מילולית בלבד (ללא ציון מספרי)</span>
                        <input
                            type="checkbox"
                            checked={showVerbalOnly}
                            onChange={(e) => setShowVerbalOnly(e.target.checked)}
                            className="w-4 h-4 text-[#1a73e8] rounded focus:ring-[#1a73e8]"
                        />
                    </div>

                    {/* Categories Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[13px] font-medium text-[#3c4043]">קטגוריות ניקוד ומשקלים</label>
                            <button
                                type="button"
                                onClick={handleAddCategory}
                                className="text-[12px] font-medium text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] px-3 py-1 rounded-full flex items-center gap-1 transition-colors"
                            >
                                <Plus size={14} /> הוסף קטגוריה
                            </button>
                        </div>

                        <div className="space-y-2 max-h-52 overflow-y-auto pl-1">
                            {categories.map((cat, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="שם הקטגוריה"
                                        value={cat.name}
                                        onChange={(e) => handleCategoryChange(idx, 'name', e.target.value)}
                                        className="flex-1 h-10 px-3 border border-[#dadce0] rounded text-[13px] font-normal bg-white text-[#202124] outline-none focus:border-[#1a73e8]"
                                        required
                                    />
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        placeholder="משקל"
                                        value={cat.maxScore || ''}
                                        onChange={(e) => handleCategoryChange(idx, 'maxScore', e.target.value)}
                                        className="w-20 h-10 px-2 border border-[#dadce0] rounded text-[13px] font-medium text-center bg-white text-[#202124] outline-none focus:border-[#1a73e8]"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveCategory(idx)}
                                        className="p-2 text-[#5f6368] hover:text-[#d93025] hover:bg-[#fce8e6] rounded-full transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="text-[12px] font-normal text-[#d93025] bg-[#fce8e6] p-3 rounded border border-[#d93025]/30 flex items-center gap-2">
                            <AlertCircle size={18} className="shrink-0 text-[#d93025]" /> <span>{error}</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#dadce0]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 px-5 text-[#3c4043] font-medium bg-[#f1f3f4] hover:bg-[#e8eaed] rounded-full transition-all text-[14px]"
                        >
                            ביטול
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="h-10 px-6 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full font-medium text-[14px] transition-all disabled:opacity-50"
                        >
                            {loading ? 'שומר...' : isEdit ? 'עדכן מבחן' : 'צור מבחן'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
