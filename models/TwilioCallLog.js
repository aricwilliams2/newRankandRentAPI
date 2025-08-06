const db = require('../config/database');

class TwilioCallLog {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.call_sid = data.call_sid;
        this.from_number = data.from_number;
        this.to_number = data.to_number;
        this.status = data.status;
        this.direction = data.direction;
        this.price = data.price;
        this.price_unit = data.price_unit;
        this.recording_url = data.recording_url;
        this.recording_sid = data.recording_sid;
        this.recording_duration = data.recording_duration;
        this.recording_channels = data.recording_channels;
        this.recording_status = data.recording_status;
        this.duration = data.duration;
        this.start_time = data.start_time;
        this.end_time = data.end_time;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Helper function to convert undefined to null for MySQL
    static _sanitizeValue(value) {
        return value === undefined ? null : value;
    }

    static async create(callData) {
        try {
            const result = await db.query(
                `INSERT INTO twilio_call_logs 
                (user_id, call_sid, from_number, to_number, status, direction, price, price_unit, 
                recording_url, recording_sid, recording_duration, recording_channels, recording_status, 
                duration, start_time, end_time) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    this._sanitizeValue(callData.user_id),
                    this._sanitizeValue(callData.call_sid),
                    this._sanitizeValue(callData.from_number),
                    this._sanitizeValue(callData.to_number),
                    this._sanitizeValue(callData.status),
                    this._sanitizeValue(callData.direction),
                    this._sanitizeValue(callData.price),
                    this._sanitizeValue(callData.price_unit),
                    this._sanitizeValue(callData.recording_url),
                    this._sanitizeValue(callData.recording_sid),
                    this._sanitizeValue(callData.recording_duration),
                    this._sanitizeValue(callData.recording_channels),
                    this._sanitizeValue(callData.recording_status),
                    this._sanitizeValue(callData.duration),
                    this._sanitizeValue(callData.start_time),
                    this._sanitizeValue(callData.end_time)
                ]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error creating Twilio call log:', error);
            throw error;
        }
    }

    static async update(callSid, updateData) {
        try {
            const result = await db.query(
                `UPDATE twilio_call_logs 
                SET status = ?, direction = ?, price = ?, price_unit = ?, 
                recording_url = ?, recording_sid = ?, recording_duration = ?, 
                recording_channels = ?, recording_status = ?, duration = ?, 
                start_time = ?, end_time = ?, updated_at = CURRENT_TIMESTAMP
                WHERE call_sid = ?`,
                [
                    this._sanitizeValue(updateData.status),
                    this._sanitizeValue(updateData.direction),
                    this._sanitizeValue(updateData.price),
                    this._sanitizeValue(updateData.price_unit),
                    this._sanitizeValue(updateData.recording_url),
                    this._sanitizeValue(updateData.recording_sid),
                    this._sanitizeValue(updateData.recording_duration),
                    this._sanitizeValue(updateData.recording_channels),
                    this._sanitizeValue(updateData.recording_status),
                    this._sanitizeValue(updateData.duration),
                    this._sanitizeValue(updateData.start_time),
                    this._sanitizeValue(updateData.end_time),
                    callSid
                ]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating Twilio call log:', error);
            throw error;
        }
    }

    static async findByUserId(userId, page = 1, limit = 20, status = null) {
        try {
            let query = `SELECT * FROM twilio_call_logs WHERE user_id = ?`;
            const params = [userId];

            if (status) {
                query += ` AND status = ?`;
                params.push(status);
            }

            // Convert to integers and use direct string interpolation for LIMIT/OFFSET
            const limitInt = parseInt(limit);
            const pageInt = parseInt(page);
            const offset = (pageInt - 1) * limitInt;
            
            query += ` ORDER BY created_at DESC LIMIT ${limitInt} OFFSET ${offset}`;

            const rows = await db.query(query, params);
            return rows.map(row => new TwilioCallLog(row));
        } catch (error) {
            console.error('Error finding Twilio call logs by user ID:', error);
            throw error;
        }
    }

    static async findByCallSid(callSid) {
        try {
            const rows = await db.query(
                'SELECT * FROM twilio_call_logs WHERE call_sid = ?',
                [callSid]
            );
            return rows.length > 0 ? new TwilioCallLog(rows[0]) : null;
        } catch (error) {
            console.error('Error finding Twilio call log by call SID:', error);
            throw error;
        }
    }

    static async getCallStats(userId) {
        try {
            const rows = await db.query(
                `SELECT 
                    COUNT(*) as total_calls,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_calls,
                    COUNT(CASE WHEN status = 'busy' THEN 1 END) as busy_calls,
                    COUNT(CASE WHEN status = 'no-answer' THEN 1 END) as no_answer_calls,
                    SUM(duration) as total_duration,
                    AVG(duration) as avg_duration,
                    SUM(price) as total_cost
                FROM twilio_call_logs 
                WHERE user_id = ?`,
                [userId]
            );
            return rows[0];
        } catch (error) {
            console.error('Error getting Twilio call stats:', error);
            throw error;
        }
    }

    static async getRecentCalls(userId, limit = 10) {
        try {
            const limitInt = parseInt(limit);
            const rows = await db.query(
                `SELECT * FROM twilio_call_logs 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ${limitInt}`,
                [userId]
            );
            return rows.map(row => new TwilioCallLog(row));
        } catch (error) {
            console.error('Error getting recent Twilio calls:', error);
            throw error;
        }
    }
}

module.exports = TwilioCallLog; 