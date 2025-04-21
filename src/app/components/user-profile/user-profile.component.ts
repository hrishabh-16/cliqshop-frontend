import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserProfileService } from '../../services/userProfile/user-profile.service';
import { User } from '../../models/user.model';
import { Address, AddressType } from '../../models/address.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-user-profile',
  standalone: false,
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  userProfile: User | null = null;
  addresses: Address[] = [];
  profileForm: FormGroup;
  passwordForm: FormGroup;
  addressForm: FormGroup;
  isEditMode = false;
  isChangingPassword = false;
  isAddressTab = false;
  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  // Toast properties
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  // Address modal
  showAddressForm = false;
  editingAddress: Address | null = null;
  isDeleting = false; // Added flag to track delete operation

  constructor(
    private userProfileService: UserProfileService,
    private fb: FormBuilder
  ) {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      email: [{ value: '', disabled: true }],
      username: [{ value: '', disabled: true }],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]]
    });

    this.passwordForm = this.fb.group({
      oldPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.passwordMatchValidator });

    this.addressForm = this.fb.group({
      addressId: [null],
      name: ['', [Validators.required]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      addressLine1: ['', [Validators.required]],
      addressLine2: [''],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      postalCode: ['', [Validators.required]],
      country: ['', [Validators.required]],
      isDefault: [false],
      addressType: ['SHIPPING', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  setTab(tab: 'profile' | 'password' | 'address') {
    this.isChangingPassword = tab === 'password';
    this.isAddressTab = tab === 'address';
    if (tab === 'profile') {
      this.isChangingPassword = false;
      this.isAddressTab = false;
    }
    if (tab === 'address') {
      this.loadAddresses();
    }
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  loadUserProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.userProfileService.getUserProfile().subscribe({
      next: (user) => {
        this.userProfile = user;
        this.profileForm.patchValue({
          name: user.name,
          email: user.email,
          username: user.username,
          phoneNumber: user.phoneNumber
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load profile:', err);
        this.errorMessage = 'Failed to load profile. Please try again later.';
        this.showToastMessage('Failed to load profile. Please try again later.', 'error');
        this.isLoading = false;
      }
    });
  }

  loadAddresses(): void {
    // Only load if we have a user ID
    if (!this.userProfile?.userId) {
      this.showToastMessage('User profile not loaded yet. Please try again.', 'error');
      return;
    }

    this.isLoading = true;
    this.userProfileService.getAddresses(this.userProfile.userId).subscribe({
      next: (addresses) => {
        this.addresses = addresses;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load addresses:', err);
        this.showToastMessage('Failed to load addresses. Please try again.', 'error');
        this.isLoading = false;
      }
    });
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    if (!this.isEditMode) {
      this.resetForm();
    }
  }

  togglePasswordChange(): void {
    this.isChangingPassword = !this.isChangingPassword;
    if (!this.isChangingPassword) {
      this.passwordForm.reset();
    }
  }

  resetForm(): void {
    if (this.userProfile) {
      this.profileForm.patchValue({
        name: this.userProfile.name,
        phoneNumber: this.userProfile.phoneNumber
      });
    }
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      this.isSubmitting = true;
      this.errorMessage = '';
      this.successMessage = '';
      const updatedProfile = {
        name: this.profileForm.get('name')?.value,
        phoneNumber: this.profileForm.get('phoneNumber')?.value
      };
      this.userProfileService.updateUserProfile(updatedProfile)
        .pipe(finalize(() => this.isSubmitting = false))
        .subscribe({
          next: (res) => {
            this.userProfile = res;
            this.isEditMode = false;
            this.successMessage = 'Profile updated successfully';
            this.showToastMessage('Profile updated successfully', 'success');
          },
          error: (err) => {
            console.error('Failed to update profile:', err);
            const errorMsg = err.error?.message || 'Failed to update profile';
            this.errorMessage = errorMsg;
            this.showToastMessage(errorMsg, 'error');
          }
        });
    }
  }

  onPasswordChange(): void {
    if (this.passwordForm.valid) {
      this.isSubmitting = true;
      this.errorMessage = '';
      this.successMessage = '';
      const oldPassword = this.passwordForm.get('oldPassword')?.value;
      const newPassword = this.passwordForm.get('newPassword')?.value;
      this.userProfileService.changePassword(oldPassword, newPassword)
        .pipe(finalize(() => this.isSubmitting = false))
        .subscribe({
          next: (response) => {
            if (response.includes('Password changed successfully') || response.includes('successfully')) {
              this.successMessage = 'Password changed successfully';
              this.isChangingPassword = false;
              this.passwordForm.reset();
              this.showToastMessage('Password changed successfully', 'success');
            } else if (response.includes('Invalid old password') || response.includes('invalid')) {
              this.errorMessage = 'Invalid old password';
              this.showToastMessage('Invalid old password', 'error');
            } else {
              this.successMessage = 'Password updated successfully';
              this.isChangingPassword = false;
              this.passwordForm.reset();
              this.showToastMessage('Password updated successfully', 'success');
            }
          },
          error: (err) => {
            console.error('Failed to change password:', err);
            let errorMsg = 'Failed to change password';
            if (typeof err.error === 'string') {
              errorMsg = err.error;
            } else if (err.error?.message) {
              errorMsg = err.error.message;
            } else if (err.message) {
              errorMsg = err.message;
            }
            this.errorMessage = errorMsg;
            this.showToastMessage(errorMsg, 'error');
          }
        });
    }
  }

  // --- Address CRUD Logic ---

  openAddressForm(address?: Address): void {
    this.showAddressForm = true;
    if (address) {
      this.editingAddress = address;
      // Clear the form first
      this.addressForm.reset({ addressType: 'SHIPPING', isDefault: false });
      // Then patch values to ensure clean form
      this.addressForm.patchValue({
        addressId: address.addressId,
        name: address.name || '',
        phone: address.phone || '',
        addressLine1: address.addressLine1 || '',
        addressLine2: address.addressLine2 || '',
        city: address.city || '',
        state: address.state || '',
        postalCode: address.postalCode || '',
        country: address.country || '',
        isDefault: address.isDefault || false,
        addressType: address.addressType || 'SHIPPING'
      });
    } else {
      this.editingAddress = null;
      this.addressForm.reset({ addressType: 'SHIPPING', isDefault: false });
    }
  }

  closeAddressForm(): void {
    this.showAddressForm = false;
    this.addressForm.reset({ addressType: 'SHIPPING', isDefault: false });
    this.editingAddress = null;
  }

  onAddressSubmit(): void {
    if (this.addressForm.valid) {
      this.isSubmitting = true;
      const addressData = this.addressForm.getRawValue();
      
      // Ensure we have a valid userId
      if (!this.userProfile?.userId) {
        this.showToastMessage('User profile not loaded correctly. Please refresh the page.', 'error');
        this.isSubmitting = false;
        return;
      }

      if (this.editingAddress && this.editingAddress.addressId) {
        this.userProfileService.updateAddress(addressData.addressId, addressData)
          .pipe(finalize(() => this.isSubmitting = false))
          .subscribe({
            next: () => {
              this.showToastMessage('Address updated successfully', 'success');
              this.loadAddresses();
              this.closeAddressForm();
            },
            error: (err) => {
              console.error('Failed to update address:', err);
              this.showToastMessage('Failed to update address. Please try again.', 'error');
            }
          });
      } else {
        this.userProfileService.addAddress(this.userProfile.userId, addressData)
          .pipe(finalize(() => this.isSubmitting = false))
          .subscribe({
            next: () => {
              this.showToastMessage('Address added successfully', 'success');
              this.loadAddresses();
              this.closeAddressForm();
            },
            error: (err) => {
              console.error('Failed to add address:', err);
              this.showToastMessage('Failed to add address. Please try again.', 'error');
            }
          });
      }
    }
  }

  editAddress(address: Address): void {
    this.openAddressForm(address);
  }

  // Simplified delete address method that works for all address types
  deleteAddress(address: Address): void {
    // Check if address ID exists
    if (!address || !address.addressId) {
      this.showToastMessage('Invalid address selected', 'error');
      return;
    }
    
    // Check if already in progress to prevent multiple clicks
    if (this.isDeleting) {
      return;
    }

    if (confirm('Are you sure you want to delete this address?')) {
      this.isDeleting = true;
      
      // Force deletion endpoint with additional parameter to override constraints
      this.userProfileService.forceDeleteAddress(address.addressId)
        .pipe(finalize(() => this.isDeleting = false))
        .subscribe({
          next: () => {
            // Update the local array to remove the deleted address immediately
            this.addresses = this.addresses.filter(a => a.addressId !== address.addressId);
            this.showToastMessage('Address deleted successfully', 'success');
          },
          error: (err) => {
            console.error('Failed to delete address:', err);
            this.showToastMessage('Failed to delete address. Please try again.', 'error');
            // Reload addresses to ensure UI is in sync with server state
            this.loadAddresses();
          }
        });
    }
  }

  setDefaultAddress(address: Address): void {
    if (!address || !address.addressId) {
      this.showToastMessage('Invalid address selected', 'error');
      return;
    }

    this.isSubmitting = true;
    this.userProfileService.setDefaultAddress(address.addressId)
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: () => {
          this.showToastMessage('Default address set successfully', 'success');
          this.loadAddresses();
        },
        error: (err) => {
          console.error('Failed to set default address:', err);
          this.showToastMessage('Failed to set default address. Please try again.', 'error');
        }
      });
  }

  showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    // Auto-hide toast after 3 seconds
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }
}