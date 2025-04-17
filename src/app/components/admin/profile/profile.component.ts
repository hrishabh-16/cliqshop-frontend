import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfileService } from '../../../services/admin/profile.service';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-admin-profile',
  standalone: false,
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class AdminProfileComponent implements OnInit {
  userProfile: User | null = null;
  profileForm: FormGroup;
  passwordForm: FormGroup;
  isEditMode: boolean = false;
  isChangingPassword: boolean = false;
  isLoading: boolean = true;
  isSubmitting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  
  // Toast properties
  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' = 'success';

  constructor(
    private profileService: ProfileService,
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
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  loadUserProfile(): void {
    this.isLoading = true;
    this.profileService.getUserProfile().subscribe({
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
        this.errorMessage = 'Failed to load profile. Please try again later.';
        this.showToastMessage('Failed to load profile. Please try again later.', 'error');
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

      this.profileService.updateUserProfile(updatedProfile).subscribe({
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
  
      this.profileService.changePassword(oldPassword, newPassword).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          
          console.log('Password change response:', response); // Debug log
          
          // Handle the plaintext response
          if (response.includes('Password changed successfully') || response.includes('successfully')) {
            this.successMessage = 'Password changed successfully';
            this.isChangingPassword = false;
            this.passwordForm.reset();
            this.showToastMessage('Password changed successfully', 'success');
          } else if (response.includes('Invalid old password') || response.includes('invalid')) {
            this.errorMessage = 'Invalid old password';
            this.showToastMessage('Invalid old password', 'error');
          } else {
            // Default successful case
            this.successMessage = 'Password updated successfully';
            this.isChangingPassword = false;
            this.passwordForm.reset();
            this.showToastMessage('Password updated successfully', 'success');
          }
        },
        error: (err) => {
          console.error('Password change error:', err); // Debug log
          
          let errorMsg = 'Failed to change password';
          
          // Try to extract error message from different possible error formats
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
  
  /**
   * Display a toast message
   * @param message Message to display
   * @param type Type of toast ('success' or 'error')
   */
  showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    
    // Auto hide toast after 3 seconds
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }
}