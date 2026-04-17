// src/App.jsx — GameVault v2

import React, { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import {
  loginWithGoogle, loginWithEmail, registerWithEmail,
  logoutUser, changePassword,
  getUserProfile, getAllUsers, updateUser,
  getGames, createGame, updateGame, deleteGame,
  getReviewsByGame, getAllReviews, upsertReview, deleteReview,
  getCategories, createCategory, updateCategory, deleteCategory,
  getPlatforms, createPlatform, updatePlatform, deletePlatform,
} from "./services";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const avg = (arr) =>
  arr.length ? (arr.reduce((s, r) => s + r.rating, 0) / arr.length).toFixed(1) : null;

const scoreColor = (score) => {
  const n = parseFloat(score);
  if (!score || isNaN(n)) return "#4a4a5a";
  if (n >= 7.5) return "#00d474";
  if (n >= 5)   return "#ffbd3f";
  return "#ff4b4b";
};

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Nunito+Sans:wght@300;400;500;600&display=swap');

  :root {
    --bg:       #0d0d14;
    --surface:  #13131e;
    --surface2: #1a1a28;
    --surface3: #21212f;
    --border:   #2c2c42;
    --accent:   #7c6cfc;
    --accent2:  #a78bfa;
    --accent-glow: #7c6cfc33;
    --text:     #e4e4f0;
    --muted:    #7878a0;
    --green:    #00d474;
    --red:      #ff4b6e;
    --yellow:   #ffd166;
    --font-display: 'Nunito', sans-serif;
    --font-body:    'Nunito Sans', sans-serif;
    --radius:   10px;
    --radius-lg: 16px;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    min-height: 100vh;
  }

  a { color: var(--accent2); text-decoration: none; }

  /* ── SCROLLBAR ── */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--surface); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

  /* ── HEADER ── */
  .header {
    position: sticky; top: 0; z-index: 200;
    background: rgba(13,13,20,0.96);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    height: 64px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 20px;
    gap: 12px;
  }
  .header-left  { display: flex; align-items: center; gap: 10px; }
  .header-right { display: flex; align-items: center; gap: 10px; justify-content: flex-end; }

  .logo {
    font-family: var(--font-display);
    font-size: 28px; font-weight: 900;
    letter-spacing: -0.5px;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    cursor: pointer; user-select: none;
  }

  /* ── HAMBURGER ── */
  .hamburger {
    width: 40px; height: 40px; border-radius: 10px;
    background: var(--surface2); border: 1px solid var(--border);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 5px; cursor: pointer; transition: all 0.2s; flex-shrink: 0;
  }
  .hamburger:hover { border-color: var(--accent); background: var(--surface3); }
  .hamburger span {
    display: block; width: 18px; height: 2px;
    background: var(--text); border-radius: 2px;
    transition: all 0.2s;
  }

  /* ── DRAWER ── */
  .drawer-overlay {
    position: fixed; inset: 0; background: #00000080;
    z-index: 300; opacity: 0; pointer-events: none;
    transition: opacity 0.25s;
  }
  .drawer-overlay.open { opacity: 1; pointer-events: all; }
  .drawer {
    position: fixed; left: 0; top: 0; bottom: 0;
    width: 280px; background: var(--surface);
    border-right: 1px solid var(--border);
    z-index: 301; transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(.4,0,.2,1);
    display: flex; flex-direction: column;
  }
  .drawer.open { transform: translateX(0); }
  .drawer-header {
    padding: 20px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .drawer-title { font-family: var(--font-display); font-size: 20px; font-weight: 800; }
  .drawer-close {
    width: 32px; height: 32px; border-radius: 8px;
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--muted); font-size: 18px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .drawer-body { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
  .drawer-footer { padding: 16px; border-top: 1px solid var(--border); }
  .drawer-item {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border-radius: 10px;
    cursor: pointer; transition: all 0.15s;
    font-size: 15px; font-weight: 600; color: var(--text);
    background: none; border: none; width: 100%; text-align: left;
  }
  .drawer-item:hover { background: var(--surface2); color: var(--accent2); }
  .drawer-item .di-icon { font-size: 18px; width: 24px; text-align: center; }
  .drawer-separator { height: 1px; background: var(--border); margin: 8px 0; }
  .drawer-user {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px; border-radius: 10px;
    background: var(--surface2); margin-bottom: 8px;
  }
  .drawer-user-info { flex: 1; min-width: 0; }
  .drawer-user-name { font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .drawer-user-role { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }

  /* ── BUTTONS ── */
  .btn {
    padding: 9px 18px; border-radius: var(--radius);
    font-family: var(--font-body); font-size: 13px; font-weight: 700;
    cursor: pointer; border: none; transition: all 0.15s;
    letter-spacing: 0.3px; display: inline-flex; align-items: center; gap: 6px;
  }
  .btn-primary { background: var(--accent); color: #fff; }
  .btn-primary:hover { background: var(--accent2); transform: translateY(-1px); }
  .btn-secondary { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
  .btn-secondary:hover { border-color: var(--accent); color: var(--accent2); }
  .btn-danger { background: transparent; color: var(--red); border: 1px solid var(--red); }
  .btn-danger:hover { background: var(--red); color: #fff; }
  .btn-ghost { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 13px; font-weight: 600; }
  .btn-ghost:hover { color: var(--text); }
  .btn-sm { padding: 5px 12px; font-size: 12px; }
  .btn-google {
    display: flex; align-items: center; gap: 10px;
    background: #fff; color: #111; padding: 12px 22px;
    border-radius: var(--radius); font-size: 14px; font-weight: 700;
    border: none; cursor: pointer; transition: all 0.15s;
  }
  .btn-google:hover { background: #f0f0f0; transform: translateY(-1px); }
  .btn-google svg { width: 18px; height: 18px; flex-shrink: 0; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

  /* ── USER PILL ── */
  .user-pill {
    display: flex; align-items: center; gap: 8px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 40px; padding: 4px 12px 4px 4px;
  }
  .user-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
  .user-avatar-placeholder {
    width: 28px; height: 28px; border-radius: 50%;
    background: var(--accent); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 800; font-family: var(--font-display);
  }
  .user-name { font-size: 13px; font-weight: 600; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* ── ROLE BADGE ── */
  .role-badge {
    font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
    padding: 2px 7px; border-radius: 20px;
  }
  .role-superadmin { background: #4f3cff22; color: #a48aff; border: 1px solid #4f3cff55; }
  .role-admin { background: #ff6b3522; color: #ff8c5a; border: 1px solid #ff6b3555; }
  .role-user { background: #ffffff10; color: var(--muted); border: 1px solid var(--border); }

  /* ── MAIN ── */
  .main { max-width: 1360px; margin: 0 auto; padding: 32px 24px; }

  /* ── HERO ── */
  .hero {
    text-align: center; padding: 80px 24px 60px;
    background: radial-gradient(ellipse at 50% 0%, var(--accent-glow) 0%, transparent 65%);
  }
  .hero-title {
    font-family: var(--font-display);
    font-size: clamp(48px, 8vw, 96px);
    font-weight: 900; line-height: 0.95; letter-spacing: -2px;
    background: linear-gradient(135deg, #fff 30%, var(--accent2) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .hero-sub { color: var(--muted); font-size: 17px; margin-top: 16px; line-height: 1.6; }
  .hero-cta { margin-top: 32px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

  /* ── FILTERS ── */
  .filters {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 28px; flex-wrap: wrap;
  }
  .search-input {
    flex: 1; min-width: 200px; max-width: 320px;
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); padding: 9px 14px; border-radius: var(--radius);
    font-family: var(--font-body); font-size: 14px;
  }
  .search-input::placeholder { color: var(--muted); }
  .search-input:focus { outline: none; border-color: var(--accent); }
  .filter-select {
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); padding: 9px 12px; border-radius: var(--radius);
    font-family: var(--font-body); font-size: 13px; cursor: pointer;
  }
  .filter-select:focus { outline: none; border-color: var(--accent); }

  /* ── GAMES GRID ── */
  .games-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 20px;
  }

  /* ── GAME CARD ── */
  .game-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); overflow: hidden;
    cursor: pointer; transition: all 0.2s; position: relative;
  }
  .game-card:hover { border-color: var(--accent); transform: translateY(-4px); box-shadow: 0 16px 48px #00000070, 0 0 0 1px var(--accent-glow); }
  .game-card-img {
    width: 100%; height: 160px; object-fit: cover;
    background: var(--surface2);
    display: flex; align-items: center; justify-content: center; font-size: 44px;
    overflow: hidden;
  }
  .game-card-img img { width: 100%; height: 100%; object-fit: cover; }
  .game-card-body { padding: 14px; }
  .game-card-title {
    font-family: var(--font-display); font-size: 17px; font-weight: 800;
    line-height: 1.2; margin-bottom: 4px; margin-top: 6px;
  }
  .game-card-meta { font-size: 12px; color: var(--muted); margin-bottom: 10px; }
  .game-card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
  .score-badge {
    width: 46px; height: 46px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display); font-size: 18px; font-weight: 900;
    border: 2px solid;
  }
  .review-count { font-size: 11px; color: var(--muted); }
  .category-tag {
    display: inline-block; font-size: 10px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.5px;
    padding: 2px 9px; border-radius: 20px;
    background: var(--accent-glow); color: var(--accent2);
    border: 1px solid var(--accent);
  }
  .flag-disabled {
    position: absolute; top: 8px; right: 8px;
    background: #0008; border: 1px solid #ff4b6e55;
    color: var(--red); font-size: 10px; font-weight: 800;
    padding: 2px 8px; border-radius: 20px;
  }
  .game-id-tag {
    font-size: 10px; color: var(--muted); font-family: monospace;
    margin-bottom: 2px;
  }

  /* ── GAME DETAIL ── */
  .game-detail-header {
    display: grid; grid-template-columns: 280px 1fr; gap: 32px; margin-bottom: 40px;
  }
  @media (max-width: 700px) { .game-detail-header { grid-template-columns: 1fr; } }
  .game-detail-img {
    width: 100%; aspect-ratio: 3/4; object-fit: cover;
    border-radius: var(--radius-lg); background: var(--surface2);
    display: flex; align-items: center; justify-content: center; font-size: 60px; overflow: hidden;
  }
  .game-detail-img img { width: 100%; height: 100%; object-fit: cover; }
  .game-detail-title {
    font-family: var(--font-display); font-size: clamp(28px, 5vw, 52px);
    font-weight: 900; line-height: 1; margin-bottom: 8px;
  }
  .game-detail-meta { color: var(--muted); font-size: 14px; margin-bottom: 16px; }
  .game-detail-desc { color: var(--text); line-height: 1.8; margin-bottom: 20px; font-size: 15px; }
  .score-big {
    display: inline-flex; align-items: center; justify-content: center;
    width: 70px; height: 70px; border-radius: 14px;
    font-family: var(--font-display); font-size: 30px; font-weight: 900;
    border: 3px solid; margin-right: 14px; flex-shrink: 0;
  }
  .platforms-list { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  .platform-pill {
    padding: 4px 12px; border-radius: 20px;
    font-size: 12px; font-weight: 700;
    background: var(--surface2); border: 1px solid var(--border); color: var(--muted);
  }

  /* ── SECTION TITLE ── */
  .section-title {
    font-family: var(--font-display); font-size: 20px; font-weight: 800;
    margin-bottom: 18px; padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }

  /* ── REVIEW FORM ── */
  .review-form {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 24px; margin-bottom: 28px;
  }
  .form-row { display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
  .form-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 150px; }
  .form-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); }
  .form-input, .form-select, .form-textarea {
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); padding: 10px 13px; border-radius: var(--radius);
    font-family: var(--font-body); font-size: 14px;
    transition: border-color 0.15s;
  }
  .form-textarea { resize: vertical; min-height: 90px; }
  .form-input:focus, .form-select:focus, .form-textarea:focus { outline: none; border-color: var(--accent); }
  .form-input::placeholder, .form-textarea::placeholder { color: var(--muted); }

  /* ── RATING INPUT ── */
  .rating-input-wrap { display: flex; align-items: center; gap: 10px; }
  .rating-input {
    width: 80px; background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); padding: 10px 12px; border-radius: var(--radius);
    font-family: var(--font-display); font-size: 22px; font-weight: 900;
    text-align: center;
  }
  .rating-input:focus { outline: none; border-color: var(--accent); }
  .rating-hint { font-size: 12px; color: var(--muted); }

  /* ── REVIEW CARD ── */
  .review-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 18px; margin-bottom: 12px;
    display: flex; gap: 16px;
  }
  .review-score {
    width: 48px; height: 48px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display); font-size: 20px; font-weight: 900; border: 2px solid;
  }
  .review-author { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
  .review-meta { font-size: 11px; color: var(--muted); margin-bottom: 6px; }
  .review-text { font-size: 14px; line-height: 1.7; color: #bbbbd0; }
  .review-actions { display: flex; gap: 8px; margin-top: 10px; }

  /* ── MODAL ── */
  .modal-overlay {
    position: fixed; inset: 0; background: #000b;
    display: flex; align-items: center; justify-content: center;
    z-index: 500; padding: 20px;
  }
  .modal {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 28px; width: 100%; max-width: 520px;
    max-height: 88vh; overflow-y: auto;
  }
  .modal-title {
    font-family: var(--font-display); font-size: 22px; font-weight: 800;
    margin-bottom: 22px; display: flex; align-items: center; justify-content: space-between;
  }
  .modal-close {
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--muted); font-size: 18px; cursor: pointer;
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .modal-close:hover { color: var(--text); border-color: var(--accent); }
  .modal-divider { height: 1px; background: var(--border); margin: 18px 0; }
  .modal-or { text-align: center; color: var(--muted); font-size: 13px; position: relative; }
  .modal-or::before, .modal-or::after {
    content: ''; position: absolute; top: 50%; width: 42%; height: 1px; background: var(--border);
  }
  .modal-or::before { left: 0; }
  .modal-or::after { right: 0; }

  /* ── AUTH TABS ── */
  .auth-tabs { display: flex; gap: 4px; margin-bottom: 22px; background: var(--surface2); padding: 4px; border-radius: 10px; }
  .auth-tab {
    flex: 1; padding: 8px; border-radius: 8px; border: none;
    font-family: var(--font-body); font-size: 13px; font-weight: 700;
    cursor: pointer; transition: all 0.15s; color: var(--muted); background: none;
  }
  .auth-tab.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 4px #00000040; }

  /* ── ADMIN TABLE ── */
  .admin-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .admin-table th {
    text-align: left; font-size: 11px; text-transform: uppercase;
    letter-spacing: 0.5px; color: var(--muted); font-weight: 800;
    padding: 8px 12px; border-bottom: 1px solid var(--border);
  }
  .admin-table td { padding: 11px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .admin-table tr:hover td { background: var(--surface2); }
  .admin-table .mono { font-family: monospace; font-size: 11px; color: var(--muted); }

  /* ── ADMIN SEARCH ── */
  .admin-search {
    display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap;
  }
  .admin-search-input {
    flex: 1; min-width: 180px;
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); padding: 8px 13px; border-radius: var(--radius);
    font-family: var(--font-body); font-size: 13px;
  }
  .admin-search-input:focus { outline: none; border-color: var(--accent); }
  .admin-search-select {
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); padding: 8px 12px; border-radius: var(--radius);
    font-family: var(--font-body); font-size: 13px; cursor: pointer;
  }

  /* ── STATS ── */
  .stats-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
  .stat-card {
    flex: 1; min-width: 120px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 18px;
    border-top: 3px solid var(--accent);
  }
  .stat-value { font-family: var(--font-display); font-size: 34px; font-weight: 900; color: var(--accent2); }
  .stat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; font-weight: 700; }

  /* ── ADMIN TABS ── */
  .admin-tabs { display: flex; gap: 4px; margin-bottom: 24px; flex-wrap: wrap; }
  .admin-tab {
    padding: 8px 16px; border-radius: var(--radius);
    background: none; border: 1px solid transparent;
    color: var(--muted); font-family: var(--font-body);
    font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s;
  }
  .admin-tab:hover { color: var(--text); border-color: var(--border); }
  .admin-tab.active { background: var(--surface2); color: var(--accent2); border-color: var(--border); }

  /* ── BACK BTN ── */
  .back-btn {
    display: inline-flex; align-items: center; gap: 6px;
    color: var(--muted); font-size: 13px; font-weight: 700;
    background: none; border: none; cursor: pointer;
    margin-bottom: 24px; transition: color 0.15s; padding: 0;
  }
  .back-btn:hover { color: var(--accent2); }

  /* ── EMPTY ── */
  .empty { text-align: center; padding: 60px 20px; color: var(--muted); }
  .empty-icon { font-size: 48px; margin-bottom: 12px; }
  .empty-text { font-size: 16px; font-weight: 600; }

  /* ── TOAST ── */
  .toast {
    position: fixed; bottom: 24px; right: 24px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 14px 20px;
    font-size: 14px; z-index: 999;
    box-shadow: 0 8px 32px #00000080;
    animation: slideUp 0.3s ease;
    max-width: 320px; font-weight: 600;
  }
  .toast.success { border-left: 4px solid var(--green); }
  .toast.error   { border-left: 4px solid var(--red); }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  /* ── LOADING ── */
  .loading {
    display: flex; align-items: center; justify-content: center;
    height: 200px; color: var(--muted); font-size: 15px; gap: 10px; font-weight: 600;
  }
  .spinner {
    width: 20px; height: 20px; border-radius: 50%;
    border: 2px solid var(--border); border-top-color: var(--accent);
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── CRUD INLINE (categorias/plataformas) ── */
  .crud-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .crud-item {
    display: flex; align-items: center; gap: 10px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 10px 14px;
  }
  .crud-item-name { flex: 1; font-size: 14px; font-weight: 600; }
  .crud-item-id { font-family: monospace; font-size: 10px; color: var(--muted); }
  .crud-add-row { display: flex; gap: 10px; margin-top: 10px; }

  /* ── CHANGE PASSWORD FORM ── */
  .change-pw-form { display: flex; flex-direction: column; gap: 14px; }
`;

// ─────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);
  return { toast, show };
}

// ─────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`toast ${toast.type}`}>{toast.msg}</div>;
}

function Spinner() {
  return <div className="loading"><div className="spinner" /> Carregando...</div>;
}

function ScoreBadge({ score, size = "sm" }) {
  const color = scoreColor(score);
  const cls = size === "lg" ? "score-big" : "score-badge";
  return (
    <div className={cls} style={{ borderColor: color, color }}>
      {score ?? "—"}
    </div>
  );
}

function UserAvatar({ user, size = 28 }) {
  if (user?.photoURL) {
    return <img src={user.photoURL} className="user-avatar" style={{ width: size, height: size }} alt="" />;
  }
  const letter = (user?.displayName || user?.name || "?")[0].toUpperCase();
  return (
    <div className="user-avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.44 }}>
      {letter}
    </div>
  );
}

// ─────────────────────────────────────────────
// AUTH MODAL (Login + Cadastro)
// ─────────────────────────────────────────────

function AuthModal({ onClose, toast }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "", password2: "" });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleGoogle() {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.show("Login realizado!");
      onClose();
    } catch (e) {
      toast.show("Erro: " + e.message, "error");
    } finally { setLoading(false); }
  }

  async function handleEmail() {
    if (tab === "register" && form.password !== form.password2) {
      toast.show("As senhas não coincidem", "error"); return;
    }
    if (!form.email || !form.password) {
      toast.show("Preencha todos os campos", "error"); return;
    }
    setLoading(true);
    try {
      if (tab === "login") {
        await loginWithEmail(form.email, form.password);
        toast.show("Login realizado!");
      } else {
        if (!form.username.trim()) { toast.show("Digite um username", "error"); setLoading(false); return; }
        await registerWithEmail(form.username.trim(), form.email, form.password);
        toast.show("Conta criada com sucesso!");
      }
      onClose();
    } catch (e) {
      const msg = e.code === "auth/user-not-found" || e.code === "auth/wrong-password"
        ? "Email ou senha incorretos"
        : e.code === "auth/email-already-in-use"
        ? "Este email já está cadastrado"
        : e.message;
      toast.show(msg, "error");
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          Entrar no GameVault
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>Login</button>
          <button className={`auth-tab ${tab === "register" ? "active" : ""}`} onClick={() => setTab("register")}>Cadastrar</button>
        </div>

        {tab === "register" && (
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Username</label>
            <input className="form-input" placeholder="Seu username" value={form.username} onChange={e => set("username", e.target.value)} />
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Email</label>
          <input className="form-input" type="email" placeholder="seu@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
        </div>

        <div className="form-group" style={{ marginBottom: tab === "register" ? 12 : 18 }}>
          <label className="form-label">Senha</label>
          <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => set("password", e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleEmail()} />
        </div>

        {tab === "register" && (
          <div className="form-group" style={{ marginBottom: 18 }}>
            <label className="form-label">Confirmar senha</label>
            <input className="form-input" type="password" placeholder="••••••••" value={form.password2} onChange={e => set("password2", e.target.value)} />
          </div>
        )}

        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={handleEmail} disabled={loading}>
          {loading ? "Aguarde..." : tab === "login" ? "Entrar" : "Criar conta"}
        </button>

        <div className="modal-or" style={{ margin: "18px 0" }}>ou</div>

        <button className="btn-google" style={{ width: "100%", justifyContent: "center" }} onClick={handleGoogle} disabled={loading}>
          <svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continuar com Google
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CHANGE PASSWORD MODAL
// ─────────────────────────────────────────────

function ChangePasswordModal({ onClose, toast, userProfile }) {
  const [form, setForm] = useState({ current: "", next: "", next2: "" });
  const [loading, setLoading] = useState(false);

  const isGoogle = userProfile?.provider === "google";

  async function handleSubmit() {
    if (form.next !== form.next2) { toast.show("As senhas não coincidem", "error"); return; }
    if (form.next.length < 6) { toast.show("A nova senha precisa ter ao menos 6 caracteres", "error"); return; }
    setLoading(true);
    try {
      await changePassword(form.current, form.next);
      toast.show("Senha alterada com sucesso!");
      onClose();
    } catch (e) {
      toast.show("Senha atual incorreta", "error");
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          Alterar Senha
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {isGoogle ? (
          <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
            Sua conta usa login pelo Google. A senha é gerenciada pelo Google e não pode ser alterada aqui.
          </div>
        ) : (
          <div className="change-pw-form">
            <div className="form-group">
              <label className="form-label">Senha atual</label>
              <input className="form-input" type="password" placeholder="••••••••"
                value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Nova senha</label>
              <input className="form-input" type="password" placeholder="••••••••"
                value={form.next} onChange={e => setForm(f => ({ ...f, next: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar nova senha</label>
              <input className="form-input" type="password" placeholder="••••••••"
                value={form.next2} onChange={e => setForm(f => ({ ...f, next2: e.target.value }))} />
            </div>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : "Alterar senha"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HAMBURGER DRAWER
// ─────────────────────────────────────────────

function HamburgerDrawer({ open, onClose, currentUser, userProfile, onLogout, onChangePw, onAdmin }) {
  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin";
  if (!open && !currentUser) return null;

  return (
    <>
      <div className={`drawer-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <div className={`drawer ${open ? "open" : ""}`}>
        <div className="drawer-header">
          <span className="drawer-title">Menu</span>
          <button className="drawer-close" onClick={onClose}>×</button>
        </div>

        <div className="drawer-body">
          {currentUser && (
            <>
              <div className="drawer-user">
                <UserAvatar user={currentUser} size={36} />
                <div className="drawer-user-info">
                  <div className="drawer-user-name">{userProfile?.username || userProfile?.name || currentUser.displayName}</div>
                  <div className="drawer-user-role">{userProfile?.role || "usuário"}</div>
                </div>
              </div>

              <div className="drawer-separator" />

              <button className="drawer-item" onClick={() => { onChangePw(); onClose(); }}>
                <span className="di-icon">🔑</span> Alterar senha
              </button>

              {isAdmin && (
                <button className="drawer-item" onClick={() => { onAdmin(); onClose(); }}>
                  <span className="di-icon">⚙️</span> Painel de Administração
                </button>
              )}

              <div className="drawer-separator" />

              <button className="drawer-item" style={{ color: "var(--red)" }} onClick={() => { onLogout(); onClose(); }}>
                <span className="di-icon">🚪</span> Sair da conta
              </button>
            </>
          )}

          {!currentUser && (
            <div style={{ color: "var(--muted)", fontSize: 14, padding: "12px 14px" }}>
              Faça login para acessar o menu.
            </div>
          )}
        </div>

        <div className="drawer-footer" style={{ color: "var(--muted)", fontSize: 11, textAlign: "center" }}>
          GameVault v2.0
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// GAME FORM MODAL
// ─────────────────────────────────────────────

function GameFormModal({ game, categories, platforms, onClose, onSave, toast }) {
  const [form, setForm] = useState({
    title: game?.title || "",
    description: game?.description || "",
    category: game?.category || "",
    developer: game?.developer || "",
    publisher: game?.publisher || "",
    releaseYear: game?.releaseYear || new Date().getFullYear(),
    platforms: game?.platforms || [],
    image: game?.image || "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const togglePlatform = (name) => {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(name)
        ? f.platforms.filter(x => x !== name)
        : [...f.platforms, name],
    }));
  };

  async function handleSubmit() {
    if (!form.title.trim()) { toast.show("Título obrigatório", "error"); return; }
    setSaving(true);
    try {
      await onSave(form, imageFile);
      onClose();
    } catch (e) {
      toast.show("Erro: " + e.message, "error");
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          {game ? "Editar Jogo" : "Novo Jogo"}
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {game && <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, fontFamily: "monospace" }}>ID: {game.id}</div>}

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Título *</label>
          <input className="form-input" value={form.title} onChange={e => set("title", e.target.value)} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <select className="form-select" value={form.category} onChange={e => set("category", e.target.value)}>
              <option value="">Selecione...</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Ano</label>
            <input className="form-input" type="number" value={form.releaseYear} onChange={e => set("releaseYear", Number(e.target.value))} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Desenvolvedor</label>
            <input className="form-input" value={form.developer} onChange={e => set("developer", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Publisher</label>
            <input className="form-input" value={form.publisher} onChange={e => set("publisher", e.target.value)} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Descrição</label>
          <textarea className="form-textarea" value={form.description} onChange={e => set("description", e.target.value)} />
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Plataformas</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {platforms.map(p => (
              <button key={p.id} type="button"
                className={`btn btn-sm ${form.platforms.includes(p.name) ? "btn-primary" : "btn-secondary"}`}
                onClick={() => togglePlatform(p.name)}>{p.name}</button>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Upload de imagem</label>
          <input type="file" accept="image/*" style={{ color: "var(--text)", fontSize: 13 }}
            onChange={e => setImageFile(e.target.files[0])} />
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Ou URL da imagem</label>
          <input className="form-input" value={form.image} placeholder="https://..."
            onChange={e => set("image", e.target.value)} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// GAME DETAIL
// ─────────────────────────────────────────────

function GameDetailPage({ game, currentUser, userProfile, onBack, onDataChange, toast }) {
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ rating: "", platform: "", text: "" });
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin";
  const isBanned = userProfile?.banned;

  useEffect(() => { load(); }, [game.id]);

  async function load() {
    setLoading(true);
    const data = await getReviewsByGame(game.id);
    setReviews(data);
    if (currentUser) {
      const mine = data.find(r => r.userId === currentUser.uid);
      setMyReview(mine || null);
      if (mine) setForm({ rating: mine.rating, platform: mine.platform, text: mine.text });
    }
    setLoading(false);
  }

  const score = avg(reviews);

  function validateRating(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return false;
    if (n < 0 || n > 10) return false;
    return true;
  }

  async function handleSubmit() {
    if (!validateRating(form.rating)) { toast.show("Nota deve ser entre 0 e 10 (ex: 7.5)", "error"); return; }
    if (!form.platform) { toast.show("Selecione a plataforma", "error"); return; }
    if (!form.text.trim()) { toast.show("Escreva um comentário", "error"); return; }
    setSubmitting(true);
    try {
      await upsertReview(currentUser.uid, game.id, {
        rating: parseFloat(parseFloat(form.rating).toFixed(1)),
        platform: form.platform,
        text: form.text,
        userName: userProfile?.username || currentUser.displayName,
        userPhoto: currentUser.photoURL,
      });
      toast.show("Avaliação salva!");
      setEditing(false);
      await load();
      onDataChange();
    } catch (e) {
      toast.show("Erro: " + e.message, "error");
    } finally { setSubmitting(false); }
  }

  async function handleDeleteReview(id) {
    if (!window.confirm("Excluir esta avaliação?")) return;
    await deleteReview(id);
    toast.show("Avaliação excluída");
    await load();
    onDataChange();
  }

  const availablePlatforms = game.platforms || [];

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Voltar</button>

      <div className="game-detail-header">
        <div className="game-detail-img">
          {game.image ? <img src={game.image} alt={game.title} /> : "🎮"}
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "monospace", marginBottom: 6 }}>ID: {game.id}</div>
          {game.category && <span className="category-tag">{game.category}</span>}
          <div className="game-detail-title" style={{ marginTop: 8 }}>{game.title}</div>
          <div className="game-detail-meta">{game.developer}{game.publisher ? ` · ${game.publisher}` : ""}{game.releaseYear ? ` · ${game.releaseYear}` : ""}</div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
            <ScoreBadge score={score} size="lg" />
            <div>
              <div style={{ fontSize: 14, color: "var(--muted)" }}>{reviews.length} avaliações</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Escala 0–10</div>
            </div>
          </div>
          {game.description && <div className="game-detail-desc">{game.description}</div>}
          <div className="platforms-list">
            {availablePlatforms.map(p => <span key={p} className="platform-pill">{p}</span>)}
          </div>
          {!game.reviewsEnabled && (
            <div style={{ marginTop: 12, color: "var(--red)", fontSize: 13, fontWeight: 700 }}>
              ⚠ Avaliações desabilitadas para este jogo
            </div>
          )}
        </div>
      </div>

      {/* FORM */}
      {!currentUser && (
        <div className="review-form" style={{ textAlign: "center", color: "var(--muted)" }}>
          Faça login para avaliar este jogo.
        </div>
      )}
      {currentUser && isBanned && (
        <div className="review-form" style={{ textAlign: "center", color: "var(--red)" }}>
          Sua conta está banida.
        </div>
      )}
      {currentUser && !isBanned && game.reviewsEnabled && (!myReview || editing) && (
        <div className="review-form">
          <div className="section-title" style={{ fontSize: 16, marginBottom: 16 }}>
            {editing ? "Editar Avaliação" : "Escrever Avaliação"}
          </div>
          <div className="form-row">
            <div className="form-group" style={{ maxWidth: 180 }}>
              <label className="form-label">Nota (0–10)</label>
              <div className="rating-input-wrap">
                <input
                  className="rating-input form-input"
                  type="number" min="0" max="10" step="0.1"
                  placeholder="7.5"
                  value={form.rating}
                  onChange={e => setForm(f => ({ ...f, rating: e.target.value }))}
                  style={{ width: 90 }}
                />
                <span className="rating-hint">ex: 8.5</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Plataforma</label>
              <select className="form-select" value={form.platform}
                onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                <option value="">Selecione...</option>
                {availablePlatforms.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Comentário</label>
            <textarea className="form-textarea" placeholder="O que você achou do jogo?"
              value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Publicando..." : editing ? "Salvar" : "Publicar"}
            </button>
            {editing && <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancelar</button>}
          </div>
        </div>
      )}
      {myReview && !editing && (
        <div style={{ marginBottom: 20, padding: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Você já avaliou este jogo.</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Editar</button>
        </div>
      )}

      {/* REVIEWS */}
      <div className="section-title">Avaliações ({reviews.length})</div>
      {loading ? <Spinner /> : reviews.length === 0 ? (
        <div className="empty"><div className="empty-icon">💬</div><div className="empty-text">Nenhuma avaliação ainda</div></div>
      ) : reviews.map(r => {
        const color = scoreColor(r.rating);
        const isMine = currentUser && r.userId === currentUser.uid;
        return (
          <div key={r.id} className="review-card">
            <div className="review-score" style={{ borderColor: color, color }}>{r.rating}</div>
            <div style={{ flex: 1 }}>
              <div className="review-author">{r.userName}</div>
              <div className="review-meta">{r.platform} · {r.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "—"}</div>
              <div className="review-text">{r.text}</div>
              {(isMine || isAdmin) && (
                <div className="review-actions">
                  {isMine && <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Editar</button>}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteReview(r.id)}>Excluir</button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// ADMIN PANEL
// ─────────────────────────────────────────────

function AdminPanel({ currentUser, userProfile, games, allReviews, categories, platforms, toast, onDataChange }) {
  const [tab, setTab] = useState("games");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showGameForm, setShowGameForm] = useState(false);
  const [editGame, setEditGame] = useState(null);

  // Filtros jogos
  const [gSearch, setGSearch] = useState("");
  const [gCat, setGCat] = useState("");
  const [gPlat, setGPlat] = useState("");

  // Filtros reviews
  const [rSearch, setRSearch] = useState("");
  const [rPlat, setRPlat] = useState("");

  // Filtros users
  const [uSearch, setUSearch] = useState("");

  // CRUD categorias/plataformas
  const [newCat, setNewCat] = useState("");
  const [newPlat, setNewPlat] = useState("");
  const [editCat, setEditCat] = useState(null);
  const [editPlat, setEditPlat] = useState(null);

  const isSuperAdmin = userProfile?.role === "superadmin";

  useEffect(() => { if (tab === "users") loadUsers(); }, [tab]);

  async function loadUsers() {
    setLoadingUsers(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoadingUsers(false);
  }

  // Games CRUD
  async function handleCreateGame(data, img) { await createGame(data, img); toast.show("Jogo criado!"); onDataChange(); }
  async function handleUpdateGame(data, img) { await updateGame(editGame.id, data, img); toast.show("Jogo atualizado!"); onDataChange(); }
  async function handleDeleteGame(g) {
    if (!window.confirm(`Excluir "${g.title}"?`)) return;
    await deleteGame(g.id); toast.show("Jogo excluído"); onDataChange();
  }
  async function handleToggleReviews(g) {
    await updateGame(g.id, { reviewsEnabled: !g.reviewsEnabled });
    toast.show(g.reviewsEnabled ? "Avaliações desativadas" : "Avaliações ativadas");
    onDataChange();
  }

  // Users
  async function handleBan(u) {
    const action = u.banned ? "desbanir" : "banir";
    if (!window.confirm(`${action} ${u.name}?`)) return;
    await updateUser(u.id, { banned: !u.banned });
    toast.show(`Usuário ${u.banned ? "desbanido" : "banido"}`);
    loadUsers();
  }
  async function handlePromote(u) {
    if (!window.confirm(`Promover ${u.name} a admin?`)) return;
    await updateUser(u.id, { role: "admin" }); toast.show("Promovido"); loadUsers();
  }
  async function handleDemote(u) {
    if (!isSuperAdmin) { toast.show("Apenas o superadmin pode rebaixar admins", "error"); return; }
    if (!window.confirm(`Rebaixar ${u.name}?`)) return;
    await updateUser(u.id, { role: "user" }); toast.show("Rebaixado"); loadUsers();
  }

  // Categories
  async function handleCreateCat() {
    if (!newCat.trim()) return;
    await createCategory(newCat.trim()); setNewCat(""); toast.show("Categoria criada"); onDataChange();
  }
  async function handleUpdateCat(id, name) {
    await updateCategory(id, name); setEditCat(null); toast.show("Categoria atualizada"); onDataChange();
  }
  async function handleDeleteCat(id) {
    if (!window.confirm("Excluir categoria?")) return;
    await deleteCategory(id); toast.show("Categoria excluída"); onDataChange();
  }

  // Platforms
  async function handleCreatePlat() {
    if (!newPlat.trim()) return;
    await createPlatform(newPlat.trim()); setNewPlat(""); toast.show("Plataforma criada"); onDataChange();
  }
  async function handleUpdatePlat(id, name) {
    await updatePlatform(id, name); setEditPlat(null); toast.show("Plataforma atualizada"); onDataChange();
  }
  async function handleDeletePlat(id) {
    if (!window.confirm("Excluir plataforma?")) return;
    await deletePlatform(id); toast.show("Plataforma excluída"); onDataChange();
  }

  // Filtered lists
  const filteredGames = games.filter(g => {
    const s = gSearch.toLowerCase();
    return (
      (!s || g.title?.toLowerCase().includes(s) || g.id?.toLowerCase().includes(s)) &&
      (!gCat || g.category === gCat) &&
      (!gPlat || g.platforms?.includes(gPlat))
    );
  });

  const filteredReviews = allReviews.filter(r => {
    const s = rSearch.toLowerCase();
    const game = games.find(g => g.id === r.gameId);
    return (
      (!s || r.userName?.toLowerCase().includes(s) || game?.title?.toLowerCase().includes(s) || r.id?.toLowerCase().includes(s)) &&
      (!rPlat || r.platform === rPlat)
    );
  });

  const filteredUsers = users.filter(u => {
    const s = uSearch.toLowerCase();
    return !s || u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.id?.toLowerCase().includes(s) || u.username?.toLowerCase().includes(s);
  });

  const totalReviews = allReviews.length;
  const avgRating = allReviews.length
    ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1) : "—";

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 900, marginBottom: 4 }}>Painel de Administração</div>
        <div style={{ color: "var(--muted)", fontSize: 14 }}>
          Logado como <strong>{userProfile?.name}</strong> ·{" "}
          <span className={`role-badge role-${userProfile?.role}`}>{userProfile?.role}</span>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card"><div className="stat-value">{games.length}</div><div className="stat-label">Jogos</div></div>
        <div className="stat-card"><div className="stat-value">{totalReviews}</div><div className="stat-label">Avaliações</div></div>
        <div className="stat-card"><div className="stat-value">{avgRating}</div><div className="stat-label">Nota Média</div></div>
        <div className="stat-card"><div className="stat-value">{categories.length}</div><div className="stat-label">Categorias</div></div>
        <div className="stat-card"><div className="stat-value">{platforms.length}</div><div className="stat-label">Plataformas</div></div>
      </div>

      <div className="admin-tabs">
        {["games","reviews","users","categories","platforms"].map(t => (
          <button key={t} className={`admin-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {{ games:"🎮 Jogos", reviews:"⭐ Avaliações", users:"👥 Usuários", categories:"🏷 Categorias", platforms:"🖥 Plataformas" }[t]}
          </button>
        ))}
      </div>

      {/* ── GAMES ── */}
      {tab === "games" && (
        <div>
          <div className="admin-search">
            <input className="admin-search-input" placeholder="Buscar por nome ou ID..." value={gSearch} onChange={e => setGSearch(e.target.value)} />
            <select className="admin-search-select" value={gCat} onChange={e => setGCat(e.target.value)}>
              <option value="">Todas as categorias</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <select className="admin-search-select" value={gPlat} onChange={e => setGPlat(e.target.value)}>
              <option value="">Todas as plataformas</option>
              {platforms.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditGame(null); setShowGameForm(true); }}>+ Novo Jogo</button>
          </div>
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>Título</th><th>Categoria</th><th>Plataformas</th><th>Avaliações</th><th>Reviews</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {filteredGames.map(g => {
                const gr = allReviews.filter(r => r.gameId === g.id);
                const sc = avg(gr);
                return (
                  <tr key={g.id}>
                    <td className="mono">{g.id.slice(0,8)}…</td>
                    <td style={{ fontWeight: 700 }}>{g.title}</td>
                    <td><span className="category-tag">{g.category}</span></td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{g.platforms?.join(", ")}</td>
                    <td><ScoreBadge score={sc} /><span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 11 }}>{gr.length}</span></td>
                    <td><span style={{ fontSize: 12, fontWeight: 700, color: g.reviewsEnabled ? "var(--green)" : "var(--red)" }}>{g.reviewsEnabled ? "ON" : "OFF"}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditGame(g); setShowGameForm(true); }}>Editar</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleToggleReviews(g)}>{g.reviewsEnabled ? "Desativar" : "Ativar"}</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteGame(g)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── REVIEWS ── */}
      {tab === "reviews" && (
        <div>
          <div className="admin-search">
            <input className="admin-search-input" placeholder="Buscar por usuário, jogo ou ID..." value={rSearch} onChange={e => setRSearch(e.target.value)} />
            <select className="admin-search-select" value={rPlat} onChange={e => setRPlat(e.target.value)}>
              <option value="">Todas as plataformas</option>
              {platforms.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <table className="admin-table">
            <thead><tr><th>ID</th><th>Jogo</th><th>Usuário</th><th>Nota</th><th>Plataforma</th><th>Data</th><th>Ações</th></tr></thead>
            <tbody>
              {filteredReviews.map(r => {
                const game = games.find(g => g.id === r.gameId);
                return (
                  <tr key={r.id}>
                    <td className="mono">{r.id.slice(0,8)}…</td>
                    <td>{game?.title || "—"}</td>
                    <td>{r.userName}</td>
                    <td><ScoreBadge score={r.rating} /></td>
                    <td>{r.platform}</td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{r.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "—"}</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={async () => {
                        if (!window.confirm("Excluir avaliação?")) return;
                        await deleteReview(r.id); toast.show("Excluída"); onDataChange();
                      }}>Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── USERS ── */}
      {tab === "users" && (
        loadingUsers ? <Spinner /> : (
          <div>
            <div className="admin-search">
              <input className="admin-search-input" placeholder="Buscar por nome, username, email ou ID..." value={uSearch} onChange={e => setUSearch(e.target.value)} />
            </div>
            <table className="admin-table">
              <thead><tr><th>ID</th><th>Nome/Username</th><th>Email</th><th>Role</th><th>Status</th><th>Desde</th><th>Ações</th></tr></thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td className="mono">{u.id.slice(0,8)}…</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {u.photo ? <img src={u.photo} className="user-avatar" style={{ width: 26, height: 26 }} alt="" />
                          : <div className="user-avatar-placeholder" style={{ width: 26, height: 26, fontSize: 11 }}>{(u.name||"?")[0]}</div>}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{u.username || u.name}</div>
                          {u.username && u.name !== u.username && <div style={{ fontSize: 11, color: "var(--muted)" }}>{u.name}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{u.email}</td>
                    <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td>
                    <td><span style={{ fontSize: 12, fontWeight: 700, color: u.banned ? "var(--red)" : "var(--green)" }}>{u.banned ? "Banido" : "Ativo"}</span></td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{u.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {u.role === "user" && u.id !== currentUser.uid && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handlePromote(u)}>Promover</button>
                        )}
                        {u.role === "admin" && isSuperAdmin && u.id !== currentUser.uid && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleDemote(u)}>Rebaixar</button>
                        )}
                        {u.id !== currentUser.uid && u.role !== "superadmin" && (
                          <button className={`btn btn-sm ${u.banned ? "btn-secondary" : "btn-danger"}`} onClick={() => handleBan(u)}>
                            {u.banned ? "Desbanir" : "Banir"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── CATEGORIES ── */}
      {tab === "categories" && (
        <div>
          <div className="crud-list">
            {categories.map(c => (
              <div key={c.id} className="crud-item">
                <div style={{ flex: 1 }}>
                  {editCat?.id === c.id ? (
                    <input className="form-input" style={{ padding: "6px 10px", fontSize: 13 }}
                      value={editCat.name} onChange={e => setEditCat({ ...editCat, name: e.target.value })} />
                  ) : (
                    <span className="crud-item-name">{c.name}</span>
                  )}
                  <div className="crud-item-id">ID: {c.id}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {editCat?.id === c.id ? (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdateCat(c.id, editCat.name)}>Salvar</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditCat(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditCat({ id: c.id, name: c.name })}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCat(c.id)}>Excluir</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="crud-add-row">
            <input className="form-input" placeholder="Nome da nova categoria..." value={newCat} onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateCat()} style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={handleCreateCat}>+ Adicionar</button>
          </div>
        </div>
      )}

      {/* ── PLATFORMS ── */}
      {tab === "platforms" && (
        <div>
          <div className="crud-list">
            {platforms.map(p => (
              <div key={p.id} className="crud-item">
                <div style={{ flex: 1 }}>
                  {editPlat?.id === p.id ? (
                    <input className="form-input" style={{ padding: "6px 10px", fontSize: 13 }}
                      value={editPlat.name} onChange={e => setEditPlat({ ...editPlat, name: e.target.value })} />
                  ) : (
                    <span className="crud-item-name">{p.name}</span>
                  )}
                  <div className="crud-item-id">ID: {p.id}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {editPlat?.id === p.id ? (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdatePlat(p.id, editPlat.name)}>Salvar</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditPlat(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditPlat({ id: p.id, name: p.name })}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeletePlat(p.id)}>Excluir</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="crud-add-row">
            <input className="form-input" placeholder="Nome da nova plataforma..." value={newPlat} onChange={e => setNewPlat(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreatePlat()} style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={handleCreatePlat}>+ Adicionar</button>
          </div>
        </div>
      )}

      {showGameForm && (
        <GameFormModal
          game={editGame}
          categories={categories}
          platforms={platforms}
          onClose={() => { setShowGameForm(false); setEditGame(null); }}
          onSave={editGame ? handleUpdateGame : handleCreateGame}
          toast={toast}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────

export default function App() {
  const [currentUser, setCurrentUser]   = useState(null);
  const [userProfile, setUserProfile]   = useState(null);
  const [authLoading, setAuthLoading]   = useState(true);

  const [games, setGames]               = useState([]);
  const [allReviews, setAllReviews]     = useState([]);
  const [categories, setCategories]     = useState([]);
  const [platforms, setPlatforms]       = useState([]);
  const [dataLoading, setDataLoading]   = useState(true);

  const [view, setView]                 = useState("home");
  const [selectedGame, setSelectedGame] = useState(null);

  const [search, setSearch]             = useState("");
  const [filterCat, setFilterCat]       = useState("");
  const [filterPlat, setFilterPlat]     = useState("");

  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [showAuth, setShowAuth]         = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);

  const toast = useToast();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setDataLoading(true);
    const [g, r, c, p] = await Promise.all([getGames(), getAllReviews(), getCategories(), getPlatforms()]);
    setGames(g); setAllReviews(r); setCategories(c); setPlatforms(p);
    setDataLoading(false);
  }

  async function handleLogout() {
    await logoutUser();
    setView("home");
    toast.show("Até logo!");
  }

  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "superadmin";

  const filtered = games.filter(g => {
    const s = search.toLowerCase();
    return (
      (!s || g.title?.toLowerCase().includes(s)) &&
      (!filterCat  || g.category === filterCat) &&
      (!filterPlat || g.platforms?.includes(filterPlat))
    );
  });

  if (authLoading) return (
    <>
      <style>{css}</style>
      <div className="loading" style={{ height: "100vh" }}><div className="spinner" /> Autenticando...</div>
    </>
  );

  return (
    <>
      <style>{css}</style>
      <Toast toast={toast.toast} />

      <HamburgerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentUser={currentUser}
        userProfile={userProfile}
        onLogout={handleLogout}
        onChangePw={() => setShowChangePw(true)}
        onAdmin={() => setView("admin")}
      />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} toast={toast} />}
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} toast={toast} userProfile={userProfile} />}

      {/* ── HEADER ── */}
      <header className="header">
        <div className="header-left">
          <button className="hamburger" onClick={() => setDrawerOpen(true)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>

        <div className="logo" onClick={() => setView("home")}>GameVault</div>

        <div className="header-right">
          {currentUser ? (
            <div className="user-pill">
              <UserAvatar user={currentUser} size={28} />
              <span className="user-name">{userProfile?.username || userProfile?.name || currentUser.displayName}</span>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowAuth(true)}>Entrar</button>
          )}
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main className="main">
        {view === "admin" && isAdmin ? (
          <AdminPanel
            currentUser={currentUser}
            userProfile={userProfile}
            games={games}
            allReviews={allReviews}
            categories={categories}
            platforms={platforms}
            toast={toast}
            onDataChange={loadData}
          />
        ) : view === "detail" && selectedGame ? (
          <GameDetailPage
            game={selectedGame}
            currentUser={currentUser}
            userProfile={userProfile}
            onBack={() => setView("home")}
            onDataChange={loadData}
            toast={toast}
          />
        ) : (
          <>
            {!currentUser && (
              <div className="hero">
                <div className="hero-title">Descubra e avalie<br />seus jogos</div>
                <div className="hero-sub">A biblioteca de videogames com avaliações reais da comunidade.<br />Notas de 0 a 10 com casas decimais.</div>
                <div className="hero-cta">
                  <button className="btn-google" onClick={() => setShowAuth(true)}>
                    <svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Entrar com Google
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowAuth(true)}>Criar conta</button>
                </div>
              </div>
            )}

            <div className="filters">
              <input className="search-input" placeholder="Buscar jogo..." value={search} onChange={e => setSearch(e.target.value)} />
              <select className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                <option value="">Todas as categorias</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <select className="filter-select" value={filterPlat} onChange={e => setFilterPlat(e.target.value)}>
                <option value="">Todas as plataformas</option>
                {platforms.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>

            {dataLoading ? <Spinner /> : filtered.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🎮</div>
                <div className="empty-text">{games.length === 0 ? "Nenhum jogo cadastrado ainda." : "Nenhum jogo encontrado."}</div>
              </div>
            ) : (
              <div className="games-grid">
                {filtered.map(game => {
                  const gr = allReviews.filter(r => r.gameId === game.id);
                  const score = avg(gr);
                  return (
                    <div key={game.id} className="game-card" onClick={() => { setSelectedGame(game); setView("detail"); }}>
                      {!game.reviewsEnabled && <span className="flag-disabled">Reviews off</span>}
                      <div className="game-card-img">
                        {game.image ? <img src={game.image} alt={game.title} /> : "🎮"}
                      </div>
                      <div className="game-card-body">
                        <div className="game-id-tag">#{game.id.slice(0,8)}</div>
                        {game.category && <span className="category-tag">{game.category}</span>}
                        <div className="game-card-title">{game.title}</div>
                        <div className="game-card-meta">{game.developer}{game.releaseYear ? ` · ${game.releaseYear}` : ""}</div>
                        <div className="game-card-footer">
                          <ScoreBadge score={score} />
                          <div>
                            <div className="review-count">{gr.length} avaliações</div>
                            <div className="review-count">{game.platforms?.join(", ")}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
