/* IGetHouse – Property Puzzle (Vanilla JS)
 * Canvas jigsaw MVP with Easy/Medium/Hard, timer, CTA modal, share, confetti
 */

(function () {
	"use strict";

	// Config
	const DIFFICULTY_PRESETS = {
		easy: { rows: 3, cols: 4 },
		medium: { rows: 4, cols: 5 },
		hard: { rows: 6, cols: 7 }
	};
	const SNAP_TOLERANCE_PX = 18;
	let CTA_URL = "https://www.igethouse.ng/"; // default, overridden by inline JSON if available
	const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1502005229762-cf1b2da7c52f?q=70&w=1200&auto=format&fit=crop";

	// Elements
	const canvas = document.getElementById("puzzle");
	const confettiCanvas = document.getElementById("confetti");
	const ctx = canvas.getContext("2d");
	const confettiCtx = confettiCanvas.getContext("2d");
	const timerEl = document.getElementById("timer");
	const bestEl = document.getElementById("best");
	const progressEl = document.getElementById("progress");
	const btnNew = document.getElementById("btn-new");
	const btnShuffle = document.getElementById("btn-shuffle");
	const diffButtons = Array.from(document.querySelectorAll(".btn-diff"));
	const btnPrev = document.getElementById("btn-prev");
	const btnNext = document.getElementById("btn-next");
	const puzzleTitleEl = document.getElementById("puzzle-title");
	const modal = document.getElementById("modal");
	const btnShare = document.getElementById("btn-share");
	const btnClose = document.getElementById("btn-close");
	const shareFallback = document.getElementById("share-fallback");
	const shareX = document.getElementById("share-x");
	const shareFb = document.getElementById("share-fb");
	const shareWa = document.getElementById("share-wa");
	const ctaLink = document.getElementById("cta-link");
	const yearEl = document.getElementById("year");
	const previewEl = document.getElementById("preview");
	const btnPreview = document.getElementById("btn-preview");
	const promo = document.getElementById("promo");
	const btnPromoHard = document.getElementById("promo-go-hard");
	const btnPromoStay = document.getElementById("promo-stay-easy");
	const btnSimEasy = document.getElementById("simulate-easy");
	const btnSimHard = document.getElementById("simulate-hard");

	// State
	let image = new Image();
	let imageLoaded = false;
	let currentDifficulty = "easy";
	let rows = DIFFICULTY_PRESETS.easy.rows;
	let cols = DIFFICULTY_PRESETS.easy.cols;
	let pieces = [];
	let pieceWidth = 0;
	let pieceHeight = 0;
	let dragState = { activeId: null, offsetX: 0, offsetY: 0 };
	let started = false;
	let startMs = 0;
	let rafId = 0;
	let completed = false;
	let puzzles = [];
	let currentPuzzleIndex = 0;
	let currentPuzzleId = "local-default";
	const PREVIEW_STORAGE_KEY = "preview:visible";
	let previewVisible = false;
	const PREVIEW_AUTO_HIDE_MS = 10000;
	const PREVIEW_MAX_VIEWS = 2;
	let previewTimerId = 0;

	// Exact completion tolerance (in pixels)
	const EXACT_SNAP_TOLERANCE_PX = 2;
	// Detection tolerance to allow tiny per-piece jitter before final snap
	const DETECTION_TOLERANCE_PX = 10;
	// Highlight (pre-snap visual feedback)
	const PRE_SNAP_MULTIPLIER = 2;
	let highlightedPieceIds = new Set();
	const clearHighlights = () => { highlightedPieceIds.clear(); };
	const addHighlight = (id) => { highlightedPieceIds.add(id); };

	// Utilities
	const formatTime = (ms) => {
		const total = Math.floor(ms / 1000);
		const mm = String(Math.floor(total / 60)).padStart(2, "0");
		const ss = String(total % 60).padStart(2, "0");
		return `${mm}:${ss}`;
	};

	const optimizeImageUrl = (url) => {
		try {
			const u = new URL(url);
			u.searchParams.set("w", "1200");
			u.searchParams.set("q", "70");
			u.searchParams.set("auto", "format");
			u.searchParams.set("fit", "crop");
			return u.toString();
		} catch (_) {
			return url;
		}
	};

	const median = (arr) => {
		if (!arr.length) return 0;
		const a = [...arr].sort((x, y) => x - y);
		const m = Math.floor(a.length / 2);
		return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2);
	};

	// Determine consensus global offset (where the user assembled the image)
	const computeGlobalOffset = () => {
		if (!pieces.length) return { offX: 0, offY: 0 };
		const dxs = [];
		const dys = [];
		for (const p of pieces) {
			dxs.push(p.x - p.correctX);
			dys.push(p.y - p.correctY);
		}
		return { offX: median(dxs), offY: median(dys) };
	};

	const isPieceAlignedWithOffset = (p, offX, offY, tol) => (
		Math.abs(p.x - (p.correctX + offX)) <= tol &&
		Math.abs(p.y - (p.correctY + offY)) <= tol
	);

	const updateTimer = () => {
		if (!started || completed) return;
		timerEl.textContent = formatTime(performance.now() - startMs);
		rAFTimer();
	};
	const rAFTimer = () => {
		cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(updateTimer);
	};

	const bestKey = () => `best:${currentPuzzleId}:${currentDifficulty}`;
	const readBest = () => Number(localStorage.getItem(bestKey()) || 0);
	const writeBest = (ms) => localStorage.setItem(bestKey(), String(ms));
	const updateBestUI = () => {
		const v = readBest();
		bestEl.textContent = v ? `Best: ${formatTime(v)}` : "Best: --:--";
	};

	const setDifficulty = (level) => {
		const preset = DIFFICULTY_PRESETS[level] || DIFFICULTY_PRESETS.easy;
		currentDifficulty = level in DIFFICULTY_PRESETS ? level : "easy";
		rows = preset.rows;
		cols = preset.cols;
		diffButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.diff === currentDifficulty)));
		loadCurrentPuzzle();
	};

	const computeCanvasSize = () => {
		const wrapper = canvas.parentElement;
		const { width, height } = wrapper.getBoundingClientRect();
		canvas.width = Math.floor(width);
		canvas.height = Math.floor(height);
		confettiCanvas.width = canvas.width;
		confettiCanvas.height = canvas.height;
	};

	const getPieceById = (id) => pieces.find((pp) => pp.id === id);

	const createPieces = () => {
		pieceWidth = Math.floor(canvas.width / cols);
		pieceHeight = Math.floor(canvas.height / rows);
		pieces = [];
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const id = r * cols + c;
				const correctX = c * pieceWidth;
				const correctY = r * pieceHeight;
				pieces.push({ id, row: r, col: c, correctX, correctY, x: 0, y: 0, locked: false });
			}
		}
	};

	const shufflePieces = () => {
		const margin = 12;
		for (const p of pieces) {
			p.locked = false;
			p.x = Math.floor(Math.random() * (canvas.width - pieceWidth - margin * 2)) + margin;
			p.y = Math.floor(Math.random() * (canvas.height - pieceHeight - margin * 2)) + margin;
		}
		updateProgress();
		draw();
	};

	const hitTest = (x, y) => {
		for (let i = pieces.length - 1; i >= 0; i--) {
			const p = pieces[i];
			if (x >= p.x && x <= p.x + pieceWidth && y >= p.y && y <= p.y + pieceHeight) {
				return p.id;
			}
		}
		return null;
	};

	const bringToTop = (id) => {
		const index = pieces.findIndex((p) => p.id === id);
		if (index >= 0) {
			const [p] = pieces.splice(index, 1);
			pieces.push(p);
		}
	};

	const near = (a, b, tol = SNAP_TOLERANCE_PX) => Math.abs(a - b) <= tol;

	// Disable board snapping to fixed position
	const trySnap = (p) => { return false; };

	const alignToNeighborIfClose = (p) => {
		const directions = [
			{ dr: 0, dc: -1, dx: -pieceWidth, dy: 0 },
			{ dr: 0, dc: 1, dx: pieceWidth, dy: 0 },
			{ dr: -1, dc: 0, dx: 0, dy: -pieceHeight },
			{ dr: 1, dc: 0, dx: 0, dy: pieceHeight }
		];
		let aligned = false;
		for (const d of directions) {
			const nr = p.row + d.dr;
			const nc = p.col + d.dc;
			if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
			const neighborId = nr * cols + nc;
			const q = getPieceById(neighborId);
			if (!q) continue;
			const nearX = Math.abs((p.x - q.x) - d.dx);
			const nearY = Math.abs((p.y - q.y) - d.dy);
			if (nearX <= SNAP_TOLERANCE_PX && nearY <= SNAP_TOLERANCE_PX) {
				p.x = q.x + d.dx;
				p.y = q.y + d.dy;
				aligned = true;
				break;
			}
		}
		return aligned;
	};

	const checkCompletion = () => {
		const { offX, offY } = computeGlobalOffset();
		const allAligned = pieces.every((p) => isPieceAlignedWithOffset(p, offX, offY, DETECTION_TOLERANCE_PX));
		if (allAligned && !completed) {
			completed = true;
			cancelAnimationFrame(rafId);
			// Snap the entire puzzle into exact position together
			for (const p of pieces) {
				p.x = p.correctX;
				p.y = p.correctY;
				p.locked = true;
			}
			draw();
			confetti();
			const elapsed = performance.now() - startMs;
			const best = readBest();
			if (!best || elapsed < best) writeBest(elapsed);
			updateBestUI();
			openModal();
		}
	};

	const updateProgress = () => {
		const { offX, offY } = computeGlobalOffset();
		const alignedCount = pieces.filter((p) => isPieceAlignedWithOffset(p, offX, offY, DETECTION_TOLERANCE_PX)).length;
		const percent = Math.round((alignedCount / pieces.length) * 100);
		progressEl.textContent = `${percent}%`;
	};

	const draw = () => {
		if (!imageLoaded) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// Dashed grid overlay at piece boundaries
		ctx.save();
		ctx.strokeStyle = "rgba(2,89,64,0.15)";
		ctx.lineWidth = 1;
		ctx.setLineDash([6, 10]);
		for (let c = 1; c < cols; c++) {
			const x = Math.round(c * pieceWidth) + 0.5;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, canvas.height);
			ctx.stroke();
		}
		for (let r = 1; r < rows; r++) {
			const y = Math.round(r * pieceHeight) + 0.5;
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(canvas.width, y);
			ctx.stroke();
		}
		ctx.restore();
		for (const p of pieces) {
			ctx.drawImage(
				image,
				(p.correctX / canvas.width) * image.width,
				(p.correctY / canvas.height) * image.height,
				(pieceWidth / canvas.width) * image.width,
				(pieceHeight / canvas.height) * image.height,
				p.x,
				p.y,
				pieceWidth,
				pieceHeight
			);
			if (!p.locked) {
				ctx.strokeStyle = "rgba(15,23,42,0.3)";
				ctx.lineWidth = 1;
				ctx.strokeRect(p.x + 0.5, p.y + 0.5, pieceWidth - 1, pieceHeight - 1);
			}
			if (highlightedPieceIds && highlightedPieceIds.has(p.id)) {
				ctx.save();
				ctx.shadowColor = "rgba(2,89,64,0.7)";
				ctx.shadowBlur = 12;
				ctx.lineWidth = 2;
				ctx.strokeStyle = "rgba(2,89,64,0.9)";
				ctx.strokeRect(p.x + 0.5, p.y + 0.5, pieceWidth - 1, pieceHeight - 1);
				ctx.restore();
			}
		}
	};

	// Simulate completion helpers
	const lockAllPiecesInPlace = () => {
		for (const p of pieces) {
			p.x = p.correctX;
			p.y = p.correctY;
			p.locked = true;
		}
		draw();
		updateProgress();
	};

	const forceWin = (options = { updateBest: false }) => {
		completed = true;
		cancelAnimationFrame(rafId);
		lockAllPiecesInPlace();
		if (options.updateBest) {
			const elapsed = performance.now() - startMs;
			const best = readBest();
			if (!best || elapsed < best) writeBest(elapsed);
			updateBestUI();
		}
		confetti();
		openModal();
	};

	// Wait until image is loaded and pieces are created
	const waitForPuzzleReady = (timeoutMs = 5000) => new Promise((resolve) => {
		const start = performance.now();
		const tick = () => {
			if (imageLoaded && pieces && pieces.length > 0) { resolve(); return; }
			if (performance.now() - start > timeoutMs) { resolve(); return; }
			requestAnimationFrame(tick);
		};
		tick();
	});

	// Confetti (simple)
	const confetti = () => {
		const particles = Array.from({ length: 140 }).map(() => ({
			x: Math.random() * confettiCanvas.width,
			y: -10 - Math.random() * 100,
			vx: (Math.random() - 0.5) * 2,
			vy: 2 + Math.random() * 3,
			s: 4 + Math.random() * 4,
			c: `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`
		}));
		let running = true;
		const step = () => {
			confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
			for (const p of particles) {
				p.x += p.vx;
				p.y += p.vy;
				confettiCtx.fillStyle = p.c;
				confettiCtx.fillRect(p.x, p.y, p.s, p.s);
			}
			if (particles.some((p) => p.y < confettiCanvas.height + 10) && running) {
				requestAnimationFrame(step);
			} else {
				setTimeout(() => confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height), 500);
				running = false;
			}
		};
		step();
	};

	// Modal & Share
	const openModal = () => {
		modal.hidden = false;
		modal.focus();
	};
	const closeModal = () => {
		modal.hidden = true;
	};

	const initShare = () => {
		const url = location.href;
		const text = "I just completed the IGetHouse Dream Home Puzzle!";
		ctaLink.href = CTA_URL;
		shareX.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
		shareFb.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
		shareWa.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + url)}`;
		btnShare.addEventListener("click", async () => {
			if (navigator.share) {
				try {
					await navigator.share({ title: document.title, text, url });
				} catch (_) {}
			} else {
				shareFallback.hidden = false;
			}
		});
		btnClose.addEventListener("click", closeModal);
		modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
		window.addEventListener("keydown", (e) => { if (!modal.hidden && e.key === "Escape") closeModal(); });
	};

	// Promo (Hard challenge)
	const openPromo = () => { if (promo) { promo.hidden = false; try { promo.focus(); } catch (_) {} } };
	const closePromo = () => { if (promo) promo.hidden = true; };

	// Preview toggle
	const setPreviewVisible = (v) => {
		previewVisible = Boolean(v);
		if (previewEl) previewEl.hidden = !previewVisible;
		if (btnPreview) {
			btnPreview.setAttribute("aria-pressed", String(previewVisible));
			btnPreview.textContent = previewVisible ? "Hide Preview" : "Show Preview";
		}
		try { localStorage.setItem(PREVIEW_STORAGE_KEY, String(previewVisible ? 1 : 0)); } catch (_) {}
	};

	const previewViewsKey = () => `preview:views:${currentPuzzleId}`;
	const getPreviewViews = () => Number(localStorage.getItem(previewViewsKey()) || 0);
	const incrementPreviewViews = () => localStorage.setItem(previewViewsKey(), String(getPreviewViews() + 1));
	const canShowPreview = () => getPreviewViews() < PREVIEW_MAX_VIEWS;
	const requestShowPreview = () => {
		if (!canShowPreview()) {
			alert("You have viewed the preview twice already.");
			return;
		}
		setPreviewVisible(true);
		incrementPreviewViews();
		if (previewTimerId) clearTimeout(previewTimerId);
		previewTimerId = setTimeout(() => setPreviewVisible(false), PREVIEW_AUTO_HIDE_MS);
	};

	// Event Handlers
	const onPointerDown = (e) => {
		if (completed) return;
		const rect = canvas.getBoundingClientRect();
		const x = (e.clientX - rect.left) * (canvas.width / rect.width);
		const y = (e.clientY - rect.top) * (canvas.height / rect.height);
		const id = hitTest(x, y);
		if (id == null) return;
		bringToTop(id);
		const p = pieces[pieces.length - 1];
		if (p.locked) return;
		dragState.activeId = p.id;
		dragState.offsetX = x - p.x;
		dragState.offsetY = y - p.y;
		e.currentTarget.setPointerCapture(e.pointerId);
		if (!started) {
			started = true;
			startMs = performance.now();
			rAFTimer();
		}
		// Simulate win buttons
		if (btnSimEasy) btnSimEasy.addEventListener("click", async () => {
			setDifficulty("easy");
			await waitForPuzzleReady();
			forceWin({ updateBest: false });
		});
		if (btnSimHard) btnSimHard.addEventListener("click", async () => {
			setDifficulty("hard");
			await waitForPuzzleReady();
			forceWin({ updateBest: false });
		});
	};

	const onPointerMove = (e) => {
		if (dragState.activeId == null) return;
		const rect = canvas.getBoundingClientRect();
		const x = (e.clientX - rect.left) * (canvas.width / rect.width);
		const y = (e.clientY - rect.top) * (canvas.height / rect.height);
		const p = pieces.find((pp) => pp.id === dragState.activeId);
		if (!p || p.locked) return;
		p.x = x - dragState.offsetX;
		p.y = y - dragState.offsetY;
		// Pre-snap highlight near board position only (no neighbor magnetics)
		clearHighlights();
		const tol = SNAP_TOLERANCE_PX * PRE_SNAP_MULTIPLIER;
		if (Math.abs(p.x - p.correctX) <= tol && Math.abs(p.y - p.correctY) <= tol) addHighlight(p.id);
		draw();
	};

	const onPointerUp = (e) => {
		if (dragState.activeId == null) return;
		const p = pieces.find((pp) => pp.id === dragState.activeId);
		dragState.activeId = null;
		if (!p) return;
		// No board snap; only neighbor alignment already handled during move
		updateProgress();
		clearHighlights();
		draw();
		checkCompletion();
	};

	// Puzzles & Config (inline JSON)
	const parseInlineJson = (id) => {
		const el = document.getElementById(id);
		if (!el) return null;
		try {
			return JSON.parse(el.textContent.trim());
		} catch (_) {
			return null;
		}
	};

	const loadConfigAndPuzzles = () => {
		const cfg = parseInlineJson("config-json");
		if (cfg && cfg.ctaUrl) CTA_URL = cfg.ctaUrl;
		const cat = parseInlineJson("puzzles-json");
		if (cat && Array.isArray(cat.puzzles) && cat.puzzles.length) {
			puzzles = cat.puzzles;
		} else {
			puzzles = [{ id: "local-default", title: "Featured Home", imageUrl: DEFAULT_IMAGE }];
		}
	};

	const getWeekIndex = () => {
		if (!puzzles.length) return 0;
		const msPerWeek = 7 * 24 * 60 * 60 * 1000;
		const epoch = new Date(2025, 0, 1).getTime();
		const weeks = Math.floor((Date.now() - epoch) / msPerWeek);
		return ((weeks % puzzles.length) + puzzles.length) % puzzles.length;
	};

	const loadCurrentPuzzle = async () => {
		const meta = puzzles[currentPuzzleIndex] || { id: "local-default", title: "Featured Home", imageUrl: DEFAULT_IMAGE };
		currentPuzzleId = meta.id;
		puzzleTitleEl.textContent = meta.title;
		const imgUrl = optimizeImageUrl(meta.imageUrl || DEFAULT_IMAGE);
		if (previewEl) previewEl.src = imgUrl;
		await newPuzzle(imgUrl);
		updateBestUI();
	};

	// Puzzle lifecycle
	const newPuzzle = async (src = DEFAULT_IMAGE) => {
		completed = false;
		started = false;
		startMs = 0;
		timerEl.textContent = "00:00";
		computeCanvasSize();
		await loadImage(src);
		createPieces();
		shufflePieces();
	};

	const loadImage = (src) => new Promise((resolve, reject) => {
		imageLoaded = false;
		image = new Image();
		image.crossOrigin = "anonymous";
		image.onload = () => { imageLoaded = true; draw(); resolve(); };
		image.onerror = reject;
		image.src = src;
	});

	// Init
	const init = async () => {
		yearEl.textContent = String(new Date().getFullYear());
		loadConfigAndPuzzles();
		initShare();
		diffButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.diff === currentDifficulty)));
		currentPuzzleIndex = getWeekIndex();
		await loadCurrentPuzzle();
		window.addEventListener("resize", () => { computeCanvasSize(); createPieces(); draw(); });
		canvas.addEventListener("pointerdown", onPointerDown);
		canvas.addEventListener("pointermove", onPointerMove);
		canvas.addEventListener("pointerup", onPointerUp);
		btnNew.addEventListener("click", () => loadCurrentPuzzle());
		btnShuffle.addEventListener("click", shufflePieces);
		diffButtons.forEach((b) => b.addEventListener("click", () => setDifficulty(b.dataset.diff)));
		btnPrev.addEventListener("click", async () => { currentPuzzleIndex = (currentPuzzleIndex - 1 + puzzles.length) % puzzles.length; await loadCurrentPuzzle(); });
		btnNext.addEventListener("click", async () => { currentPuzzleIndex = (currentPuzzleIndex + 1) % puzzles.length; await loadCurrentPuzzle(); });
		if (btnPreview) {
			setPreviewVisible(false);
			btnPreview.addEventListener("click", () => {
				if (previewVisible) {
					setPreviewVisible(false);
					if (previewTimerId) { clearTimeout(previewTimerId); previewTimerId = 0; }
				} else {
					requestShowPreview();
				}
			});
		}
		// Always show the promo on page load
		openPromo();
		// Promo interactions
		if (btnPromoHard) btnPromoHard.addEventListener("click", () => { closePromo(); setDifficulty("hard"); });
		if (btnPromoStay) btnPromoStay.addEventListener("click", () => { closePromo(); });
		if (promo) {
			promo.addEventListener("click", (e) => { if (e.target === promo) closePromo(); });
			window.addEventListener("keydown", (e) => { if (!promo.hidden && e.key === "Escape") closePromo(); });
		}
	};

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})(); 