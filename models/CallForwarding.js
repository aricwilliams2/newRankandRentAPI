const db = require('../config/database');

class CallForwarding {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.phone_number_id = data.phone_number_id;
        this.forward_to_number = data.forward_to_number;
        this.is_active = data.is_active;
        this.forwarding_type = data.forwarding_type; // 'always', 'busy', 'no_answer', 'unavailable'
        this.ring_timeout = data.ring_timeout; // seconds before forwarding
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async create(forwardingData) {
        try {
            const result = await db.query(
                `INSERT INTO call_forwarding 
                (user_id, phone_number_id, forward_to_number, is_active, forwarding_type, ring_timeout) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    forwardingData.user_id,
                    forwardingData.phone_number_id,
                    forwardingData.forward_to_number,
                    forwardingData.is_active !== undefined ? forwardingData.is_active : true,
                    forwardingData.forwarding_type || 'always',
                    forwardingData.ring_timeout || 20
                ]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error creating call forwarding:', error);
            throw error;
        }
    }

    static async findByUserId(userId) {
        try {
            const rows = await db.query(
                `SELECT cf.*, upn.phone_number as source_number, upn.friendly_name 
                FROM call_forwarding cf
                JOIN user_phone_numbers upn ON cf.phone_number_id = upn.id
                WHERE cf.user_id = ? 
                ORDER BY cf.created_at DESC`,
                [userId]
            );
            return rows.map(row => new CallForwarding(row));
        } catch (error) {
            console.error('Error finding call forwarding by user ID:', error);
            throw error;
        }
    }

    static async findByPhoneNumberId(phoneNumberId) {
        try {
            // Handle null/undefined phone number ID
            if (!phoneNumberId) {
                console.log('⚠️ findByPhoneNumberId called with null/undefined phoneNumberId');
                return null;
            }
            
            const rows = await db.query(
                'SELECT * FROM call_forwarding WHERE phone_number_id = ? AND is_active = true',
                [phoneNumberId]
            );
            if (rows.length > 0) {
                return new CallForwarding(rows[0]);
            }
            return null;
        } catch (error) {
            console.error('Error finding call forwarding by phone number ID:', error);
            throw error;
        }
    }

    static async findByPhoneNumberIdAnyStatus(phoneNumberId) {
        try {
            // Handle null/undefined phone number ID
            if (!phoneNumberId) {
                console.log('⚠️ findByPhoneNumberIdAnyStatus called with null/undefined phoneNumberId');
                return null;
            }
            
            const rows = await db.query(
                'SELECT * FROM call_forwarding WHERE phone_number_id = ?',
                [phoneNumberId]
            );
            if (rows.length > 0) {
                return new CallForwarding(rows[0]);
            }
            return null;
        } catch (error) {
            console.error('Error finding call forwarding by phone number ID (any status):', error);
            throw error;
        }
    }

    static async update(id, updateData) {
        try {
            const fields = [];
            const values = [];
            
            Object.keys(updateData).forEach(key => {
                fields.push(`${key} = ?`);
                values.push(updateData[key]);
            });
            
            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(id);
            
            const result = await db.query(
                `UPDATE call_forwarding SET ${fields.join(', ')} WHERE id = ?`,
                values
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating call forwarding:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const result = await db.query(
                'DELETE FROM call_forwarding WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting call forwarding:', error);
            throw error;
        }
    }

    static async toggleActive(id, isActive) {
        try {
            const result = await db.query(
                'UPDATE call_forwarding SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [isActive, id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error toggling call forwarding active status:', error);
            throw error;
        }
    }

    static async getActiveForwardingForNumber(phoneNumberId) {
        try {
            // Handle null/undefined phone number ID
            if (!phoneNumberId) {
                console.log('⚠️ getActiveForwardingForNumber called with null/undefined phoneNumberId');
                return null;
            }
            
            const rows = await db.query(
                'SELECT * FROM call_forwarding WHERE phone_number_id = ? AND is_active = true',
                [phoneNumberId]
            );
            if (rows.length > 0) {
                return new CallForwarding(rows[0]);
            }
            return null;
        } catch (error) {
            console.error('Error getting active forwarding for number:', error);
            throw error;
        }
    }
}

module.exports = CallForwarding;


