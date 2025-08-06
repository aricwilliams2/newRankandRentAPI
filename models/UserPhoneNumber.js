const db = require('../config/database');

class UserPhoneNumber {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.phone_number = data.phone_number;
        this.twilio_sid = data.twilio_sid;
        this.friendly_name = data.friendly_name;
        this.country = data.country;
        this.region = data.region;
        this.locality = data.locality;
        this.is_active = data.is_active;
        this.purchase_price = data.purchase_price;
        this.purchase_price_unit = data.purchase_price_unit;
        this.monthly_cost = data.monthly_cost;
        this.capabilities = data.capabilities;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Helper function to convert undefined to null for MySQL
    static _sanitizeValue(value) {
        return value === undefined ? null : value;
    }

    static async create(phoneData) {
        try {
            const result = await db.query(
                `INSERT INTO user_phone_numbers 
                (user_id, phone_number, twilio_sid, friendly_name, country, region, locality, 
                is_active, purchase_price, purchase_price_unit, monthly_cost, capabilities) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    this._sanitizeValue(phoneData.user_id),
                    this._sanitizeValue(phoneData.phone_number),
                    this._sanitizeValue(phoneData.twilio_sid),
                    this._sanitizeValue(phoneData.friendly_name),
                    this._sanitizeValue(phoneData.country),
                    this._sanitizeValue(phoneData.region),
                    this._sanitizeValue(phoneData.locality),
                    phoneData.is_active !== undefined ? phoneData.is_active : true,
                    this._sanitizeValue(phoneData.purchase_price),
                    this._sanitizeValue(phoneData.purchase_price_unit),
                    this._sanitizeValue(phoneData.monthly_cost),
                    phoneData.capabilities ? JSON.stringify(phoneData.capabilities) : null
                ]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error creating user phone number:', error);
            throw error;
        }
    }

    static async findByUserId(userId) {
        try {
            const rows = await db.query(
                'SELECT * FROM user_phone_numbers WHERE user_id = ? ORDER BY created_at DESC',
                [userId]
            );
            return rows.map(row => {
                const phoneNumber = new UserPhoneNumber(row);
                // Parse capabilities JSON
                if (phoneNumber.capabilities) {
                    try {
                        phoneNumber.capabilities = JSON.parse(phoneNumber.capabilities);
                    } catch (e) {
                        phoneNumber.capabilities = {};
                    }
                }
                return phoneNumber;
            });
        } catch (error) {
            console.error('Error finding phone numbers by user ID:', error);
            throw error;
        }
    }

    static async findByPhoneNumber(phoneNumber) {
        try {
            const rows = await db.query(
                'SELECT * FROM user_phone_numbers WHERE phone_number = ?',
                [phoneNumber]
            );
            if (rows.length > 0) {
                const phone = new UserPhoneNumber(rows[0]);
                if (phone.capabilities) {
                    try {
                        phone.capabilities = JSON.parse(phone.capabilities);
                    } catch (e) {
                        phone.capabilities = {};
                    }
                }
                return phone;
            }
            return null;
        } catch (error) {
            console.error('Error finding phone number:', error);
            throw error;
        }
    }

    static async findByTwilioSid(twilioSid) {
        try {
            const rows = await db.query(
                'SELECT * FROM user_phone_numbers WHERE twilio_sid = ?',
                [twilioSid]
            );
            if (rows.length > 0) {
                const phone = new UserPhoneNumber(rows[0]);
                if (phone.capabilities) {
                    try {
                        phone.capabilities = JSON.parse(phone.capabilities);
                    } catch (e) {
                        phone.capabilities = {};
                    }
                }
                return phone;
            }
            return null;
        } catch (error) {
            console.error('Error finding phone number by Twilio SID:', error);
            throw error;
        }
    }

    static async findActiveByUserId(userId) {
        try {
            const rows = await db.query(
                'SELECT * FROM user_phone_numbers WHERE user_id = ? AND is_active = true ORDER BY created_at DESC',
                [userId]
            );
            return rows.map(row => {
                const phoneNumber = new UserPhoneNumber(row);
                if (phoneNumber.capabilities) {
                    try {
                        phoneNumber.capabilities = JSON.parse(phoneNumber.capabilities);
                    } catch (e) {
                        phoneNumber.capabilities = {};
                    }
                }
                return phoneNumber;
            });
        } catch (error) {
            console.error('Error finding active phone numbers by user ID:', error);
            throw error;
        }
    }

    static async update(id, updateData) {
        try {
            const fields = [];
            const values = [];
            
            Object.keys(updateData).forEach(key => {
                if (key === 'capabilities') {
                    fields.push(`${key} = ?`);
                    values.push(updateData[key] ? JSON.stringify(updateData[key]) : null);
                } else {
                    fields.push(`${key} = ?`);
                    values.push(this._sanitizeValue(updateData[key]));
                }
            });
            
            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(id);
            
            const result = await db.query(
                `UPDATE user_phone_numbers SET ${fields.join(', ')} WHERE id = ?`,
                values
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating user phone number:', error);
            throw error;
        }
    }

    static async deactivate(id) {
        try {
            const result = await db.query(
                'UPDATE user_phone_numbers SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deactivating phone number:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const result = await db.query(
                'DELETE FROM user_phone_numbers WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting user phone number:', error);
            throw error;
        }
    }

    static async getUserPhoneNumberStats(userId) {
        try {
            const rows = await db.query(
                `SELECT 
                    COUNT(*) as total_numbers,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as active_numbers,
                    SUM(purchase_price) as total_purchase_cost,
                    SUM(monthly_cost) as total_monthly_cost
                FROM user_phone_numbers 
                WHERE user_id = ?`,
                [userId]
            );
            return rows[0];
        } catch (error) {
            console.error('Error getting user phone number stats:', error);
            throw error;
        }
    }
}

module.exports = UserPhoneNumber;