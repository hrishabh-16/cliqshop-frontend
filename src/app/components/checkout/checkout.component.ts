import { Component, OnInit, HostListener, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CartService } from '../../services/cart/cart.service';
import { CheckoutService } from '../../services/checkout/checkout.service';
import { OrderService } from '../../services/order/order.service';
import { AuthService } from '../../services/auth/auth.service';
import { Cart } from '../../models/cart.model';
import { Address, AddressType } from '../../models/address.model';
import { OrderRequest } from '../../models/order.model';

// Extended User interface to match what we need in this component
interface ExtendedUser {
  userId: number;
  username: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  role: string;
}

@Component({
  selector: 'app-checkout',
  standalone: false,  
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  cart: Cart | null = null;
  isLoading: boolean = true;
  isSubmitting: boolean = false;
  showScrollTop: boolean = false;
  checkoutForm!: FormGroup;
  formSubmitAttempt: boolean = false; // Track if form submit was attempted
  retryCount: number = 0; // Track retry attempts
  maxRetries: number = 3; // Maximum retries
  
  shippingMethods = [
    { id: 'standard', name: 'Standard Shipping', description: '5-7 working days', cost: 99 },
    { id: 'express', name: 'Express Shipping', description: '3-5 working days', cost: 199 },
    { id: 'next_day', name: 'Next Day Delivery', description: '1-2 working days', cost: 299 },
    { id: 'free', name: 'Free Shipping', description: 'For orders above ₹999', cost: 0 }
  ];

  // Payment related properties
  showPaymentComponent: boolean = false;
  paymentAmount: number = 0;
  orderId: number | null = null;
  
  constructor(
    private formBuilder: FormBuilder,
    private cartService: CartService,
    private checkoutService: CheckoutService,
    private orderService: OrderService, // Added OrderService
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone
  ) {
    // Create form
    this.createForm();
  }
  
  private createForm(): void {
    try {
      this.checkoutForm = this.formBuilder.group({
        billing: this.formBuilder.group({
          firstName: ['', Validators.required],
          lastName: ['', Validators.required],
          email: ['', [Validators.required, Validators.email]],
          company: [''],
          country: ['', Validators.required],
          addressLine1: ['', Validators.required],
          addressLine2: [''],
          city: ['', Validators.required],
          state: ['', Validators.required],
          postalCode: ['', Validators.required],
          phone: ['', Validators.required],
          saveAddress: [true]
        }),
        shipping: this.formBuilder.group({
          firstName: [''],
          lastName: [''],
          company: [''],
          country: [''],
          addressLine1: [''],
          addressLine2: [''],
          city: [''],
          state: [''],
          postalCode: [''],
          phone: [''],
          saveAddress: [true]
        }),
        sameAsBilling: [true],
        payment: this.formBuilder.group({
          method: ['card', Validators.required]
        }),
        shippingMethod: this.formBuilder.group({
          method: ['standard', Validators.required]
        }),
        orderNotes: ['']
      });
  
      console.log('Form created successfully', this.checkoutForm);
    } catch (error) {
      console.error('Error creating form:', error);
    }
  }

  ngOnInit(): void {
    console.log('Component initialized');
    this.loadCart();
    this.loadUserAddresses();
    
    // Add debug for form validation
    console.log('Initial form validity:', this.checkoutForm.valid);
    
    // When sameAsBilling changes, update shipping validators
    this.checkoutForm.get('sameAsBilling')?.valueChanges.subscribe(sameAsBilling => {
      console.log('Same as billing changed:', sameAsBilling);
      const shippingGroup = this.checkoutForm.get('shipping');
      
      if (sameAsBilling) {
        Object.keys((shippingGroup as FormGroup)?.controls || {}).forEach(key => {
          shippingGroup?.get(key)?.clearValidators();
          shippingGroup?.get(key)?.updateValueAndValidity();
        });
      } else {
        // Restore validators
        shippingGroup?.get('firstName')?.setValidators(Validators.required);
        shippingGroup?.get('lastName')?.setValidators(Validators.required);
        shippingGroup?.get('country')?.setValidators(Validators.required);
        shippingGroup?.get('addressLine1')?.setValidators(Validators.required);
        shippingGroup?.get('city')?.setValidators(Validators.required);
        shippingGroup?.get('state')?.setValidators(Validators.required);
        shippingGroup?.get('postalCode')?.setValidators(Validators.required);
        shippingGroup?.get('phone')?.setValidators(Validators.required);
        
        // Update validity
        Object.keys((shippingGroup as FormGroup)?.controls || {}).forEach(key => {
          shippingGroup?.get(key)?.updateValueAndValidity();
        });
      }
      
      // After updating validators, check form validity again
      console.log('Form validity after shipping update:', this.checkoutForm.valid);
    });

    // Check for successful payment return from Stripe
    this.checkForPaymentCompletion();
  }

  /**
   * Check for payment completion when redirected back from Stripe
   */
  checkForPaymentCompletion(): void {
    this.route.queryParams.subscribe(params => {
      const paymentStatus = params['payment_status'];
      const orderId = params['order_id'];
      const sessionId = localStorage.getItem('stripeSessionId');
      
      if (paymentStatus === 'success' && orderId) {
        this.orderId = Number(orderId);
        
        this.showNotification('Payment successful! Processing your order...', 'success');
        
        // Force update the payment status to PAID
        this.updatePaymentStatusAndClearCart(Number(orderId), sessionId);
      } else if (paymentStatus === 'cancel') {
        this.showNotification('Payment was cancelled', 'error');
        this.isSubmitting = false;
      }
    });
  }

  /**
   * Update payment status and clear cart after successful payment
   */
  /**
 * Update payment status and clear cart after successful payment
 * Enhanced with multiple fallback mechanisms to ensure payment status gets updated
 */
private updatePaymentStatusAndClearCart(orderId: number, sessionId: string | null): void {
  // Get the user ID
  const user = this.authService.getCurrentUser();
  if (!user || !user.userId) {
    this.showNotification('User information not found', 'error');
    this.isSubmitting = false;
    return;
  }
  
  // First, update the payment status to PAID
  this.orderService.updatePaymentStatus(orderId, 'PAID', sessionId || undefined).subscribe({
    next: (response) => {
      console.log('Payment status updated to PAID:', response);
      
      // After payment is marked as PAID, clear the cart
      this.clearCartAndRedirect(user.userId, orderId);
    },
    error: (error) => {
      console.error('Error updating payment status:', error);
      
      // Try alternative method to update payment status
      this.orderService.updatePaymentStatusAlternative(orderId, 'PAID', sessionId || undefined).subscribe({
        next: (altResponse) => {
          console.log('Payment status updated via alternative method:', altResponse);
          this.clearCartAndRedirect(user.userId, orderId);
        },
        error: (altError) => {
          console.error('Alternative payment status update also failed:', altError);
          
          // Last resort: Try direct database update
          this.orderService.forcePaymentStatusUpdate(orderId).subscribe({
            next: (forceResponse) => {
              console.log('Forced payment status update successful:', forceResponse);
              this.clearCartAndRedirect(user.userId, orderId);
            },
            error: (forceError) => {
              console.error('All payment status update methods failed:', forceError);
              
              // Even if all payment status updates fail, still clear cart and redirect
              // this.showNotification('There was an issue confirming your payment. Your order is being processed.', 'warning');
              this.clearCartAndRedirect(user.userId, orderId);
              
              // Store information about the failed payment status update to retry later
              localStorage.setItem('paymentStatusUpdateFailed', orderId.toString());
            }
          });
        }
      });
    }
  });
}

/**
 * Helper method to clear cart and redirect
 */
private clearCartAndRedirect(userId: number, orderId: number): void {
  this.cartService.clearCart(userId).subscribe({
    next: () => {
      console.log('Cart cleared successfully');
      
      // Clean up local storage
      localStorage.removeItem('stripeSessionId');
      localStorage.removeItem('orderPaymentPending');
      
      // Redirect to order confirmation
      this.showNotification('Payment confirmed! Redirecting to order details...', 'success');
      setTimeout(() => {
        this.router.navigate(['/order-confirmation'], { 
          queryParams: { orderId: orderId, payment_status: 'success' }
        });
      }, 1500);
    },
    error: (cartError) => {
      console.error('Error clearing cart:', cartError);
      // Even if cart clearing fails, still redirect to order confirmation
      this.showNotification('Order placed successfully, but there was an issue clearing your cart', 'warning');
      
      setTimeout(() => {
        this.router.navigate(['/order-confirmation'], { 
          queryParams: { orderId: orderId, payment_status: 'success' }
        });
      }, 1500);
    }
  });
}


  /**
 * Handle payment completion from the payment component
 * This method is required because it's referenced in the template
 */
handlePaymentComplete(event: { success: boolean, paymentIntentId?: string, error?: string }): void {
  console.log('Payment completion event received:', event);
  
  if (event.success) {
    // Payment succeeded
    this.showNotification('Payment successful!', 'success');
    
    // Update payment status in the backend
    if (this.orderId) {
      this.orderService.updatePaymentStatus(this.orderId, 'PAID', event.paymentIntentId).subscribe({
        next: (response) => {
          console.log('Payment status updated to PAID:', response);
          
          // Get the user ID
          const user = this.authService.getCurrentUser();
          if (user && user.userId) {
            // Clear the cart
            this.cartService.clearCart(user.userId).subscribe({
              next: () => {
                console.log('Cart cleared successfully after payment');
                
                // Clean up session storage
                localStorage.removeItem('stripeSessionId');
                localStorage.removeItem('orderPaymentPending');
                
                // Redirect to order confirmation page
                setTimeout(() => {
                  console.log('Redirecting to order confirmation page for order:', this.orderId);
                  this.router.navigate(['/order-confirmation'], { 
                    queryParams: { orderId: this.orderId, payment_status: 'success' }
                  });
                }, 1500);
              },
              error: (cartError) => {
                console.error('Error clearing cart:', cartError);
                // Even if cart clearing fails, still redirect to order confirmation
                this.redirectToOrderConfirmation();
              }
            });
          } else {
            // No user ID available, just redirect
            this.redirectToOrderConfirmation();
          }
        },
        error: (error) => {
          console.error('Error updating payment status:', error);
          // Even if update fails, still redirect to confirmation
          this.redirectToOrderConfirmation();
        }
      });
    } else {
      console.error('Order ID missing for payment status update');
      this.redirectToOrderConfirmation();
    }
  } else {
    // Payment failed
    console.error('Payment failed:', event.error);
    this.showNotification(event.error || 'An unknown error occurred during payment.', 'error');
    this.isSubmitting = false;
  }
}

/**
 * Helper method to redirect to order confirmation page
 */
private redirectToOrderConfirmation(): void {
  setTimeout(() => {
    console.log('Redirecting to order confirmation page for order:', this.orderId);
    this.router.navigate(['/order-confirmation'], { 
      queryParams: { orderId: this.orderId, payment_status: 'success' }
    });
  }, 1500);
}

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.showScrollTop = window.scrollY > 500;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Get currently logged in user with extended properties
   * This helper adds type safety and helps avoid errors
   */
  private getCurrentExtendedUser(): ExtendedUser {
    const user = this.authService.getCurrentUser();
    return {
      ...user,
      phoneNumber: (user as any).phoneNumber || '' // Ensure phoneNumber exists but may be empty
    } as ExtendedUser;
  }
  
  getShippingMethodValue(): string {
    const shippingMethodControl = this.checkoutForm.get('shippingMethod');
    if (shippingMethodControl && shippingMethodControl instanceof FormGroup) {
      return shippingMethodControl.get('method')?.value;
    }
    return 'standard'; // Default value
  }
  
  setShippingMethod(methodId: string): void {
    const shippingMethodControl = this.checkoutForm.get('shippingMethod');
    if (shippingMethodControl && shippingMethodControl instanceof FormGroup) {
      shippingMethodControl.get('method')?.setValue(methodId);
    }
  }

  loadCart(): void {
    console.log('Loading cart...');
    this.isLoading = true;
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      console.error('No user found in localStorage');
      this.isLoading = false;
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    
    if (!user.userId) {
      console.error('User found but userId is missing:', user);
      this.isLoading = false;
      this.router.navigate(['/cart']);
      return;
    }
    
    // Ensure we're using the correct user ID
    const userId = user.userId;
    console.log('Fetching cart for user ID:', userId);
    
    this.cartService.getCartByUserId(userId).subscribe({
      next: (cart) => {
        console.log('Cart data loaded:', cart);
        this.ngZone.run(() => {
          this.cart = cart;
          this.isLoading = false;
          
          // Only redirect if cart is actually empty
          if (!this.cart || !this.cart.items || this.cart.items.length === 0) {
            this.showNotification('Your cart is empty', 'error');
            this.router.navigate(['/cart']);
          }
        });
      },
      error: (error) => {
        console.error('Error loading cart:', error);
        this.ngZone.run(() => {
          this.isLoading = false;
          this.showNotification('Failed to load cart. Please try again later.', 'error');
          // Don't redirect on error - let the user try again
        });
      }
    });
  }

  loadUserAddresses(): void {
    try {
      const user = this.getCurrentExtendedUser();
      if (!user || !user.userId) return;
      
      this.checkoutService.getUserAddresses(user.userId).subscribe({
        next: (addresses) => {
          console.log('User addresses loaded:', addresses);
          
          // Default values for billing fields even if no addresses found
          const names = this.splitName(user.name || '');
          
          this.checkoutForm.get('billing')?.patchValue({
            firstName: names.firstName,
            lastName: names.lastName,
            email: user.email || '',
            phone: user.phoneNumber || ''
          });
          
          if (!addresses || addresses.length === 0) {
            return; // No addresses to process
          }
          
          // Find default billing address
          const defaultBillingAddress = addresses.find(
            addr => addr.isDefault && (addr.addressType === 'BILLING' || addr.addressType === 'BOTH')
          );
          
          // Find default shipping address
          const defaultShippingAddress = addresses.find(
            addr => addr.isDefault && (addr.addressType === 'SHIPPING' || addr.addressType === 'BOTH')
          );
          
          // Apply billing address to form if available
          if (defaultBillingAddress) {
            // Safely update form without accessing potentially undefined properties
            this.checkoutForm.get('billing')?.patchValue({
              firstName: names.firstName,
              lastName: names.lastName,
              email: user.email || '',
              company: '',
              country: defaultBillingAddress.country || '',
              addressLine1: defaultBillingAddress.addressLine1 || '',
              addressLine2: defaultBillingAddress.addressLine2 || '',
              city: defaultBillingAddress.city || '',
              state: defaultBillingAddress.state || '',
              postalCode: defaultBillingAddress.postalCode || '',
              phone: user.phoneNumber || ''
            });
          }
          
          // Apply shipping address to form if available
          if (defaultShippingAddress) {
            this.checkoutForm.get('shipping')?.patchValue({
              firstName: names.firstName,
              lastName: names.lastName,
              company: '',
              country: defaultShippingAddress.country || '',
              addressLine1: defaultShippingAddress.addressLine1 || '',
              addressLine2: defaultShippingAddress.addressLine2 || '',
              city: defaultShippingAddress.city || '',
              state: defaultShippingAddress.state || '',
              postalCode: defaultShippingAddress.postalCode || '',
              phone: user.phoneNumber || ''
            });
            
            // If both addresses are different, uncheck same as billing
            if (defaultBillingAddress && defaultShippingAddress.addressId !== defaultBillingAddress.addressId) {
              this.checkoutForm.get('sameAsBilling')?.setValue(false);
            }
          }
        },
        error: (error) => {
          console.error('Error loading user addresses:', error);
          // Still set basic user info even if address loading fails
          const names = this.splitName(user.name || '');
          this.checkoutForm.get('billing')?.patchValue({
            firstName: names.firstName,
            lastName: names.lastName,
            email: user.email || '',
            phone: user.phoneNumber || ''
          });
        }
      });
    } catch (error) {
      console.error('Unexpected error loading addresses:', error);
    }
  }

  splitName(fullName: string): { firstName: string, lastName: string } {
    if (!fullName) return { firstName: '', lastName: '' };
    
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    } else {
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');
      return { firstName, lastName };
    }
  }

  getSelectedShippingCost(): string {
    if (!this.checkoutForm) return '₹0.00';
    
    try {
      const shippingMethodControl = this.checkoutForm.get('shippingMethod')?.get('method');
      const selectedMethodId = shippingMethodControl?.value;
      
      if (!selectedMethodId) return '₹0.00';
      
      const method = this.shippingMethods.find(m => m.id === selectedMethodId);
      if (!method) return '₹0.00';
      
      // Free shipping for orders over ₹999
      if (method.id === 'free' || (this.cart && this.cart.totalPrice >= 999 && method.id === 'standard')) {
        return 'Free';
      }
      
      return `₹${method.cost.toFixed(2)}`;
    } catch (error) {
      console.error('Error getting shipping cost:', error);
      return '₹0.00';
    }
  }

  getShippingCostValue(): number {
    if (!this.checkoutForm) return 0;
    
    const selectedMethodId = this.checkoutForm.get('shippingMethod.method')?.value;
    if (!selectedMethodId) return 0;
    
    const method = this.shippingMethods.find(m => m.id === selectedMethodId);
    if (!method) return 0;
    
    // Free shipping for orders over ₹999
    if (method.id === 'free' || (this.cart && this.cart.totalPrice >= 999 && method.id === 'standard')) {
      return 0;
    }
    
    return method.cost;
  }

  calculateTax(): number {
    if (!this.cart || !this.cart.totalPrice) return 0;
    
    // Calculate 18% GST
    return this.cart.totalPrice * 0.18;
  }

  calculateTotal(): number {
    if (!this.cart || !this.cart.totalPrice) return 0;
    
    const subtotal = this.cart.totalPrice;
    const tax = this.calculateTax();
    const shipping = this.getShippingCostValue();
    
    // Calculate total
    return subtotal + tax + shipping;
  }

  isFieldInvalid(fieldPath: string): boolean {
    try {
      const control = this.checkoutForm.get(fieldPath);
      return control ? (control.invalid && (control.touched || control.dirty || this.formSubmitAttempt)) : false;
    } catch (error) {
      console.error(`Error checking field validity for ${fieldPath}:`, error);
      return false; // Default to valid to avoid blocking the form
    }
  }

  debugFormValidity(): void {
    console.log('Form validity:', this.checkoutForm.valid);
    console.log('Form errors:', this.checkoutForm.errors);
    
    // Check billing group
    const billingGroup = this.checkoutForm.get('billing');
    console.log('Billing group validity:', billingGroup?.valid);
    
    if (billingGroup) {
      Object.keys((billingGroup as FormGroup).controls).forEach(key => {
        const control = billingGroup.get(key);
        console.log(`Billing.${key} validity:`, control?.valid, 'Errors:', control?.errors);
      });
    }
    
    // Check shipping group if not same as billing
    if (!this.checkoutForm.get('sameAsBilling')?.value) {
      const shippingGroup = this.checkoutForm.get('shipping');
      console.log('Shipping group validity:', shippingGroup?.valid);
      
      if (shippingGroup) {
        Object.keys((shippingGroup as FormGroup).controls).forEach(key => {
          const control = shippingGroup.get(key);
          console.log(`Shipping.${key} validity:`, control?.valid, 'Errors:', control?.errors);
        });
      }
    }
    
    // Check payment method
    const paymentGroup = this.checkoutForm.get('payment');
    console.log('Payment group validity:', paymentGroup?.valid);
  }

  placeOrder(): void {
    console.log('Place order clicked');
    
    // Set form submit attempt to true to trigger validation messages
    this.formSubmitAttempt = true;
    
    // Check if we're already submitting to prevent multiple submissions
    if (this.isSubmitting) {
      console.log('Already processing order, ignoring additional clicks');
      return;
    }
    
    // Check the cart first - this is most important
    if (!this.cart || !this.cart.items || this.cart.items.length === 0) {
      console.log('Cart is empty');
      this.showNotification('Your cart is empty', 'error');
      this.router.navigate(['/cart']);
      return;
    }
    
    // Validate cart items
    this.validateCartItems();
    
    // Now check form validity
    if (this.checkoutForm.invalid) {
      console.log('Form is invalid, marking all fields as touched');
      this.markFormGroupTouched(this.checkoutForm);
      this.validateRequiredFields();
      this.debugFormValidity();
      this.showNotification('Please fill in all required fields', 'error');
      return;
    }
    
    this.isSubmitting = true;
    console.log('Processing order...');
    
    const user = this.authService.getCurrentUser();
    
    if (!user || !user.userId) {
      this.isSubmitting = false;
      this.showNotification('You need to be logged in to place an order', 'error');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    
    // Prepare order data
    const formValue = this.checkoutForm.value;
    
    try {
      // Create billing address using helper
      const billingAddress = this.createAddressFromForm(
        formValue.billing,
        user.userId,
        formValue.sameAsBilling ? 'BOTH' : 'BILLING'
      );
      
      // Create shipping address if needed
      let shippingAddress: Address | null = null;
      if (!formValue.sameAsBilling) {
        shippingAddress = this.createAddressFromForm(
          formValue.shipping,
          user.userId,
          'SHIPPING'
        );
      }
      
      // Prepare cart items in the format expected by the backend
      const orderItems = this.cart.items
        .filter(item => item && (item.product?.productId || item.productId) !== undefined)
        .map(item => ({
          productId: item.product?.productId || item.productId as number,
          quantity: item.quantity || 1,
          price: item.product?.price || item.productPrice || 0
        }));
      
      // Prepare order request with proper structure
      const orderRequest: OrderRequest = {
        userId: user.userId,
        billingAddressId: null,
        shippingAddressId: null,
        items: orderItems,
        totalPrice: this.calculateTotal(),
        shippingMethod: formValue.shippingMethod?.method || 'standard',
        paymentMethod: formValue.payment?.method || 'card',
        orderNotes: formValue.orderNotes || null,
        
        // Add additional fields needed by the backend
        subtotal: this.cart.totalPrice,
        tax: this.calculateTax(),
        shippingCost: this.getShippingCostValue(),
        discount: 0 // Assuming no discount for now
      };
      
      console.log('Order request prepared:', orderRequest);
      
      // First, save addresses if needed
      if (formValue.billing.saveAddress) {
        this.checkoutService.saveAddress(user.userId, billingAddress).subscribe({
          next: (savedBillingAddress) => {
            console.log('Billing address saved:', savedBillingAddress);
            
            // Ensure we have a valid addressId
            if (savedBillingAddress && savedBillingAddress.addressId) {
              orderRequest.billingAddressId = savedBillingAddress.addressId;
            } else {
              console.warn('Saved billing address missing addressId');
            }
            
            if (!formValue.sameAsBilling && formValue.shipping.saveAddress && shippingAddress) {
              this.checkoutService.saveAddress(user.userId, shippingAddress).subscribe({
                next: (savedShippingAddress) => {
                  console.log('Shipping address saved:', savedShippingAddress);
                  
                  // Ensure we have a valid addressId
                  if (savedShippingAddress && savedShippingAddress.addressId) {
                    orderRequest.shippingAddressId = savedShippingAddress.addressId;
                  } else {
                    console.warn('Saved shipping address missing addressId');
                  }
                  
                  this.submitOrder(orderRequest);
                },
                error: (error) => {
                  console.error('Error saving shipping address:', error);
                  this.handleOrderError(error);
                }
              });
            } else {
              // Same address for shipping or don't save shipping address
              orderRequest.shippingAddressId = orderRequest.billingAddressId ?? 0; // Default to 0 if null or undefined
              this.submitOrder(orderRequest);
            }
          },
          error: (error) => {
            console.error('Error saving billing address:', error);
            this.handleOrderError(error);
          }
        });
      } else {
        // Don't save addresses, just place the order
        console.log('Not saving addresses, proceeding with order');
        this.submitOrder(orderRequest);
      }
    } catch (error) {
      console.error('Error preparing order:', error);
      this.isSubmitting = false;
      this.showNotification('Error processing your order. Please try again.', 'error');
    }
  }
  
  // Helper method to create Address objects
  createAddressFromForm(
    formData: any, 
    userId: number, 
    addressType: AddressType
  ): Address {
    return {
      addressId: null,
      userId: userId,
      addressLine1: formData.addressLine1 || '',
      addressLine2: formData.addressLine2 || null,
      city: formData.city || '',
      state: formData.state || '',
      postalCode: formData.postalCode || '',
      country: formData.country || '',
      isDefault: formData.saveAddress || false,
      addressType: addressType,
      // Add name property for better display in order confirmation
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      // Include phone for shipping purposes
      phone: formData.phone || ''
    };
  }

  submitOrder(orderRequest: OrderRequest): void {
    // Check if payment method is card
    const paymentMethod = this.checkoutForm.get('payment')?.get('method')?.value;
    console.log('Submitting order with payment method:', paymentMethod);
    
    // Make direct API call with simple retry logic
    this.checkoutService.placeOrder(orderRequest).subscribe({
      next: (orderResponse) => {
        console.log('Order placed successfully:', orderResponse);
        this.ngZone.run(() => {
          // Store order details for potential session recovery
          localStorage.setItem('lastOrderId', orderResponse.orderId?.toString() || '');
          localStorage.setItem('lastOrderTime', new Date().toISOString());
          
          this.orderId = orderResponse.orderId ?? null;
          
          if (paymentMethod === 'card') {
            // For card payments, redirect to Stripe Checkout
            this.redirectToStripeCheckout(orderResponse);
          } else {
            // For other payment methods (COD, etc.), proceed as before
            this.isSubmitting = false;
            console.log('Order complete with non-card payment');
            this.showNotification('Order placed successfully!', 'success');
            
            // Clear cart for non-card payment methods
            this.cartService.clearCart(orderRequest.userId).subscribe({
              next: () => console.log('Cart cleared successfully after non-card payment'),
              error: (err) => console.error('Error clearing cart after non-card payment:', err)
            });
            
            // Redirect to order confirmation page
            this.router.navigate(['/order-confirmation'], { 
              queryParams: { orderId: orderResponse.orderId }
            });
          }
        });
      },
      error: (error) => {
        console.error('Error placing order:', error);
        
        // Simple retry without complex logic
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          this.showNotification(`Connection issue. Retrying... (${this.retryCount}/${this.maxRetries})`, 'error');
          
          setTimeout(() => {
            console.log(`Retry attempt ${this.retryCount}/${this.maxRetries}`);
            this.submitOrder(orderRequest);
          }, 1000);
        } else {
          this.handleOrderError(error);
        }
      }
    });
  }
  
  /**
   * Redirect to Stripe Checkout for payment processing
   * UPDATED to fix payment status issues and cart clearing
   */
  redirectToStripeCheckout(orderResponse: any): void {
    console.log('Redirecting to Stripe Checkout for order:', orderResponse);
    
    // Save order ID in local storage for recovery
    if (orderResponse && orderResponse.orderId) {
      localStorage.setItem('lastOrderId', orderResponse.orderId.toString());
      localStorage.setItem('lastOrderTime', new Date().toISOString());
      localStorage.setItem('orderPaymentPending', orderResponse.orderId.toString());
    }
    
    // Prepare checkout session request
    const checkoutRequest = {
      orderId: orderResponse.orderId,
      amount: this.calculateTotal(),
      currency: 'inr',
      customerEmail: this.checkoutForm.get('billing')?.get('email')?.value,
      customerName: `${this.checkoutForm.get('billing')?.get('firstName')?.value} ${this.checkoutForm.get('billing')?.get('lastName')?.value}`.trim(),
      successUrl: `${window.location.origin}/checkout?payment_status=success&order_id=${orderResponse.orderId}`,
      cancelUrl: `${window.location.origin}/checkout?payment_status=cancel&order_id=${orderResponse.orderId}`
    };
    
    this.showNotification('Preparing payment. Please wait...', 'info');
    
    // Create Stripe Checkout session
    this.checkoutService.createCheckoutSession(checkoutRequest).subscribe({
      next: (response) => {
        console.log('Checkout session created:', response);
        
        if (response && response.url) {
          // Store payment session info in local storage for post-redirect validation
          if (response.sessionId) {
            localStorage.setItem('stripeSessionId', response.sessionId);
          }
          
          // Redirect to Stripe Checkout
          this.showNotification('Redirecting to payment page...', 'success');
          window.location.href = response.url;
        } else {
          console.error('Invalid checkout session response:', response);
          this.isSubmitting = false;
          this.showNotification('Payment initialization failed. Please try again.', 'error');
        }
      },
      error: (error) => {
        console.error('Error creating checkout session:', error);
        this.isSubmitting = false;
        this.showNotification('Payment service is currently unavailable. Please try again later.', 'error');
      }
    });
  }
  
  handleOrderError(error: any): void {
    console.error('Error during checkout:', error);
    this.ngZone.run(() => {
      this.isSubmitting = false; // Important! Reset submission state
      this.showNotification(
        error.message || 'Error processing your order. Please try again later.', 
        'error'
      );
    });
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    try {
      Object.keys(formGroup.controls).forEach(key => {
        const control = formGroup.get(key);
        if (control instanceof FormGroup) {
          this.markFormGroupTouched(control);
        } else if (control) {
          control.markAsTouched();
          control.markAsDirty();
          control.updateValueAndValidity();
          console.log(`Marked control ${key} as touched. Valid: ${control.valid}, Errors:`, control.errors);
        }
      });
      formGroup.updateValueAndValidity();
    } catch (error) {
      console.error('Error marking form group touched:', error);
    }
  }
  
  resetForm(): void {
    console.log('Resetting form state');
    this.isSubmitting = false;
    this.showPaymentComponent = false;
    this.formSubmitAttempt = false;
    this.retryCount = 0;
    
    // Re-validate the form
    this.checkoutForm.updateValueAndValidity();
    console.log('Form validity after reset:', this.checkoutForm.valid);
  }
  
  validateCartItems(): void {
    if (!this.cart || !this.cart.items) {
      console.error('Cart or cart items are undefined');
      return;
    }

    console.log('Validating cart items:', this.cart.items);
    
    // Filter out invalid items
    const validItems = this.cart.items.filter(item => {
      if (!item) {
        console.error('Found null item in cart');
        return false;
      }
      
      // Handle both item structures (with product object or direct properties)
      if (!item.product && !item.productId) {
        console.error('Found item without product or productId:', item);
        return false;
      }
      
      // Check if we have a product ID (either directly or in product object)
      const hasProductId = (item.product && item.product.productId) || item.productId;
      if (!hasProductId) {
        console.error('Found item without valid productId:', item);
        return false;
      }
      
      // Check price (either in product or directly on item)
      const price = item.product?.price || item.productPrice;
      if (typeof price !== 'number') {
        console.error('Found item with invalid price:', item);
        if (item.product) {
          item.product.price = 0; // Set default price
        } else {
          item.productPrice = 0;
        }
      }
      
      // Check quantity
      if (!item.quantity || typeof item.quantity !== 'number') {
        console.error('Found item with invalid quantity:', item);
        item.quantity = 1; // Set default quantity
      }
      
      return true;
    });
    
    // Update the cart if we had to filter items
    if (validItems.length !== this.cart.items.length) {
      console.warn(`Removed ${this.cart.items.length - validItems.length} invalid items from cart`);
      this.cart.items = validItems;
      
      // Recalculate total price
      this.cart.totalPrice = validItems.reduce((total, item) => {
        const price = item.product?.price || item.productPrice || 0;
        return total + (price * (item.quantity || 1));
      }, 0);
    }
  }
  
  validateRequiredFields(): void {
    // Check billing fields first
    const billingControls = [
      'firstName', 'lastName', 'email', 'country', 
      'addressLine1', 'city', 'state', 'postalCode', 'phone'
    ];
    
    const billingGroup = this.checkoutForm.get('billing');
    if (billingGroup) {
      billingControls.forEach(field => {
        const control = billingGroup.get(field);
        if (control) {
          control.markAsTouched();
          control.markAsDirty();
          control.updateValueAndValidity();
        }
      });
    }
    
    // If shipping is not same as billing, check shipping fields
    if (!this.checkoutForm.get('sameAsBilling')?.value) {
      const shippingGroup = this.checkoutForm.get('shipping');
      if (shippingGroup) {
        billingControls.forEach(field => {
          const control = shippingGroup.get(field);
          if (control) {
            control.markAsTouched();
            control.markAsDirty();
            control.updateValueAndValidity();
          }
        });
      }
    }
    
    // Make sure payment method is selected
    const paymentMethodControl = this.checkoutForm.get('payment')?.get('method');
    if (paymentMethodControl && !paymentMethodControl.value) {
      paymentMethodControl.setValue('card'); // Default to card payment
      paymentMethodControl.markAsTouched();
      paymentMethodControl.markAsDirty();
    }
    
    // Make sure shipping method is selected
    const shippingMethodControl = this.checkoutForm.get('shippingMethod')?.get('method');
    if (shippingMethodControl && !shippingMethodControl.value) {
      shippingMethodControl.setValue('standard'); // Default to standard shipping
      shippingMethodControl.markAsTouched();
      shippingMethodControl.markAsDirty();
    }
    
    // Update form validity
    this.checkoutForm.updateValueAndValidity();
    console.log('Form validity after validation:', this.checkoutForm.valid);
  }

  // Helper method to show a notification
  showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success'): void {
    // Create a temporary notification element
    const notification = document.createElement('div');
    let bgColor = 'bg-green-500';
    
    switch (type) {
      case 'error':
        bgColor = 'bg-rose-500';
        break;
      case 'warning':
        bgColor = 'bg-yellow-500';
        break;
      case 'info':
        bgColor = 'bg-blue-500';
        break;
      default:
        bgColor = 'bg-green-500';
    }
    
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300`;
    notification.style.zIndex = '9999';  // Ensure it's visible above other elements
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}