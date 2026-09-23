/**
 * @file JSONTreeInspector.js
 * @module components/JSONTreeInspector
 * @description Autonomous Line-Numbered Interactive JSON Tree & Find Controller.
 * Injects its own panel, header, IDE find widget, and handles copy/collapse/search internally.
 */
import { escapeHtml } from '../core/DomUtils.js';
import { ToastManager } from './Toast.js';

export class JSONTreeInspector {
	#mount = null;
	#panel = null;
	#viewport = null;
	#searchWidgets = {};
	#jsonData = null;
	#matches = [];
	#currentMatchIdx = -1;
	#isAllCollapsed = false;
	#searchOptions = { caseSensitive: false, wholeWord: false, useRegex: false };
	#searchDebounceTimer = null;
	#lineCounter = 1;
	#options = {};

	constructor(mountPoint, options = {}) {
		this.#mount = typeof mountPoint === 'string' ? document.querySelector(mountPoint) : mountPoint;
		if (!this.#mount) {
			console.warn(`[JSONTreeInspector] Mount point not found:`, mountPoint);
			return;
		}

		this.#options = {
			title: 'JSON Payload',
			subtitle: '',
			dotColor: 'indigo',
			allowSearch: true,
			allowCopy: true,
			allowCollapse: true,
			...options
		};

		this.#renderSkeleton();
		this.#bindInternalEvents();
	}

	#renderSkeleton() {
		const { title, subtitle, dotColor, allowSearch, allowCopy, allowCollapse } = this.#options;

		this.#mount.innerHTML = `
			<div class="json-inspector-panel">
				<!-- Panel Header -->
				<div class="json-panel-header">
					<div>
						<h3 class="json-panel-title flex-align gap-xs">
							${dotColor ? `<span class="status-indicator-dot dot-${dotColor}"></span>` : `<img src="./assets/icons/ui/terminal.svg" class="icon-xs icon-indigo" alt="Code">`}
							<span class="json-title-text">${escapeHtml(title)}</span>
						</h3>
						<p class="json-panel-subtitle font-mono">${escapeHtml(subtitle)}</p>
					</div>
					
					<div class="flex-align gap-xs">
						${allowCollapse ? `<button class="btn-console-tool btn-toggle-all" title="Collapse / Expand All"><span class="toggle-all-label">Collapse All</span></button>` : ''}
						${allowCopy ? `<button class="btn-modal-primary btn-copy-json" title="Copy Raw JSON"><span>Copy</span></button>` : ''}
					</div>
				</div>

				<!-- IDE Find Widget -->
				${allowSearch ? `
				<div class="json-find-widget">
					<div class="find-input-wrapper">
						<img src="./assets/icons/ui/search.svg" class="search-icon-inside" alt="Search">
						<input type="text" placeholder="Find in JSON (e.g. 'gate', '\\d{10}')..." class="find-text-input font-mono">
						<button class="search-clear-btn hidden" title="Clear Search">&times;</button>
					</div>

					<div class="match-count-badge font-mono">0 of 0</div>

					<div class="find-nav-buttons">
						<button disabled class="btn-nav-arrow btn-prev-match" title="Previous Match">&uarr;</button>
						<button disabled class="btn-nav-arrow btn-next-match" title="Next Match">&darr;</button>
					</div>

					<div class="find-toggles-bar">
						<button class="btn-find-mode btn-toggle-case" title="Match Case">Aa</button>
						<button class="btn-find-mode btn-toggle-word" title="Match Whole Word">\\b</button>
						<button class="btn-find-mode btn-toggle-regex" title="Use Regular Expression">.*</button>
					</div>
				</div>
				` : ''}

				<!-- Line Numbered Viewport -->
				<div class="json-tree-viewport font-mono custom-scrollbar"></div>
			</div>
		`;

		this.#panel = this.#mount.querySelector('.json-inspector-panel');
		this.#viewport = this.#mount.querySelector('.json-tree-viewport');

		if (allowSearch) {
			this.#searchWidgets = {
				input: this.#panel.querySelector('.find-text-input'),
				clearBtn: this.#panel.querySelector('.search-clear-btn'),
				badge: this.#panel.querySelector('.match-count-badge'),
				prevBtn: this.#panel.querySelector('.btn-prev-match'),
				nextBtn: this.#panel.querySelector('.btn-next-match'),
				toggleCase: this.#panel.querySelector('.btn-toggle-case'),
				toggleWord: this.#panel.querySelector('.btn-toggle-word'),
				toggleRegex: this.#panel.querySelector('.btn-toggle-regex')
			};
		}
	}

	#bindInternalEvents() {
		// 1. Copy Button
		const copyBtn = this.#panel.querySelector('.btn-copy-json');
		copyBtn?.addEventListener('click', async () => {
			if (!this.#jsonData) {
				ToastManager.warn('No JSON data to copy');
				return;
			}
			try {
				await navigator.clipboard.writeText(JSON.stringify(this.#jsonData, null, 2));
				ToastManager.success('JSON payload copied to clipboard!');
			} catch (err) {
				ToastManager.error(`Copy failed: ${err.message}`);
			}
		});

		// 2. Collapse All Button
		const toggleAllBtn = this.#panel.querySelector('.btn-toggle-all');
		toggleAllBtn?.addEventListener('click', () => this.toggleCollapseAll());

		// 3. Find Widget Controls
		const s = this.#searchWidgets;
		if (!s?.input) return;

		s.input.addEventListener('input', () => {
			clearTimeout(this.#searchDebounceTimer);
			this.#searchDebounceTimer = setTimeout(() => this.handleSearch(), 150);
		});

		s.clearBtn?.addEventListener('click', () => {
			s.input.value = '';
			s.clearBtn.classList.add('hidden');
			this.handleSearch();
		});

		s.nextBtn?.addEventListener('click', () => this.navigateMatch(1));
		s.prevBtn?.addEventListener('click', () => this.navigateMatch(-1));

		s.toggleCase?.addEventListener('click', (e) => {
			this.#searchOptions.caseSensitive = !this.#searchOptions.caseSensitive;
			e.currentTarget.classList.toggle('active', this.#searchOptions.caseSensitive);
			this.handleSearch();
		});

		s.toggleWord?.addEventListener('click', (e) => {
			this.#searchOptions.wholeWord = !this.#searchOptions.wholeWord;
			e.currentTarget.classList.toggle('active', this.#searchOptions.wholeWord);
			this.handleSearch();
		});

		s.toggleRegex?.addEventListener('click', (e) => {
			this.#searchOptions.useRegex = !this.#searchOptions.useRegex;
			e.currentTarget.classList.toggle('active', this.#searchOptions.useRegex);
			this.handleSearch();
		});
	}

	setJSON(data, subtitle = null) {
		this.#jsonData = data;
		if (subtitle !== null) {
			this.setSubtitle(subtitle);
		}
		this.render();
	}

	getJSON() {
		return this.#jsonData;
	}

	setTitle(title) {
		const el = this.#panel?.querySelector('.json-title-text');
		if (el) el.textContent = title;
	}

	setSubtitle(subtitle) {
		const el = this.#panel?.querySelector('.json-panel-subtitle');
		if (el) el.textContent = subtitle;
	}

	toggleCollapseAll() {
		this.#isAllCollapsed = !this.#isAllCollapsed;
		const labelEl = this.#panel?.querySelector('.toggle-all-label');
		if (labelEl) labelEl.textContent = this.#isAllCollapsed ? 'Expand All' : 'Collapse All';

		if (!this.#viewport) return;
		const allChildren = this.#viewport.querySelectorAll('.json-children');
		const allToggles = this.#viewport.querySelectorAll('.json-toggle');
		const allSummaries = this.#viewport.querySelectorAll('.json-collapsed-summary');

		allChildren.forEach(child => child.classList.toggle('hidden', this.#isAllCollapsed));
		allToggles.forEach(toggle => { toggle.textContent = this.#isAllCollapsed ? '▶' : '▼'; });
		allSummaries.forEach(summary => summary.classList.toggle('hidden', !this.#isAllCollapsed));
	}

	render() {
		if (!this.#viewport || this.#jsonData === null) return;
		this.#viewport.innerHTML = '';
		this.#matches = [];
		this.#currentMatchIdx = -1;
		this.#lineCounter = 1;

		const frag = document.createDocumentFragment();
		this.#buildTree(this.#jsonData, frag, 0, true, '$');
		this.#viewport.appendChild(frag);

		if (this.#searchWidgets?.input?.value?.trim()) {
			this.handleSearch();
		}
	}

	#buildTree(obj, targetContainer, indent = 0, isLast = true, path = '$', keyName = null) {
		const pad = '  '.repeat(indent);
		const isObj = obj !== null && typeof obj === 'object';
		const isArray = Array.isArray(obj);
		const keyPrefix = keyName !== null 
			? `<span class="json-key">"${escapeHtml(keyName)}"</span><span class="json-colon">: </span>` 
			: '';

		if (!isObj) {
			const lineDiv = document.createElement('div');
			lineDiv.className = 'json-line';
			let valHtml = '';
			if (typeof obj === 'string') {
				valHtml = `<span class="json-val-str">"${escapeHtml(obj)}"</span>`;
			} else if (typeof obj === 'number') {
				valHtml = `<span class="json-val-num">${obj}</span>`;
			} else if (typeof obj === 'boolean') {
				valHtml = `<span class="json-val-bool">${obj}</span>`;
			} else if (obj === null) {
				valHtml = `<span class="json-val-null">null</span>`;
			}
			lineDiv.innerHTML = `<span class="line-num">${this.#lineCounter++}</span><span class="json-code">${pad}${keyPrefix}${valHtml}${isLast ? '' : ','}</span>`;
			targetContainer.appendChild(lineDiv);
			return;
		}

		const entries = Object.entries(obj);
		const count = entries.length;
		const openBracket = isArray ? '[' : '{';
		const closeBracket = isArray ? ']' : '}';

		const nodeWrapper = document.createElement('div');
		nodeWrapper.className = 'json-node';
		nodeWrapper.dataset.path = path;

		const headerLine = document.createElement('div');
		headerLine.className = 'json-line json-collapsible-header';
		headerLine.innerHTML = `<span class="line-num">${this.#lineCounter++}</span><span class="json-code">${pad}<button type="button" class="json-toggle" aria-label="Toggle Tree">▼</button>${keyPrefix}${openBracket}<span class="json-collapsed-summary hidden text-muted"> ${count} ${count === 1 ? 'item' : 'items'}</span></span>`;
		nodeWrapper.appendChild(headerLine);

		const childrenContainer = document.createElement('div');
		childrenContainer.className = 'json-children';

		const toggleBtn = headerLine.querySelector('.json-toggle');
		const summarySpan = headerLine.querySelector('.json-collapsed-summary');

		toggleBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			const isCollapsed = childrenContainer.classList.toggle('hidden');
			toggleBtn.textContent = isCollapsed ? '▶' : '▼';
			summarySpan.classList.toggle('hidden', !isCollapsed);
		});

		entries.forEach(([key, val], idx) => {
			const childPath = isArray ? `${path}[${key}]` : `${path}.${key}`;
			this.#buildTree(val, childrenContainer, indent + 1, idx === count - 1, childPath, isArray ? null : key);
		});
		nodeWrapper.appendChild(childrenContainer);

		const footerLine = document.createElement('div');
		footerLine.className = 'json-line';
		footerLine.innerHTML = `<span class="line-num">${this.#lineCounter++}</span><span class="json-code">${pad}${closeBracket}${isLast ? '' : ','}</span>`;
		nodeWrapper.appendChild(footerLine);

		targetContainer.appendChild(nodeWrapper);
	}

	handleSearch() {
		const s = this.#searchWidgets;
		if (!s?.input || !this.#viewport) return;

		const query = s.input.value.trim();
		s.clearBtn?.classList.toggle('hidden', !query);

		this.#viewport.querySelectorAll('.json-highlight').forEach(el => {
			el.outerHTML = el.textContent;
		});
		this.#matches = [];
		this.#currentMatchIdx = -1;

		if (!query) {
			this.#updateSearchUI();
			return;
		}

		let regex;
		try {
			let pattern = query;
			if (!this.#searchOptions.useRegex) {
				pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			}
			if (this.#searchOptions.wholeWord) {
				pattern = `\\b${pattern}\\b`;
			}
			regex = new RegExp(pattern, this.#searchOptions.caseSensitive ? 'g' : 'gi');
		} catch {
			if (s.badge) s.badge.textContent = 'Invalid Regex';
			return;
		}

		const codeSpans = this.#viewport.querySelectorAll('.json-code');
		codeSpans.forEach(codeSpan => {
			const textNodes = [];
			const walker = document.createTreeWalker(codeSpan, NodeFilter.SHOW_TEXT);
			let n;
			while ((n = walker.nextNode())) {
				if (!n.parentElement.classList.contains('json-toggle')) {
					textNodes.push(n);
				}
			}

			textNodes.forEach(textNode => {
				const text = textNode.nodeValue;
				if (!text) return;
				regex.lastIndex = 0;
				let match;
				let lastIdx = 0;
				const frag = document.createDocumentFragment();
				let hasMatch = false;

				while ((match = regex.exec(text)) !== null) {
					hasMatch = true;
					if (match.index > lastIdx) {
						frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
					}
					const mark = document.createElement('mark');
					mark.className = 'json-highlight';
					mark.textContent = match[0];
					frag.appendChild(mark);
					this.#matches.push(mark);
					lastIdx = regex.lastIndex;
					if (regex.lastIndex === match.index) regex.lastIndex++;
				}

				if (hasMatch) {
					if (lastIdx < text.length) {
						frag.appendChild(document.createTextNode(text.slice(lastIdx)));
					}
					textNode.parentNode.replaceChild(frag, textNode);
				}
			});
		});

		if (this.#matches.length > 0) {
			this.#currentMatchIdx = 0;
			this.#expandAncestors(this.#matches[0]);
			this.#highlightCurrentMatch();
		}

		this.#updateSearchUI();
	}

	navigateMatch(dir) {
		if (this.#matches.length === 0) return;
		this.#currentMatchIdx = (this.#currentMatchIdx + dir + this.#matches.length) % this.#matches.length;
		this.#expandAncestors(this.#matches[this.#currentMatchIdx]);
		this.#highlightCurrentMatch();
		this.#updateSearchUI();
	}

	#expandAncestors(el) {
		let curr = el;
		while (curr && curr !== this.#viewport) {
			if (curr.classList && curr.classList.contains('json-children')) {
				curr.classList.remove('hidden');
				const toggle = curr.previousElementSibling?.querySelector('.json-toggle');
				if (toggle) toggle.textContent = '▼';
				const summary = curr.previousElementSibling?.querySelector('.json-collapsed-summary');
				if (summary) summary.classList.add('hidden');
			}
			curr = curr.parentElement;
		}
	}

	#highlightCurrentMatch() {
		this.#matches.forEach((m, idx) => {
			m.classList.toggle('active-match', idx === this.#currentMatchIdx);
		});
		const activeEl = this.#matches[this.#currentMatchIdx];
		if (activeEl) {
			activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		}
	}

	#updateSearchUI() {
		const s = this.#searchWidgets;
		if (!s) return;
		const total = this.#matches.length;
		const curr = total === 0 ? 0 : this.#currentMatchIdx + 1;

		if (s.badge) {
			s.badge.textContent = `${curr} of ${total}`;
			s.badge.className = total > 0 ? 'match-count-badge font-mono has-matches' : 'match-count-badge font-mono';
		}
		if (s.prevBtn) s.prevBtn.disabled = total === 0;
		if (s.nextBtn) s.nextBtn.disabled = total === 0;
	}
}