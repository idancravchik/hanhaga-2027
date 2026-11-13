import React from 'react';
import { Image as ImageIcon, Upload, Loader2, Trash2 } from 'lucide-react';
import { BulletinImage } from '@/types/bulletin';

export interface BulletinImageGalleryProps {
    images: BulletinImage[];
    uploadingImage: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    onRemoveImage: (img: BulletinImage) => Promise<void>;
    onUpdateCaption: (id: string, caption: string) => void;
    onInsertImageIntoText?: (img: BulletinImage) => void;
}

export const BulletinImageGallery: React.FC<BulletinImageGalleryProps> = ({
    images,
    uploadingImage,
    fileInputRef,
    onFileUpload,
    onRemoveImage,
    onUpdateCaption,
    onInsertImageIntoText,
}) => {
    return (
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
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileUpload}
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
                            <div className="absolute top-2 left-2 flex items-center gap-1">
                                {onInsertImageIntoText && (
                                    <button
                                        type="button"
                                        onClick={() => onInsertImageIntoText(img)}
                                        className="p-1.5 bg-white/90 hover:bg-[#1a73e8] hover:text-white text-[#1a73e8] rounded-full shadow-md transition-colors text-[11px]"
                                        title="הכנס תמונה לטקסט"
                                        aria-label="הכנס תמונה לטקסט"
                                    >
                                        <Upload size={13} className="rotate-180" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onRemoveImage(img)}
                                    className="p-1.5 bg-white/90 hover:bg-[#d93025] hover:text-white text-[#d93025] rounded-full shadow-md transition-colors"
                                    title="הסר תמונה"
                                    aria-label="הסר תמונה"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <input
                                type="text"
                                value={img.caption || ''}
                                onChange={(e) => onUpdateCaption(img.id, e.target.value)}
                                placeholder="כיתוב לתמונה (אופציונלי)"
                                aria-label="כיתוב לתמונה"
                                className="w-full text-[11px] p-1.5 bg-white border-t border-[#dadce0] text-right focus:outline-hidden text-[#3c4043]"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
