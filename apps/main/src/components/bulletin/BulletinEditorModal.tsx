import React, { useState, useEffect, useRef } from 'react';
import {
    X, Megaphone, Upload, Trash2, Plus, ExternalLink,
    Image as ImageIcon, Check, Loader2, RefreshCw, Eye, Edit3
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, appId, auth } from '../../config/firebase';
import { signInAnonymously } from 'firebase/auth';
import { BulletinBoardData, BulletinImage, BulletinLinkChip } from '../../types/bulletin';
import { BulletinBoardBanner } from './BulletinBoardBanner';

export interface BulletinEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (msg: string, type?: 'success' | 'error') => void;
    initialBoard?: 'students' | 'instructors';
    currentUserName?: string;
}

export const BulletinEditorModal: React.FC<BulletinEditorModalProps> = ({
    isOpen,
    onClose,
    showToast,
    initialBoard = 'students',
    currentUserName = 'מנהל'
}) => {
    const [activeTab, setActiveTab] = useState<'students' | 'instructors'>(initialBoard);
    const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

    // Board states
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [uploadingImage, setUploadingImage] = useState<boolean>(false);

    const [isEnabled, setIsEnabled] = useState<boolean>(true);
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [images, setImages] = useState<BulletinImage[]>([]);
    const [links, setLinks] = useState<BulletinLinkChip[]>([]);

    // New link inputs
    const [newLinkLabel, setNewLinkLabel] = useState<string>('');
    const [newLinkUrl, setNewLinkUrl] = useState<string>('');

    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch active board data on tab change or modal open
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const fetchBoard = async () => {
            setLoading(true);
            try {
                const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'bulletin_boards', activeTab);
                const snapshot = await getDoc(docRef);
                if (snapshot.exists() && isMounted) {
                    const data = snapshot.data() as BulletinBoardData;
                    setIsEnabled(data.isEnabled ?? true);
                    setHtmlContent(data.htmlContent || '');
                    setImages(data.images || []);
                    setLinks(data.links || []);
                    if (editorRef.current) {
                        editorRef.current.innerHTML = data.htmlContent || '';
                    }
                } else if (isMounted) {
                    setIsEnabled(true);
                    setHtmlContent('');
                    setImages([]);
                    setLinks([]);
                    if (editorRef.current) {
                        editorRef.current.innerHTML = '';
                    }
                }
            } catch (err) {
                console.error('Failed to fetch bulletin board data:', err);
                showToast('שגיאה בטעינת נתוני לוח המודעות', 'error');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchBoard();

        return () => {
            isMounted = false;
        };
    }, [isOpen, activeTab]);

    // Keep editor innerHTML in sync when tab finishes loading
    useEffect(() => {
        if (!loading && editorRef.current) {
            editorRef.current.innerHTML = htmlContent;
        }
    }, [loading]);

    // Handle ESC key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !saving && !uploadingImage) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, saving, uploadingImage, onClose]);

    if (!isOpen) return null;

    // Formatting Toolbar Helpers
    const applySize = (size: 'large' | 'medium' | 'small') => {
        if (!editorRef.current) return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.toString().length === 0) {
            // If no text selected, append a sample formatted block
            const sample = document.createElement(size === 'large' ? 'h3' : size === 'medium' ? 'h4' : 'p');
            sample.className =
                size === 'large'
                    ? 'text-[20px] font-bold text-[#202124] my-2'
                    : size === 'medium'
                    ? 'text-[16px] font-semibold text-[#202124] my-1.5'
                    : 'text-[14px] text-[#202124] my-1';
            sample.innerText = size === 'large' ? 'כותרת חדשה' : size === 'medium' ? 'כותרת משנה' : 'פסקה חדשה';
            editorRef.current.appendChild(sample);
            setHtmlContent(editorRef.current.innerHTML);
            return;
        }

        const range = selection.getRangeAt(0);
        const selectedText = range.extractContents();
        const wrapper = document.createElement('span');

        if (size === 'large') {
            wrapper.style.fontSize = '20px';
            wrapper.style.fontWeight = 'bold';
            wrapper.style.display = 'block';
            wrapper.style.marginTop = '6px';
            wrapper.style.marginBottom = '4px';
        } else if (size === 'medium') {
            wrapper.style.fontSize = '16px';
            wrapper.style.fontWeight = '600';
            wrapper.style.display = 'block';
            wrapper.style.marginTop = '4px';
            wrapper.style.marginBottom = '2px';
        } else {
            wrapper.style.fontSize = '14px';
            wrapper.style.fontWeight = 'normal';
        }

        wrapper.appendChild(selectedText);
        range.insertNode(wrapper);
        setHtmlContent(editorRef.current.innerHTML);
    };

    const applyColor = (hex: string) => {
        if (!editorRef.current) return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.toString().length === 0) {
            return;
        }

        const range = selection.getRangeAt(0);
        const selectedText = range.extractContents();
        const span = document.createElement('span');
        span.style.color = hex;
        span.appendChild(selectedText);
        range.insertNode(span);
        setHtmlContent(editorRef.current.innerHTML);
    };

    const handleContentInput = () => {
        if (editorRef.current) {
            setHtmlContent(editorRef.current.innerHTML);
        }
    };

    // Image Upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (!file.type.startsWith('image/')) {
            showToast('אנא בחר קובץ תמונה בלבד (JPG, PNG, WebP)', 'error');
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            showToast('גודל התמונה מוגבל לעד 8MB', 'error');
            return;
        }

        setUploadingImage(true);
        try {
            if (!auth.currentUser) {
                await signInAnonymously(auth);
            }
            const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const storagePath = `bulletin_images/${activeTab}_${Date.now()}_${cleanName}`;
            const fileRef = ref(storage, storagePath);

            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);

            const newImg: BulletinImage = {
                id: `img_${Date.now()}`,
                downloadUrl,
                storagePath,
                caption: file.name
            };

            setImages((prev) => [...prev, newImg]);
            showToast('התמונה הועלתה בהצלחה!');
        } catch (err: any) {
            console.error('Upload error:', err);
            showToast(`שגיאה בהעלאת התמונה: ${err?.message || err}`, 'error');
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveImage = async (img: BulletinImage) => {
        setImages((prev) => prev.filter((i) => i.id !== img.id));
        if (img.storagePath) {
            try {
                const fileRef = ref(storage, img.storagePath);
                await deleteObject(fileRef);
            } catch (err) {
                console.warn('Storage delete warning (non-fatal):', err);
            }
        }
    };

    // Link Chips
    const handleAddLink = () => {
        if (!newLinkLabel.trim() || !newLinkUrl.trim()) {
            showToast('נא להזין תיאור וכתובת URL עבור הכפתור', 'error');
            return;
        }

        let formattedUrl = newLinkUrl.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = `https://${formattedUrl}`;
        }

        const newChip: BulletinLinkChip = {
            id: `link_${Date.now()}`,
            label: newLinkLabel.trim(),
            url: formattedUrl
        };

        setLinks((prev) => [...prev, newChip]);
        setNewLinkLabel('');
        setNewLinkUrl('');
    };

    const handleRemoveLink = (id: string) => {
        setLinks((prev) => prev.filter((l) => l.id !== id));
    };

    // Save to Firestore
    const handleSave = async () => {
        setSaving(true);
        try {
            if (!auth.currentUser) {
                await signInAnonymously(auth);
            }

            const finalHtml = editorRef.current ? editorRef.current.innerHTML : htmlContent;

            const payload: BulletinBoardData = {
                id: activeTab,
                isEnabled,
                htmlContent: finalHtml,
                images,
                links,
                updatedAt: new Date().toISOString(),
                updatedBy: {
                    name: currentUserName,
                    phone: auth.currentUser?.phoneNumber || auth.currentUser?.uid || ''
                }
            };

            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'bulletin_boards', activeTab);
            await setDoc(docRef, payload, { merge: true });

            showToast(`לוח המודעות (${activeTab === 'students' ? 'חניכים' : 'מדריכים'}) עודכן ונשמר בהצלחה!`);
            onClose();
        } catch (err: any) {
            console.error('Save bulletin error:', err);
            showToast(`שגיאה בשמירת הלוח: ${err?.message || err}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn font-sans text-right"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulletin-editor-title"
        >
            <div className="bg-white rounded-[24px] border border-[#dadce0] w-full max-w-3xl my-auto shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
                {/* Modal Header */}
                <header className="px-5 py-4 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1a73e8] text-white flex items-center justify-center shadow-xs">
                            <Megaphone size={20} />
                        </div>
                        <div>
                            <h2 id="bulletin-editor-title" className="text-[18px] sm:text-[20px] font-medium text-[#202124] leading-tight">
                                עריכת לוח מודעות ועדכונים
                            </h2>
                            <p className="text-[12px] text-[#5f6368] font-normal mt-0.5">
                                המידע יופיע כבלוק עליון קבוע במסכי החניכים והמדריכים
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={saving || uploadingImage}
                        className="w-9 h-9 rounded-full hover:bg-[#e8eaed] text-[#5f6368] flex items-center justify-center transition-colors"
                        aria-label="סגור חלון"
                    >
                        <X size={20} />
                    </button>
                </header>

                {/* Subheader: Board Selector & Master Switch */}
                <div className="px-5 py-3 border-b border-[#e8eaed] bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
                    {/* Role Tab Switcher */}
                    <div className="flex bg-[#f1f3f4] p-1 rounded-full border border-[#dadce0]">
                        <button
                            type="button"
                            onClick={() => setActiveTab('students')}
                            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                                activeTab === 'students'
                                    ? 'bg-[#1a73e8] text-white shadow-xs'
                                    : 'text-[#5f6368] hover:text-[#202124]'
                            }`}
                        >
                            לוח חניכים
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('instructors')}
                            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                                activeTab === 'instructors'
                                    ? 'bg-[#1a73e8] text-white shadow-xs'
                                    : 'text-[#5f6368] hover:text-[#202124]'
                            }`}
                        >
                            לוח מדריכים וסגל
                        </button>
                    </div>

                    {/* Master Active / Inactive Toggle */}
                    <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-[#3c4043]">
                            סטטוס הלוח:
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={(e) => setIsEnabled(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[#dadce0] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1e8e3e]"></div>
                            <span className={`mr-2 text-[12px] font-medium ${isEnabled ? 'text-[#1e8e3e]' : 'text-[#5f6368]'}`}>
                                {isEnabled ? 'פעיל ומוצג' : 'מוסתר מהמשתמשים'}
                            </span>
                        </label>
                    </div>

                    {/* Mode Toggle: Edit vs Preview */}
                    <div className="flex items-center gap-1 bg-[#f1f3f4] p-1 rounded-full">
                        <button
                            type="button"
                            onClick={() => setIsPreviewMode(false)}
                            className={`px-3 py-1 rounded-full text-[12px] font-medium flex items-center gap-1 transition-colors ${
                                !isPreviewMode ? 'bg-white text-[#1a73e8] shadow-2xs' : 'text-[#5f6368]'
                            }`}
                        >
                            <Edit3 size={14} /> עריכה
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsPreviewMode(true)}
                            className={`px-3 py-1 rounded-full text-[12px] font-medium flex items-center gap-1 transition-colors ${
                                isPreviewMode ? 'bg-white text-[#1a73e8] shadow-2xs' : 'text-[#5f6368]'
                            }`}
                        >
                            <Eye size={14} /> תצוגה מקדימה
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="p-5 overflow-y-auto space-y-6 flex-1">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-2 text-[#5f6368]">
                            <Loader2 className="animate-spin text-[#1a73e8]" size={32} />
                            <span className="text-[14px]">טוען את נתוני לוח המודעות...</span>
                        </div>
                    ) : isPreviewMode ? (
                        /* Live Preview Mode */
                        <div className="space-y-3">
                            <p className="text-[13px] text-[#5f6368]">
                                כך ייראה הלוח בפועל במסך {activeTab === 'students' ? 'החניך' : 'המדריך'}:
                            </p>
                            <div className="p-3 bg-[#f8f9fa] rounded-[24px] border border-[#dadce0]">
                                <BulletinBoardBanner boardId={activeTab} showEditButton={false} />
                            </div>
                        </div>
                    ) : (
                        /* Edit Mode */
                        <div className="space-y-6">
                            {/* 1. Rich Text Formatting Toolbar */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[14px] font-medium text-[#202124]">
                                        תוכן ההודעה (גוף הלוח):
                                    </label>
                                    <span className="text-[12px] text-[#5f6368]">
                                        סמן טקסט ולחץ על גודל או צבע להחלה
                                    </span>
                                </div>

                                {/* Custom Toolbar */}
                                <div className="bg-[#f8f9fa] p-2 rounded-[16px] border border-[#dadce0] flex flex-wrap items-center gap-2">
                                    {/* 3 Sizes */}
                                    <div className="flex items-center gap-1 pl-2 border-l border-[#dadce0]">
                                        <button
                                            type="button"
                                            onClick={() => applySize('large')}
                                            className="px-2.5 py-1 text-[13px] font-bold bg-white hover:bg-[#e8f0fe] text-[#202124] hover:text-[#1a73e8] rounded-md border border-[#dadce0] transition-colors"
                                            title="גודל כותרת גדולה (20px)"
                                        >
                                            גדול
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applySize('medium')}
                                            className="px-2.5 py-1 text-[13px] font-semibold bg-white hover:bg-[#e8f0fe] text-[#202124] hover:text-[#1a73e8] rounded-md border border-[#dadce0] transition-colors"
                                            title="גודל כותרת משנה (16px)"
                                        >
                                            בינוני
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applySize('small')}
                                            className="px-2.5 py-1 text-[13px] font-normal bg-white hover:bg-[#e8f0fe] text-[#202124] hover:text-[#1a73e8] rounded-md border border-[#dadce0] transition-colors"
                                            title="גודל טקסט רגיל (14px)"
                                        >
                                            רגיל
                                        </button>
                                    </div>

                                    {/* 3 Colors */}
                                    <div className="flex items-center gap-1.5 pl-2 border-l border-[#dadce0]">
                                        <button
                                            type="button"
                                            onClick={() => applyColor('#202124')}
                                            className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-gray-100 rounded-md border border-[#dadce0] text-[12px] text-[#202124]"
                                            title="טקסט רגיל כהה"
                                        >
                                            <span className="w-3.5 h-3.5 rounded-full bg-[#202124] inline-block border border-gray-400"></span>
                                            שחור
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyColor('#1a73e8')}
                                            className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#e8f0fe] rounded-md border border-[#dadce0] text-[12px] text-[#1a73e8]"
                                            title="הדגשה כחול Google"
                                        >
                                            <span className="w-3.5 h-3.5 rounded-full bg-[#1a73e8] inline-block"></span>
                                            כחול
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyColor('#d93025')}
                                            className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#fce8e6] rounded-md border border-[#dadce0] text-[12px] text-[#d93025]"
                                            title="התראה דחופה אדום"
                                        >
                                            <span className="w-3.5 h-3.5 rounded-full bg-[#d93025] inline-block"></span>
                                            אדום
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (editorRef.current) {
                                                editorRef.current.innerHTML = '';
                                                setHtmlContent('');
                                            }
                                        }}
                                        className="text-[12px] text-[#5f6368] hover:text-[#d93025] px-2 py-1 hover:bg-white rounded-md transition-colors"
                                        title="נקה את כל הטקסט"
                                    >
                                        נקה טקסט
                                    </button>
                                </div>

                                {/* ContentEditable Area */}
                                <div
                                    ref={editorRef}
                                    contentEditable
                                    onInput={handleContentInput}
                                    data-placeholder="הקלד כאן את העדכון או ההודעה..."
                                    className="min-h-[140px] max-h-[220px] overflow-y-auto p-4 rounded-[16px] border border-[#dadce0] bg-white text-right focus:outline-hidden focus:ring-2 focus:ring-[#1a73e8]/30 focus:border-[#1a73e8] transition-all text-[#202124] text-[15px] leading-relaxed"
                                    style={{ direction: 'rtl' }}
                                />
                            </div>

                            {/* 2. Photo Upload Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[14px] font-medium text-[#202124] flex items-center gap-1.5">
                                        <ImageIcon size={16} className="text-[#1a73e8]" />
                                        תמונות מצורפות:
                                    </label>
                                    <span className="text-[12px] text-[#5f6368]">
                                        עד 8MB לקובץ (JPG, PNG, WebP)
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-3 items-center">
                                    {/* Upload Trigger Button */}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept="image/*"
                                        className="hidden"
                                        id="bulletin-image-upload"
                                    />
                                    <label
                                        htmlFor="bulletin-image-upload"
                                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-dashed border-[#1a73e8] text-[#1a73e8] bg-[#e8f0fe]/50 hover:bg-[#e8f0fe] cursor-pointer text-[13px] font-medium transition-colors ${
                                            uploadingImage ? 'opacity-50 pointer-events-none' : ''
                                        }`}
                                    >
                                        {uploadingImage ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" /> מעלה תמונה...
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={16} /> העלה תמונה מהמכשיר
                                            </>
                                        )}
                                    </label>
                                </div>

                                {/* Uploaded Thumbnails Grid */}
                                {images.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                                        {images.map((img) => (
                                            <div
                                                key={img.id}
                                                className="relative group rounded-[14px] overflow-hidden border border-[#dadce0] bg-[#f8f9fa]"
                                            >
                                                <img
                                                    src={img.downloadUrl}
                                                    alt={img.caption || 'תמונה מצורפת'}
                                                    className="w-full h-28 object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveImage(img)}
                                                    className="absolute top-2 left-2 p-1.5 bg-white/90 hover:bg-[#d93025] hover:text-white text-[#d93025] rounded-full shadow-md transition-colors"
                                                    title="הסר תמונה"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                <input
                                                    type="text"
                                                    value={img.caption || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setImages((prev) =>
                                                            prev.map((i) => (i.id === img.id ? { ...i, caption: val } : i))
                                                        );
                                                    }}
                                                    placeholder="כיתוב לתמונה (אופציונלי)"
                                                    className="w-full text-[11px] p-1.5 bg-white border-t border-[#dadce0] text-right focus:outline-hidden text-[#3c4043]"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 3. Action Link Chips Builder */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[14px] font-medium text-[#202124] flex items-center gap-1.5">
                                        <ExternalLink size={16} className="text-[#1a73e8]" />
                                        כפתורי קישור מהירים (Chips):
                                    </label>
                                    <span className="text-[12px] text-[#5f6368]">
                                        יופיעו כצ'יפים בולטים בתחתית הבלוק
                                    </span>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="text"
                                        value={newLinkLabel}
                                        onChange={(e) => setNewLinkLabel(e.target.value)}
                                        placeholder="טקסט הכפתור (למשל: כניסה למפגש הזום)"
                                        className="flex-1 p-2.5 rounded-[12px] border border-[#dadce0] text-[13px] focus:outline-hidden focus:border-[#1a73e8] text-right"
                                    />
                                    <input
                                        type="url"
                                        value={newLinkUrl}
                                        onChange={(e) => setNewLinkUrl(e.target.value)}
                                        placeholder="כתובת URL (למשל: https://zoom.us/...)"
                                        className="flex-1 p-2.5 rounded-[12px] border border-[#dadce0] text-[13px] focus:outline-hidden focus:border-[#1a73e8] text-left"
                                        dir="ltr"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddLink}
                                        className="px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-[13px] font-medium rounded-[12px] transition-colors flex items-center justify-center gap-1 shrink-0"
                                    >
                                        <Plus size={16} /> הוסף
                                    </button>
                                </div>

                                {/* Active Links List */}
                                {links.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {links.map((link) => (
                                            <div
                                                key={link.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]"
                                            >
                                                <span>{link.label}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveLink(link.id)}
                                                    className="w-4 h-4 rounded-full hover:bg-black/10 flex items-center justify-center text-[#5f6368] hover:text-[#d93025]"
                                                    title="הסר קישור"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <footer className="px-5 py-4 border-t border-[#dadce0] bg-[#f8f9fa] flex items-center justify-between shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving || uploadingImage}
                        className="px-4 py-2 rounded-full border border-[#dadce0] hover:bg-[#e8eaed] text-[#3c4043] text-[14px] font-medium transition-colors"
                    >
                        ביטול
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || uploadingImage || loading}
                        className="px-6 py-2.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white text-[14px] font-medium shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> שומר בענן...
                            </>
                        ) : (
                            <>
                                <Check size={16} /> שמור ועדכן לוח ({activeTab === 'students' ? 'חניכים' : 'מדריכים'})
                            </>
                        )}
                    </button>
                </footer>
            </div>
        </div>
    );
};
