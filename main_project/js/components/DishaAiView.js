/**
 * 🤖 DishaAiView - Pure UI Interaction Component for Disha AI
 * Phase 1: Semantic UI, State Transitions, and Interactive Placeholders
 * Strict adherence to base.css tokens and Zero-Inline CSS architecture
 */

import { dishaAiEngine } from "../services/ai/DishaAiEngine.js";
import { centerClass } from "../core/CenterClass.js";
import { DishaAiChatStorage } from "../services/ai/DishaAiChatStorage.js";
import { DishaAiFeedbackService } from "../services/ai/DishaAiFeedbackService.js";
import { eventBus } from "../core/event-bus.js";
import { appStateStore } from "../core/app-state-store.js";

export class DishaAiView {
	#sectionEl = null;
	#newChatBtn = null;
	#recentChatBtn = null;
	#bodyWrapper = null;
	#chatScrollArea = null;
	#welcomeScreen = null;
	#chatStream = null;
	#typingIndicator = null;
	#suggestionsBar = null;
	#inputForm = null;
	#messageInput = null;
	#sendBtn = null;

	// History Drawer Elements
	#historyDrawer = null;
	#historyBackdrop = null;
	#historyList = null;
	#historyEmpty = null;
	#historyCount = null;
	#clearAllChatsBtn = null;

	// Active Chat Session State
	#currentChatId = null;
	#currentChatTitle = null;
	#currentChatMessages = [];

	#abortController = null;
	#currentLang = "en";
	#isTyping = false;

	constructor(options = {}) {
		this.#currentLang = options.lang || centerClass.currentLanguage || appStateStore.getState("currentLang") || "en";
		this.#abortController = new AbortController();
		this.#cacheDOMElements();
		this.#bindEvents();
	}

	destroy() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
		}
	}

	#getCurrentLang() {
		return centerClass.currentLanguage
			|| appStateStore.getState("currentLang")
			|| this.#currentLang
			|| document.documentElement.lang
			|| "en";
	}

	setLanguage(newLang) {
		this.#currentLang = newLang;
		if (this.#messageInput) {
			this.#messageInput.placeholder = centerClass.t("ai.inputPlaceholder");
		}
		if (this.#historyDrawer && !this.#historyDrawer.hidden) {
			this.#renderHistoryDrawer();
		}
	}

	focusInput() {
		if (this.#messageInput) {
			setTimeout(() => this.#messageInput.focus(), 100);
		}
	}

	#cacheDOMElements() {
		this.#sectionEl = document.querySelector("#ai-assistant");
		if (!this.#sectionEl) return;

		this.#newChatBtn = this.#sectionEl.querySelector("#aiNewChatBtn");
		this.#recentChatBtn = this.#sectionEl.querySelector("#aiRecentChatBtn");
		this.#bodyWrapper = this.#sectionEl.querySelector("#aiBodyWrapper");
		this.#chatScrollArea = this.#sectionEl.querySelector("#aiChatScrollArea");
		this.#welcomeScreen = this.#sectionEl.querySelector("#aiWelcomeScreen");
		this.#chatStream = this.#sectionEl.querySelector("#aiChatStream");
		this.#typingIndicator = this.#sectionEl.querySelector("#aiTypingIndicator");
		this.#suggestionsBar = this.#sectionEl.querySelector("#aiSuggestionsBar");
		this.#inputForm = this.#sectionEl.querySelector("#aiInputForm");
		this.#messageInput = this.#sectionEl.querySelector("#aiMessageInput");
		this.#sendBtn = this.#sectionEl.querySelector("#aiSendBtn");

		// Drawer Elements
		this.#historyDrawer = this.#sectionEl.querySelector("#aiHistoryDrawer");
		this.#historyBackdrop = this.#sectionEl.querySelector("#aiHistoryBackdrop");
		this.#historyList = this.#sectionEl.querySelector("#aiHistoryList");
		this.#historyEmpty = this.#sectionEl.querySelector("#aiHistoryEmpty");
		this.#historyCount = this.#sectionEl.querySelector("#aiHistoryCount");
		this.#clearAllChatsBtn = this.#sectionEl.querySelector("#aiClearAllChatsBtn");
	}

	#bindEvents() {
		if (!this.#sectionEl) return;
		const signal = this.#abortController.signal;

		// 1. New Chat Button
		this.#newChatBtn?.addEventListener("click", () => {
			this.resetToWelcome();
		}, { signal });

		// 2. Recent Chats Drawer Toggle
		this.#recentChatBtn?.addEventListener("click", () => {
			this.#toggleHistoryDrawer();
		}, { signal });

		this.#historyBackdrop?.addEventListener("click", () => {
			this.#closeHistoryDrawer();
		}, { signal });

		this.#clearAllChatsBtn?.addEventListener("click", () => {
			this.#handleClearAllChats();
		}, { signal });

		// Close any 3-dot dropdowns when clicking outside
		document.addEventListener("click", (e) => {
			if (!e.target.closest(".ai-history-popover") && !e.target.closest(".ai-history-menu-btn")) {
				this.#closeAllHistoryPopovers();
			}
		}, { signal });

		// 3. Starter Option Buttons (Welcome Screen)
		const starterCards = this.#welcomeScreen?.querySelectorAll(".ai-starter-btn, .ai-starter-card");
		starterCards?.forEach((card) => {
			card.addEventListener("click", () => {
				const action = card.getAttribute("data-action");
				const label = card.querySelector(".starter-label")?.textContent?.trim() || card.textContent?.trim();
				this.#handleStarterAction(action, label);
			}, { signal });
		});

		// 4. Message Input State
		this.#messageInput?.addEventListener("input", () => {
			this.#syncSendButtonState();
		}, { signal });

		// 5. Keyboard Shortcuts: Enter to submit
		this.#messageInput?.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				this.#inputForm?.requestSubmit();
			}
		}, { signal });

		// 6. Input Form Submission
		this.#inputForm?.addEventListener("submit", (e) => {
			e.preventDefault();
			const text = this.#messageInput?.value?.trim();
			if (!text || this.#isTyping) return;

			this.#handleUserQuery(text);
			this.#messageInput.value = "";
			this.#syncSendButtonState();
		}, { signal });
	}

	#syncSendButtonState() {
		if (!this.#sendBtn || !this.#messageInput) return;
		const hasText = this.#messageInput.value.trim().length > 0;
		this.#sendBtn.disabled = !hasText || this.#isTyping;
	}

	#scrollToBottom() {
		const target = this.#chatScrollArea || this.#bodyWrapper;
		if (!target) return;
		requestAnimationFrame(() => {
			target.scrollTop = target.scrollHeight;
		});
	}

	/**
	 * State A: Reset UI to initial Welcome Screen
	 */
	resetToWelcome() {
		this.#closeHistoryDrawer();
		this.#currentChatId = null;
		this.#currentChatTitle = null;
		this.#currentChatMessages = [];

		dishaAiEngine.reset();
		if (this.#welcomeScreen) this.#welcomeScreen.hidden = false;
		if (this.#chatStream) {
			this.#chatStream.hidden = true;
			this.#chatStream.innerHTML = "";
		}
		if (this.#suggestionsBar) {
			this.#suggestionsBar.hidden = true;
			this.#suggestionsBar.innerHTML = "";
		}
		this.#hideTyping();
		if (this.#messageInput) {
			this.#messageInput.value = "";
			this.#syncSendButtonState();
			this.#messageInput.focus();
		}
	}

	/**
	 * Switch from Welcome Screen to Active Chat Conversation
	 */
	#ensureChatActive() {
		if (this.#welcomeScreen) this.#welcomeScreen.hidden = true;
		if (this.#chatStream) this.#chatStream.hidden = false;
	}

	/**
	 * Handle Click on Starter Cards
	 */
	#handleStarterAction(action, label) {
		const prompt = label || "How can I help you?";
		this.#handleUserQuery(prompt, action);
	}

	/**
	 * Main User Query Handler (Integrated with DishaAiEngine & Route Engine)
	 */
	async #handleUserQuery(queryText, actionType = null, actionPayload = null) {
		this.#ensureChatActive();

		// Initialize session if starting fresh
		if (!this.#currentChatId) {
			this.#currentChatId = "chat_" + Date.now();
			this.#currentChatTitle = DishaAiChatStorage.generateSmartTitle(queryText, this.#getCurrentLang());
		}

		const userTime = this.#getFormattedTime();
		this.renderUserMessage(queryText);
		this.#currentChatMessages.push({
			role: "user",
			text: queryText,
			time: userTime
		});

		this.#showTyping();

		try {
			let engineResult = null;
			const activeLang = this.#getCurrentLang();

			// Handle Welcome Starter Card Prompts
			if (actionType && !actionPayload) {
				engineResult = await dishaAiEngine.processMessage(queryText, {
					lang: activeLang,
					starterAction: actionType
				});
			} else {
				engineResult = await dishaAiEngine.processMessage(queryText, {
					lang: activeLang,
					actionPayload: actionPayload?.payload ? actionPayload : (actionPayload?.action ? actionPayload : null)
				});
			}

			let resultCardHtml = null;
			if (engineResult.cardData) {
				resultCardHtml = this.getJourneyCardHtml(engineResult.cardData);
			}

			this.#hideTyping();
			const botTime = this.#getFormattedTime();
			const botMsgIndex = this.#currentChatMessages.length;
			this.renderBotMessage({
				text: engineResult.text,
				actions: engineResult.actions || [],
				resultCardHtml,
				suggestions: engineResult.suggestions || [],
				msgIndex: botMsgIndex,
				feedback: null
			});

			this.#currentChatMessages.push({
				role: "bot",
				text: engineResult.text,
				time: botTime,
				cardData: engineResult.cardData || null,
				actions: engineResult.actions || [],
				suggestions: engineResult.suggestions || [],
				feedback: null
			});

			this.#persistCurrentSession();
		} catch (err) {
			console.error("[DishaAiView] Failed to process query:", err);
			this.#hideTyping();
			const botErrorText = centerClass.t("ai.errorMessage");
			const botMsgIndex = this.#currentChatMessages.length;
			this.renderBotMessage({
				text: botErrorText,
				actions: [],
				suggestions: [centerClass.t("ai.tryAgain")],
				msgIndex: botMsgIndex,
				feedback: null
			});

			this.#currentChatMessages.push({
				role: "bot",
				text: botErrorText,
				time: this.#getFormattedTime(),
				cardData: null,
				actions: [],
				suggestions: [],
				feedback: null
			});

			this.#persistCurrentSession();
		}
	}

	/**
	 * Render User Chat Bubble
	 */
	renderUserMessage(text) {
		if (!this.#chatStream) return;

		const group = document.createElement("div");
		group.className = "ai-msg-group user-group";

		const bubble = document.createElement("div");
		bubble.className = "ai-msg-bubble-user";
		bubble.textContent = text;

		const time = document.createElement("span");
		time.className = "ai-msg-time";
		time.textContent = this.#getFormattedTime();

		group.appendChild(bubble);
		group.appendChild(time);
		this.#chatStream.appendChild(group);

		this.#scrollToBottom();
	}

	/**
	 * Render Disha AI Bot Bubble with optional actions & result cards
	 */
	renderBotMessage({ text, actions = [], resultCardHtml = null, suggestions = [], msgIndex = null, feedback = null }) {
		if (!this.#chatStream) return;

		const group = document.createElement("div");
		group.className = "ai-msg-group bot-group";

		const row = document.createElement("div");
		row.className = "ai-bot-row";

		const avatar = document.createElement("div");
		avatar.className = "ai-bot-avatar";
		avatar.setAttribute("aria-hidden", "true");
		avatar.innerHTML = `<span class="icon ai-icon avatar-icon"></span>`;

		const bubble = document.createElement("div");
		bubble.className = "ai-msg-bubble-bot";

		if (text) {
			const p = document.createElement("p");
			p.textContent = text;
			bubble.appendChild(p);
		}

		// Structured Result Card (State C layout)
		if (resultCardHtml) {
			const cardContainer = document.createElement("div");
			cardContainer.innerHTML = resultCardHtml;
			const cardEl = cardContainer.firstElementChild || cardContainer;

			// Bind click on "Find Route" inside card
			const findRouteBtn = cardEl.querySelector('[data-action="find-route"]');
			if (findRouteBtn) {
				findRouteBtn.addEventListener("click", () => {
					const from = findRouteBtn.getAttribute("data-from");
					const to = findRouteBtn.getAttribute("data-to");
					const startInput = document.getElementById("startStation");
					const endInput = document.getElementById("endStation");
					if (startInput && from) startInput.value = from;
					if (endInput && to) endInput.value = to;

					// Switch sidebar to route-finder tab
					const routeFinderTab = document.querySelector('.sidebar-link[data-target="route-finder"]');
					if (routeFinderTab) routeFinderTab.click();

					// Trigger pre-written route search pipeline
					document.querySelector(".routeFinder")?.requestSubmit();
				});
			}

			// Bind click on "Show on Map" inside card
			const mapBtn = cardEl.querySelector('[data-action="view-map"]');
			if (mapBtn) {
				mapBtn.addEventListener("click", () => {
					const activeResult = dishaAiEngine.context.lastRouteResult;
					if (activeResult?.path) {
						centerClass.highlightRoute(activeResult.path, { customZoom: 2.2 });
					} else {
						const from = findRouteBtn?.getAttribute("data-from");
						const to = findRouteBtn?.getAttribute("data-to");
						if (from && to) {
							const routeInfo = centerClass.searchRoute(from, to);
							if (routeInfo?.path) {
								centerClass.highlightRoute(routeInfo.path, { customZoom: 2.2 });
							}
						}
					}
					// Minimize/close sidebar so full map is revealed
					const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");
					if (sidebarCloseBtn) {
						sidebarCloseBtn.click();
					} else {
						document.body.dataset.activeTab = "map";
						document.querySelectorAll(".sidebar-section").forEach(s => s.classList.remove("active"));
					}
				});
			}
			bubble.appendChild(cardEl);
		}

		// Interactive Selectable Buttons/Chips
		if (actions && actions.length > 0) {
			const actionsWrap = document.createElement("div");
			actionsWrap.className = "ai-interactive-actions";

			actions.forEach((act) => {
				const chip = document.createElement("button");
				chip.type = "button";
				chip.className = "ai-action-chip";
				chip.textContent = act.label;
				chip.addEventListener("click", () => {
					if (act.onClick) {
						act.onClick();
					} else {
						this.#handleUserQuery(act.label, null, act);
					}
				});
				actionsWrap.appendChild(chip);
			});

			bubble.appendChild(actionsWrap);
		}

		const footer = document.createElement("div");
		footer.className = "ai-msg-footer";

		const time = document.createElement("span");
		time.className = "ai-msg-time";
		time.textContent = this.#getFormattedTime();
		footer.appendChild(time);

		// Feedback (👍 / 👎)
		const feedbackWrap = document.createElement("div");
		feedbackWrap.className = "ai-msg-feedback";
		feedbackWrap.setAttribute("role", "group");
		feedbackWrap.setAttribute("aria-label", "Feedback");

		const upBtn = document.createElement("button");
		upBtn.type = "button";
		upBtn.className = "ai-feedback-btn" + (feedback === "up" ? " active-up" : "");
		upBtn.title = centerClass.t("ai.helpful");
		upBtn.setAttribute("aria-label", centerClass.t("ai.helpful"));
		upBtn.innerHTML = '<span aria-hidden="true">👍</span>';

		const downBtn = document.createElement("button");
		downBtn.type = "button";
		downBtn.className = "ai-feedback-btn" + (feedback === "down" ? " active-down" : "");
		downBtn.title = centerClass.t("ai.notHelpful");
		downBtn.setAttribute("aria-label", centerClass.t("ai.notHelpful"));
		downBtn.innerHTML = '<span aria-hidden="true">👎</span>';

		const currentMsgIdx = typeof msgIndex === "number" ? msgIndex : (this.#currentChatMessages.length - 1);

		upBtn.addEventListener("click", () => {
			if (upBtn.classList.contains("active-up")) return; // Prevent multiple clicks
			upBtn.classList.add("active-up");
			downBtn.classList.remove("active-down");
			if (this.#currentChatMessages[currentMsgIdx]) {
				this.#currentChatMessages[currentMsgIdx].feedback = "up";
			}
			DishaAiChatStorage.recordFeedback(this.#currentChatId, currentMsgIdx, "up");
			const lastUserQuery = this.#currentChatMessages.slice(0, currentMsgIdx).reverse().find(m => m.role === "user")?.text || "";
			DishaAiChatStorage.logQueryFeedback({ query: lastUserQuery, botText: text, isSuccess: true, lang: this.#getCurrentLang() });
			DishaAiFeedbackService.recordAndSync({
				query: lastUserQuery,
				botText: text,
				isSuccess: true,
				feedbackType: "up",
				lang: this.#getCurrentLang()
			});
			this.#persistCurrentSession();
			eventBus.emit("SHOW_TOAST", {
				message: centerClass.t("ai.feedbackThanks"),
				type: "success"
			});
		});

		downBtn.addEventListener("click", () => {
			if (downBtn.classList.contains("active-down")) return; // Prevent multiple clicks
			downBtn.classList.add("active-down");
			upBtn.classList.remove("active-up");
			if (this.#currentChatMessages[currentMsgIdx]) {
				this.#currentChatMessages[currentMsgIdx].feedback = "down";
			}
			DishaAiChatStorage.recordFeedback(this.#currentChatId, currentMsgIdx, "down");
			const lastUserQuery = this.#currentChatMessages.slice(0, currentMsgIdx).reverse().find(m => m.role === "user")?.text || "";
			DishaAiChatStorage.logQueryFeedback({ query: lastUserQuery, botText: text, isSuccess: false, lang: this.#getCurrentLang() });
			DishaAiFeedbackService.recordAndSync({
				query: lastUserQuery,
				botText: text,
				isSuccess: false,
				feedbackType: "down",
				lang: this.#getCurrentLang()
			});
			this.#persistCurrentSession();
			eventBus.emit("SHOW_TOAST", {
				message: centerClass.t("ai.feedbackThanks"),
				type: "info"
			});
		});

		feedbackWrap.appendChild(upBtn);
		feedbackWrap.appendChild(downBtn);
		footer.appendChild(feedbackWrap);

		row.appendChild(avatar);
		row.appendChild(bubble);

		group.appendChild(row);
		group.appendChild(footer);
		this.#chatStream.appendChild(group);

		// Populate follow-up suggestions in sticky footer
		this.#renderSuggestions(suggestions);

		this.#scrollToBottom();
	}

	/**
	 * Render Follow-up Suggestion Chips Bar
	 */
	#renderSuggestions(suggestions = []) {
		if (!this.#suggestionsBar) return;

		if (!suggestions || suggestions.length === 0) {
			this.#suggestionsBar.hidden = true;
			this.#suggestionsBar.innerHTML = "";
			return;
		}

		this.#suggestionsBar.innerHTML = "";
		suggestions.forEach((text) => {
			const pill = document.createElement("button");
			pill.type = "button";
			pill.className = "ai-suggest-pill";
			pill.textContent = text;
			pill.addEventListener("click", () => {
				this.#handleUserQuery(text);
			});
			this.#suggestionsBar.appendChild(pill);
		});

		this.#suggestionsBar.hidden = false;
	}

	/**
	 * State C Template: Pre-built Journey Result Layout (Phase 2 Ready)
	 */
	getJourneyCardHtml({ fromName, toName, lineName, durationMin, distanceKm, fareRs }) {
		return `
			<div class="ai-result-card" role="region" aria-label="Route summary">
				<div class="ai-result-header">
					<span class="ai-result-badge">${lineName || centerClass.t("ai.directRoute")}</span>
					<div class="ai-result-stations">
						<span>${fromName}</span>
						<span class="ai-result-arrow">➔</span>
						<span>${toName}</span>
					</div>
				</div>
				<div class="ai-result-metrics">
					<div class="ai-metric-item">
						<span class="metric-label">${centerClass.t("ai.time")}</span>
						<span class="metric-value">${durationMin} min</span>
					</div>
					<div class="ai-metric-item">
						<span class="metric-label">${centerClass.t("ai.dist")}</span>
						<span class="metric-value">${distanceKm} km</span>
					</div>
					<div class="ai-metric-item">
						<span class="metric-label">${centerClass.t("ai.fare")}</span>
						<span class="metric-value">₹${fareRs}</span>
					</div>
				</div>
				<div class="ai-result-actions">
					<button type="button" class="ai-btn-result" data-action="find-route" data-from="${fromName}" data-to="${toName}">
						<span>🧭</span>
						<span>${centerClass.t("ai.findRoute")}</span>
					</button>
					<button type="button" class="ai-btn-result" data-action="view-map">
						<span>🗺️</span>
						<span>${centerClass.t("ai.showOnMap")}</span>
					</button>
				</div>
			</div>
		`;
	}

	/**
	 * Loading Typing Dots
	 */
	#showTyping() {
		this.#isTyping = true;
		this.#syncSendButtonState();
		if (this.#typingIndicator) {
			this.#typingIndicator.hidden = false;
			this.#scrollToBottom();
		}
	}

	#hideTyping() {
		this.#isTyping = false;
		this.#syncSendButtonState();
		if (this.#typingIndicator) {
			this.#typingIndicator.hidden = true;
		}
	}



	#getFormattedTime() {
		const now = new Date();
		return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	/**
	 * Persist current active conversation session to localStorage
	 */
	#persistCurrentSession() {
		if (!this.#currentChatId || this.#currentChatMessages.length === 0) return;
		DishaAiChatStorage.saveChat({
			id: this.#currentChatId,
			title: this.#currentChatTitle || centerClass.t("ai.newChat"),
			messages: this.#currentChatMessages,
			context: dishaAiEngine.exportState ? dishaAiEngine.exportState() : null
		});
	}

	/**
	 * Toggle Slide-in History Drawer
	 */
	#toggleHistoryDrawer() {
		if (this.#historyDrawer?.classList.contains("is-open")) {
			this.#closeHistoryDrawer();
		} else {
			this.#openHistoryDrawer();
		}
	}

	/**
	 * Open Slide-in History Drawer
	 */
	#openHistoryDrawer() {
		if (!this.#historyDrawer) return;
		this.#recentChatBtn?.classList.add("active");
		this.#recentChatBtn?.setAttribute("aria-expanded", "true");
		this.#historyDrawer.hidden = false;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				this.#historyDrawer.classList.add("is-open");
				this.#historyDrawer.setAttribute("aria-hidden", "false");
			});
		});
		this.#renderHistoryDrawer();
	}

	/**
	 * Close Slide-in History Drawer
	 */
	#closeHistoryDrawer() {
		if (!this.#historyDrawer) return;
		this.#recentChatBtn?.classList.remove("active");
		this.#recentChatBtn?.setAttribute("aria-expanded", "false");
		this.#closeAllHistoryPopovers();
		this.#historyDrawer.classList.remove("is-open");
		this.#historyDrawer.setAttribute("aria-hidden", "true");
		setTimeout(() => {
			if (!this.#historyDrawer.classList.contains("is-open")) {
				this.#historyDrawer.hidden = true;
			}
		}, 300);
	}

	#closeAllHistoryPopovers() {
		if (!this.#historyDrawer) return;
		const popovers = this.#historyDrawer.querySelectorAll(".ai-history-popover");
		popovers.forEach((p) => p.remove());
	}

	/**
	 * Render recent chats inside the history drawer
	 */
	#renderHistoryDrawer() {
		if (!this.#historyList) return;
		this.#closeAllHistoryPopovers();

		const chats = DishaAiChatStorage.getAllChats();

		// Update count (e.g. 5/25)
		if (this.#historyCount) {
			this.#historyCount.textContent = `${chats.length}/25`;
		}

		if (chats.length === 0) {
			this.#historyList.innerHTML = "";
			this.#historyList.hidden = true;
			if (this.#historyEmpty) this.#historyEmpty.hidden = false;
			return;
		}

		if (this.#historyEmpty) this.#historyEmpty.hidden = true;
		this.#historyList.hidden = false;
		this.#historyList.innerHTML = "";

		chats.forEach((chat) => {
			const item = document.createElement("div");
			item.className = "ai-history-item" + (chat.isPinned ? " is-pinned" : "") + (chat.id === this.#currentChatId ? " is-selected" : "");
			item.setAttribute("role", "listitem");

			// Pin icon badge
			if (chat.isPinned) {
				const pinBadge = document.createElement("span");
				pinBadge.className = "ai-history-pin-badge";
				pinBadge.setAttribute("aria-label", "Pinned");
				pinBadge.textContent = "📌";
				item.appendChild(pinBadge);
			}

			// Main text body (Title + Time)
			const body = document.createElement("div");
			body.className = "ai-history-item-body";

			const titleSpan = document.createElement("span");
			titleSpan.className = "ai-history-item-title";
			titleSpan.textContent = chat.title || centerClass.t("ai.newChat");

			const dateSpan = document.createElement("span");
			dateSpan.className = "ai-history-item-date";
			dateSpan.textContent = this.#formatRelativeDate(chat.updatedAt || chat.createdAt);

			body.appendChild(titleSpan);
			body.appendChild(dateSpan);

			// Clicking the body loads the chat session
			body.addEventListener("click", () => {
				this.#loadSession(chat);
			});

			// 3-Dot Action Button (⋮)
			const menuBtn = document.createElement("button");
			menuBtn.type = "button";
			menuBtn.className = "ai-history-menu-btn";
			menuBtn.setAttribute("aria-label", "Chat options");
			menuBtn.setAttribute("title", "Options");
			menuBtn.textContent = "⋮";

			menuBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.#toggleHistoryMenu(item, menuBtn, chat);
			});

			item.appendChild(body);
			item.appendChild(menuBtn);
			this.#historyList.appendChild(item);
		});
	}

	/**
	 * Toggle 3-Dot Floating Action Popup Menu
	 */
	#toggleHistoryMenu(itemEl, menuBtn, chat) {
		const existing = itemEl.querySelector(".ai-history-popover");
		if (existing) {
			existing.remove();
			return;
		}
		this.#closeAllHistoryPopovers();

		const popover = document.createElement("div");
		popover.className = "ai-history-popover";

		// Smart Dropup: If item is near the bottom of history list, open upwards so it doesn't get cut off
		if (this.#historyList) {
			const listRect = this.#historyList.getBoundingClientRect();
			const itemRect = itemEl.getBoundingClientRect();
			const spaceBelow = listRect.bottom - itemRect.bottom;
			if (spaceBelow < 120 && (itemRect.top - listRect.top) > 100) {
				popover.classList.add("is-dropup");
			}
		}

		// 1. Pin / Unpin Option
		const pinBtn = document.createElement("button");
		pinBtn.type = "button";
		pinBtn.className = "ai-history-popover-item";
		pinBtn.innerHTML = `<span>${chat.isPinned ? "📍" : "📌"}</span> <span>${chat.isPinned ? centerClass.t("ai.unpin") : centerClass.t("ai.pin")}</span>`;
		pinBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			popover.remove();
			const result = DishaAiChatStorage.togglePin(chat.id);
			if (!result.success && result.reason === "MAX_PIN_REACHED") {
				alert(centerClass.t("ai.maxPinNotice"));
			}
			this.#renderHistoryDrawer();
		});

		// 2. Rename Option
		const renameBtn = document.createElement("button");
		renameBtn.type = "button";
		renameBtn.className = "ai-history-popover-item";
		renameBtn.innerHTML = `<span>✏️</span> <span>${centerClass.t("ai.rename")}</span>`;
		renameBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			popover.remove();
			const promptMsg = centerClass.t("ai.enterNewChatName");
			const newName = prompt(promptMsg, chat.title);
			if (newName && newName.trim()) {
				DishaAiChatStorage.renameChat(chat.id, newName.trim());
				if (this.#currentChatId === chat.id) {
					this.#currentChatTitle = newName.trim();
				}
				this.#renderHistoryDrawer();
			}
		});

		// 3. Delete Option
		const deleteBtn = document.createElement("button");
		deleteBtn.type = "button";
		deleteBtn.className = "ai-history-popover-item is-danger";
		deleteBtn.innerHTML = `<span>🗑️</span> <span>${centerClass.t("ai.delete")}</span>`;
		deleteBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			popover.remove();
			DishaAiChatStorage.deleteChat(chat.id);
			if (this.#currentChatId === chat.id) {
				this.resetToWelcome();
			}
			this.#renderHistoryDrawer();
		});

		popover.appendChild(pinBtn);
		popover.appendChild(renameBtn);
		popover.appendChild(deleteBtn);

		itemEl.appendChild(popover);
	}

	/**
	 * Restore a past conversation session
	 */
	#loadSession(chat) {
		if (!chat) return;
		this.#closeHistoryDrawer();

		this.#currentChatId = chat.id;
		this.#currentChatTitle = chat.title;
		this.#currentChatMessages = Array.isArray(chat.messages) ? [...chat.messages] : [];

		// Restore conversation engine context memory
		dishaAiEngine.reset();
		if (chat.context && dishaAiEngine.restoreState) {
			dishaAiEngine.restoreState(chat.context);
		}

		this.#ensureChatActive();
		if (this.#chatStream) {
			this.#chatStream.innerHTML = "";
		}

		// Re-render conversation stream
		this.#currentChatMessages.forEach((msg) => {
			if (msg.role === "user") {
				this.renderUserMessage(msg.text);
			} else if (msg.role === "bot") {
				const resultCardHtml = msg.cardData ? this.getJourneyCardHtml(msg.cardData) : null;
				this.renderBotMessage({
					text: msg.text,
					actions: msg.actions || [],
					resultCardHtml,
					suggestions: msg.suggestions || []
				});
			}
		});

		this.#scrollToBottom();
		this.focusInput();
	}

	/**
	 * Handle Clear All Chats
	 */
	#handleClearAllChats() {
		const confirmMsg = centerClass.t("ai.confirmClear");
		if (!confirm(confirmMsg)) return;

		DishaAiChatStorage.clearAllChats(false);

		// If current chat was unpinned, reset to welcome
		const activeChat = DishaAiChatStorage.getChat(this.#currentChatId);
		if (!activeChat) {
			this.resetToWelcome();
		}

		this.#renderHistoryDrawer();
	}

	/**
	 * Relative timestamp formatter (e.g., Today 02:30 PM, Yesterday, or 12 Oct)
	 */
	#formatRelativeDate(timestamp) {
		if (!timestamp) return "";
		const date = new Date(timestamp);
		const now = new Date();
		const isToday = date.toDateString() === now.toDateString();

		const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		if (isToday) {
			return `${centerClass.t("ai.today")}, ${timeStr}`;
		}

		const yesterday = new Date(now);
		yesterday.setDate(now.getDate() - 1);
		if (date.toDateString() === yesterday.toDateString()) {
			return `${centerClass.t("ai.yesterday")}, ${timeStr}`;
		}

		return date.toLocaleDateString([], { day: 'numeric', month: 'short' }) + `, ${timeStr}`;
	}
}
