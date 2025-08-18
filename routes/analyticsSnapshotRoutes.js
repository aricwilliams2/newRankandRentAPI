const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');

// List snapshots for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const rows = await AnalyticsSnapshot.listByUser(req.user.id, limit, offset);
    res.json({ data: rows, total: rows.length });
  } catch (e) {
    console.error('Failed to list snapshots:', e);
    res.status(500).json({ error: 'Failed to list snapshots', message: e.message });
  }
});

// Get one snapshot
router.get('/:id', authenticate, async (req, res) => {
  try {
    const row = await AnalyticsSnapshot.findByIdForUser(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Not found' });

    // Normalize JSON: some drivers may return parsed JSON for JSON columns; others return string
    let snapshotParsed = null;
    try {
      const raw = row.snapshot_json;
      if (typeof raw === 'string') {
        snapshotParsed = JSON.parse(raw);
      } else if (raw && typeof raw === 'object') {
        snapshotParsed = raw;
      }
    } catch (e) {
      snapshotParsed = null;
    }

    res.json({ data: { ...row, snapshot: snapshotParsed } });
  } catch (e) {
    console.error('Failed to read snapshot:', e);
    res.status(500).json({ error: 'Failed to read snapshot', message: e.message });
  }
});

// Delete a snapshot
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const ok = await AnalyticsSnapshot.deleteForUser(req.params.id, req.user.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    console.error('Failed to delete snapshot:', e);
    res.status(500).json({ error: 'Failed to delete snapshot', message: e.message });
  }
});

module.exports = router;


