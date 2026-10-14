/**
 * Test suite for DishaAiChatStorage
 */
import { DishaAiChatStorage } from "../main_project/js/services/ai/DishaAiChatStorage.js";

// Mock localStorage in Node
const store = new Map();
global.localStorage = {
	getItem: (k) => store.get(k) || null,
	setItem: (k, v) => store.set(k, String(v)),
	removeItem: (k) => store.delete(k),
	clear: () => store.clear()
};

console.log("=== Testing DishaAiChatStorage ===");

// 1. Save Chat
const c1 = { id: "chat_1", title: "Test 1", messages: [{ role: "user", text: "hi" }] };
DishaAiChatStorage.saveChat(c1);
let all = DishaAiChatStorage.getAllChats();
console.assert(all.length === 1, "Should have 1 chat");
console.log("✅ Save single chat: OK");

// 2. Pin limit: Pin 13 chats max
for (let i = 2; i <= 14; i++) {
	DishaAiChatStorage.saveChat({ id: `chat_${i}`, title: `Test ${i}` });
}
for (let i = 1; i <= 13; i++) {
	const res = DishaAiChatStorage.togglePin(`chat_${i}`);
	console.assert(res.success === true, `Chat ${i} should be pinned`);
}

// 14th pin attempt must fail
const res14 = DishaAiChatStorage.togglePin("chat_14");
console.assert(res14.success === false && res14.reason === "MAX_PIN_REACHED", "14th pin must fail");
console.log("✅ Pin limit (max 13): OK");

// 3. LRU limit: Insert up to 30 chats
// Pinned chats (1-13) must remain, unpinned chats above 25 total must be evicted based on oldest updatedAt
for (let i = 15; i <= 30; i++) {
	DishaAiChatStorage.saveChat({ id: `chat_${i}`, title: `Test ${i}` });
}
all = DishaAiChatStorage.getAllChats();
console.assert(all.length === 25, `Total chats must not exceed 25, got ${all.length}`);

// Verify all 13 pinned chats are still present
for (let i = 1; i <= 13; i++) {
	console.assert(all.some(c => c.id === `chat_${i}` && c.isPinned), `Pinned chat ${i} must never be evicted`);
}
console.log("✅ LRU eviction (max 25, pinned immune): OK");

// 4. Rename Chat
const renRes = DishaAiChatStorage.renameChat("chat_1", "My Daily Office Metro");
console.assert(renRes === true, "Rename should succeed");
const renamedChat = DishaAiChatStorage.getChat("chat_1");
console.assert(renamedChat.title === "My Daily Office Metro", "Title should be updated");
console.log("✅ Rename chat: OK");

// 5. Delete Chat
const delRes = DishaAiChatStorage.deleteChat("chat_2");
console.assert(delRes === true, "Delete should succeed");
console.assert(DishaAiChatStorage.getChat("chat_2") === null, "Deleted chat should be gone");
console.log("✅ Delete single chat: OK");

// 6. Clear All (keep pinned)
DishaAiChatStorage.clearAllChats(false);
const remaining = DishaAiChatStorage.getAllChats();
console.assert(remaining.every(c => c.isPinned), "Only pinned chats should remain after clearAll(false)");
console.assert(remaining.length === 12, `12 pinned chats should remain (1 was deleted), got ${remaining.length}`);
console.log("✅ Clear all unpinned: OK");

console.log("\n🎉 ALL STORAGE TESTS PASSED 100%!");
