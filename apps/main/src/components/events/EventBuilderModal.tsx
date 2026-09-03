import React, { useState } from 'react';
import { X, Calendar, MapPin, FileText, Check } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, appId } from '@/config/firebase';
import { CourseEvent, EventType } from '@/types/event';

interface EventBuilderModalProps {
    eventToEdit?: CourseEvent | null;
    onClose: () => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

const EVENT_TYPES: EventType[] = ['מפגש', 'מסע', 'יום היערכות', 'יום חשיפה', 'אחר'];

export const EventBuilderModal: React.FC<EventBuilderModalProps> = ({ eventToEdit, onClose, showToast }) => {
    const isEdit = !!eventToEdit;

    const [title, setTitle] = useState(eventToEdit?.title || '');
    const [type, setType] = useState<EventType>(eventToEdit?.type || 'מפגש');
    const [date, setDate] = useState(eventToEdit?.date || new Date().toISOString().slice(0, 16));
    const [location, setLocation] = useState(eventToEdit?.location || '');
    const [description, setDescription] = useState(eventToEdit?.description || '');

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            showToast('כותרת האירוע היא שדה חובה', 'error');
            return;
        }

        setLoading(true);
        const eventId = isEdit ? eventToEdit.id : Date.now().toString();

        const payload: CourseEvent = {
            id: eventId,
            title: title.trim(),
            type,
            date,
            location: location.trim(),
            description: description.trim(),
        };

        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId), payload, { merge: true });
            showToast(isEdit ? 'האירוע עודכן בהצלחה!' : 'האירוע נוצר בהצלחה!');
            setLoading(false);
            onClose();
        } catch (err: any) {
            setLoading(false);
            showToast(`שגיאה בשמירת האירוע: ${err?.message || err}`, 'error');
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
                        <Calendar size={18} />
                    </div>
                    <div>
                        <h2 className="text-[18px] font-medium text-[#202124]">{isEdit ? 'עריכת אירוע בלו"ז' : 'הוספת אירוע חדש'}</h2>
                        <p className="text-[12px] text-[#5f6368] font-normal">מפגש, מסע, יום היערכות או פעילות קורס</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div className="space-y-1">
                        <label className="text-[13px] font-medium text-[#3c4043] block">שם/כותרת האירוע</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="למשל: מפגש 1 - פתיחת קורס"
                            className="w-full h-10 px-3 border border-[#dadce0] rounded text-[13px] font-normal bg-white text-[#202124] outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-all"
                            required
                        />
                    </div>

                    {/* Type & Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-[#3c4043] block">סוג אירוע</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as EventType)}
                                className="w-full h-10 px-3 border border-[#dadce0] rounded font-normal bg-white text-[#202124] text-[13px] outline-none focus:border-[#1a73e8]"
                            >
                                {EVENT_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-[#3c4043] block">תאריך ושעה</label>
                            <input
                                type="datetime-local"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full h-10 px-3 border border-[#dadce0] rounded font-normal bg-white text-[#202124] text-[13px] outline-none focus:border-[#1a73e8]"
                                required
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-1">
                        <label className="text-[13px] font-medium text-[#3c4043] flex items-center gap-1">
                            <MapPin size={14} className="text-[#1a73e8]" /> מיקום האירוע
                        </label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="למשל: סניף מרכזי / כיתה 3"
                            className="w-full h-10 px-3 border border-[#dadce0] rounded text-[13px] font-normal bg-white text-[#202124] outline-none focus:border-[#1a73e8] transition-all"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="text-[13px] font-medium text-[#3c4043] flex items-center gap-1">
                            <FileText size={14} className="text-[#1a73e8]" /> תיאור ודגשים
                        </label>
                        <textarea
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="דגשים מיוחדים, ציוד נדרש..."
                            className="w-full p-3 border border-[#dadce0] rounded text-[13px] font-normal bg-white text-[#202124] outline-none focus:border-[#1a73e8] transition-all resize-none"
                        />
                    </div>

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
                            {loading ? 'שומר...' : isEdit ? 'עדכן אירוע' : 'שמור אירוע'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
