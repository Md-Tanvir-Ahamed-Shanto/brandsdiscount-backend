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

        // Validate required fields
        if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Cart items are required'
            });
        }

        if (!finalAmount || finalAmount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid final amount is required'
            });
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
            }
        }
        
        // Only use fallback if no email is available at all
        if (!email) {
            email = 'customer@brandsdiscounts.com';
        }

        // Prepare line items for Stripe
        const lineItems = cartItems.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.title || item.name,
                    description: item.description || `${item.brandName || ''} - ${item.color || ''} - ${item.sizeType || item.size || ''}`.trim(),
                    images: item.imageUrl ? [item.imageUrl] : [],
                    metadata: {
                        productId: item.id?.toString() || '',
                        sku: item.sku || '',
                        color: item.color || '',
                        size: item.sizeType || item.size || ''
                    }
                },
                unit_amount: Math.round((item.salePrice || item.price) * 100) // Convert to cents
            },
            quantity: item.quantity || 1
        }));

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            
            // Payment settings
            payment_intent_data: {
                capture_method: 'automatic',
                setup_future_usage: 'off_session', // For future payments
                metadata: {
                    userId: userId?.toString() || '',
                    appliedPoints: appliedPoints.toString(),
                    orderType: 'ecommerce',
                    ...metadata
                }
            },

            // Address collection
            billing_address_collection: 'required',
            shipping_address_collection: {
                allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE']
            },

            // Customer information
            customer_email: email, // Using validated email variable
            
            // URLs
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout`,

            // Additional metadata
            metadata: {
                userId: userId?.toString() || '',
                appliedPoints: appliedPoints.toString(),
                cartItemsCount: cartItems.length.toString(),
                originalAmount: (finalAmount + (appliedPoints / 100)).toString(), // Add back points for tracking
                finalAmount: finalAmount.toString()
            },

            // Automatic tax calculation (optional)
            automatic_tax: {
                enabled: false // Set to true if you want Stripe to calculate taxes
            },

            // Expires in 24 hours
            expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        });

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
        res.status(500).json({
            success: false,
            error: 'Failed to create checkout session',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
 */
router.post('/refund', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({
                success: false,
                error: 'Stripe is not properly configured'
            });
        }

        const { paymentIntentId, amount, reason = 'requested_by_customer' } = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({
                success: false,
                error: 'Payment Intent ID is required'
            });
        }

        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: amount ? Math.round(amount * 100) : undefined, // Partial refund if amount specified
            reason: reason
        });

        res.json({
            success: true,
            refund: {
                id: refund.id,
                amount: refund.amount / 100,
                currency: refund.currency,
                status: refund.status,
                reason: refund.reason
            }
        });

    } catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process refund',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;