const express = require('express');
const router = express.Router();

// Initialize Stripe
let stripe;
try {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} catch (error) {
    console.error('Stripe initialization error:', error.message);
}

const { prisma } = require('../db/connection');
const { sendOrderConfirmationEmail } = require('../utils/emailSender');

// Webhook endpoint secret
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Stripe Webhook Handler
 * POST /webhook/stripe
 * 
 * This endpoint handles Stripe webhook events for payment confirmation
 * and order processing. It must be registered in your Stripe dashboard.
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        if (!stripe) {
            console.error('Stripe not initialized');
            return res.status(500).send('Stripe not configured');
        }

        if (!endpointSecret) {
            console.error('Stripe webhook secret not configured');
            return res.status(500).send('Webhook secret not configured');
        }

        // Verify webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('Received Stripe webhook event:', event.type);

    try {
        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(event.data.object);
                break;

            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event.data.object);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event.data.object);
                break;

            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(event.data.object);
                break;

            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;

            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

/**
 * Handle successful checkout session completion
 */
async function handleCheckoutSessionCompleted(session) {
    console.log('Processing checkout session completed:', session.id);

    try {
        // Update session status in database
        await prisma.stripeSession.update({
            where: { sessionId: session.id },
            data: {
                status: 'completed',
                paymentIntentId: session.payment_intent,
                customerEmail: session.customer_details?.email,
                customerName: session.customer_details?.name,
                completedAt: new Date()
            }
        });

        // Get session details from database
        const dbSession = await prisma.stripeSession.findUnique({
            where: { sessionId: session.id }
        });

        if (!dbSession) {
            console.error('Session not found in database:', session.id);
            return;
        }

        // Note: Order creation is handled by the frontend success page
        // The webhook only updates the session status and handles stock/points
        // This prevents duplicate order creation
        
        const cartItems = JSON.parse(dbSession.cartItems);

        // Update product stock
        for (const item of cartItems) {
            try {
                await prisma.product.update({
                    where: { id: item.id },
                    data: {
                        stockQuantity: {
                            decrement: item.quantity || 1
                        }
                    }
                });

                // Update variant stock if applicable
                if (item.variantId) {
                    await prisma.productVariant.update({
                        where: { id: item.variantId },
                        data: {
                            quantity: {
                                decrement: item.quantity || 1
                            }
                        }
                    });
                }
            } catch (stockError) {
                console.error('Error updating stock for product:', item.id, stockError);
            }
        }

        // Deduct loyalty points if used
        if (dbSession.appliedPoints > 0 && dbSession.userId) {
            try {
                await prisma.user.update({
                    where: { id: dbSession.userId },
                    data: {
                        orderPoint: {
                            decrement: dbSession.appliedPoints
                        }
                    }
                });
            } catch (pointsError) {
                console.error('Error deducting loyalty points:', pointsError);
            }
        }

        // Send order confirmation email
        if (session.customer_details?.email) {
            try {
                await sendOrderConfirmationEmail({
                    email: session.customer_details.email,
                    customerName: session.customer_details.name,
                    orderId: session.id, // Use session ID as order reference
                    orderItems: cartItems,
                    totalAmount: dbSession.amount,
                    appliedPoints: dbSession.appliedPoints
                });
            } catch (emailError) {
                console.error('Error sending confirmation email:', emailError);
            }
        }

        console.log('Payment processing completed for session:', session.id);

    } catch (error) {
        console.error('Error processing checkout session completion:', error);
        throw error;
    }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
    console.log('Payment intent succeeded:', paymentIntent.id);

    try {
        // Update any relevant records
        await prisma.stripeSession.updateMany({
            where: { paymentIntentId: paymentIntent.id },
            data: {
                status: 'payment_succeeded',
                updatedAt: new Date()
            }
        });

        // Add any additional logic for successful payments
        console.log('Payment intent processing completed');

    } catch (error) {
        console.error('Error processing payment intent success:', error);
        throw error;
    }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent) {
    console.log('Payment intent failed:', paymentIntent.id);

    try {
        // Update session status
        await prisma.stripeSession.updateMany({
            where: { paymentIntentId: paymentIntent.id },
            data: {
                status: 'payment_failed',
                failureReason: paymentIntent.last_payment_error?.message,
                updatedAt: new Date()
            }
        });

        // Send failure notification email if needed
        console.log('Payment failure processed');

    } catch (error) {
        console.error('Error processing payment intent failure:', error);
        throw error;
    }
}

/**
 * Handle subscription events (for future use)
 */
async function handleInvoicePaymentSucceeded(invoice) {
    console.log('Invoice payment succeeded:', invoice.id);
    // Handle subscription payments
}

async function handleSubscriptionCreated(subscription) {
    console.log('Subscription created:', subscription.id);
    // Handle new subscriptions
}

async function handleSubscriptionUpdated(subscription) {
    console.log('Subscription updated:', subscription.id);
    // Handle subscription changes
}

async function handleSubscriptionDeleted(subscription) {
    console.log('Subscription deleted:', subscription.id);
    // Handle subscription cancellations
}

module.exports = router;