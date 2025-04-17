// cliqshop-frontend\src\app\components\admin\users\users.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { UserService, User } from '../../../services/user/user.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-users',
  standalone: false,
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {
  allUsers: User[] = [];
  adminUsers: User[] = [];
  regularUsers: User[] = [];
  filteredUsers: User[] = [];
  
  selectedUser: User | null = null;
  currentView: 'all' | 'admins' | 'customers' = 'all';
  
  loading = true;
  error: string | null = null;
  successMessage: string = '';
  errorMessage: string = '';
  
  showEditModal = false;
  showDeleteModal = false;
  submitting = false;
  
  userForm: FormGroup;
  searchTerm = '';
  
  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.userForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required]],
      role: ['USER', [Validators.required]],
      enabled: [true]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = null;
    
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
        this.adminUsers = users.filter(user => user.role === 'ADMIN');
        this.regularUsers = users.filter(user => user.role === 'USER');
        this.applyFilter(this.currentView);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load users. Please try again later.';
        console.error('Error loading users:', err);
        this.loading = false;
      }
    });
  }
  
  applyFilter(filterType: 'all' | 'admins' | 'customers'): void {
    this.currentView = filterType;
    
    switch (filterType) {
      case 'all':
        this.filteredUsers = [...this.allUsers];
        break;
      case 'admins':
        this.filteredUsers = [...this.adminUsers];
        break;
      case 'customers':
        this.filteredUsers = [...this.regularUsers];
        break;
    }
    
    // Apply search filter if there is a search term
    if (this.searchTerm) {
      this.filteredUsers = this.filteredUsers.filter(user => 
        user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (user.username && user.username.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );
    }
  }
  
  searchUsers(event: Event): void {
    const element = event.target as HTMLInputElement;
    this.searchTerm = element.value;
    this.applyFilter(this.currentView);
  }
  
  navigateBack(): void {
    this.router.navigate(['/admin/dashboard']);
  }
  
  refreshUsers(): void {
    this.loadUsers();
  }
  
  formatDate(date: string): string {
    if (!date) return 'N/A';
    
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  }
  
  // Edit user
  editUser(user: User): void {
    console.log('Edit user clicked:', user);
    this.selectedUser = { ...user }; // Create a copy to avoid direct reference modification
    
    // Patch the form values
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      enabled: user.enabled
    });
    
    this.showEditModal = true;
    this.cdr.detectChanges();
    console.log('Edit modal state:', this.showEditModal);
  }
  
  // Update user
  updateUser(): void {
    if (this.userForm.invalid || !this.selectedUser) {
      this.markFormGroupTouched(this.userForm);
      return;
    }
    
    this.submitting = true;
    const userData = this.userForm.value;
    
    this.userService.updateUser(this.selectedUser.userId, userData).subscribe({
      next: (updatedUser) => {
        // Update the user in the lists
        this.updateUserInLists(updatedUser);
        
        this.successMessage = `User ${updatedUser.name} has been updated successfully`;
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.detectChanges();
        }, 5000);
        
        this.closeModal();
        this.submitting = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to update user. Please try again.';
        setTimeout(() => {
          this.errorMessage = '';
          this.cdr.detectChanges();
        }, 5000);
        console.error('Error updating user:', err);
        this.submitting = false;
      }
    });
  }
  
  // Delete user confirmation
  confirmDelete(user: User): void {
    console.log('Confirm delete clicked:', user);
    this.selectedUser = { ...user }; // Create a copy
    this.showDeleteModal = true;
    this.cdr.detectChanges();
    console.log('Delete modal state:', this.showDeleteModal);
  }
  
  // Delete user
  deleteUser(): void {
    if (!this.selectedUser) return;
    
    this.submitting = true;
    
    this.userService.deleteUser(this.selectedUser.userId).subscribe({
      next: () => {
        // Store the name before removing
        const userName = this.selectedUser?.name;
        
        // Remove the user from the lists
        this.removeUserFromLists(this.selectedUser!.userId);
        
        this.successMessage = `User ${userName} has been deleted successfully`;
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.detectChanges();
        }, 5000);
        
        this.closeDeleteModal();
        this.submitting = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to delete user. Please try again.';
        setTimeout(() => {
          this.errorMessage = '';
          this.cdr.detectChanges();
        }, 5000);
        console.error('Error deleting user:', err);
        this.submitting = false;
      }
    });
  }
  
  // Toggle user status
  toggleUserStatus(user: User): void {
    console.log('Toggle status clicked for user:', user);
    
    // Optimistic update - update UI first
    const previousStatus = user.enabled;
    user.enabled = !user.enabled;
    this.updateUserStatusInLists(user.userId, user.enabled);
    
    this.userService.toggleUserStatus(user.userId).subscribe({
      next: () => {
        console.log('Toggle status successful');
        this.successMessage = `User status has been ${user.enabled ? 'activated' : 'deactivated'} successfully`;
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.detectChanges();
        }, 5000);
      },
      error: (err) => {
        console.error('Error toggling status:', err);
        // Revert the optimistic update
        user.enabled = previousStatus;
        this.updateUserStatusInLists(user.userId, previousStatus);
        
        this.errorMessage = 'Failed to update user status. Please try again.';
        setTimeout(() => {
          this.errorMessage = '';
          this.cdr.detectChanges();
        }, 5000);
      }
    });
  }
  
  // Update user status in all lists
  private updateUserStatusInLists(userId: number, enabled: boolean): void {
    // Update in allUsers
    const allUsersIndex = this.allUsers.findIndex(u => u.userId === userId);
    if (allUsersIndex !== -1) {
      this.allUsers[allUsersIndex].enabled = enabled;
    }
    
    // Update in adminUsers
    const adminUsersIndex = this.adminUsers.findIndex(u => u.userId === userId);
    if (adminUsersIndex !== -1) {
      this.adminUsers[adminUsersIndex].enabled = enabled;
    }
    
    // Update in regularUsers
    const regularUsersIndex = this.regularUsers.findIndex(u => u.userId === userId);
    if (regularUsersIndex !== -1) {
      this.regularUsers[regularUsersIndex].enabled = enabled;
    }
    
    // Update in filteredUsers
    const filteredUsersIndex = this.filteredUsers.findIndex(u => u.userId === userId);
    if (filteredUsersIndex !== -1) {
      this.filteredUsers[filteredUsersIndex].enabled = enabled;
    }
    
    // Force change detection
    this.cdr.detectChanges();
  }
  
  // Close edit modal
  closeModal(): void {
    this.showEditModal = false;
    this.resetForm();
    this.cdr.detectChanges();
  }
  
  // Close delete modal
  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedUser = null;
    this.cdr.detectChanges();
  }
  
  // Reset form
  resetForm(): void {
    this.userForm.reset({
      role: 'USER',
      enabled: true
    });
    this.selectedUser = null;
  }
  
  // Helper to mark all form fields as touched
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if ((control as any).controls) { // check if it's a FormGroup
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }
  
  // Helper to update a user in all lists
  private updateUserInLists(updatedUser: User): void {
    // Helper function to update user in a list
    const updateUserInList = (list: User[]): void => {
      const index = list.findIndex(u => u.userId === updatedUser.userId);
      if (index !== -1) {
        list[index] = { ...updatedUser };
      }
    };
    
    // Update in all lists
    updateUserInList(this.allUsers);
    
    // Check role for admin/regular lists
    if (updatedUser.role === 'ADMIN') {
      // Remove from regular users if present
      this.regularUsers = this.regularUsers.filter(u => u.userId !== updatedUser.userId);
      // Add to admin users if not present
      if (!this.adminUsers.some(u => u.userId === updatedUser.userId)) {
        this.adminUsers.push(updatedUser);
      } else {
        updateUserInList(this.adminUsers);
      }
    } else {
      // Remove from admin users if present
      this.adminUsers = this.adminUsers.filter(u => u.userId !== updatedUser.userId);
      // Add to regular users if not present
      if (!this.regularUsers.some(u => u.userId === updatedUser.userId)) {
        this.regularUsers.push(updatedUser);
      } else {4
        updateUserInList(this.regularUsers);
      }
    }
    
    // Refresh the filtered list
    this.applyFilter(this.currentView);
  }
  
  // Helper to remove a user from all lists
  private removeUserFromLists(userId: number): void {
    this.allUsers = this.allUsers.filter(u => u.userId !== userId);
    this.adminUsers = this.adminUsers.filter(u => u.userId !== userId);
    this.regularUsers = this.regularUsers.filter(u => u.userId !== userId);
    this.applyFilter(this.currentView);
  }
}