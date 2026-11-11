import React, { useState, useEffect } from 'react';
import { Megaphone, ExternalLink, Image as ImageIcon, X, Maximize2 } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import { BulletinBoardData, BulletinImage } from '../../types/bulletin';

export interface BulletinBoardBannerProps {
    boardId: 'students' | 'instructors';
    className?: string;
    onEditClick?: () => void;
    showEditButton?: boolean;
}

export const BulletinBoardBanner: React.FC<BulletinBoardBannerProps> = ({
    boardId,
    className = '',
    onEditClick,
    showEditButton = false
}) => {
    const [boardData, setBoardData] = useState<BulletinBoardData | null>(null);
    const [selectedImage, setSelectedImage] = useState<BulletinImage | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'bulletin_boards', boardId);
        const unsubscribe = onSnapshot(
            docRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    setBoardData(snapshot.data() as BulletinBoardData);
                } else {
                    setBoardData(null);
                }
                setLoading(false);
            },
            (error) => {
                console.warn(`Failed to subscribe to bulletin board [${boardId}]:`, error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [boardId]);

    // If still initial loading, do not flash empty space
    if (loading) {
        return null;
    }

    // Auto-hide when disabled or empty
    const hasHtml = Boolean(boardData?.htmlContent && boardData.htmlContent.trim() !== '' && boardData.htmlContent !== '<p></p>');
    const hasImages = Boolean(boardData?.images && boardData.images.length > 0);
    const hasLinks = Boolean(boardData?.links && boardData.links.length > 0);

    if (!boardData || !boardData.isEnabled || (!hasHtml && !hasImages && !hasLinks)) {
        // If an admin wants to see where the empty board is and edit it, we can show a small placeholder if showEditButton is true
        if (showEditButton && onEditClick) {
            return (
                <div className={`mb-4 sm:mb-6 p-3 bg-[#f8f9fa] border border-dashed border-[#dadce0] rounded-[20px] flex items-center justify-between text-right ${className}`} dir="rtl">
                    <div className="flex items-center gap-2 text-[#5f6368] text-[13px]">
                        <Megaphone size={16} className="text-[#1a73e8]" />
                        <span>לוח מודעות ({boardId === 'students' ? 'חניכים' : 'מדריכים'}) כבוי או ריק כרגע</span>
                    </div>
                    <button
                        onClick={onEditClick}
                        className="px-3 py-1 bg-[#1a73e8] text-white text-[12px] font-medium rounded-full hover:bg-[#1557b0] transition-colors"
                    >
                        ערוך לוח
                    </button>
                </div>
            );
        }
        return null;
    }

    return (
        <section
            aria-label="לוח מודעות והודעות"
            className={`bg-white rounded-[24px] border border-[#dadce0] shadow-xs hover:shadow-sm transition-all overflow-hidden mb-4 sm:mb-6 text-right relative ${className}`}
            dir="rtl"
        >
            {/* Header / Accent Bar */}
            <div className="bg-gradient-to-l from-[#e8f0fe] via-white to-white px-4 sm:px-6 py-3 border-b border-[#e8eaed] flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#1a73e8] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Megaphone size={16} aria-hidden="true" />
                    </div>
                    <div>
                        <h2 className="text-[15px] sm:text-[16px] font-medium text-[#202124] leading-tight">
                            לוח מודעות ועדכונים
                        </h2>
                        {boardData.updatedAt && (
                            <p className="text-[11px] text-[#5f6368] font-normal leading-none mt-0.5">
                                עודכן: {new Date(boardData.updatedAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        )}
                    </div>
                </div>

                {showEditButton && onEditClick && (
                    <button
                        onClick={onEditClick}
                        className="px-3 py-1 rounded-full text-[12px] font-medium bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#3c4043] transition-colors flex items-center gap-1"
                        aria-label="ערוך לוח מודעות"
                    >
                        עריכה
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="p-4 sm:p-6 space-y-4">
                {/* Formatted Text Body */}
                {hasHtml && (
                    <div
                        className="bulletin-content leading-relaxed select-text space-y-2"
                        dangerouslySetInnerHTML={{ __html: boardData.htmlContent }}
                    />
                )}

                {/* Uploaded Photos */}
                {hasImages && (
                    <div className="pt-2">
                        <div className={`grid gap-3 ${boardData.images.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}>
                            {boardData.images.map((img) => (
                                <div
                                    key={img.id}
                                    className="group relative rounded-[16px] overflow-hidden border border-[#dadce0] bg-[#f8f9fa] cursor-pointer"
                                    onClick={() => setSelectedImage(img)}
                                    title="לחץ להגדלה"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedImage(img)}
                                >
                                    <img
                                        src={img.downloadUrl}
                                        alt={img.caption || 'תמונת עדכון בלוח המודעות'}
                                        loading="lazy"
                                        className="w-full h-48 sm:h-56 object-cover group-hover:scale-[1.02] transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="p-2 bg-white/90 rounded-full text-[#202124] shadow-sm">
                                            <Maximize2 size={16} />
                                        </div>
                                    </div>
                                    {img.caption && (
                                        <p className="p-2 text-[12px] text-[#5f6368] bg-white border-t border-[#dadce0] truncate">
                                            {img.caption}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Link Chips */}
                {hasLinks && (
                    <div className="pt-2 flex flex-wrap gap-2 items-center">
                        {boardData.links.map((link) => (
                            <a
                                key={link.id}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] sm:text-[14px] font-medium bg-[#e8f0fe] text-[#1a73e8] hover:bg-[#d2e3fc] active:bg-[#c2d7fa] transition-colors border border-[#d2e3fc] shadow-2xs hover:shadow-xs group shrink-0"
                            >
                                <span>{link.label}</span>
                                <ExternalLink size={14} className="group-hover:translate-x-[-1px] transition-transform" />
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox Modal for Photo Preview */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn"
                    onClick={() => setSelectedImage(null)}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-[24px] overflow-hidden p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-4 left-4 z-10 w-9 h-9 bg-white/90 hover:bg-white text-[#202124] rounded-full flex items-center justify-center shadow-md transition-all"
                            aria-label="סגור תמונה"
                        >
                            <X size={20} />
                        </button>
                        <img
                            src={selectedImage.downloadUrl}
                            alt={selectedImage.caption || 'תמונה בהגדלה'}
                            className="max-h-[80vh] w-auto mx-auto rounded-[16px] object-contain"
                        />
                        {selectedImage.caption && (
                            <p className="p-3 text-center text-[#202124] text-[14px] font-medium">
                                {selectedImage.caption}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};
