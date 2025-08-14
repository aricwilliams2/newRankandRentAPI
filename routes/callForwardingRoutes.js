const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth');
const CallForwarding = require('../models/CallForwarding');
const UserPhoneNumber = require('../models/UserPhoneNumber');

// Get all call forwarding settings for the authenticated user
router.get('/', auth, async (req, res) => {
    try {
        const forwardingSettings = await CallForwarding.findByUserId(req.user.id);
        res.json({
            success: true,
            data: forwardingSettings
        });
    } catch (error) {
        console.error('Error fetching call forwarding settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch call forwarding settings'
        });
    }
});

// Create a new call forwarding setting
router.post('/', auth, async (req, res) => {
    try {
        const { phone_number_id, forward_to_number, forwarding_type, ring_timeout } = req.body;

        // Validate required fields
        if (!phone_number_id || !forward_to_number) {
            return res.status(400).json({
                success: false,
                error: 'Phone number ID and forward to number are required'
            });
        }

        // Verify the phone number belongs to the user
        const userNumber = await UserPhoneNumber.findById(phone_number_id);
        
        if (!userNumber || userNumber.user_id !== req.user.id) {
            return res.status(404).json({
                success: false,
                error: 'Phone number not found or does not belong to you'
            });
        }

        // Check if forwarding already exists for this phone number (any status)
        const existingForwarding = await CallForwarding.findByPhoneNumberIdAnyStatus(phone_number_id);
        if (existingForwarding) {
            return res.status(400).json({
                success: false,
                error: 'Call forwarding already exists for this phone number. Please update the existing setting instead.'
            });
        }

        // Create the forwarding setting
        const forwardingId = await CallForwarding.create({
            user_id: req.user.id,
            phone_number_id,
            forward_to_number,
            forwarding_type: forwarding_type || 'always',
            ring_timeout: ring_timeout || 20
        });

        // Get the created forwarding setting
        const newForwarding = await CallForwarding.findByUserId(req.user.id);
        const createdForwarding = newForwarding.find(f => f.id == forwardingId);

        res.status(201).json({
            success: true,
            message: 'Call forwarding created successfully',
            data: createdForwarding
        });
    } catch (error) {
        console.error('Error creating call forwarding:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create call forwarding setting'
        });
    }
});

// Update a call forwarding setting
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { forward_to_number, forwarding_type, ring_timeout, is_active } = req.body;

        // Get user's forwarding settings to verify ownership
        const userForwarding = await CallForwarding.findByUserId(req.user.id);
        const forwarding = userForwarding.find(f => f.id == id);

        if (!forwarding) {
            return res.status(404).json({
                success: false,
                error: 'Call forwarding setting not found'
            });
        }

        // Prepare update data
        const updateData = {};
        if (forward_to_number !== undefined) updateData.forward_to_number = forward_to_number;
        if (forwarding_type !== undefined) updateData.forwarding_type = forwarding_type;
        if (ring_timeout !== undefined) updateData.ring_timeout = ring_timeout;
        if (is_active !== undefined) updateData.is_active = is_active;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No fields to update'
            });
        }

        // Update the forwarding setting
        const updated = await CallForwarding.update(id, updateData);

        if (updated) {
            // Get the updated forwarding setting
            const updatedForwarding = await CallForwarding.findByUserId(req.user.id);
            const updatedSetting = updatedForwarding.find(f => f.id == id);

            res.json({
                success: true,
                message: 'Call forwarding updated successfully',
                data: updatedSetting
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to update call forwarding setting'
            });
        }
    } catch (error) {
        console.error('Error updating call forwarding:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update call forwarding setting'
        });
    }
});

// Toggle call forwarding active status
router.patch('/:id/toggle', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        if (is_active === undefined) {
            return res.status(400).json({
                success: false,
                error: 'is_active field is required'
            });
        }

        // Get user's forwarding settings to verify ownership
        const userForwarding = await CallForwarding.findByUserId(req.user.id);
        const forwarding = userForwarding.find(f => f.id == id);

        if (!forwarding) {
            return res.status(404).json({
                success: false,
                error: 'Call forwarding setting not found'
            });
        }

        // Toggle the active status
        const updated = await CallForwarding.toggleActive(id, is_active);

        if (updated) {
            res.json({
                success: true,
                message: `Call forwarding ${is_active ? 'activated' : 'deactivated'} successfully`
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to toggle call forwarding status'
            });
        }
    } catch (error) {
        console.error('Error toggling call forwarding:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle call forwarding status'
        });
    }
});

// Delete a call forwarding setting
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        // Get user's forwarding settings to verify ownership
        const userForwarding = await CallForwarding.findByUserId(req.user.id);
        const forwarding = userForwarding.find(f => f.id == id);

        if (!forwarding) {
            return res.status(404).json({
                success: false,
                error: 'Call forwarding setting not found'
            });
        }

        // Delete the forwarding setting
        const deleted = await CallForwarding.delete(id);

        if (deleted) {
            res.json({
                success: true,
                message: 'Call forwarding deleted successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to delete call forwarding setting'
            });
        }
    } catch (error) {
        console.error('Error deleting call forwarding:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete call forwarding setting'
        });
    }
});

// Get call forwarding settings for a specific phone number
router.get('/phone-number/:phoneNumberId', auth, async (req, res) => {
    try {
        const { phoneNumberId } = req.params;

        // Verify the phone number belongs to the user
        const userNumber = await UserPhoneNumber.findById(phoneNumberId);
        
        if (!userNumber || userNumber.user_id !== req.user.id) {
            return res.status(404).json({
                success: false,
                error: 'Phone number not found or does not belong to you'
            });
        }

        // Get forwarding settings for this phone number
        const forwarding = await CallForwarding.findByPhoneNumberId(phoneNumberId);

        res.json({
            success: true,
            data: forwarding
        });
    } catch (error) {
        console.error('Error fetching call forwarding for phone number:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch call forwarding settings'
        });
    }
});

module.exports = router;
