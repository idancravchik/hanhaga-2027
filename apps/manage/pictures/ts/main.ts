/**
 * Picture Capture App for Candidates (ממשק צילום מתמיינים)
 * Hanhaga 2027 Management Portal
 */

import { CandidateItem, loadCandidatesFromSheet } from './sheetService';
import { uploadCandidatePhoto } from './uploadService';

export interface AppState {
  selectedCandidate: CandidateItem | null;
  hasCapturedPhoto: boolean;
  capturedImageDataUrl: string | null;
  isCameraActive: boolean;
  isUploading: boolean;
}

class PictureCaptureController {
  private state: AppState = {
    selectedCandidate: null,
    hasCapturedPhoto: false,
    capturedImageDataUrl: null,
    isCameraActive: false,
    isUploading: false,
  };

  private candidates: CandidateItem[] = [];

  // DOM Elements - Combobox
  private comboboxWrapper = document.getElementById('comboboxWrapper') as HTMLElement;
  private candidateSearchInput = document.getElementById('candidateSearchInput') as HTMLInputElement;
  private candidateDropdownList = document.getElementById('candidateDropdownList') as HTMLUListElement;

  // DOM Elements - Camera
  private cameraContainer = document.getElementById('cameraContainer') as HTMLElement;
  private cameraVideo = document.getElementById('cameraVideo') as HTMLVideoElement;
  private cameraCanvas = document.getElementById('cameraCanvas') as HTMLCanvasElement;
  private cameraFlash = document.getElementById('cameraFlash') as HTMLElement;

  // DOM Elements - Actions
  private captureBtn = document.getElementById('captureBtn') as HTMLButtonElement;
  private captureBtnText = document.getElementById('captureBtnText') as HTMLElement;
  private approveBtn = document.getElementById('approveBtn') as HTMLButtonElement;

  // DOM Elements - Toast
  private toastContainer = document.getElementById('toastContainer') as HTMLElement;
  private toastMessage = document.getElementById('toastMessage') as HTMLElement;
  private toastIcon = document.getElementById('toastIcon') as HTMLElement;
  private toastTimer: number | null = null;

  // Media Stream
  private mediaStream: MediaStream | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    this.setupEventListeners();
    await this.initCamera();
    await this.loadCandidates();
  }

  /**
   * Loads candidate roster from Google Sheets CSV
   */
  private async loadCandidates(): Promise<void> {
    this.candidateSearchInput.placeholder = 'טוען רשימת מתמיינים...';
    this.candidates = await loadCandidatesFromSheet();
    this.candidateSearchInput.placeholder = 'חפש מתמיין מהרשימה...';
    this.renderDropdown(this.candidates);
  }

  private setupEventListeners(): void {
    // Combobox input focus & search
    this.candidateSearchInput.addEventListener('focus', () => {
      this.openDropdown();
    });

    this.candidateSearchInput.addEventListener('input', () => {
      const query = this.candidateSearchInput.value.trim().toLowerCase();
      const filtered = this.candidates.filter((c) =>
        c.name.toLowerCase().includes(query) || (c.group && c.group.toLowerCase().includes(query))
      );
      this.renderDropdown(filtered);
      this.openDropdown();

      // If user altered input text, clear active candidate until re-selected
      if (this.state.selectedCandidate && this.candidateSearchInput.value !== this.state.selectedCandidate.name) {
        this.state.selectedCandidate = null;
      }
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!this.comboboxWrapper.contains(target)) {
        this.closeDropdown();
      }
    });

    // Keyboard navigation in combobox
    this.candidateSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeDropdown();
      }
    });

    // Capture button ("צילום" / "צילום חוזר")
    this.captureBtn.addEventListener('click', () => {
      this.handleCaptureToggle();
    });

    // Approve button ("אישור")
    this.approveBtn.addEventListener('click', () => {
      this.handleApprove();
    });
  }

  /**
   * Searchable Combobox Dropdown Logic
   */
  private openDropdown(): void {
    this.comboboxWrapper.classList.add('active');
    this.candidateDropdownList.classList.add('open');
    this.candidateSearchInput.setAttribute('aria-expanded', 'true');
  }

  private closeDropdown(): void {
    this.comboboxWrapper.classList.remove('active');
    this.candidateDropdownList.classList.remove('open');
    this.candidateSearchInput.setAttribute('aria-expanded', 'false');

    // If input was left blurred without selecting, revert to selected or empty
    if (this.state.selectedCandidate) {
      this.candidateSearchInput.value = this.state.selectedCandidate.name;
    }
  }

  private renderDropdown(items: CandidateItem[]): void {
    this.candidateDropdownList.innerHTML = '';

    if (items.length === 0) {
      const noRes = document.createElement('li');
      noRes.className = 'combobox-no-results';
      noRes.textContent = 'לא נמצאו מתמיינים תואמים';
      this.candidateDropdownList.appendChild(noRes);
      return;
    }

    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'combobox-option';
      if (this.state.selectedCandidate?.id === item.id) {
        li.classList.add('selected');
      }

      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.name;

      li.appendChild(nameSpan);

      if (item.group) {
        const groupSpan = document.createElement('span');
        groupSpan.className = 'combobox-option-group';
        groupSpan.textContent = item.group;
        li.appendChild(groupSpan);
      }

      li.addEventListener('click', () => {
        this.selectCandidate(item);
      });

      this.candidateDropdownList.appendChild(li);
    });
  }

  private selectCandidate(candidate: CandidateItem): void {
    this.state.selectedCandidate = candidate;
    this.candidateSearchInput.value = candidate.name;
    this.closeDropdown();
    this.showToast(`נבחר: ${candidate.name}`, 'info');
  }

  /**
   * Initializes webcam with automatic fallback
   */
  private async initCamera(): Promise<void> {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        this.mediaStream = stream;
        this.cameraVideo.srcObject = stream;
        this.state.isCameraActive = true;
      } catch (err) {
        console.info('Camera stream not accessible, running in simulation mode:', err);
        this.state.isCameraActive = false;
      }
    } else {
      this.state.isCameraActive = false;
    }
  }

  /**
   * Toggle between "צילום" and "צילום חוזר"
   */
  private handleCaptureToggle(): void {
    // If a photo is already captured, clicking "צילום חוזר" retakes and returns to live mode
    if (this.state.hasCapturedPhoto) {
      this.resetToLiveView();
      return;
    }

    // Must have a candidate chosen before taking a photo
    if (!this.state.selectedCandidate) {
      this.showToast('נא לבחור מתמיין לפני הצילום', 'error');
      this.candidateSearchInput.focus();
      return;
    }

    // Perform capture
    this.triggerShutterFlash();

    const width = this.cameraVideo.videoWidth || this.cameraContainer.clientWidth || 640;
    const height = this.cameraVideo.videoHeight || this.cameraContainer.clientHeight || 480;

    this.cameraCanvas.width = width;
    this.cameraCanvas.height = height;

    const ctx = this.cameraCanvas.getContext('2d');
    if (ctx) {
      if (this.state.isCameraActive && this.cameraVideo.videoWidth > 0) {
        // Mirrored draw for selfie perspective
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(this.cameraVideo, 0, 0, width, height);
        ctx.restore();
      } else {
        // Clean simulation fallback frame
        ctx.fillStyle = '#f1f3f4';
        ctx.fillRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;

        ctx.fillStyle = '#dadce0';
        ctx.beginPath();
        ctx.arc(centerX, centerY - 25, 60, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 90, 100, 70, 0, 0, Math.PI);
        ctx.fill();

        const candidateName = this.state.selectedCandidate.name;
        ctx.fillStyle = '#202124';
        ctx.font = '600 16px "Google Sans", "Open Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(candidateName, centerX, height - 30);
      }
    }

    this.state.capturedImageDataUrl = this.cameraCanvas.toDataURL('image/jpeg', 0.88);
    this.state.hasCapturedPhoto = true;

    // Display frozen canvas
    this.cameraVideo.style.display = 'none';
    this.cameraCanvas.style.display = 'block';

    // Toggle button texts & states
    this.captureBtnText.textContent = 'צילום חוזר';
    this.approveBtn.disabled = false; // Enabled & turns Google Blue!

    this.showToast('התמונה נלכדה! לחץ על אישור לשמירה בגיליון', 'success');
  }

  /**
   * Resets camera back to live feed and turns Approve button back to disabled
   */
  private resetToLiveView(): void {
    this.state.hasCapturedPhoto = false;
    this.state.capturedImageDataUrl = null;

    this.cameraCanvas.style.display = 'none';
    this.cameraVideo.style.display = 'block';

    this.captureBtnText.textContent = 'צילום';
    this.approveBtn.disabled = true; // Off / Muted gray
  }

  private triggerShutterFlash(): void {
    this.cameraFlash.classList.add('active');
    setTimeout(() => {
      this.cameraFlash.classList.remove('active');
    }, 120);
  }

  /**
   * Confirm / Approve Action ("אישור"):
   * Uploads photo, writes to Google Sheet row, and resets view for next candidate.
   */
  private async handleApprove(): Promise<void> {
    if (this.state.isUploading) return;

    if (!this.state.selectedCandidate) {
      this.showToast('נא לבחור מתמיין מהרשימה', 'error');
      this.candidateSearchInput.focus();
      return;
    }

    if (!this.state.hasCapturedPhoto || !this.state.capturedImageDataUrl) {
      this.showToast('נא לצלם תמונה תחילה', 'error');
      return;
    }

    const candidate = this.state.selectedCandidate;
    const imageData = this.state.capturedImageDataUrl;

    this.state.isUploading = true;
    this.approveBtn.disabled = true;
    this.showToast('שומר את התמונה בגיליון...', 'info');

    const result = await uploadCandidatePhoto({
      candidateName: candidate.name,
      rowIndex: candidate.rowIndex,
      imageBase64: imageData,
    });

    this.state.isUploading = false;

    if (result.success) {
      this.showToast(`התמונה עבור ${candidate.name} נשמרה בהצלחה!`, 'success');

      // Reset everything to default for the next candidate
      this.state.selectedCandidate = null;
      this.candidateSearchInput.value = '';
      this.renderDropdown(this.candidates);
      this.resetToLiveView();
    } else {
      this.showToast(result.error || 'שגיאה בשמירת התמונה', 'error');
      this.approveBtn.disabled = false; // Keep blue so user can retry
    }
  }

  /**
   * Google-style Toast Alert matching main app Toast.tsx
   */
  public showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toastMessage.textContent = message;

    if (type === 'error') {
      this.toastIcon.className = 'toast-icon error';
      this.toastIcon.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d93025" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      `;
    } else if (type === 'info') {
      this.toastIcon.className = 'toast-icon info';
      this.toastIcon.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      `;
    } else {
      this.toastIcon.className = 'toast-icon success';
      this.toastIcon.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#188038" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      `;
    }

    this.toastContainer.classList.add('show');

    this.toastTimer = window.setTimeout(() => {
      this.toastContainer.classList.remove('show');
    }, 3200);
  }
}

// Instantiate controller on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new PictureCaptureController();
});
