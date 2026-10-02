import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface MobileNavItem {
    id: string;
    label: string;
    icon: LucideIcon;
    badge?: number | string;
    onClick: () => void;
    active: boolean;
}

interface MobileBottomNavProps {
    items: MobileNavItem[];
    ariaLabel?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
    items,
    ariaLabel = 'ניווט מהיר למובייל',
}) => {
    return (
        <nav
            role="navigation"
            aria-label={ariaLabel}
            className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#dadce0] shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            dir="rtl"
        >
            <div className="flex items-center justify-around max-w-md mx-auto">
                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.active;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={item.onClick}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all rounded-xl relative active:scale-95 ${
                                isActive ? 'text-[#1a73e8]' : 'text-[#5f6368] hover:text-[#202124]'
                            }`}
                        >
                            <div
                                className={`w-10 h-7 flex items-center justify-center rounded-full transition-colors relative ${
                                    isActive ? 'bg-[#e8f0fe]' : 'bg-transparent'
                                }`}
                            >
                                <Icon size={20} className={isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'} />
                                {item.badge !== undefined && (
                                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#d93025] text-white text-[10px] font-bold flex items-center justify-center">
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            <span
                                className={`text-[11px] mt-0.5 leading-tight tracking-tight transition-all ${
                                    isActive ? 'font-semibold text-[#1a73e8]' : 'font-normal text-[#5f6368]'
                                }`}
                            >
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
