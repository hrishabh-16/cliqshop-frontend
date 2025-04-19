import { Component, OnInit, HostListener, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart/cart.service';
import { CheckoutService } from '../../services/checkout/checkout.service';
import { AuthService } from '../../services/auth/auth.service';
import { Cart } from '../../models/cart.model';
import { Address, AddressType } from '../../models/address.model';

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
  
  shippingMethods = [
    { id: 'standard', name: 'Standard Shipping', description: '5-7 working days', cost: 99 },
    { id: 'express', name: 'Express Shipping', description: '3-5 working days', cost: 199 },
    { id: 'next_day', name: 'Next Day Delivery', description: '1-2 working days', cost: 299 },
    { id: 'free', name: 'Free Shipping', description: 'For orders above ₹999', cost: 0 }
  ];
  
  constructor(
    private formBuilder: FormBuilder,
    private cartService: CartService,
    private checkoutService: CheckoutService,
    private authService: AuthService,
    private router: Router,
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
          firstName: ['', Validators.required],
          lastName: ['', Validators.required],
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
        sameAsBilling: [true],
        payment: this.formBuilder.group({
          method: ['cod', Validators.required]
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
    
    // When sameAsBilling changes, update shipping validators
    this.checkoutForm.get('sameAsBilling')?.valueChanges.subscribe(sameAsBilling => {
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
    });
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
      phoneNumber: '' // Ensure phoneNumber exists but may be empty
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
          
          // If cart is null or has no items, redirect to cart page
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
          this.router.navigate(['/cart']);
        });
      }
    });
    console.log('Cart loaded:', this.cart);
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
    const control = this.checkoutForm.get(fieldPath);
    return control ? control.invalid && (control.touched || control.dirty) : false;
  }

  placeOrder(): void {
    if (this.checkoutForm.invalid) {
      // Mark all fields as touched to display validation errors
      this.markFormGroupTouched(this.checkoutForm);
      this.showNotification('Please fill in all required fields', 'error');
      return;
    }
    
    if (!this.cart || !this.cart.items || this.cart.items.length === 0) {
      this.showNotification('Your cart is empty', 'error');
      this.router.navigate(['/cart']);
      return;
    }
    
    this.isSubmitting = true;
    const user = this.authService.getCurrentUser();
    
    if (!user || !user.userId) {
      this.isSubmitting = false;
      this.showNotification('You need to be logged in to place an order', 'error');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    
    // Prepare order data
    const formValue = this.checkoutForm.value;
    
    // Prepare billing address - omitting user property entirely
    const billingAddress: Partial<Address> = {
      addressId: null,
      addressLine1: formValue.billing.addressLine1,
      addressLine2: formValue.billing.addressLine2 || null,
      city: formValue.billing.city,
      state: formValue.billing.state,
      postalCode: formValue.billing.postalCode,
      country: formValue.billing.country,
      isDefault: formValue.billing.saveAddress,
      addressType: formValue.sameAsBilling ? 'BOTH' : 'BILLING'
    };
    
    // Prepare shipping address if different from billing
    let shippingAddress: Partial<Address> | null = null;
    if (!formValue.sameAsBilling) {
      shippingAddress = {
        addressId: null,
        addressLine1: formValue.shipping.addressLine1,
        addressLine2: formValue.shipping.addressLine2 || null,
        city: formValue.shipping.city,
        state: formValue.shipping.state,
        postalCode: formValue.shipping.postalCode,
        country: formValue.shipping.country,
        isDefault: formValue.shipping.saveAddress,
        addressType: 'SHIPPING'
      };
    }
    
    // Prepare order request
    const orderRequest = {
      userId: user.userId,
      billingAddressId: null as number | null, // Will be set after saving addresses
      shippingAddressId: null as number | null, // Will be set after saving addresses
      shippingMethod: formValue.shippingMethod.method,
      paymentMethod: formValue.payment.method,
      orderNotes: formValue.orderNotes || null,
      orderTotal: this.calculateTotal(),
      cartItems: this.cart.items.map(item => ({
        productId: item.product.productId,
        quantity: item.quantity,
        price: item.product.price
      }))
    };
    
    // First, save addresses if needed
    if (formValue.billing.saveAddress) {
      this.checkoutService.saveAddress(user.userId, billingAddress as Address).subscribe({
        next: (savedBillingAddress) => {
          console.log('Billing address saved:', savedBillingAddress);
          orderRequest.billingAddressId = savedBillingAddress.addressId;
          
          if (!formValue.sameAsBilling && formValue.shipping.saveAddress && shippingAddress) {
            this.checkoutService.saveAddress(user.userId, shippingAddress as Address).subscribe({
              next: (savedShippingAddress) => {
                console.log('Shipping address saved:', savedShippingAddress);
                orderRequest.shippingAddressId = savedShippingAddress.addressId;
                this.submitOrder(orderRequest);
              },
              error: (error) => this.handleOrderError(error)
            });
          } else {
            // Same address for shipping or don't save shipping address
            orderRequest.shippingAddressId = orderRequest.billingAddressId;
            this.submitOrder(orderRequest);
          }
        },
        error: (error) => this.handleOrderError(error)
      });
    } else {
      // Don't save addresses, just place the order
      this.submitOrder(orderRequest);
    }
  }

  submitOrder(orderRequest: any): void {
    this.checkoutService.placeOrder(orderRequest).subscribe({
      next: (orderResponse) => {
        console.log('Order placed successfully:', orderResponse);
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.showNotification('Order placed successfully!', 'success');
          // Clear cart and redirect to order confirmation page
          this.cartService.clearCart(orderRequest.userId).subscribe();
          this.router.navigate(['/order-confirmation'], { 
            queryParams: { orderId: orderResponse.orderId }
          });
        });
      },
      error: (error) => this.handleOrderError(error)
    });
  }

  handleOrderError(error: any): void {
    console.error('Error during checkout:', error);
    this.ngZone.run(() => {
      this.isSubmitting = false;
      this.showNotification(
        'Error processing your order. Please try again later.', 
        'error'
      );
    });
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  // Helper method to show a notification
  showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    // Create a temporary notification element
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-rose-500';
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