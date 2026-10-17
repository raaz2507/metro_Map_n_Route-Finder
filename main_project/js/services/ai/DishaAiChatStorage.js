/**
 * 📦 DishaAiChatStorage - Offline Chat History & Session Manager
 * Features:
 * - 100% Offline (localStorage based)
 * - LRU Auto-cleanup: Max 25 chats, removes oldest inactive unpinned chat
 * - Pin Limit: Max 13 chats can be pinned
 * - Rename & Delete capabilities
 * - Preserves conversation context for seamless session resumption
 */

import { centerClass } from "../../core/CenterClass.js";

const STORAGE_KEY = "disha_chat_sessions";
const MAX_TOTAL_CHATS = 25;
const MAX_PINNED_CHATS = 13;

export class DishaAiChatStorage {
	/**
	 * Retrieve all saved chat sessions sorted:
	 * Pinned first (newest to oldest), then Unpinned (newest to oldest)
	 */
	static getAllChats() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return [];
			const list = JSON.parse(raw);
			if (!Array.isArray(list)) return [];

			return list.sort((a, b) => {
				// Pinned items come first
				if (a.isPinned && !b.isPinned) return -1;
				if (!a.isPinned && b.isPinned) return 1;
				// Then sort by updatedAt descending
				return (b.updatedAt || 0) - (a.updatedAt || 0);
			});
		} catch (e) {
			console.error("[DishaAiChatStorage] Failed to read chats:", e);
			return [];
		}
	}

	/**
	 * Get a single chat session by ID
	 */
	static getChat(id) {
		const list = this.getAllChats();
		return list.find((c) => c.id === id) || null;
	}

	/**
	 * Save or update a chat session
	 * @param {Object} chat - { id, title, messages, context, isPinned, createdAt, updatedAt }
	 */
	static saveChat(chat) {
		if (!chat || !chat.id) return false;
		try {
			let list = this.getAllChats();
			const now = Date.now();
			const existingIndex = list.findIndex((c) => c.id === chat.id);

			const sessionData = {
				id: chat.id,
				title: chat.title || "New Chat",
				isPinned: Boolean(chat.isPinned),
				createdAt: chat.createdAt || now,
				updatedAt: now,
				messages: Array.isArray(chat.messages) ? chat.messages : [],
				context: chat.context || null
			};

			if (existingIndex >= 0) {
				// Update existing
				list[existingIndex] = {
					...list[existingIndex],
					...sessionData,
					createdAt: list[existingIndex].createdAt || sessionData.createdAt
				};
			} else {
				// Insert new chat
				list.unshift(sessionData);

				// Enforce LRU Limit of MAX_TOTAL_CHATS (25)
				if (list.length > MAX_TOTAL_CHATS) {
					// Find the oldest unpinned chat by updatedAt
					let oldestUnpinnedIndex = -1;
					let oldestTime = Infinity;

					for (let i = 0; i < list.length; i++) {
						if (!list[i].isPinned) {
							const t = list[i].updatedAt || list[i].createdAt || 0;
							if (t < oldestTime) {
								oldestTime = t;
								oldestUnpinnedIndex = i;
							}
						}
					}

					// Remove the oldest unpinned chat
					if (oldestUnpinnedIndex >= 0) {
						list.splice(oldestUnpinnedIndex, 1);
					}
				}
			}

			localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
			return true;
		} catch (e) {
			console.error("[DishaAiChatStorage] Failed to save chat:", e);
			return false;
		}
	}

	/**
	 * Toggle Pin status of a chat (Max 13 pinned)
	 * @returns {{ success: boolean, isPinned?: boolean, reason?: string }}
	 */
	static togglePin(id) {
		const list = this.getAllChats();
		const chat = list.find((c) => c.id === id);
		if (!chat) return { success: false, reason: "NOT_FOUND" };

		if (!chat.isPinned) {
			const currentPinnedCount = list.filter((c) => c.isPinned).length;
			if (currentPinnedCount >= MAX_PINNED_CHATS) {
				return {
					success: false,
					reason: "MAX_PIN_REACHED",
					max: MAX_PINNED_CHATS
				};
			}
			chat.isPinned = true;
		} else {
			chat.isPinned = false;
		}

		chat.updatedAt = Date.now();
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
			return { success: true, isPinned: chat.isPinned };
		} catch (e) {
			return { success: false, reason: "STORAGE_ERROR" };
		}
	}

	/**
	 * Rename a chat session
	 */
	static renameChat(id, newTitle) {
		const trimmed = (newTitle || "").trim();
		if (!trimmed) return false;

		const list = this.getAllChats();
		const chat = list.find((c) => c.id === id);
		if (!chat) return false;

		chat.title = trimmed.slice(0, 60); // Cap title to 60 characters
		chat.updatedAt = Date.now();

		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
			return true;
		} catch (e) {
			return false;
		}
	}

	/**
	 * Delete a single chat
	 */
	static deleteChat(id) {
		let list = this.getAllChats();
		list = list.filter((c) => c.id !== id);
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
			return true;
		} catch (e) {
			return false;
		}
	}

	/**
	 * Clear all chats (can keep pinned chats by default)
	 * @param {boolean} includePinned - If true, wipes pinned chats too
	 */
	static clearAllChats(includePinned = false) {
		try {
			if (includePinned) {
				localStorage.removeItem(STORAGE_KEY);
			} else {
				const list = this.getAllChats().filter((c) => c.isPinned);
				localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
			}
			return true;
		} catch (e) {
			return false;
		}
	}

	/**
	 * Smart title generator from first query text
	 */
	static generateSmartTitle(text) {
		if (!text) return centerClass.t("ai.newChat");
		const cleaned = text.trim();
		if (cleaned.length <= 40) return cleaned;
		return cleaned.slice(0, 37) + "...";
	}

	/**
	 * Record user feedback (up/down) on a specific bot message in a chat
	 */
	static recordFeedback(chatId, messageIndex, feedbackType) {
		try {
			const list = this.getAllChats();
			const chat = list.find((c) => c.id === chatId);
			if (chat && Array.isArray(chat.messages) && chat.messages[messageIndex]) {
				chat.messages[messageIndex].feedback = feedbackType;
				chat.updatedAt = Date.now();
				localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
				return true;
			}
		} catch (e) {
			console.error("[DishaAiChatStorage] Failed to record feedback:", e);
		}
		return false;
	}

	/**
	 * Log query feedback data locally for future model/NLU improvement
	 */
	static logQueryFeedback({ query, botText, isSuccess, lang }) {
		try {
			const logKey = "disha_ai_feedback_log";
			const raw = localStorage.getItem(logKey);
			const logs = raw ? JSON.parse(raw) : [];
			logs.push({
				timestamp: Date.now(),
				query,
				botText,
				isSuccess,
				lang
			});
			if (logs.length > 100) logs.shift(); // Keep latest 100 entries
			localStorage.setItem(logKey, JSON.stringify(logs));
		} catch (e) {
			console.warn("[DishaAiChatStorage] Feedback log error:", e);
		}
	}
}
export default DishaAiChatStorage;
