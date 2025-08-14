import React, { useState, useEffect } from 'react';

interface PhoneNumber {
    id: number;
    phone_number: string;
    friendly_name: string;
    is_active: boolean;
}

interface CallForwarding {
    id: number;
    phone_number_id: number;
    forward_to_number: string;
    is_active: boolean;
    forwarding_type: 'always' | 'busy' | 'no_answer' | 'unavailable';
    ring_timeout: number;
    source_number?: string;
    friendly_name?: string;
}

const CallForwardingComponent = () => {
    const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
    const [forwardingSettings, setForwardingSettings] = useState<CallForwarding[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form states
    const [selectedPhoneNumber, setSelectedPhoneNumber] = useState('');
    const [forwardToNumber, setForwardToNumber] = useState('');
    const [forwardingType, setForwardingType] = useState<'always' | 'busy' | 'no_answer' | 'unavailable'>('always');
    const [ringTimeout, setRingTimeout] = useState(20);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load user's phone numbers and forwarding settings
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');

            // Load user's phone numbers
            const phoneResponse = await fetch('https://newrankandrentapi.onrender.com/api/twilio/my-numbers', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!phoneResponse.ok) {
                throw new Error('Failed to load phone numbers');
            }

            const phoneData = await phoneResponse.json();
            setPhoneNumbers(phoneData.phoneNumbers || []);

            // Load call forwarding settings
            const forwardingResponse = await fetch('https://newrankandrentapi.onrender.com/api/call-forwarding', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!forwardingResponse.ok) {
                throw new Error('Failed to load forwarding settings');
            }

            const forwardingData = await forwardingResponse.json();
            setForwardingSettings(forwardingData.data || []);

        } catch (err) {
            console.error('Error loading data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateForwarding = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPhoneNumber || !forwardToNumber) {
            setError('Please select a phone number and enter a forward-to number');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');

            const response = await fetch('https://newrankandrentapi.onrender.com/api/call-forwarding', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    phone_number_id: parseInt(selectedPhoneNumber),
                    forward_to_number: forwardToNumber,
                    forwarding_type: forwardingType,
                    ring_timeout: ringTimeout
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create call forwarding');
            }

            setSuccess('Call forwarding created successfully!');

            // Reset form
            setSelectedPhoneNumber('');
            setForwardToNumber('');
            setForwardingType('always');
            setRingTimeout(20);

            // Reload data
            await loadData();

        } catch (err) {
            console.error('Error creating call forwarding:', err);
            setError(err instanceof Error ? err.message : 'Failed to create call forwarding');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleForwarding = async (id: number, currentStatus: boolean) => {
        try {
            const response = await fetch(`https://newrankandrentapi.onrender.com/api/call-forwarding/${id}/toggle`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    is_active: !currentStatus
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to toggle forwarding');
            }

            setSuccess(data.message);
            await loadData();

        } catch (err) {
            console.error('Error toggling forwarding:', err);
            setError(err instanceof Error ? err.message : 'Failed to toggle forwarding');
        }
    };

    const handleDeleteForwarding = async (id: number) => {
        if (!confirm('Are you sure you want to delete this call forwarding setting?')) {
            return;
        }

        try {
            const response = await fetch(`https://newrankandrentapi.onrender.com/api/call-forwarding/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete forwarding');
            }

            setSuccess('Call forwarding deleted successfully!');
            await loadData();

        } catch (err) {
            console.error('Error deleting forwarding:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete forwarding');
        }
    };

    const getPhoneNumberDisplay = (phoneNumberId: number) => {
        const phone = phoneNumbers.find(p => p.id === phoneNumberId);
        return phone ? `${phone.phone_number}${phone.friendly_name ? ` (${phone.friendly_name})` : ''}` : 'Unknown';
    };

    if (loading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>Loading call forwarding settings...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px' }}>
            <h2>📞 Call Forwarding Settings</h2>

            {error && (
                <div style={{
                    color: 'red',
                    backgroundColor: '#ffe6e6',
                    padding: '10px',
                    borderRadius: '5px',
                    marginBottom: '10px'
                }}>
                    ❌ {error}
                </div>
            )}

            {success && (
                <div style={{
                    color: 'green',
                    backgroundColor: '#e6ffe6',
                    padding: '10px',
                    borderRadius: '5px',
                    marginBottom: '10px'
                }}>
                    ✅ {success}
                </div>
            )}

            {/* Create New Forwarding Setting */}
            <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '30px'
            }}>
                <h3>➕ Create New Call Forwarding</h3>

                {phoneNumbers.length === 0 ? (
                    <p style={{ color: '#666' }}>
                        You don't have any phone numbers yet. Please purchase a phone number first.
                    </p>
                ) : (
                    <form onSubmit={handleCreateForwarding}>
                        <div style={{ marginBottom: '15px' }}>
                            <label htmlFor="phoneNumber" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Select Phone Number:
                            </label>
                            <select
                                id="phoneNumber"
                                value={selectedPhoneNumber}
                                onChange={(e) => setSelectedPhoneNumber(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    border: '1px solid #ccc'
                                }}
                            >
                                <option value="">Choose a phone number...</option>
                                {phoneNumbers.map(phone => (
                                    <option key={phone.id} value={phone.id}>
                                        {phone.phone_number}{phone.friendly_name ? ` (${phone.friendly_name})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label htmlFor="forwardToNumber" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Forward Calls To:
                            </label>
                            <input
                                id="forwardToNumber"
                                type="tel"
                                value={forwardToNumber}
                                onChange={(e) => setForwardToNumber(e.target.value)}
                                placeholder="+1 (555) 123-4567"
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    border: '1px solid #ccc'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label htmlFor="forwardingType" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Forwarding Type:
                            </label>
                            <select
                                id="forwardingType"
                                value={forwardingType}
                                onChange={(e) => setForwardingType(e.target.value as any)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    border: '1px solid #ccc'
                                }}
                            >
                                <option value="always">Always Forward</option>
                                <option value="busy">Forward When Busy</option>
                                <option value="no_answer">Forward When No Answer</option>
                                <option value="unavailable">Forward When Unavailable</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label htmlFor="ringTimeout" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Ring Timeout (seconds):
                            </label>
                            <input
                                id="ringTimeout"
                                type="number"
                                min="5"
                                max="60"
                                value={ringTimeout}
                                onChange={(e) => setRingTimeout(parseInt(e.target.value))}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    border: '1px solid #ccc'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedPhoneNumber || !forwardToNumber}
                            style={{
                                backgroundColor: isSubmitting ? '#ccc' : '#007bff',
                                color: 'white',
                                padding: '12px 24px',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                fontSize: '16px'
                            }}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Call Forwarding'}
                        </button>
                    </form>
                )}
            </div>

            {/* Existing Forwarding Settings */}
            <div>
                <h3>📋 Current Call Forwarding Settings</h3>

                {forwardingSettings.length === 0 ? (
                    <p style={{ color: '#666' }}>No call forwarding settings configured yet.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '15px' }}>
                        {forwardingSettings.map(forwarding => (
                            <div key={forwarding.id} style={{
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                padding: '15px',
                                backgroundColor: forwarding.is_active ? '#f8fff8' : '#fff8f8'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 5px 0' }}>
                                            {getPhoneNumberDisplay(forwarding.phone_number_id)}
                                        </h4>
                                        <p style={{ margin: '0', color: '#666' }}>
                                            Forwards to: <strong>{forwarding.forward_to_number}</strong>
                                        </p>
                                        <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                                            Type: {forwarding.forwarding_type.replace('_', ' ')} |
                                            Timeout: {forwarding.ring_timeout}s |
                                            Status: <span style={{
                                                color: forwarding.is_active ? 'green' : 'red',
                                                fontWeight: 'bold'
                                            }}>
                                                {forwarding.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => handleToggleForwarding(forwarding.id, forwarding.is_active)}
                                            style={{
                                                backgroundColor: forwarding.is_active ? '#dc3545' : '#28a745',
                                                color: 'white',
                                                padding: '8px 16px',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                        >
                                            {forwarding.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteForwarding(forwarding.id)}
                                            style={{
                                                backgroundColor: '#dc3545',
                                                color: 'white',
                                                padding: '8px 16px',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CallForwardingComponent;


