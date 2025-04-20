import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, OnDestroy, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { CheckoutService } from '../../services/checkout/checkout.service';
import { AuthService } from '../../services/auth/auth.service';

declare var Stripe: any;

@Component({
  selector: 'app-payment',
  standalone: false,
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css']
})
export class PaymentComponent implements OnInit, OnDestroy {
  @Input() amount: number = 0;
  @Input() currency: string = 'inr';
  @Input() orderId: number | null = null;
  @Input() email: string = '';
  
  @Output() paymentComplete = new EventEmitter<{ success: boolean, paymentIntentId?: string, error?: string }>();
  
  @ViewChild('cardElement') cardElement!: ElementRef;

  private stripe: any;
  private card: any;
  private clientSecret: string = '';
  private paymentIntentId: string = '';
  
  name: string = '';
  saveCard: boolean = false;
  cardComplete: boolean = false;
  cardError: string = '';
  isProcessing: boolean = false;
  paymentSuccess: boolean = false;
  paymentError: boolean = false;
  paymentErrorMessage: string = '';

  constructor(
    private checkoutService: CheckoutService,
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    console.log('Payment component initialized with amount:', this.amount, 'for order:', this.orderId);
    
    // Fetch the publishable key from backend and initialize Stripe
    this.checkoutService.getStripeConfig().subscribe({
      next: (config) => {
        console.log('Received Stripe config:', config);
        // Use a timeout to ensure the DOM is fully loaded
        setTimeout(() => {
          this.initializeStripe(config.publishableKey);
        }, 500);
      },
      error: (error) => {
        console.error('Error fetching Stripe config:', error);
        this.showError('Failed to initialize payment system. Please try again later.');
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up Stripe elements
    if (this.card) {
      this.card.destroy();
    }
  }

  private initializeStripe(publishableKey: string): void {
    try {
      console.log('Initializing Stripe with key:', publishableKey);
      // Initialize Stripe with your publishable key
      this.stripe = Stripe(publishableKey);
  
      // Create card element
      const elements = this.stripe.elements();
      this.card = elements.create('card', {
        style: {
          base: {
            color: '#32325d',
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
              color: '#aab7c4'
            }
          },
          invalid: {
            color: '#fa755a',
            iconColor: '#fa755a'
          }
        }
      });
  
      console.log('Card element created');
  
      // Mount the card element only if element is available
      this.ngZone.runOutsideAngular(() => {
        if (this.cardElement && this.cardElement.nativeElement) {
          console.log('Mounting card element to DOM');
          this.card.mount(this.cardElement.nativeElement);
  
          // Listen for changes in the card element
          this.card.on('change', (event: any) => {
            this.ngZone.run(() => {
              console.log('Card input changed:', event.complete ? 'complete' : 'incomplete');
              this.cardComplete = event.complete;
              this.cardError = event.error ? event.error.message : '';
            });
          });
        } else {
          console.error('Card element not found in DOM');
          this.ngZone.run(() => {
            this.showError('Payment form could not be loaded. Please refresh and try again.');
          });
        }
      });
  
      // Create a payment intent if we have an order ID
      if (this.orderId) {
        console.log('Creating payment intent for order:', this.orderId);
        this.createPaymentIntent();
      } else {
        console.error('No order ID provided to payment component');
        this.showError('Order information missing. Please try again.');
      }
    } catch (error) {
      console.error('Error during Stripe initialization:', error);
      this.showError('Payment system initialization failed. Please refresh and try again.');
    }
  }

  private createPaymentIntent(): void {
    const user = this.authService.getCurrentUser();
    if (!user || !user.userId) {
      console.error('User not found during payment intent creation');
      this.showError('User not found. Please log in again.');
      return;
    }
  
    console.log('Creating payment intent with amount:', this.amount);
    const paymentIntentRequest = {
      orderId: this.orderId,
      amount: Math.round(this.amount * 100), // Convert to cents/paise as required by Stripe
      currency: this.currency.toLowerCase(),
      userId: user.userId,
      receiptEmail: this.email || user.email
    };
  
    this.checkoutService.createPaymentIntent(paymentIntentRequest).subscribe({
      next: (response) => {
        console.log('Payment intent created successfully:', response);
        if (response && response.success) {
          this.clientSecret = response.clientSecret;
          this.paymentIntentId = response.paymentIntentId;
          console.log('Ready for payment confirmation with client secret');
        } else {
          console.error('Payment intent creation failed:', response);
          this.showError(response.message || 'Failed to initialize payment. Please try again.');
        }
      },
      error: (error) => {
        console.error('Error creating payment intent:', error);
        this.showError('Failed to initialize payment. Please try again.');
      }
    });
  }

  processPayment(): void {
    console.log('Processing payment...');
    
    if (!this.cardComplete) {
      console.error('Card details incomplete');
      this.showError('Please complete card details.');
      return;
    }
    
    if (!this.clientSecret) {
      console.error('Client secret missing');
      this.showError('Payment not initialized properly. Please refresh and try again.');
      return;
    }
  
    // Validate cardholder name
    if (!this.name || this.name.trim() === '') {
      console.error('Cardholder name is required');
      this.showError('Cardholder name is required.');
      return;
    }
  
    this.isProcessing = true;
    console.log('Confirming card payment with Stripe...');
  
    this.stripe.confirmCardPayment(this.clientSecret, {
      payment_method: {
        card: this.card,
        billing_details: {
          name: this.name,
          email: this.email
        }
      },
      setup_future_usage: this.saveCard ? 'off_session' : undefined
    }).then((result: any) => {
      this.ngZone.run(() => {
        console.log('Payment confirmation result:', result);
        this.isProcessing = false;
    
        if (result.error) {
          // Show error to customer
          console.error('Payment error:', result.error);
          this.showError(result.error.message || 'Payment processing failed');
        } else {
          // The payment succeeded
          if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
            console.log('Payment succeeded!');
            this.paymentSuccess = true;
            this.paymentComplete.emit({
              success: true,
              paymentIntentId: result.paymentIntent.id
            });
          } else {
            console.error('Payment not succeeded, status:', result.paymentIntent?.status);
            this.showError('Payment processing failed. Please try again.');
          }
        }
      });
    }).catch((error: any) => {
      this.ngZone.run(() => {
        console.error('Exception during payment processing:', error);
        this.isProcessing = false;
        this.showError('Payment processing failed. Please try again.');
      });
    });
  }

  showError(message: string): void {
    this.ngZone.run(() => {
      this.paymentError = true;
      this.paymentErrorMessage = message;
      this.paymentComplete.emit({
        success: false,
        error: message
      });
    });
  }

  resetPayment(): void {
    this.paymentError = false;
    this.paymentErrorMessage = '';
    this.isProcessing = false;
    
    // Re-create the payment intent
    if (this.orderId) {
      this.createPaymentIntent();
    }
  }

  navigateToOrderConfirmation(): void {
    this.router.navigate(['/order-confirmation'], { 
      queryParams: { orderId: this.orderId }
    });
  }
}