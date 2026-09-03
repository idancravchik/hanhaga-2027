export interface ModalState {
    show: boolean;
    title: string;
    message: string;
    isConfirm?: boolean;
    onConfirm?: () => void;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastState {
    show: boolean;
    message: string;
    type?: ToastType;
}
