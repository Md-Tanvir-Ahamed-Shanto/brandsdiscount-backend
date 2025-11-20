const express = require('express');
const router = express.Router();

// Initialize Stripe with proper error handling
let stripe;
try {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    
    // Check if we're using a live key that might be malformed
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (apiKey.startsWith('sk_live_') && apiKey.length > 100) {
        console.warn('Warning: Stripe live key appears to be malformed or contains extra characters');
    }
    
    // Clean the key by trimming any whitespace
    const cleanKey = apiKey.trim();
    stripe = require('stripe')(cleanKey);
    console.log('Stripe initialized successfully with key type:', cleanKey.startsWith('sk_live') ? 'live' : 'test');
} catch (error) {
    console.error('Stripe initialization error:', error.message);
    // Don't crash the server, but log the error
}

const { prisma } = require('../db/connection');

/**
 * Create Stripe Checkout Session
 * POST /api/stripe/create-checkout-session
 */
router.post('/create-checkout-session', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({
                success: false,
                error: 'Stripe is not properly configured'
            });
        }

        const {
            cartItems,
            userId,
            shippingAddress,
            billingAddress,
            finalAmount,
            appliedPoints = 0,
            metadata = {},
            customerEmail,
            ui_mode
        } = req.body;

        // Enhanced validation with specific error messages
        if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Cart items are required and cannot be empty'
            });
        }

        if (!finalAmount || typeof finalAmount !== 'number' || finalAmount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid final amount is required and must be greater than 0'
            });
        }

        // Validate cart items structure
        for (let i = 0; i < cartItems.length; i++) {
            const item = cartItems[i];
            if (!item.title && !item.name) {
                return res.status(400).json({
                    success: false,
                    error: `Cart item ${i + 1} is missing a title or name`
                });
            }
            if (!item.salePrice && !item.price) {
                return res.status(400).json({
                    success: false,
                    error: `Cart item ${i + 1} is missing price information`
                });
            }
            if (!item.quantity || item.quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    error: `Cart item ${i + 1} has invalid quantity`
                });
            }
        }
        
        // Get user's actual email if userId is provided
        let email = customerEmail;
        if (userId && !email) {
            try {
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { email: true }
                });
                if (user) {
                    email = user.email;
                }
            } catch (error) {
                console.error('Error fetching user email:', error);
                // Don't fail the request, just log the error
            }
        }
        
        // Only use fallback if no email is available at all
        if (!email) {
            email = 'customer@brandsdiscounts.com';
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Prepare line items for Stripe with enhanced validation
        const lineItems = cartItems.map((item, index) => {
            const price = item.salePrice || item.price;
            const unitAmount = Math.round(price * 100); // Convert to cents
            
            if (unitAmount <= 0) {
                throw new Error(`Invalid price for item ${index + 1}: ${price}`);
            }

            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: (item.title || item.name).substring(0, 100), // Stripe limit
                        description: `${item.brandName || ''} - ${item.color || ''} - ${item.sizeType || item.size || ''}`.trim().substring(0, 300), // Stripe limit
                        images: item.imageUrl ? [item.imageUrl] : [],
                        metadata: {
                            productId: (item.id?.toString() || '').substring(0, 500),
                            sku: (item.sku || '').substring(0, 500),
                            color: (item.color || '').substring(0, 500),
                            size: (item.sizeType || item.size || '').substring(0, 500)
                        }
                    },
                    unit_amount: unitAmount
                },
                quantity: Math.max(1, Math.floor(item.quantity || 1)) // Ensure positive integer
            };
        });

        // Validate total amount matches line items
        const calculatedTotal = lineItems.reduce((sum, item) => {
            return sum + (item.price_data.unit_amount * item.quantity);
        }, 0) / 100; // Convert back to dollars

        if (Math.abs(calculatedTotal - finalAmount) > 0.01) { // Allow for small rounding differences
            console.warn(`Amount mismatch: calculated ${calculatedTotal}, provided ${finalAmount}`);
        }

        // Create checkout session with enhanced error handling
        const sessionConfig = {
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            
            // Payment settings
            payment_intent_data: {
                capture_method: 'automatic',
                setup_future_usage: 'off_session',
                metadata: {
                    userId: (userId?.toString() || '').substring(0, 500),
                    appliedPoints: appliedPoints.toString(),
                    orderType: 'ecommerce',
                    timestamp: new Date().toISOString(),
                    ...Object.fromEntries(
                        Object.entries(metadata).map(([k, v]) => [k, String(v).substring(0, 500)])
                    )
                }
            },

            // Address collection
            billing_address_collection: 'required',
            shipping_address_collection: {
                allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE']
            },

            // Customer information
            customer_email: email,
            
            // URLs with fallback
            success_url: `${process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://brandsdiscounts.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://brandsdiscounts.com'}/checkout`,

            // Additional metadata
            metadata: {
                userId: (userId?.toString() || '').substring(0, 500),
                appliedPoints: appliedPoints.toString(),
                cartItemsCount: cartItems.length.toString(),
                originalAmount: (finalAmount + (appliedPoints / 100)).toString(),
                finalAmount: finalAmount.toString(),
                timestamp: new Date().toISOString()
            },

            // Automatic tax calculation
            automatic_tax: {
                enabled: false
            },

            // Expires in 24 hours
            expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        };

        const session = await stripe.checkout.sessions.create(sessionConfig);

        // Store session info in database for tracking
        try {
            const sessionData = {
                sessionId: session.id,
                amount: finalAmount,
                currency: 'usd',
                status: 'pending',
                appliedPoints: appliedPoints,
                cartItems: JSON.stringify(cartItems),
                shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : null,
                billingAddress: billingAddress ? JSON.stringify(billingAddress) : null,
                customerEmail: email // Store the actual email being used
            };

            // Add user relation if userId exists
            if (userId) {
                sessionData.user = {
                    connect: { id: userId }
                };
            }

            await prisma.stripeSession.create({
                data: sessionData
            });
        } catch (dbError) {
            console.error('Database error storing session:', dbError);
            // Continue anyway - don't fail the payment
        }

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('Stripe checkout session creation error:', error);
        
        // Handle different types of errors
        let statusCode = 500;
        let errorMessage = 'Failed to create checkout session';
        let errorCode = 'UNKNOWN_ERROR';

        if (error.type === 'StripeCardError') {
            statusCode = 400;
            errorMessage = 'Your card was declined. Please try a different payment method.';
            errorCode = 'CARD_DECLINED';
        } else if (error.type === 'StripeRateLimitError') {
            statusCode = 429;
            errorMessage = 'Too many requests. Please try again in a moment.';
            errorCode = 'RATE_LIMIT';
        } else if (error.type === 'StripeInvalidRequestError') {
            statusCode = 400;
            errorMessage = 'Invalid request parameters. Please check your cart and try again.';
            errorCode = 'INVALID_REQUEST';
        } else if (error.type === 'StripeAPIError') {
            statusCode = 502;
            errorMessage = 'Payment service temporarily unavailable. Please try again.';
            errorCode = 'API_ERROR';
        } else if (error.type === 'StripeConnectionError') {
            statusCode = 503;
            errorMessage = 'Network connection error. Please check your connection and try again.';
            errorCode = 'CONNECTION_ERROR';
        } else if (error.type === 'StripeAuthenticationError') {
            statusCode = 500;
            errorMessage = 'Payment configuration error. Please contact support.';
            errorCode = 'AUTH_ERROR';
        } else if (error.message && error.message.includes('Invalid price')) {
            statusCode = 400;
            errorMessage = 'Invalid product pricing. Please refresh your cart and try again.';
            errorCode = 'INVALID_PRICE';
        } else if (error.message && error.message.includes('email')) {
            statusCode = 400;
            errorMessage = 'Invalid email address. Please check your email and try again.';
            errorCode = 'INVALID_EMAIL';
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            code: errorCode,
            details: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                type: error.type,
                stack: error.stack
            } : undefined
        });
    }
});

/**
 * Get Session Status
 * GET /api/stripe/session-status/:sessionId
 */
router.get('/session-status/:sessionId', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({
                success: false,
                error: 'Stripe is not properly configured'
            });
        }

        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Session ID is required'
            });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // Also get from database if available
        let dbSession = null;
        try {
            dbSession = await prisma.stripeSession.findUnique({
                where: { sessionId }
            });
        } catch (dbError) {
            console.error('Database error retrieving session:', dbError);
        }

        res.json({
            success: true,
            session: {
                id: session.id,
                payment_status: session.payment_status,
                status: session.status,
                amount_total: session.amount_total,
                currency: session.currency,
                customer_email: session.customer_details?.email,
                customer_name: session.customer_details?.name,
                payment_intent: session.payment_intent,
                created: session.created,
                expires_at: session.expires_at
            },
            dbSession: dbSession ? {
                status: dbSession.status,
                appliedPoints: dbSession.appliedPoints,
                createdAt: dbSession.createdAt
            } : null
        });

    } catch (error) {
        console.error('Error retrieving session status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve session status',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Refund Payment
 * POST /api/stripe/refund
 * 
 * Enhanced refund endpoint with better validation, error handling,
 * and support for both payment intent and charge refunds
 */
router.post('/refund', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({
                success: false,
                error: 'Stripe is not properly configured'
            });
        }

        const { 
            paymentIntentId, 
            chargeId, 
            amount, 
            reason = 'requested_by_customer',
            orderId,
            refundApplicationFee = false,
            reverseTransfer = false
        } = req.body;

        // Validate that we have at least one identifier
        if (!paymentIntentId && !chargeId) {
            return res.status(400).json({
                success: false,
                error: 'Either Payment Intent ID or Charge ID is required'
            });
        }

        // Validate reason
        const validReasons = ['duplicate', 'fraudulent', 'requested_by_customer'];
        if (!validReasons.includes(reason)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid refund reason. Must be one of: duplicate, fraudulent, requested_by_customer'
            });
        }

        // Validate amount if provided
        if (amount !== undefined && amount !== null) {
            if (typeof amount !== 'number' || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Refund amount must be a positive number'
                });
            }
            if (amount > 999999.99) { // Reasonable upper limit
                return res.status(400).json({
                    success: false,
                    error: 'Refund amount exceeds maximum allowed'
                });
            }
        }

        // Build refund parameters
        const refundParams = {
            reason: reason,
            metadata: {
                requested_at: new Date().toISOString(),
                requested_by: 'admin_system'
            }
        };

        // Add amount if specified (convert to cents)
        if (amount !== undefined && amount !== null) {
            refundParams.amount = Math.round(amount * 100);
        }

        // Add payment identifier
        if (paymentIntentId) {
            refundParams.payment_intent = paymentIntentId;
        } else {
            refundParams.charge = chargeId;
        }

        // Add advanced parameters for connected accounts
        if (refundApplicationFee) {
            refundParams.refund_application_fee = true;
        }
        if (reverseTransfer) {
            refundParams.reverse_transfer = true;
        }

        // Create the refund
        const refund = await stripe.refunds.create(refundParams);

        // Log successful refund
        console.log('Refund created successfully:', {
            refundId: refund.id,
            amount: refund.amount / 100,
            currency: refund.currency,
            status: refund.status,
            paymentIntentId: paymentIntentId,
            chargeId: chargeId
        });

        // If orderId is provided, update order status in database
        if (orderId && refund.status === 'succeeded') {
            try {
                await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        status: 'refunded'
                    }
                });
                console.log(`Order ${orderId} marked as refunded`);
            } catch (dbError) {
                console.error('Error updating order status:', dbError);
                // Don't fail the refund if database update fails
            }
        }

        // Return comprehensive refund information
        res.json({
            success: true,
            refund: {
                id: refund.id,
                amount: refund.amount / 100,
                currency: refund.currency,
                status: refund.status,
                reason: refund.reason,
                created: refund.created,
                payment_intent: refund.payment_intent,
                charge: refund.charge,
                metadata: refund.metadata,
                failure_reason: refund.failure_reason,
                failure_balance_transaction: refund.failure_balance_transaction
            },
            message: refund.status === 'succeeded' 
                ? 'Refund processed successfully' 
                : `Refund is ${refund.status}`,
            next_steps: refund.status === 'failed' 
                ? 'Please contact Stripe support for assistance' 
                : refund.status === 'pending' 
                ? 'Refund is being processed and will appear in customer account within 5-10 business days'
                : 'Refund has been completed'
        });

    } catch (error) {
        console.error('Refund error:', error);
        
        // Handle specific Stripe errors
        let statusCode = 500;
        let errorMessage = 'Failed to process refund';
        let errorCode = 'REFUND_FAILED';

        if (error.type === 'StripeInvalidRequestError') {
            statusCode = 400;
            errorMessage = 'Invalid refund request. Please check the payment details.';
            errorCode = 'INVALID_REQUEST';
        } else if (error.type === 'StripeCardError') {
            statusCode = 400;
            errorMessage = 'Card error occurred during refund.';
            errorCode = 'CARD_ERROR';
        } else if (error.type === 'StripeRateLimitError') {
            statusCode = 429;
            errorMessage = 'Too many refund requests. Please try again later.';
            errorCode = 'RATE_LIMIT';
        } else if (error.code === 'charge_already_refunded') {
            statusCode = 400;
            errorMessage = 'This charge has already been fully refunded.';
            errorCode = 'ALREADY_REFUNDED';
        } else if (error.code === 'amount_too_large') {
            statusCode = 400;
            errorMessage = 'Refund amount exceeds the original charge amount.';
            errorCode = 'AMOUNT_TOO_LARGE';
        } else if (error.code === 'expired_charge') {
            statusCode = 400;
            errorMessage = 'This charge is too old to be refunded.';
            errorCode = 'CHARGE_EXPIRED';
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            code: errorCode,
            details: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                type: error.type,
                code: error.code,
                stack: error.stack
            } : undefined
        });
    }
});

/**
 * Get Refund Status
 * GET /api/stripe/refund-status/:refundId
 * 
 * Retrieve the current status of a refund
 */
router.get('/refund-status/:refundId', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({
                success: false,
                error: 'Stripe is not properly configured'
            });
        }

        const { refundId } = req.params;

        if (!refundId) {
            return res.status(400).json({
                success: false,
                error: 'Refund ID is required'
            });
        }

        const refund = await stripe.refunds.retrieve(refundId);

        res.json({
            success: true,
            refund: {
                id: refund.id,
                amount: refund.amount / 100,
                currency: refund.currency,
                status: refund.status,
                reason: refund.reason,
                created: refund.created,
                payment_intent: refund.payment_intent,
                charge: refund.charge,
                metadata: refund.metadata,
                failure_reason: refund.failure_reason,
                failure_balance_transaction: refund.failure_balance_transaction,
                description: getRefundStatusDescription(refund.status)
            }
        });

    } catch (error) {
        console.error('Refund status error:', error);
        
        let statusCode = 500;
        let errorMessage = 'Failed to retrieve refund status';

        if (error.type === 'StripeInvalidRequestError') {
            statusCode = 400;
            errorMessage = 'Invalid refund ID';
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * List Refunds for Payment Intent
 * GET /api/stripe/refunds/:paymentIntentId
 * 
 * Get all refunds for a specific payment intent
 */
router.get('/refunds/:paymentIntentId', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({
                success: false,
                error: 'Stripe is not properly configured'
            });
        }

        const { paymentIntentId } = req.params;
        const { limit = 10, starting_after } = req.query;

        if (!paymentIntentId) {
            return res.status(400).json({
                success: false,
                error: 'Payment Intent ID is required'
            });
        }

        // Validate limit
        const refundLimit = Math.min(Math.max(1, parseInt(limit) || 10), 100); // Between 1 and 100

        const refunds = await stripe.refunds.list({
            payment_intent: paymentIntentId,
            limit: refundLimit,
            starting_after: starting_after || undefined
        });

        res.json({
            success: true,
            refunds: refunds.data.map(refund => ({
                id: refund.id,
                amount: refund.amount / 100,
                currency: refund.currency,
                status: refund.status,
                reason: refund.reason,
                created: refund.created,
                metadata: refund.metadata,
                failure_reason: refund.failure_reason
            })),
            has_more: refunds.has_more,
            total_count: refunds.data.length
        });

    } catch (error) {
        console.error('List refunds error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve refunds',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Helper function to get refund status description
 */
function getRefundStatusDescription(status) {
    const descriptions = {
        'pending': 'Refund is being processed and will appear in customer account within 5-10 business days',
        'succeeded': 'Refund has been completed successfully',
        'failed': 'Refund failed to process. Please contact support',
        'canceled': 'Refund was canceled'
    };
    return descriptions[status] || 'Refund status unknown';
}

module.exports = router;