/**
 * Hybrid Share Modal Component
 * Handles Mobile Native Web Share API, Desktop Custom Share Modal,
 * Social Media share links (WhatsApp, Telegram, SMS), Clipboard copy, and Toast notifications.
 */
export class ShareModalComponent {
    #elements = {};

    constructor() {
        this.#getElements();
        this.#initEvents();
    }

    #getElements() {
        this.#elements = {
            shareModal: document.getElementById("shareModal"),
            closeShareModal: document.getElementById("closeShareModal"),
            shareWhatsAppBtn: document.getElementById("shareWhatsAppBtn"),
            shareTelegramBtn: document.getElementById("shareTelegramBtn"),
            shareSmsBtn: document.getElementById("shareSmsBtn"),
            copyShareUrlBtn: document.getElementById("copyShareUrlBtn"),
            copyShareTextBtn: document.getElementById("copyShareTextBtn"),
            shareToast: document.getElementById("shareToast"),
            sharePreviewFrom: document.getElementById("sharePreviewFrom"),
            sharePreviewTo: document.getElementById("sharePreviewTo"),
            sharePreviewDist: document.getElementById("sharePreviewDist"),
            sharePreviewTime: document.getElementById("sharePreviewTime"),
            sharePreviewFare: document.getElementById("sharePreviewFare"),
        };
    }

    #initEvents() {
        const { closeShareModal, shareModal } = this.#elements;

        if (closeShareModal) {
            closeShareModal.addEventListener("click", () => this.close());
        }

        if (shareModal) {
            shareModal.addEventListener("click", (e) => {
                if (e.target === shareModal) {
                    this.close();
                }
            });
        }

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && shareModal?.classList.contains("active")) {
                this.close();
            }
        });
    }

    /**
     * Share Action: Mobile Web Share API ya Desktop Custom Share Modal
     * @param {Object} shareData 
     * @param {string} currentLang 
     */
    async share(shareData, currentLang = "en") {
        if (!shareData) return;

        const { shareText, startName, endName } = shareData;

        // A) Mobile Native Share Sheet (yadi available ho)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Metro Route: ${startName} to ${endName}`,
                    text: shareText,
                });
                return;
            } catch (err) {
                if (err.name === "AbortError") return;
            }
        }

        // B) Desktop / Fallback Custom Share Modal
        this.open(shareData, currentLang);
    }

    /**
     * Custom Share Modal Open karein aur links fill karein
     */
    open(data, currentLang = "en") {
        const { startName, endName, distKm, totalMin, tokenFare, shareUrl, shareText } = data;
        const { shareModal, sharePreviewFrom, sharePreviewTo, sharePreviewDist, sharePreviewTime, sharePreviewFare, shareWhatsAppBtn, shareTelegramBtn, shareSmsBtn, copyShareUrlBtn, copyShareTextBtn } = this.#elements;

        if (!shareModal) return;

        if (sharePreviewFrom) sharePreviewFrom.textContent = startName;
        if (sharePreviewTo) sharePreviewTo.textContent = endName;
        if (sharePreviewDist) sharePreviewDist.textContent = `${distKm} km`;
        if (sharePreviewTime) sharePreviewTime.textContent = `${totalMin} min`;
        if (sharePreviewFare) sharePreviewFare.textContent = `₹${tokenFare}`;

        const encodedText = encodeURIComponent(shareText);
        const encodedUrl = encodeURIComponent(shareUrl);

        if (shareWhatsAppBtn) {
            shareWhatsAppBtn.onclick = () => {
                window.open(`https://api.whatsapp.com/send?text=${encodedText}`, "_blank");
            };
        }

        if (shareTelegramBtn) {
            shareTelegramBtn.onclick = () => {
                window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, "_blank");
            };
        }

        if (shareSmsBtn) {
            shareSmsBtn.onclick = () => {
                window.location.href = `sms:?body=${encodedText}`;
            };
        }

        if (copyShareUrlBtn) {
            copyShareUrlBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    this.showToast(
                        currentLang === "hi"
                            ? "रूट का लिंक क्लिपबोर्ड में कॉपी हो गया!"
                            : "Route link copied to clipboard!"
                    );
                } catch (e) {
                    console.error("Clipboard copy failed:", e);
                }
            };
        }

        if (copyShareTextBtn) {
            copyShareTextBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(shareText);
                    this.showToast(
                        currentLang === "hi"
                            ? "पूरा विवरण और लिंक क्लिपबोर्ड में कॉपी हो गया!"
                            : "Full details & link copied to clipboard!"
                    );
                } catch (e) {
                    console.error("Clipboard copy failed:", e);
                }
            };
        }

        shareModal.classList.add("active");
        shareModal.setAttribute("aria-hidden", "false");
    }

    close() {
        const { shareModal } = this.#elements;
        if (shareModal) {
            shareModal.classList.remove("active");
            shareModal.setAttribute("aria-hidden", "true");
        }
    }

    showToast(message) {
        const toast = this.#elements.shareToast;
        if (!toast) return;

        toast.textContent = message;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }
}