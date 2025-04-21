import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserProfileService } from '../../services/userProfile/user-profile.service';
import { User } from '../../models/user.model';
import { Address, AddressType } from '../../models/address.model';

@Component({
  selector: 'app-user-profile',
  standalone:false,
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
      error: () => {
        this.errorMessage = 'Failed to load profile. Please try again later.';
        this.showToastMessage('Failed to load profile. Please try again later.', 'error');
        this.isLoading = false;
      }
    });
  }

  loadAddresses(): void {
    this.userProfileService.getAddresses(this.userProfile?.userId!).subscribe({
      next: (addresses) => {
        this.addresses = addresses;
      },
      error: () => {
        this.showToastMessage('Failed to load addresses.', 'error');
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
      this.userProfileService.updateUserProfile(updatedProfile).subscribe({
        next: (res) => {
          this.userProfile = res;
          this.isEditMode = false;
          this.isSubmitting = false;
          this.successMessage = 'Profile updated successfully';
          this.showToastMessage('Profile updated successfully', 'success');
        },
        error: (err) => {
          const errorMsg = err.error?.message || 'Failed to update profile';
          this.errorMessage = errorMsg;
          this.showToastMessage(errorMsg, 'error');
          this.isSubmitting = false;
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
      this.userProfileService.changePassword(oldPassword, newPassword).subscribe({
        next: (response) => {
          this.isSubmitting = false;
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
          this.isSubmitting = false;
        }
      });
    }
  }

  // --- Address CRUD Logic ---

  openAddressForm(address?: Address): void {
    this.showAddressForm = true;
    if (address) {
      this.editingAddress = address;
      this.addressForm.patchValue(address);
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
      if (this.editingAddress && this.editingAddress.addressId) {
        this.userProfileService.updateAddress(addressData.addressId, addressData).subscribe({
          next: () => {
            this.showToastMessage('Address updated successfully', 'success');
            this.loadAddresses();
            this.closeAddressForm();
            this.isSubmitting = false;
          },
          error: () => {
            this.showToastMessage('Failed to update address', 'error');
            this.isSubmitting = false;
          }
        });
      } else {
        this.userProfileService.addAddress(this.userProfile?.userId!, addressData).subscribe({
          next: () => {
            this.showToastMessage('Address added successfully', 'success');
            this.loadAddresses();
            this.closeAddressForm();
            this.isSubmitting = false;
          },
          error: () => {
            this.showToastMessage('Failed to add address', 'error');
            this.isSubmitting = false;
          }
        });
      }
    }
  }

  editAddress(address: Address): void {
    this.openAddressForm(address);
  }

  deleteAddress(address: Address): void {
    if (confirm('Are you sure you want to delete this address?')) {
      this.userProfileService.deleteAddress(address.addressId!).subscribe({
        next: () => {
          this.showToastMessage('Address deleted successfully', 'success');
          this.loadAddresses();
        },
        error: () => {
          this.showToastMessage('Failed to delete address', 'error');
        }
      });
    }
  }

  setDefaultAddress(address: Address): void {
    this.userProfileService.setDefaultAddress(address.addressId!).subscribe({
      next: () => {
        this.showToastMessage('Default address set successfully', 'success');
        this.loadAddresses();
      },
      error: () => {
        this.showToastMessage('Failed to set default address', 'error');
      }
    });
  }

  showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }
}
